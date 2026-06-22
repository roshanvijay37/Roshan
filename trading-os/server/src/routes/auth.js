import crypto from "crypto";
import express from "express";

const router = express.Router();

const appId = process.env.FYERS_APP_ID;
const secretId = process.env.FYERS_SECRET_ID;
const redirectUrl = process.env.FYERS_REDIRECT_URL || "http://127.0.0.1:5173/";

// In-memory session store (use Redis in production)
const sessions = new Map();
const stateStore = new Map(); // Store state tokens for validation

// Step 1: Get FYERS login URL
router.get("/login", async (_req, res) => {
  if (!appId || !secretId) {
    return res.status(500).json({
      error: "FYERS API credentials not configured",
      setupUrl: "https://myaccount.fyers.in/",
    });
  }

  const state = crypto.randomUUID();
  stateStore.set(state, { createdAt: Date.now() });

  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of stateStore.entries()) {
    if (value.createdAt < tenMinutesAgo) {
      stateStore.delete(key);
    }
  }

  try {
    // FYERS requires authenticated POST to generate authcode
    const hash = crypto.createHash("sha256");
    hash.update(`${appId}:${secretId}`);
    const appIdHash = hash.digest("hex");

    const response = await fetch("https://api.fyers.in/api/v3/generate-authcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: appId,
        redirect_uri: redirectUrl,
        response_type: "code",
        state: state,
        appIdHash: appIdHash,
      }),
    });

    const data = await response.json();
    console.log("FYERS generate-authcode response:", JSON.stringify(data));

    if (data.s === "ok" && data.data) {
      // FYERS returns the login URL in the response
      const loginUrl = data.data.url || data.data.authorization_url;
      if (loginUrl) {
        res.json({ loginUrl, state });
        return;
      }
    }

    // If we get here, something went wrong but let's try fallback
    throw new Error(data.message || "Failed to get login URL from FYERS");
  } catch (error) {
    console.error("FYERS login error:", error);
    // Fallback: construct the OAuth URL directly
    const loginUrl = `https://api.fyers.in/api/v3/generate-authcode?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&state=${state}`;
    res.json({ loginUrl, state, warning: "Using fallback URL" });
  }
});

// Step 2: Handle OAuth callback and generate access token
router.post("/callback", async (req, res) => {
  const { auth_code, state } = req.body;

  if (!auth_code) {
    return res.status(400).json({ error: "auth_code is required" });
  }

  // Validate state if provided
  if (state && !stateStore.has(state)) {
    return res.status(400).json({ error: "Invalid or expired state" });
  }

  // Clear used state
  if (state) {
    stateStore.delete(state);
  }

  try {
    // Exchange auth_code for access_token using SHA256 hash of secret
    const cryptoModule = await import("crypto");
    const hash = cryptoModule.createHash("sha256");
    hash.update(`${appId}:${secretId}`);
    const appIdHash = hash.digest("hex");

    const tokenResponse = await fetch("https://api.fyers.in/api/v3/validate-authcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        appIdHash: appIdHash,
        code: auth_code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.s !== "ok") {
      throw new Error(tokenData.message || "Failed to get access token");
    }

    const { access_token, refresh_token } = tokenData;

    // Get user profile using the access token
    const profileResponse = await fetch(
      `https://api.fyers.in/api/v3/profile?client_id=${appId}&access_token=${access_token}`,
    );
    const profileData = await profileResponse.json();

    // Create session
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      accessToken: access_token,
      refreshToken: refresh_token,
      userId: profileData.data?.fy_id || "unknown",
      userName: profileData.data?.name || "FYERS User",
      email: profileData.data?.email_id || "",
      broker: "FYERS",
      createdAt: new Date().toISOString(),
    };

    sessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId,
      user: {
        userId: session.userId,
        userName: session.userName,
        email: session.email,
        broker: session.broker,
      },
    });
  } catch (error) {
    console.error("FYERS auth error:", error);
    res.status(401).json({
      error: "Failed to authenticate with FYERS",
      message: error.message,
    });
  }
});

// Step 3: Check session status
router.get("/session/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(401).json({ error: "Session not found" });
  }

  res.json({
    valid: true,
    user: {
      userId: session.userId,
      userName: session.userName,
      email: session.email,
      broker: session.broker,
    },
  });
});

// Step 4: Logout - invalidate session
router.post("/logout", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

// Middleware to validate session and attach FYERS config
export function requireAuth(req, res, next) {
  const sessionId = req.headers["x-session-id"];

  if (!sessionId) {
    return res.status(401).json({ error: "Session ID required" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Attach FYERS config to request
  req.fyers = {
    appId,
    accessToken: session.accessToken,
  };
  req.session = session;
  next();
}

export default router;