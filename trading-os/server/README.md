# TradingOS Zerodha Server

Backend server that connects TradingOS to your real Zerodha account via Kite Connect API.

## Setup

### 1. Get Kite Connect API credentials

1. Go to [kite.trade](https://kite.trade/) and create a Kite Connect developer account
2. Create a new app
3. Set the **Redirect URL** to: `http://localhost:5173/live-trade` (or your frontend URL)
4. Note down your **API Key** and **API Secret**

### 2. Configure environment variables

```bash
cd trading-os/server
cp .env.example .env
```

Edit `.env`:

```env
KITE_API_KEY=your_actual_api_key
KITE_API_SECRET=your_actual_api_secret
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=any_random_string_for_security
```

### 3. Install dependencies and start

```bash
npm install
npm run dev
```

Server will start on `http://localhost:3001`

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/login` | Get Zerodha OAuth login URL |
| POST | `/api/auth/callback` | Exchange request_token for access token |
| GET | `/api/auth/session/:id` | Check if session is valid |
| POST | `/api/auth/logout` | Invalidate session |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/place` | Place a real order |
| DELETE | `/api/orders/cancel/:id` | Cancel an order |
| GET | `/api/orders/history` | Get order history |
| GET | `/api/orders/:id` | Get order details |
| GET | `/api/orders/trades/today` | Get today's trades |

### Account
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/account/profile` | Get user profile |
| GET | `/api/account/funds` | Get available margins |
| GET | `/api/account/holdings` | Get holdings |
| GET | `/api/account/positions` | Get positions |
| GET | `/api/account/quote/:instrument` | Get market quote |
| GET | `/api/account/search` | Search instruments |

## How it works

1. User clicks **"Connect Zerodha"** in TradingOS
2. Backend generates a Kite login URL and redirects the user
3. User logs into Zerodha and authorizes the app
4. Zerodha redirects back with a `request_token`
5. Backend exchanges the `request_token` for an `access_token`
6. The `access_token` is stored in a server-side session (in-memory, use Redis in production)
7. All subsequent API calls use the session ID to authenticate with Zerodha

## Security Notes

- **Never commit `.env` to git** — it contains your API secret
- The server uses in-memory session storage. For production, use **Redis** or a database
- Access tokens expire at the end of the trading day (set by Zerodha)
- The frontend never sees your API secret — all Kite API calls go through the backend
- All routes (except `/api/auth/login`) require a valid `x-session-id` header

## Production Deployment

1. Use a proper session store (Redis, PostgreSQL)
2. Add HTTPS
3. Set up CORS properly for your domain
4. Consider adding rate limiting
5. Deploy the backend separately from the frontend