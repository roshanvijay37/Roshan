import { KiteConnect } from "kiteconnect";
import express from "express";

const router = express.Router();

const apiKey = process.env.KITE_API_KEY;
const apiSecret = process.env.KITE_API_SECRET;

// In-memory session store (use Redis in production)
const sessions = new Map();

// Initialize KiteConnect instance
function getKite(accessToken = null) {
  return new KiteConnect({ api_key: apiKey, access_token: accessToken });
}

// Step 1: Get login URL for Zerodha OAuth
router.get("/login", (_req, res) => {
  if (!apiKey || !apiSecret) {
    return res.status(500).json({
      error: "Kite API credentials not configured",
      setupUrl: "https://kite.trade/",
    });
  }

  const kite = getKite();
  const loginUrl = kite.getLoginURL();
  res.json({ loginUrl });
});

// Step 2: Handle OAuth callback and generate access token
router.post("/callback", async (req, res) => {
  const { request_token } = req.body;

  if (!request_token) {
    return res.status(400).json({ error: "request_token is required" });
  }

  try {
    const kite = getKite();
    const response = await kite.generateSession(request_token, apiSecret);

    // Create session
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      accessToken: response.access_token,
      userId: response.user_id,
      userName: response.user_name,
      email: response.email,
      broker: response.broker,
      createdAt: new Date().toISOString(),
    };

    sessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId,
      user: {
        userId: response.user_id,
        userName: response.user_name,
        email: response.email,
        broker: response.broker,
      },
    });
  } catch (error) {
    console.error("Kite auth error:", error);
    res.status(401).json({
      error: "Failed to authenticate with Zerodha",
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

// Middleware to validate session and attach kite instance
export function requireAuth(req, res, next) {
  const sessionId = req.headers["x-session-id"];

  if (!sessionId) {
    return res.status(401).json({ error: "Session ID required" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Attach kite instance and session to request
  req.kite = getKite(session.accessToken);
  req.session = session;
  next();
}

export default router;