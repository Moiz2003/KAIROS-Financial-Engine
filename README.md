<div align="center">

# KAIROS

### *An AI-powered cryptocurrency trading terminal that fuses real-time market data, quantitative signals, and LLM-driven reality checks into a single human-in-the-loop decision engine.*

<br/>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-blueviolet?style=for-the-badge)](CONTRIBUTING.md)

<br/>

<p>
  <img src="https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" height="28"/>
  &nbsp;
  <img src="https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black" height="28"/>
  &nbsp;
  <img src="https://img.shields.io/badge/-MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" height="28"/>
  &nbsp;
  <img src="https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white" height="28"/>
  &nbsp;
  <img src="https://img.shields.io/badge/-Tailwind CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" height="28"/>
  &nbsp;
  <img src="https://img.shields.io/badge/-Binance-F0B90B?style=flat-square&logo=binance&logoColor=black" height="28"/>
  &nbsp;
  <img src="https://img.shields.io/badge/-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" height="28"/>
</p>

</div>

---

## Executive Summary

KAIROS is a full-stack, production-grade cryptocurrency trading terminal built on a strict **N-Tier Layered Architecture**. It is not a dashboard — it is a decision engine. Every trade passes through a deterministic pipeline: quantitative technical analysis generates a signal, Perplexity AI performs a real-world news reality check, a rules-based risk gate validates position sizing, and only then does execution reach Binance's Testnet.

The frontend is a glassmorphic React 19 terminal with a **Pro Mode** — a full animated transition that unlocks a high-density, dark UI purpose-built for active monitoring. WebSocket streams deliver sub-second price updates without polling.

**Phase 2 is complete.** Core backend (FastAPI, Binance WS, Perplexity AI, JWT Auth, MongoDB Atlas) and the full React/Tailwind/Framer Motion frontend are all functional and integrated.

---

## Feature Highlights

| Feature | Description |
|---|---|
| **Sniper Strategy** | RSI + EMA-200 crossover signals with confidence scoring (0.0 – 1.0). Only high-conviction setups surface. |
| **AI Reality Check** | Before any trade reaches the risk gate, Perplexity AI cross-references live news and macro context against the technical signal. |
| **Risk Gate** | Hard limits on drawdown percentage and position size. No approved trade exceeds configured risk parameters. |
| **Live WebSocket Feed** | Binance WebSocket streams push real-time OHLCV and ticker data directly to the frontend without REST polling. |
| **Pro Mode Terminal** | Full-screen Framer Motion transition unlocks a glassmorphic, high-density trading UI with live charts, portfolio P&L, and trade history. |
| **JWT RBAC Auth** | Stateless JWT authentication with role-based access control. All protected routes validated server-side via `Depends(get_current_user)`. |
| **Layered Architecture** | Strict 4-layer separation (Presentation → Domain → Service → Infrastructure) enforced at module boundaries. |
| **Dependency Injection** | Single composition root (`core/di_container.py`) — no service is ever instantiated inside a route handler. |

---

## System Architecture

### N-Tier Layered Architecture

```mermaid
graph TD
    subgraph CLIENT["🌐 Client Layer"]
        FE["React 19 + Vite\nPro Mode Terminal"]
    end

    subgraph PRESENTATION["📡 Presentation Layer  —  api/routes/"]
        R1["auth.py\nJWT Login/Register"]
        R2["market.py\nPrices & Candles"]
        R3["trade.py\nTrade Execution"]
        R4["portfolio.py\nPortfolio State"]
        R5["trades.py\nTrade History"]
        WS["binance_ws.py\nWebSocket Relay"]
    end

    subgraph DOMAIN["🧠 Business Logic Layer  —  domain/services/"]
        ORCH["Orchestrator\nUse-Case Coordinator"]
        TA["TA Engine\nRSI · EMA · Trend"]
        RISK["Risk Manager\nDrawdown · Position Size"]
        EXEC["Trade Executor\nLifecycle Controller"]
        PM["Price Monitor\nBackground Alert Task"]
    end

    subgraph SERVICE["🔌 Service Abstraction Layer  —  services/"]
        BAPI["Binance Adapter\nimplements IMarketDataProvider"]
        PAPI["Perplexity Adapter\nimplements IAIContextProvider"]
        SENT["Sentiment Engine\nNews Aggregation"]
    end

    subgraph INFRA["⚙️ Infrastructure Layer  —  core/"]
        DI["DI Container\nComposition Root"]
        DB["MongoDB Atlas\nMotor Async Driver"]
        SEC["Security\nJWT Encode/Decode"]
        CFG["Config\nPydantic Settings"]
        LOG["Logging\nStructlog"]
    end

    subgraph EXTERNAL["☁️ External APIs"]
        BIN["Binance REST + WS\nTestnet & Mainnet"]
        PERP["Perplexity AI\nLLM Reality Check"]
        MDB["MongoDB Atlas\nCloud Database"]
    end

    CLIENT -->|"REST + WS"| PRESENTATION
    PRESENTATION --> DOMAIN
    DOMAIN --> SERVICE
    SERVICE --> INFRA
    INFRA --> EXTERNAL
    SERVICE --> EXTERNAL
```

