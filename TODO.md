# KAIROS Night-Shift Roadmap
**Session paused at ~90 % context.  Pick up here immediately on resume.**

---

## 1. Current Architecture Snapshot

### 1.1 Backend — FastAPI (`backend/`)

```
HTTP / WS clients
        │
┌───────▼──────────────────────────────────────────┐
│  API Layer  (api/)                               │
│  Routes: auth, debug/pipeline, market, trade,    │
│           user_progress                          │
│  Factory:  api/__init__.py  (create_app)         │
└───────┬──────────────────────────────────────────┘
        │ calls only Orchestrator / services
┌───────▼──────────────────────────────────────────┐
│  Domain Layer  (domain/)                         │
│  TradeOrchestrator (Facade)                      │
│  SignalGenerator · MarketAnalyzer · RiskManager  │
│  SignalValidator  (FR22-24 Reality Check)        │
└───────┬──────────────────────────────────────────┘
        │ injected via DI container
┌───────▼──────────────────────────────────────────┐
│  Service / Adapter Layer                         │
│  BinanceAdapter   → Binance REST + Testnet       │
│  PerplexityAdapter / AISentimentService → DeepSeek│
│  CryptoPanicAdapter → news headlines             │
│  BinanceStreamManager (core/binance_ws.py)       │
│    └─ single upstream WS → fans out to browsers  │
└───────┬──────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────┐
│  Infrastructure Layer  (core/)                   │
│  config.py · di_container.py · database.py       │
│  security.py · tenant_db.py · binance_ws.py      │
│  logging_config.py                               │
└──────────────────────────────────────────────────┘
```

**Background tasks wired into FastAPI lifespan:**
- `BinanceStreamManager.start()` — opens `btcusdt@bookTicker/btcusdt@kline_1m` upstream WS on startup, fans out to all browser WS clients at `/api/market/stream`.
- `Database.connect()` — Motor (async MongoDB driver) connection pool.

### 1.2 IAM / Auth
| Piece | File | Status |
|---|---|---|
| Pydantic v2 schemas | `api/schemas/auth.py` | ✅ |
| HTTP-only cookie JWT | `api/routes/auth.py` | ✅ |
| RBAC dependency factory | `api/dependencies.py` | ✅ |
| Tenant isolation wrapper | `core/tenant_db.py` | ✅ |
| MongoDB user store | `core/database.py` | ✅ |
| Google OAuth | `api/routes/auth.py` | ✅ |

Cookie name: `kairos_access_token` | Algorithm: HS256 | Expiry: configurable via `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`.

### 1.3 Frontend — Vite + React 19 (`web/`)
| Piece | File | Status |
|---|---|---|
| AuthContext + session restore | `context/AuthContext.jsx` | ✅ |
| Central fetch wrapper (credentials: include) | `lib/api.js` | ✅ |
| ProtectedRoute with loading spinner | `components/ProtectedRoute.jsx` | ✅ |
| Login page (cookie-based, no localStorage) | `pages/Login.jsx` | ✅ |
| LiveTicker (WS relay + Framer Motion) | `components/LiveTicker.jsx` | ✅ |
| Dashboard Bento Grid (Framer Motion stagger) | `App.jsx` DashboardPage | ✅ |
| Home landing page | `App.jsx` HomePage | ✅ |

### 1.4 Infrastructure
| Piece | File | Status |
|---|---|---|
| docker-compose.yml | repo root | ✅ |
| backend/Dockerfile | backend/ | ✅ |
| web/Dockerfile | web/ | ✅ |

---

## 2. Pending Functional Requirements: FR11–FR35

> FRs 1–10 are considered complete (core auth, WS relay, Docker).
> The list below represents the remaining feature surface required for
> a production-ready "Proving Grounds" milestone.

### Group A — TA Engine on Live Stream (FR11–FR14)

