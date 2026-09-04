# Smart Market Watchlist

## The problem with a normal watchlist

A normal stock watchlist mainly tells you what the price is right now. The problem is that when you return later, you still have to manually compare today's values with what you remember from your previous visit.

**Smart Market Watchlist treats the watchlist as a diff engine over time, not just a ticker.**

For every stock, the system compares its current market state with the user's last-seen snapshot and determines whether the change is:

- 🟢 **Calm** — nothing meaningful changed
- 🟡 **Worth a glance** — notable movement
- 🔴 **Meaningful** — a significant change that deserves attention

This makes the watchlist answer a more useful question:

> "What changed since I last checked?"

rather than simply:

> "What is the price right now?"

## Architecture

```
┌──────────────────────┐
│   React + Vite        │
│   Frontend             │
└──────────┬─────────────┘
           │ Axios
           ▼
┌──────────────────────┐
│  Express REST API     │
│  Backend               │
└───────┬───────┬───────┘
        │       │
  Mongoose   node-cron
        │       │
        ▼       ▼
┌──────────────┐  ┌───────────────────┐
│ MongoDB Atlas │  │ Simulated Market   │
│               │  │ Feed               │
└──────────────┘  │ random walk +      │
                   │ price spikes       │
                   └───────────────────┘
```

## Data model

**User**
- `deviceId`

**WatchlistItem**
- `userId`
- `symbol`
- `alertPriceHigh`, `alertPriceLow`

**PriceSnapshot**
- `symbol`
- `price`
- `volume`
- `fetchedAt`

**UserLastSeen**
- `userId`
- `symbol`
- `lastSeenPrice`
- `lastSeenVolume`
- `lastSeenAt`

**ChangeEvent**
- `userId`
- `symbol`
- `severity`
- `reason`
- `fromPrice` → `toPrice`

## What counts as a meaningful change?

The system does **not** rely on a simple fixed percentage such as "more than 5% means important." Instead, the current movement is compared against the stock's own recent volatility.

The system considers:

**1. Volatility-relative price movement**
Recent price history is used to estimate normal movement for that specific stock.

A movement becomes:
- **Meaningful** → greater than ~1.5 × normal volatility
- **Notable** → greater than ~0.75 × normal volatility
- **Calm** → below the notable threshold

This makes the alert relative to each stock's own recent behaviour, rather than applying the same threshold to every stock.

**2. Price alerts**
If the user configured an alert price, the event becomes meaningful when the current price crosses the alert high or alert low.

**3. Volume spike**
A significant increase in trading volume is also considered — current volume greater than 2.5× the recent average volume can trigger a meaningful change.

**4. New high / low**
The system also checks whether the current price reaches a new high or low within the available stored history.

This means the system looks beyond price percentage change alone.

## Design decisions worth explaining

### Why simulated market data?

The project was designed to demonstrate the change-detection layer, rather than depend on a paid or rate-limited market-data provider.

The simulated feed generates realistic-looking market behaviour using a random walk with occasional larger movements and volume spikes. This gives the application deterministic infrastructure for demonstrating price changes, volatility detection, volume spikes, meaningful events, historical data, and stale-data handling.

The market-feed layer is isolated from the rest of the application, so a real market API can be introduced later without redesigning the watchlist or change-detection logic.

### Why shouldn't "last seen" update on page load?

This is one of the most important design decisions in the application.

If the system updated `UserLastSeen` whenever the dashboard loaded, the application would effectively erase the evidence of what changed before the user actually looked at it.

For example:

```
10:00 AM  TCS = ₹4,100     User leaves
10:30 AM  TCS = ₹4,170     User opens dashboard
```

The application should tell the user: *"TCS moved significantly since you last checked."* If page load automatically became the new baseline, that information would disappear immediately.

The intended interaction is:

```
User opens dashboard
     ↓
Compare against previous snapshot
     ↓
Show change
     ↓
User explicitly clicks "Mark as seen"
     ↓
Update UserLastSeen
```

This preserves the meaning of "since you last checked."

### Why minimal deviceId authentication?

This is a hackathon-scale implementation, so full authentication was intentionally kept outside the MVP.

