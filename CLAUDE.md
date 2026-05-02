# KAIROS — Claude Operational Ruleset

This file is the authoritative system memory for all AI-assisted work on this repository.
Read it before touching any file. Violating these rules breaks the architecture.

---

## 1. Project Identity

**KAIROS** is an AI-assisted cryptocurrency trading terminal. It surfaces real-time market data, AI-generated trade signals, sentiment intelligence, and portfolio analytics inside a premium web UI. The flagship feature is **Pro Mode** — a dark, glassmorphic, high-density interface toggled by the user that triggers a full animated transition and unlocks an enhanced visual experience.

---

## 2. Tech Stack

### Frontend (`web/`)
| Concern | Library / Version |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin — no `tailwind.config.js`) |
| Animations | Framer Motion 12 |
| Charts | Recharts 3 |
| Routing | React Router DOM 7 |
| Icons | Lucide React |
| Auth (social) | `@react-oauth/google` |
| HTTP client | `web/src/lib/api.js` (centralised Axios/fetch wrapper) |

### Backend (`backend/`)
| Concern | Library |
|---|---|
| Framework | FastAPI (Python) |
| Server | Uvicorn (with `--reload` in dev, multi-worker in prod) |
| Database | MongoDB Atlas via Motor (async) — `core/database.py` |
| Auth | JWT (via `core/security.py`) |
| Rate limiting | SlowAPI (`core/rate_limiter.py`) |
| Market data | Binance REST + WebSocket (`services/binance/`, `core/binance_ws.py`) |
| AI / Sentiment | Perplexity (`services/perplexity/`), internal `core/ai_engine.py` |
| Technical analysis | `core/ta_engine.py` (singleton, started at lifespan) |
| Price monitoring | `domain/services/price_monitor.py` (background task, started at lifespan) |

---

## 3. Folder Architecture

### Frontend — `web/src/`

```
web/src/
├── App.jsx                  # Root: ProModeProvider + BrowserRouter + all routes
├── main.jsx                 # ReactDOM.createRoot entry point
├── index.css                # Tailwind v4 base imports
├── lib/
│   └── api.js               # Single API client — all fetch/axios calls go here
├── context/
│   ├── AuthContext.jsx      # JWT auth state, login/logout helpers
│   └── ProModeContext.jsx   # isProMode flag, transition state, localStorage persistence
├── components/
│   ├── SidebarLayout.jsx    # Authenticated shell with sidebar nav + <Outlet />
│   ├── ProtectedRoute.jsx   # Redirects unauthenticated users to /login
│   ├── ProModeTransition.jsx# Full-screen Framer Motion splash on mode toggle
│   ├── ProfileModal.jsx     # User profile overlay
│   ├── SettingsModal.jsx    # Settings overlay
│   ├── LiveTicker.jsx       # Real-time price ticker strip
│   ├── Layout.jsx           # Generic page layout wrapper
│   ├── ComingSoonModal.jsx
│   └── landing/             # Landing page sub-components
├── pages/
│   ├── LandingPage.jsx      # Public marketing page
│   ├── Login.jsx            # /login
│   ├── SignUp.jsx           # /signup
│   ├── MarketPage.jsx       # /dashboard/market — live prices, charts
│   ├── PortfolioPage.jsx    # /dashboard/portfolio — holdings, P&L
│   ├── IntelligencePage.jsx # /dashboard/intelligence — AI signals, sentiment
│   ├── TerminalPage.jsx     # /dashboard/terminal — trade execution UI
│   └── TradeHistoryPage.jsx # /dashboard/history — trade log
└── assets/                  # Static images / icons
```

Route hierarchy: `/ → LandingPage`, `/login`, `/signup`, `/dashboard/*` (protected, wrapped by `SidebarLayout`).

### Backend — `backend/`

The backend follows a strict **Layered Architecture**. Full rationale is in [`backend/ARCHITECTURE.md`](backend/ARCHITECTURE.md).