| ID | Requirement | Dependencies |
|---|---|---|
| FR11 | `TAEngine` subscribes to the live `BinanceStreamManager` event bus and maintains a rolling buffer of closed-candle closing prices (max 500, configurable). | `core/binance_ws.py` |
| FR12 | `TAEngine` computes RSI(14) whenever a kline `closed == True` event fires. Must use the same pure-Python algorithm already in `domain/entities/MarketAnalyzer`. | FR11, `MarketAnalyzer` |
| FR13 | `TAEngine` computes EMA(200) on the same closed-candle trigger. Emits an `AnalysisResult` value object. | FR11, FR12 |
| FR14 | `GET /api/market/analysis` REST endpoint returns the latest cached `AnalysisResult` (price, RSI, EMA200, trend, timestamp) without doing any blocking I/O. | FR13 |

### Group B — Streaming Signal Push (FR15–FR16)

| ID | Requirement | Dependencies |
|---|---|---|
| FR15 | `SignalGenerator.generate_signal()` is called automatically after every `AnalysisResult` update. The result is cached in `TAEngine._latest_signal`. | FR13 |
| FR16 | The `/api/market/stream` WebSocket payload is extended to include a `type: "signal"` message whenever a new signal is generated (piggybacks existing fan-out). | FR15, `BinanceStreamManager` |

### Group C — Sentiment Engine Async (FR17–FR21)

| ID | Requirement | Dependencies |
|---|---|---|
| FR17 | `AISentimentService` is refactored to be non-blocking: the synchronous DeepSeek HTTP call is offloaded via `asyncio.to_thread()` (Python 3.9+). | `services/sentiment_engine.py` |
| FR18 | Sentiment results are cached for 5 minutes by a SHA-256 hash of the concatenated article titles. No re-fetch during the TTL window. | FR17 |
| FR19 | `GET /api/debug/sentiment/{symbol}` becomes an async endpoint that awaits the non-blocking sentiment call. | FR17, FR18 |
| FR20 | Raw news articles for each symbol are persisted to MongoDB (`news` collection) via `TenantCollection` so the dashboard can page through history. | `core/tenant_db.py`, `core/database.py` |
| FR21 | Stale articles (older than 24 h) are purged on insert via a TTL index on the `timestamp` field (`db.news.createIndex({ timestamp: 1 }, { expireAfterSeconds: 86400 })`). | FR20 |

### Group D — Reality Check Pipeline (FR22–FR25) [Partially done]

| ID | Requirement | Status |
|---|---|---|
| FR22 | `SignalValidator.reality_check()` cross-references TA action with AI sentiment. | ✅ implemented in `domain/services/signal_validator.py` |
| FR23 | TA BUY + AI Bullish → `HIGH_CONFIDENCE` (confidence boosted to ≥ 0.90). | ✅ |
| FR24 | TA BUY + AI Bearish → `CONTRADICTION` → forced HOLD. | ✅ |
| FR25 | `ValidationResult` is returned from `/api/debug/pipeline` (Panel C). | ✅ wired in `api/routes/debug.py` |

### Group E — Trade Execution & Persistence (FR26–FR30)

| ID | Requirement | Dependencies |
|---|---|---|
| FR26 | `TradeExecutor.execute_trade()` is integrated with `RiskManager.assess()`. A trade is only sent to Binance if `RiskAssessment.approved == True`. | `domain/services/orchestrator.py`, `domain/services/trade_executor.py` |
| FR27 | Every `ExecutionResult` (success or failure) is persisted to MongoDB via `TenantCollection('trades', user_id)`. Fields: symbol, action, quantity, fill_price, order_id, timestamp, approved_for_execution, risk_score. | `core/tenant_db.py` |
| FR28 | Open positions are tracked in `TenantCollection('positions', user_id)`. A BUY inserts a position document; a SELL closes it and records P&L. | FR27 |
| FR29 | `GET /api/trades/history` returns the last N trades for the authenticated user. Requires `get_current_user` dependency. | FR27, `api/dependencies.py` |
| FR30 | `GET /api/portfolio` returns open positions + total unrealised P&L (calculated from current BTC price fetched via `BinanceAdapter.get_current_price()`). | FR28 |

### Group F — Triggered Execution Endpoint (FR31–FR32)

