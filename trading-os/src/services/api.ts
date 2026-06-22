/// <reference types="vite/client" />
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getSessionId(): string | null {
  return localStorage.getItem("kiteSessionId");
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const sessionId = getSessionId();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");
  if (sessionId) {
    headers.set("x-session-id", sessionId);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Clear invalid session
    localStorage.removeItem("kiteSessionId");
    window.dispatchEvent(new Event("kite:logout"));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export const authApi = {
  getLoginUrl: () => fetchWithAuth("/auth/login"),
  exchangeToken: (requestToken: string) =>
    fetchWithAuth("/auth/callback", {
      method: "POST",
      body: JSON.stringify({ request_token: requestToken }),
    }),
  checkSession: (sessionId: string) => fetchWithAuth(`/auth/session/${sessionId}`),
  logout: () => {
    const sessionId = getSessionId();
    if (sessionId) {
      fetchWithAuth("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    localStorage.removeItem("kiteSessionId");
  },
};

// Account
export const accountApi = {
  getProfile: () => fetchWithAuth("/account/profile"),
  getFunds: () => fetchWithAuth("/account/funds"),
  getHoldings: () => fetchWithAuth("/account/holdings"),
  getPositions: () => fetchWithAuth("/account/positions"),
  getQuote: (instrument: string) => fetchWithAuth(`/account/quote/${instrument}`),
  searchInstruments: (query: string, exchange = "NSE") =>
    fetchWithAuth(`/account/search?q=${encodeURIComponent(query)}&exchange=${exchange}`),
};

// Orders
export const orderApi = {
  place: (params: {
    tradingsymbol: string;
    transaction_type: "BUY" | "SELL";
    quantity: number;
    order_type?: string;
    product?: string;
    price?: number;
    trigger_price?: number;
    exchange?: string;
  }) =>
    fetchWithAuth("/orders/place", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  cancel: (orderId: string, variety = "regular") =>
    fetchWithAuth(`/orders/cancel/${orderId}`, {
      method: "DELETE",
      body: JSON.stringify({ variety }),
    }),
  getHistory: () => fetchWithAuth("/orders/history"),
  getTrades: () => fetchWithAuth("/orders/trades/today"),
};

export function isKiteConnected(): boolean {
  return !!getSessionId();
}