A generated `deviceId` is stored in the browser's `localStorage` and sent to the backend using an `x-device-id` header. The backend uses it to associate watchlist items and last-seen state with a user.

This provides the minimum identity layer required to demonstrate per-user watchlist state without introducing OAuth/JWT complexity that isn't central to the product idea. For production, this would be replaced with proper authentication and authorization.

### Where I kept it simple on purpose

The architecture deliberately avoids unnecessary infrastructure for the current scale. There is no Redis, no message queue, no microservice architecture, no distributed worker system.

Instead, the application uses:

```
React → Express → MongoDB + node-cron
```

For a hackathon-scale application, this keeps the system easier to understand, debug and deploy while still demonstrating the core engineering idea.

## Handling stale or uncertain data

Market data should not be presented as live when the latest snapshot is too old. The backend checks the age of the latest snapshot — if it's older than approximately 2 minutes, it's considered stale.

The frontend then displays a **STALE** badge and the live indicator is visually de-emphasized. This prevents the UI from giving the user false confidence that an old price is current.

## How the system scales

The important scaling decision is to think in terms of **unique market symbols**, rather than individual watchlist rows.

For example, 100 users each watching TCS should not require 100 independent market-data fetches. Instead, the market state is fetched once per unique symbol (TCS, INFY, RELIANCE, HDFCBANK, ...) and reused across users. MongoDB stores the snapshots, while each user's `UserLastSeen` record provides the personalized comparison baseline:

```
Many users
     ↓
Shared market snapshots
     ↓
User-specific last-seen state
     ↓
Personalized change detection
```

This separates market state from user state, which is important for scaling the product.

## Key user flow

```
User adds TCS
     ↓
Market feed generates snapshots
     ↓
System stores price + volume history
     ↓
User returns later
     ↓
Current state is compared with last-seen state
     ↓
Change is classified
     ↓
UI sorts meaningful changes first
     ↓
User expands the stock
     ↓
Recent price history appears as a sparkline
     ↓
User clicks "Mark as seen"
     ↓
New baseline is stored
```

## Features

- Add / remove stocks from a personal watchlist
- Optional high/low price alerts
- Automatic market snapshot generation
- Recent price history
- Volatility-aware change detection
- Volume-spike detection
- New high/low detection
- Three-level severity classification (calm / notable / meaningful)
- "Since you last checked" messaging
- Explicit "Mark as seen" action
- Expandable stock rows with price-history sparkline
- Stale-data detection
- Per-device watchlist state
- MongoDB persistence

## Tech stack

**Frontend:** React, Vite, Axios, plain CSS, React Context API (`useState`/`useEffect`)

**Backend:** Node.js, Express, Mongoose, MongoDB Atlas, node-cron, dotenv, CORS

**Data:** Simulated market feed → MongoDB price snapshots → user-specific last-seen state

## Setup / running locally

### Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

Then start the backend:

```bash
npm run dev
```

Backend runs on `http://localhost:5000`. Health check: `GET /api/health`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## API overview

**Watchlist**
```
POST   /api/watchlist
GET    /api/watchlist
DELETE /api/watchlist/:id
PATCH  /api/watchlist/:id
```

**Change detection**
```
GET  /api/watchlist/changes
POST /api/watchlist/:symbol/seen
```

**Market history**
```
GET /api/market/:symbol/history
```

## What I'd add with more time

- **Real market-data provider** — replace the simulated feed with a real market-data provider while keeping the existing market-feed interface; the rest of the system would continue operating on the same `PriceSnapshot` abstraction.
- **Proper authentication** — replace the temporary `deviceId` identity mechanism with production authentication and authorization.
- **True 52-week history** — the current implementation works with the available stored market history; with a production historical data provider, the system could calculate genuine 52-week highs and lows.
- **More advanced notifications** — meaningful events could eventually trigger browser, email, or mobile notifications without changing the core change-detection engine.

## Product philosophy

The central idea behind this project is simple:

> I didn't build another price ticker. I built a change-detection layer on top of a watchlist.

The value isn't only knowing that a stock is at ₹4,170. The value is knowing: *it was ₹4,100 when you last checked, and something meaningful happened while you were away.*