| ID | Requirement | Dependencies |
|---|---|---|
| FR31 | `POST /api/trades/execute` accepts `{ symbol, action }` (same shape as current `/api/trade`), runs the full pipeline (TA → Reality Check → Risk → Execution), and persists the result. Requires authentication. | FR26, FR27, `api/dependencies.py` |
| FR32 | Endpoint returns a unified response: `{ approved_for_execution, ta_signal, ai_signal, reality_check, execution_result }`. | FR31 |

### Group G — User Progress & Metrics (FR33–FR35)

| ID | Requirement | Dependencies |
|---|---|---|
| FR33 | `GET /api/progress` returns per-user stats: total trades, win rate, best/worst trade, total P&L. Computed live from `TenantCollection('trades')`. | FR27 |
| FR34 | Trade stats are also exposed per-symbol (`?symbol=BTCUSDT`) for portfolio attribution analysis. | FR33 |
| FR35 | Dashboard frontend renders a "Portfolio" card below the Bento Grid showing live stats fetched from `GET /api/progress` on mount and every 60 s via `useInterval`. | FR33, `App.jsx` DashboardPage |

---

## 3. `core/ta_engine.py` — Proposed Logic

**Role:** Stateful singleton that sits between `BinanceStreamManager` (WS events in)
and `SignalGenerator` (signals out). All math is pure Python — no blocking I/O.

### 3.1 Architecture

```
BinanceStreamManager
   └─ on kline_closed event
        └─ TAEngine.on_kline(kline_msg)
               ├─ append close price to _buffer (deque[float], maxlen=500)
               ├─ if len(_buffer) >= 14: compute RSI(14)
               ├─ if len(_buffer) >= 200: compute EMA(200)
               ├─ detect_trend(current_price, ema_200)
               ├─ build AnalysisResult → store in _latest_analysis
               ├─ call SignalGenerator.generate_signal(_latest_analysis)
               └─ store TradeSignal in _latest_signal
```

### 3.2 Class Skeleton (no implementation — roadmap only)

```python
# core/ta_engine.py

class TAEngine:
    _instance: ClassVar["TAEngine | None"] = None

    def __init__(self, buffer_size: int = 500):
        self._buffer: deque[float]     # rolling close prices
        self._latest_analysis: AnalysisResult | None
        self._latest_signal: TradeSignal | None
        self._lock: asyncio.Lock       # guard concurrent reads/writes
        self._analyzer: MarketAnalyzer
        self._signal_generator: SignalGenerator

    async def on_kline(self, msg: dict) -> None:
        """Called by BinanceStreamManager for every kline event.
        Only triggers recalculation when msg["closed"] is True.
        Pure Python math — never awaits any I/O."""
        ...

    def get_latest_analysis(self) -> AnalysisResult | None:
        """Synchronous read — safe to call from any thread."""
        ...

    def get_latest_signal(self) -> TradeSignal | None:
        """Synchronous read — safe to call from any thread."""
        ...

    @classmethod
    def instance(cls) -> "TAEngine":
        """Singleton accessor."""
        ...


# Module-level singleton
ta_engine = TAEngine()
```

### 3.3 Integration Points

1. **`core/binance_ws.py`** — Inside `_listen_forever`, after normalising a `kline` message,
   add: `asyncio.create_task(ta_engine.on_kline(normalised_msg))`.
   This keeps the fan-out loop non-blocking.

2. **`api/routes/market.py`** — Add `GET /api/market/analysis` that returns
   `ta_engine.get_latest_analysis()` serialised to JSON. No DB query needed.

3. **`api/__init__.py`** — Import `ta_engine` singleton after `stream_manager`
   so the module is initialised once at startup.

### 3.4 RSI Algorithm (pure Python, already exists in `domain/entities`)

```
Reuse: MarketAnalyzer.calculate_rsi(prices, period=14)
Reuse: MarketAnalyzer.calculate_ema(prices, period=200)
Reuse: MarketAnalyzer.detect_trend(price, ema, threshold=0.01)
```
Do NOT copy the math — instantiate `MarketAnalyzer()` inside `TAEngine.__init__`
and delegate all calculation to it.

### 3.5 Signal Fan-Out Extension (FR16)