---

### Backend Component Map

```mermaid
graph LR
    subgraph DI["core/di_container.py — Composition Root"]
        CONTAINER["ServiceContainer\nSingleton"]
    end

    subgraph ADAPTERS["Service Abstraction Layer"]
        BA["BinanceAdapter"]
        PA["PerplexityAdapter"]
        SE["SentimentEngine"]
    end

    subgraph DOMAIN["Domain Services"]
        ORCH["Orchestrator"]
        TA["TAEngine"]
        RM["RiskManager"]
        TE["TradeExecutor"]
        PM["PriceMonitor"]
        PF["PortfolioManager"]
    end

    subgraph ABSTRACTIONS["Interfaces (ABCs)"]
        IMP["IMarketDataProvider"]
        IAP["IAIContextProvider"]
        ITE["ITradeExecutorService"]
    end

    CONTAINER -->|"constructs"| BA
    CONTAINER -->|"constructs"| PA
    CONTAINER -->|"constructs"| SE
    CONTAINER -->|"injects"| ORCH
    CONTAINER -->|"injects"| TE
    CONTAINER -->|"injects"| PM

    BA -->|"implements"| IMP
    PA -->|"implements"| IAP
    BA -->|"implements"| ITE

    ORCH --> TA
    ORCH --> RM
    ORCH --> TE
    ORCH --> PF

    IMP -.->|"injected into"| ORCH
    IAP -.->|"injected into"| ORCH
    ITE -.->|"injected into"| TE
```

---

### Trade Execution — Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as React Terminal
    participant API as FastAPI /trade/execute
    participant Auth as JWT Auth Guard
    participant Orch as Orchestrator
    participant TA as TA Engine
    participant PERP as Perplexity AI
    participant Risk as Risk Manager
    participant Exec as Trade Executor
    participant BIN as Binance Testnet

    User->>UI: Click "Execute Trade" (symbol, side, qty)
    UI->>API: POST /trade/execute { symbol, side, quantity }
    API->>Auth: Depends(get_current_user)
    Auth-->>API: ✅ Validated JWT payload

    API->>Orch: orchestrator.execute_trade(symbol, side, qty, user_id)

    Orch->>TA: ta_engine.analyze(symbol, lookback=200)
    TA-->>Orch: AnalysisResult { price, RSI, EMA_200, trend, confidence }

    alt confidence < 0.65
        Orch-->>API: TradeSignal { action: HOLD, reason: "Low conviction" }
        API-->>UI: 200 { status: "HELD", reason }
        UI-->>User: Signal blocked — insufficient confidence
    end

    Orch->>PERP: perplexity.get_context(symbol, analysis_summary)
    PERP-->>Orch: NewsContext { sentiment, key_events, risk_flags }

    Orch->>Risk: risk_manager.assess(signal, portfolio_state)
    Risk-->>Orch: RiskAssessment { approved, max_position_size, warnings }

    alt approved == false
        Orch-->>API: RiskAssessment { approved: false, reason }
        API-->>UI: 200 { status: "REJECTED", reason }
        UI-->>User: Trade blocked by risk gate
    end

    Orch->>Exec: trade_executor.execute(assessment, symbol, side, qty)
    Exec->>BIN: POST /api/v3/order (Testnet)
    BIN-->>Exec: OrderResult { orderId, status, fill_price }

    Exec-->>Orch: ExecutionResult { success, order_id, fill_price, timestamp }
    Orch-->>API: ExecutionResult
    API-->>UI: 200 { status: "FILLED", order_id, fill_price }
    UI-->>User: ✅ Trade confirmed — order logged to history
```

---

## Engineering Principles

### Layered Architecture (N-Tier)

The codebase enforces a strict one-way dependency rule across four layers:

```
api/routes/  →  domain/services/  →  services/adapters/  →  core/
  HTTP I/O       pure business logic    external I/O       infrastructure