```
backend/
├── main.py                  # Uvicorn entry point
├── brain.py                 # Legacy prototype (do not modify)
├── core/                    # INFRASTRUCTURE LAYER
│   ├── config.py            # Pydantic settings singleton (reads .env)
│   ├── database.py          # MongoDB Motor connection pool
│   ├── di_container.py      # Composition root — ServiceContainer singleton
│   ├── security.py          # JWT encode/decode, password hashing
│   ├── rate_limiter.py      # SlowAPI limiter instance
│   ├── logging_config.py    # Structlog / stdlib logging setup
│   ├── exceptions.py        # Domain exception hierarchy
│   ├── binance_ws.py        # Binance WebSocket stream manager
│   ├── ta_engine.py         # Technical analysis singleton
│   ├── ai_engine.py         # Internal AI inference singleton
│   └── tenant_db.py         # Per-user DB scoping helpers
├── domain/                  # BUSINESS LOGIC LAYER (pure Python, no I/O)
│   ├── news.py              # News domain entity
│   └── services/
│       ├── orchestrator.py      # Use-case coordinator — wires all domain services
│       ├── portfolio_manager.py # Portfolio state & P&L calculations
│       ├── price_monitor.py     # Background price alert monitor
│       ├── risk_manager.py      # Position sizing, drawdown checks
│       ├── signal_validator.py  # Signal confidence validation
│       └── trade_executor.py    # Trade lifecycle (delegates to service layer)
├── services/                # SERVICE ABSTRACTION LAYER (external I/O only)
│   ├── abstractions/        # ABCs: IMarketDataProvider, IAIContextProvider, ITradeExecutorService
│   ├── binance/             # Binance adapter (implements IMarketDataProvider)
│   ├── perplexity/          # Perplexity adapter (implements IAIContextProvider)
│   └── sentiment_engine.py  # Sentiment aggregation service
├── adapters/                # Secondary adapters (news, etc.)
│   └── news_adapter.py
├── api/                     # PRESENTATION LAYER
│   ├── __init__.py          # create_app() factory + lifespan handler
│   ├── dependencies.py      # FastAPI Depends() helpers (auth, container)
│   ├── schemas/             # Pydantic request/response DTOs
│   └── routes/
│       ├── auth.py          # POST /auth/register, /auth/login, /auth/refresh
│       ├── market.py        # GET /market/prices, /market/candles, WS /ws/prices
│       ├── trades.py        # GET /trades (history)
│       ├── trade.py         # POST /trade/execute
│       ├── portfolio.py     # GET /portfolio
│       ├── user.py          # GET/PATCH /user/me
│       ├── user_progress.py # GET /user/progress
│       ├── ai_targets.py    # GET /ai/targets
│       ├── admin.py         # Admin-only routes
│       └── debug.py         # Dev/debug routes (disabled in prod)
└── tests/
    ├── unit/
    └── integration/
```

---

## 4. Strict AI Coding Standards

### 4.1 Frontend Rules

**Components**
- Always use functional components. No class components, ever.
- All state via React Hooks (`useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`).
- Custom hooks live in `web/src/lib/` or inline when single-use.
- Consume `useProMode()` from `ProModeContext` to branch Pro/Standard UI. Never read `localStorage` directly in components.
- Consume `useAuth()` from `AuthContext` for user state. Never decode JWTs in components.

**Styling**
- Tailwind CSS v4 utility classes only. No inline `style={{}}` except for dynamic values that cannot be expressed as utilities (e.g., JS-calculated pixel offsets).
- **Pro Mode aesthetic**: `bg-black`, deep `bg-zinc-900/80` glass cards with `backdrop-blur`, `border border-white/10`, subtle `shadow-[0_0_30px_rgba(var(--accent),0.15)]` glows, monospace accent fonts. Text hierarchy: `text-white` → `text-zinc-400` → `text-zinc-600`.
- **Standard Mode aesthetic**: `bg-zinc-950` base, `bg-zinc-900` cards, `border-zinc-800`. Clean, minimal.
- Never add Tailwind `v3`-style config (`theme.extend`, `purge`, `plugins` array in a JS config file). Tailwind v4 is configured via CSS `@theme` blocks.

**Animations**
- ALL animations MUST use Framer Motion. No CSS `transition`/`animation` classes for anything interactive or enter/exit animated.
- Page transitions: `<motion.div>` with `initial`, `animate`, `exit` props.
- List items: `AnimatePresence` + staggered `variants`.
- The Pro Mode splash is `ProModeTransition.jsx` — do not inline transition logic elsewhere.
- Performance: use `layout` prop sparingly; prefer `transform`/`opacity` animations to avoid layout thrash.