After computing a new `TradeSignal`, call:
```python
await stream_manager.broadcast_signal(signal_dict)
```
Add `broadcast_signal(payload)` to `BinanceStreamManager` — it formats the dict as
`{ "type": "signal", "action": ..., "confidence": ..., "ts": ... }` and calls
`_broadcast(json.dumps(payload))`.

The existing `LiveTicker.jsx` already handles unknown `msg.type` gracefully
(falls through the `if/elif`), so the frontend can add an `else if (msg.type === "signal")`
branch without breaking the ticker.

---

## 4. `core/ai_engine.py` — Proposed Logic (Non-Blocking Sentiment)

**Problem:** The current `AISentimentService` makes a synchronous HTTP call to the
DeepSeek API (via the `openai` SDK). This blocks the entire asyncio event loop for
10–30 seconds, preventing any other request from being served during that time.

**Goal:** Wrap the synchronous call in a thread so FastAPI's event loop stays free.

### 4.1 Strategy: `asyncio.to_thread()` + In-Process LRU Cache

```
Incoming request
    │
    ▼
async def analyze_headlines_async(headlines) -> SentimentResult
    │
    ├─ hash = sha256("|".join(a.title for a in headlines))
    ├─ if hash in _cache and not expired: return _cache[hash]
    │
    └─ result = await asyncio.to_thread(_blocking_llm_call, headlines)
           └─ _blocking_llm_call runs in a ThreadPoolExecutor worker
                  └─ DeepSeek HTTP call (sync openai SDK) — up to 30s
    │
    ├─ _cache[hash] = (result, datetime.utcnow())
    └─ return result
```

### 4.2 Class Skeleton

```python
# core/ai_engine.py

_CACHE_TTL_SECONDS = 300   # 5 minutes

class AIEngine:
    """
    Async wrapper around AISentimentService.
    Offloads blocking LLM calls to a thread pool.
    Caches results by headline-set hash to avoid redundant API calls.
    """

    def __init__(self):
        self._service: AISentimentService   # existing sync service
        self._cache: dict[str, tuple[SentimentResult, datetime]]

    def _compute_hash(self, headlines: list[NewsArticle]) -> str:
        """SHA-256 of pipe-joined titles."""
        ...

    def _is_fresh(self, ts: datetime) -> bool:
        """Return True if cached result is within TTL."""
        ...

    async def analyze(self, headlines: list[NewsArticle]) -> SentimentResult:
        """
        Public async entry point.
        1. Check cache — return if fresh.
        2. Offload sync LLM call to thread pool via asyncio.to_thread().
        3. Store result in cache.
        4. Return result.
        """
        ...


# Module-level singleton
ai_engine = AIEngine()
```

### 4.3 Integration Points

1. **`api/routes/debug.py`** — Replace direct `AISentimentService()` instantiation
   with `await ai_engine.analyze(headlines)`. Route handlers are already `async`.

2. **`domain/services/orchestrator.py`** — The `_apply_ai_reality_check` method
   is currently synchronous. Either:
   - (Preferred) Make `TradeOrchestrator.get_trade_recommendation` fully async and
     `await ai_engine.analyze(...)` inside it; OR
   - Keep it sync but call `asyncio.run_coroutine_threadsafe` from a background task.
   
   Since the orchestrator is only called from async FastAPI route handlers,
   converting it to `async def` is the clean path.

3. **`services/sentiment_engine.py`** — Keep `AISentimentService` unchanged (sync).
   `AIEngine` wraps it; no risk of breaking existing unit tests.

### 4.4 Rate-Limit Safety

- DeepSeek free tier: ~10 requests/minute.
- The 5-minute cache prevents >1 LLM call per symbol per refresh cycle.
- If the thread pool is saturated (e.g., 5 simultaneous refresh hits), use
  `asyncio.Lock` per hash key to collapse concurrent identical requests into one.

---

## 5. Missing REST Endpoints for FR29–FR35

All endpoints live under `backend/api/routes/` and require the `get_current_user`
dependency from `api/dependencies.py`. All DB access goes through `TenantCollection`.