```

No layer imports from a layer above it. Domain services contain zero framework imports (`httpx`, `motor`, Binance SDK). This makes the entire domain layer testable without a running server, database, or external API.

### SOLID Principles

| Principle | Implementation in KAIROS |
|---|---|
| **S**ingle Responsibility | `TradeExecutor` handles lifecycle only; `RiskManager` handles validation only; `TAEngine` handles indicators only. |
| **O**pen/Closed | New signal strategies extend `SignalGenerator` without touching `Orchestrator` or `RiskManager`. |
| **L**iskov Substitution | `BinanceAdapter` fully satisfies `IMarketDataProvider`; swapping to a Coinbase adapter requires zero domain changes. |
| **I**nterface Segregation | Three focused ABCs: `IMarketDataProvider`, `IAIContextProvider`, `ITradeExecutorService` — no bloated service interfaces. |
| **D**ependency Inversion | `Orchestrator.__init__` receives abstractions, never concrete implementations. |

### Dependency Injection

`core/di_container.py` is the single composition root. No service is ever instantiated inside a route handler or domain service. FastAPI's `Depends()` system pulls pre-wired instances from the container:

```python
# api/dependencies.py
def get_orchestrator(container: ServiceContainer = Depends(get_container)) -> Orchestrator:
    return container.orchestrator

# api/routes/trade.py
@router.post("/execute")
async def execute_trade(
    request: TradeRequest,
    current_user: User = Depends(get_current_user),
    orchestrator: Orchestrator = Depends(get_orchestrator),
):
    ...
```

### JWT Role-Based Access Control

All protected endpoints are guarded by `Depends(get_current_user)`. Tokens are signed and verified exclusively in `core/security.py` — no manual JWT decoding anywhere else in the codebase. Token expiry, rotation, and claim validation are centralized.

---

## Tech Stack

### Frontend

| Concern | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` — no `tailwind.config.js`) |
| Animations | Framer Motion 12 |
| Charts | Recharts 3 |
| Routing | React Router DOM 7 |
| Icons | Lucide React |
| Auth (social) | `@react-oauth/google` |
| HTTP Client | Centralized Axios wrapper (`web/src/lib/api.js`) |

### Backend

| Concern | Technology |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| Server | Uvicorn (multi-worker in prod) |
| Database | MongoDB Atlas via Motor (async) |
| Auth | JWT (`python-jose`, `passlib`) |
| Rate Limiting | SlowAPI |
| Market Data | Binance REST + WebSocket |
| AI / LLM | Perplexity API |
| Technical Analysis | Custom `core/ta_engine.py` (RSI, EMA-200) |
| Price Monitoring | `domain/services/price_monitor.py` (background task) |
| Validation | Pydantic v2 |
| Testing | Pytest + `httpx` TestClient |

### Infrastructure

| Concern | Technology |
|---|---|
| Database | MongoDB Atlas (cloud-hosted, async Motor driver) |
| Market Data | Binance WebSocket Streams + REST API (Testnet) |
| AI Inference | Perplexity AI (sonar-pro model) |
| Config | Pydantic `BaseSettings` loaded from `.env` |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- A MongoDB Atlas cluster (free tier works)
- Binance API keys (Testnet recommended)
- Perplexity API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/KAIROS-Financial-Engine.git
cd KAIROS-Financial-Engine
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and populate all required keys (see section below)
```

**Required `.env` variables:**

```bash
# Binance
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
BINANCE_TESTNET=true

# Perplexity AI
PERPLEXITY_API_KEY=your_perplexity_key

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kairos

# JWT
JWT_SECRET_KEY=your_256_bit_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server
API_HOST=0.0.0.0
API_PORT=8000
```

```bash
# Start the backend (with hot-reload)
uvicorn api:app --reload --port 8000

# Or via the entry point script
python main.py
```

Interactive API docs available at **`http://localhost:8000/docs`**.

### 3. Frontend setup

```bash
cd web

# Install dependencies
npm install

# Configure environment
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# Start the Vite dev server
npm run dev
```

Frontend available at **`http://localhost:5173`**.

### 4. Production build

```bash
# Frontend
cd web && npm run build   # outputs to web/dist/

# Backend (multi-worker)
cd backend && uvicorn api:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Project Structure

```
KAIROS-Financial-Engine/
├── backend/
│   ├── api/                    # Presentation Layer
│   │   ├── routes/             # FastAPI route handlers
│   │   ├── schemas/            # Pydantic request/response DTOs
│   │   └── dependencies.py     # FastAPI Depends() helpers
│   ├── core/                   # Infrastructure Layer
│   │   ├── config.py           # Pydantic settings singleton
│   │   ├── database.py         # MongoDB Motor connection pool
│   │   ├── di_container.py     # Composition root
│   │   ├── security.py         # JWT encode/decode
│   │   ├── ta_engine.py        # Technical analysis singleton
│   │   ├── binance_ws.py       # WebSocket stream manager
│   │   └── exceptions.py       # Domain exception hierarchy
│   ├── domain/                 # Business Logic Layer
│   │   └── services/
│   │       ├── orchestrator.py     # Use-case coordinator
│   │       ├── trade_executor.py   # Trade lifecycle
│   │       ├── risk_manager.py     # Position sizing & drawdown
│   │       ├── portfolio_manager.py
│   │       └── price_monitor.py    # Background alert task
│   ├── services/               # Service Abstraction Layer
│   │   ├── abstractions/       # ABCs: IMarketDataProvider, etc.
│   │   ├── binance/            # Binance adapter
│   │   └── perplexity/         # Perplexity adapter
│   └── tests/
│       ├── unit/               # Pure domain logic tests (no I/O)
│       └── integration/        # Orchestrator + API endpoint tests
└── web/
    └── src/
        ├── lib/api.js           # Centralized HTTP client
        ├── context/             # AuthContext, ProModeContext
        ├── components/          # SidebarLayout, ProModeTransition, etc.
        └── pages/               # MarketPage, PortfolioPage, TerminalPage, etc.