**API calls**
- All backend calls go through `web/src/lib/api.js`. Never call `fetch` or `axios` directly in a component or page.

### 4.2 Backend Rules

**Layer discipline — non-negotiable**
```
api/routes/  →  domain/services/  →  services/adapters/
     ↓                 ↓                      ↓
  (HTTP I/O)    (pure business logic)   (external I/O)
```
- Route handlers: validate input (Pydantic schemas in `api/schemas/`), call domain services, return DTOs. Zero business logic.
- `domain/services/`: pure Python. No `httpx`, no Motor, no Binance SDK calls. Receives data via injected service abstractions.
- `services/binance/`, `services/perplexity/`: all network I/O. Implements ABCs in `services/abstractions/`.
- `core/`: infrastructure singletons only. Route handlers never import from `core/` except `core/exceptions.py`.

**Dependency Injection**
- All service wiring happens in `core/di_container.py` (`ServiceContainer`). This is the single composition root.
- Route handlers get dependencies via FastAPI `Depends()` helpers defined in `api/dependencies.py`.
- Never instantiate `BinanceAdapter`, `PerplexityAdapter`, or domain services inside a route handler or domain service. Always inject.

**Database**
- All MongoDB access goes through `core/database.py` (`Database.get_collection()`).
- Use Motor (async). No synchronous PyMongo calls anywhere.
- Collection names are snake_case strings defined as constants — never hardcoded inline.

**Schemas / DTOs**
- All request bodies and response models are Pydantic `BaseModel` subclasses in `api/schemas/`.
- Domain value objects (internal) are `@dataclass` or plain Pydantic models in `domain/`. They never leak into API responses directly — map them to response DTOs in the route.

**Error handling**
- Raise domain exceptions from `core/exceptions.py` inside domain services.
- Route handlers catch domain exceptions and map to appropriate HTTP status codes.
- Never raise `HTTPException` from inside `domain/` or `services/`.

**Auth**
- JWT logic lives exclusively in `core/security.py`.
- The current user is provided to routes via `Depends(get_current_user)` from `api/dependencies.py`.
- Never decode tokens manually inside a route or domain service.

---

## 5. Staff-Level Response Persona

All future AI responses on this codebase must adopt the following persona:

**You are a Staff Engineer on KAIROS. You write production code, not tutorials.**

- Provide **complete, working code blocks** — no `# ... rest of code`, no `# TODO: implement this`. If you can't write it fully, say so and explain why.
- Be **direct and terse**. No preamble, no "Great question!", no meta-commentary about what you're about to do. Lead with the code or the answer.
- **Never break the existing architecture**. If a request would violate the layered architecture, DI rules, or naming conventions, say so and propose the correct approach.
- **No unnecessary abstractions**. Solve the specific problem. Don't add factories, base classes, or config flags that aren't required by the current task.
- **No comments that explain what the code does**. Only comment on non-obvious *why*: a hidden invariant, a workaround for a specific external API quirk, a subtle race condition. Self-documenting names over explanatory comments.
- When modifying existing files, **show the full modified function/class** in context — not just the changed lines — so the change is immediately applicable.
- When adding a route: add the Pydantic schema, the route handler, and wire the domain service call. All three. Never one without the others.
- When adding a frontend feature in Pro Mode: the component must consume `useProMode()`, use Framer Motion for any animation, and follow the dark glassmorphic aesthetic.

---

## 6. Running the Project

```bash
# Backend (from repo root)
cd backend
uvicorn api:app --reload --port 8000

# Or via main.py
python main.py

# Frontend (from repo root)
cd web
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # Production build → web/dist/
```

Environment: copy `.env.example` → `.env` and populate `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `PERPLEXITY_API_KEY`, `MONGODB_URI`, `JWT_SECRET_KEY`.

---

## 7. Key Invariants

1. `domain/services/` imports nothing from `api/`, `core/database.py`, or any external SDK.
2. `ProModeTransition.jsx` is the only place the full-screen mode-switch animation runs.
3. `core/di_container.py` is the only file that calls constructors for adapters and domain services.
4. All MongoDB collections accessed via `Database.get_collection()` — never via a direct Motor client reference elsewhere.
5. Tailwind v4 — no `tailwind.config.js`, no `@apply` for complex component styles (compose utilities directly in JSX).
6. `web/src/lib/api.js` is the only file allowed to make HTTP requests to the backend.