### 5.1 `api/routes/portfolio.py` (new file)

| Method | Path | FR | Description |
|---|---|---|---|
| `GET` | `/api/portfolio` | FR30 | Open positions + unrealised P&L. Fetches from `TenantCollection('positions', user_id)`, prices from `BinanceAdapter`. |
| `GET` | `/api/portfolio/summary` | FR33 | Aggregate stats: total trades, win rate, total realised P&L. Queries `TenantCollection('trades', user_id)`. |

### 5.2 `api/routes/trades.py` (new file — extends existing `/api/trade`)

| Method | Path | FR | Description |
|---|---|---|---|
| `GET` | `/api/trades/history` | FR29 | Last N trades (default 20, max 100). Query param `?symbol=BTCUSDT` for filtering. |
| `POST` | `/api/trades/execute` | FR31 | Full pipeline: TA → AI reality check → risk → Binance testnet execution → persist. Returns unified response (FR32). |

### 5.3 `api/routes/user_progress.py` (already exists — extend it)

| Method | Path | FR | Description |
|---|---|---|---|
| `GET` | `/api/progress` | FR33 | Per-user aggregate stats. Currently a stub — wire to `TenantCollection('trades')`. |
| `GET` | `/api/progress/symbol` | FR34 | Same stats filtered by `?symbol=BTCUSDT`. |

### 5.4 `api/routes/market.py` (extend existing file)

| Method | Path | FR | Description |
|---|---|---|---|
| `GET` | `/api/market/analysis` | FR14 | Latest `AnalysisResult` from `ta_engine.get_latest_analysis()`. No DB hit. |
| `WS` | `/api/market/stream` | FR16 | Already exists. Extend to fan-out `type: "signal"` messages (no new route — just add `broadcast_signal()` to `BinanceStreamManager`). |

### 5.5 Wire-up checklist for `api/__init__.py`

```python
# Add these imports to api/__init__.py create_app():
from api.routes.portfolio import router as portfolio_router
from api.routes.trades    import router as trades_router

app.include_router(portfolio_router)
app.include_router(trades_router)
```

---

## 6. Recommended Implementation Order (Night Shift)

```
1. core/ta_engine.py              ← FR11-FR13 (no I/O, easy to unit test)
2. binance_ws.py extension        ← FR16 (broadcast_signal hook)
3. api/routes/market.py           ← FR14 GET /api/market/analysis
4. core/ai_engine.py              ← FR17-FR18 (async wrapper + cache)
5. debug.py refactor              ← FR19 (await ai_engine.analyze)
6. MongoDB persistence            ← FR20-FR21 (news TTL index)
7. trade persistence              ← FR27-FR28 (TenantCollection 'trades'/'positions')
8. api/routes/portfolio.py        ← FR29-FR30
9. api/routes/trades.py           ← FR31-FR32
10. user_progress.py extension    ← FR33-FR34
11. Dashboard PortfolioCard        ← FR35 (frontend, App.jsx)
```

---

## 7. Key Constraints to Remember

- **No numpy / pandas** — Python 3.14 pre-release lacks compiled wheels.
  All math must use pure Python lists/loops. `MarketAnalyzer` is already compliant.
- **No blocking in asyncio** — any sync I/O (Binance REST, DeepSeek HTTP) must
  run in `asyncio.to_thread()` or a `ThreadPoolExecutor`.
- **CORS** — `allow_origins` must not be `["*"]` when `allow_credentials=True`.
  Configured via `ALLOWED_ORIGINS` env var in `core/config.py`.
- **Tenant isolation** — every MongoDB read/write must go through
  `TenantCollection(collection_name, user_id)`. Never pass a raw collection.
- **Cookie auth** — all new protected routes must use `get_current_user`
  from `api/dependencies.py`, not re-implement JWT parsing.
- **WebSocket fan-out** — `BinanceStreamManager` owns the client set.
  Never hold a WebSocket reference outside of it.

---

*File generated automatically as a session handoff artifact.*
*Last completed work: Framer Motion / Bento Grid redesign of DashboardPage + LiveTicker.*