```

---

## Testing & QA

### Strategy

KAIROS follows an **80 / 20 unit-to-integration test split**, consistent with the architecture's layer isolation guarantees.

| Layer | Test Type | Rationale |
|---|---|---|
| `domain/services/` | Unit — no mocks needed | Pure Python, zero I/O; functions are deterministic |
| `services/adapters/` | Unit — mock ABCs | Adapter logic tested against interface contracts |
| `api/routes/` | Integration — `httpx` TestClient | HTTP contract validation with full DI wiring |
| `Orchestrator` | Integration — mock adapters | End-to-end domain flow without live Binance calls |

### Running Tests

```bash
cd backend

# Full suite
pytest

# With coverage report
pytest --cov=domain --cov=services --cov-report=term-missing

# Unit tests only (fast, no network)
pytest tests/unit/

# Integration tests
pytest tests/integration/

# Specific module
pytest tests/unit/test_risk_manager.py -v
```

### QA Baseline — 20 Passing Test Cases

| # | Test Case | Layer | Type |
|---|---|---|---|
| 1–4 | `MarketAnalyzer` — RSI boundary, EMA period, bullish/bearish detection, edge-case empty prices | Domain | Unit |
| 5–7 | `SignalGenerator` — BUY/SELL/HOLD signal output for known inputs | Domain | Unit |
| 8–10 | `RiskManager` — max position size, drawdown gate, approved/rejected paths | Domain | Unit |
| 11–12 | `Portfolio` — total value calculation, drawdown percentage | Domain | Unit |
| 13–15 | `TradeExecutor` — parameter validation, mock executor delegation | Domain | Unit |
| 16–17 | `Orchestrator` — full pipeline with mocked adapters, HOLD propagation | Domain | Integration |
| 18–19 | `POST /trade/execute` — 200 FILLED, 401 Unauthorized | API | Integration |
| 20 | `GET /portfolio` — correct P&L structure returned | API | Integration |

---

## API Reference

All endpoints are documented interactively at `/docs` (Swagger UI) and `/redoc`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register a new user |
| `POST` | `/auth/login` | — | Obtain JWT access token |
| `POST` | `/auth/refresh` | Bearer | Refresh access token |
| `GET` | `/market/prices` | Bearer | Live multi-symbol prices |
| `GET` | `/market/candles/{symbol}` | Bearer | OHLCV candlestick data |
| `WS` | `/ws/prices` | Bearer | Real-time Binance price stream |
| `POST` | `/trade/execute` | Bearer | Execute a trade (Testnet) |
| `GET` | `/trades` | Bearer | Full trade history |
| `GET` | `/portfolio` | Bearer | Current holdings & P&L |
| `GET` | `/user/me` | Bearer | Authenticated user profile |

---

## Design Patterns Applied

| Pattern | Location | Purpose |
|---|---|---|
| **Layered Architecture** | Entire backend | Strict one-way dependency rule across 4 layers |
| **Dependency Injection** | `core/di_container.py` | Single composition root; no service constructed at call site |
| **Adapter** | `services/binance/`, `services/perplexity/` | Isolate external API volatility behind stable ABCs |
| **Facade** | `domain/services/orchestrator.py` | Single entry point for all trade use-cases |
| **Singleton** | `core/ta_engine.py`, `core/config.py` | One instance per process; initialized at lifespan startup |
| **Repository** | `core/database.py` | Centralizes all MongoDB collection access |
| **Strategy** | `SignalGenerator` | Pluggable signal evaluation strategies |
| **Observer** | `domain/services/price_monitor.py` | Background price alert monitoring |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Follow the architecture rules in [CLAUDE.md](CLAUDE.md) and [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)
4. Ensure all tests pass: `pytest`
5. Open a Pull Request with a clear description of the change and its architectural rationale

> **Architecture violations** (e.g., business logic in a route handler, direct Motor calls in a domain service) will block merge.

---

## License

Released under the [MIT License](LICENSE). © 2026 Moiz Ahmed.

---

<div align="center">

*Built with precision. Designed to ship.*

**KAIROS** — Know the market. Act with intelligence.

</div>
