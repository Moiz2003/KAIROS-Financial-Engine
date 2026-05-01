# KAIROS Financial Engine — NFR Roadmap

**Date:** 2026-05-01
**Branch:** `main`
**Author:** Moiz Ahmed

---

## Part 1: Functional Requirements — 100% Complete

All **FR1–FR35** have been implemented and verified across the backend domain, API, and service layers. The following table summarises coverage by domain area.

| FR Range | Domain Area | Implementation |
|---|---|---|
| FR1–FR5 | User Authentication & IAM | JWT + bcrypt, Google OAuth, HTTP-only cookies, RBAC roles, timing-attack prevention |
| FR6–FR10 | Market Data Ingestion | Binance WebSocket stream manager, REST kline/ticker fetchers, BinanceAdapter |
| FR11–FR15 | Technical Analysis | TAEngine (RSI-14, EMA-200, trend detection), MarketAnalyzer domain entity, deque ring buffer |
| FR16–FR20 | AI Sentiment Analysis | AIEngine LLM wrapper, PerplexityAdapter, SHA-256 cache keying, 5-minute TTL |
| FR21–FR25 | Trade Signal Generation | TradeOrchestrator facade, SignalGenerator, RiskManager, Reality Check pipeline |
| FR26–FR30 | Trade Execution Safety | Triple SAFETY_BLOCK (module/init/method), Binance testnet-only execution, ExecutionResult model |
| FR31–FR35 | Portfolio & User Progress | PortfolioManager, TenantCollection multi-tenant isolation, MongoDB TTL index on news, user progress routes |

---

## Part 2: Non-Functional Requirements — Current Status (NFR1–NFR12)

### NFR1 — Performance: Response Time
**Status: SUPPORTED**

All FastAPI route handlers are `async`. Blocking I/O (Binance REST, DeepSeek HTTP) is offloaded to the thread pool via `asyncio.to_thread()`, keeping the event loop unblocked. Multiple external calls execute concurrently via `asyncio.gather()` in `domain/services/orchestrator.py:94-102` and `api/routes/trades.py:73-80`.

- **API response target:** < 2s for TA-only paths, < 5s for AI-augmented paths.
- **Current baseline:** Not formally benchmarked yet. Load testing is a next-session action.

### NFR2 — Performance: Real-Time Throughput
**Status: SUPPORTED**

The `core/ta_engine.py` maintains a `deque(maxlen=500)` ring buffer protected by an `asyncio.Lock`. Every Binance WebSocket kline event is appended via `on_kline()`, giving a rolling 500-candle window for RSI and EMA calculations with no unbounded memory growth. The `core/binance_ws.py` `BinanceStreamManager` maintains a single upstream WebSocket and fans out to all connected browser clients, preventing N upstream connections for N users.

- **Buffer size:** 500 price points (`_BUFFER_SIZE` constant, `core/ta_engine.py:30`)
- **WebSocket fan-out:** `_broadcast()`, `core/binance_ws.py:164-176`

### NFR3 — Availability: Connection Resilience
**Status: SUPPORTED**

The Binance WebSocket manager implements exponential backoff reconnection:
- Initial delay: 1.0 s → max 60.0 s, factor 2.0× (`core/binance_ws.py:31-33`)
- Ping/pong keepalive: 20 s interval, 10 s timeout
- Malformed JSON messages are silently skipped (`binance_ws.py:105-109`) — the stream never crashes on bad data.

Startup and shutdown are managed through a FastAPI lifespan handler (`api/__init__.py:32-52`), ensuring the database connection and WebSocket stream are always started before the first request and cleaned up on termination.

### NFR4 — Security: Authentication & Encryption
**Status: COMPLETE**

| Mechanism | Implementation | File |
|---|---|---|
| Password hashing | bcrypt (12 rounds via `passlib`) | `core/security.py:40-50` |
| JWT signing | HS256, 30-minute TTL | `core/security.py:57-98` |
| Cookie delivery | HTTP-only, SameSite=Strict, Secure flag in prod | `api/routes/auth.py:45-55` |
| Timing attack prevention | Dummy hash always runs bcrypt, even if user not found | `api/routes/auth.py:117-120` |
| Google OAuth | ID token verified against Google public keys (10 s clock skew) | `api/routes/auth.py:217-291` |
| RBAC enforcement | `require_role()` FastAPI dependency, raises HTTP 403 | `api/dependencies.py:61-100` |
| CORS | Non-wildcard `ALLOWED_ORIGINS` env var | `api/__init__.py:69-78` |

### NFR5 — Data Privacy: Multi-Tenant Isolation
**Status: COMPLETE**

`core/tenant_db.py` wraps every MongoDB collection with a `TenantCollection` that injects `{"user_id": current_user_id}` into every query, update, and delete. Cross-tenant data leakage is structurally impossible — there is no code path that allows bypassing this filter. Applied to positions, trades, user progress, and portfolio documents.

### NFR6 — Maintainability: Architecture Quality
**Status: COMPLETE**

The codebase follows Domain-Driven Design with strict layer separation:
- **Domain layer** (`domain/`) — zero external dependencies; pure business logic, testable without mocks
- **Service layer** (`services/`) — adapter implementations behind `IMarketDataProvider` / `IAIContextProvider` interfaces
- **API layer** (`api/`) — thin HTTP facade, delegates to orchestrator
- **Core layer** (`core/`) — infrastructure singletons (DB, security, config, logging, DI container)

The `ServiceContainer` in `core/di_container.py` centralises all service wiring and supports graceful degradation when API keys are absent.

### NFR7 — Security: Rate Limiting
**Status: NOT IMPLEMENTED — Priority for Next Session**

No per-IP or per-user request throttling is currently applied to any endpoint. The `/api/analyze`, `/api/trade`, and `/api/auth/login` routes are vulnerable to brute-force and abuse. See Part 3 for the implementation plan using `slowapi`.

### NFR8 — Observability: Logging & Monitoring
**Status: COMPLETE**

`core/logging_config.py` provides a singleton structured logger with two output modes:
- **JSON** (production): includes `timestamp`, `level`, `logger`, `message`, `module`, `function`, `line`, `exception` fields — compatible with ELK, Datadog, and cloud log aggregators.
- **Text** (development): human-readable with the same fields.

Log level is configurable via `LOG_LEVEL` env var. All domain services, adapters, and the WebSocket manager emit structured logs at appropriate levels (DEBUG for data flow, INFO for lifecycle events, WARNING for degraded paths, ERROR with `exc_info=True` for failures).

### NFR9 — Reliability: Graceful Degradation on External API Failure
**Status: PARTIALLY IMPLEMENTED — Needs Strengthening in Next Session**

**What exists:**
- If Perplexity/Reality Check fails, `orchestrator.py:221-226` catches the exception and returns the raw TA signal — the endpoint never errors.
- If Binance API keys are absent, `di_container.py:83-106` logs a warning and skips orchestrator init.
- Adapter exceptions are wrapped as domain exceptions (`MarketDataException`, `AIContextException`) — no raw HTTP or library exceptions leak to routes.

**What is missing:**
- No structured fallback for DeepSeek (`services/sentiment_engine.py`) — if DeepSeek returns an error, no alternative sentiment source is attempted.
- No circuit-breaker or retry logic on Binance REST calls (only the WebSocket has reconnection).
- No user-facing degraded-mode indicator (e.g., a response field `"data_source": "ta_only"` when AI is unavailable).

See Part 3 for the implementation plan.

### NFR10 — Data Durability: Backup & Recovery
**Status: NOT IMPLEMENTED — Priority for Next Session**

MongoDB data (users, trades, positions, portfolio) has no automated backup strategy. A single database failure would result in permanent data loss. See Part 3 for the strategy.

### NFR11 — Scalability: Horizontal Scaling Readiness
**Status: PARTIAL**

**Supports scaling:**
- Uvicorn with 4 workers in production (`main.py:22-26`)
- Stateless JWT authentication — no server-side session state
- Async Motor MongoDB client — shared connection pool, non-blocking
- Adapter interfaces — Binance/Perplexity implementations can be swapped without domain changes

**Limitations for horizontal scaling:**
- `BinanceStreamManager` is an in-process singleton — multiple server instances would open multiple upstream WebSocket connections to Binance (redundant and wasteful). A shared pub/sub layer (Redis, NATS) would be needed for multi-instance deployments.
- `AIEngine` in-memory cache is per-process — cache misses would be duplicated across workers. A shared cache layer (Redis) would unify this.
- These are acceptable limitations for the current single-host deployment target.

### NFR12 — Compliance & Safety: Real-Money Trade Safeguard
**Status: COMPLETE**

Real-money Binance execution is blocked by three independent safety checks in `domain/services/trade_executor.py`:
1. **Module-level guard** (lines 19-27): raises `RuntimeError` at import time if `BINANCE_MAINNET=true`
2. **`__init__`-level guard** (lines 49-51): belt-and-suspenders check on instantiation
3. **`execute_trade()`-level guard** (lines 93-95): runtime check before any order is placed

All orders use `new_order_test` (Binance test endpoint) by default. The `_send_real_order` function is dead code unless all three gates are explicitly bypassed. The `BINANCE_TESTNET=true` env var is the default.

---

## Part 3: Missing NFRs — Implementation Plan for Next Session

### NFR7 — Rate Limiting via `slowapi`

**Problem:** The login, analysis, and trade endpoints have no throttling. A bad actor can enumerate users via login brute-force or drain Binance/DeepSeek API quotas by hammering the analysis endpoint.

**Library:** [`slowapi`](https://github.com/laurentS/slowapi) — a FastAPI-native rate limiter built on `limits`, using `starlette` middleware. Zero changes to existing route signatures.

**Implementation Steps:**

1. Add to `requirements.txt`:
   ```
   slowapi==0.1.9
   limits==3.13.0
   ```

2. Create `core/rate_limiter.py`:
   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address

   limiter = Limiter(key_func=get_remote_address)
   ```

3. Register in `api/__init__.py` (in the `create_app()` factory):
   ```python
   from slowapi import _rate_limit_exceeded_handler
   from slowapi.errors import RateLimitExceeded
   from slowapi.middleware import SlowAPIMiddleware
   from core.rate_limiter import limiter

   app.state.limiter = limiter
   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
   app.add_middleware(SlowAPIMiddleware)
   ```

4. Apply limits to sensitive routes:
   ```python
   # api/routes/auth.py — brute-force protection
   @router.post("/login")
   @limiter.limit("10/minute")
   async def login(request: Request, ...): ...

   @router.post("/register")
   @limiter.limit("5/minute")
   async def register(request: Request, ...): ...

   # api/routes/__init__.py — API quota protection
   @router.post("/analyze")
   @limiter.limit("30/minute")
   async def analyze(request: Request, ...): ...
   ```

**Recommended Limits:**

| Endpoint | Limit | Rationale |
|---|---|---|
| `POST /auth/login` | 10/minute per IP | Brute-force protection |
| `POST /auth/register` | 5/minute per IP | Prevents account farming |
| `POST /analyze` | 30/minute per IP | Binance + DeepSeek quota protection |
| `POST /trade` | 20/minute per user | Prevents runaway trade loops |
| `GET /market/*` | 60/minute per IP | WebSocket preferred; REST is fallback |

**Note:** For authenticated endpoints, switch `key_func` to `get_remote_address` based on the decoded JWT `sub` claim so limits are per-user rather than per-IP (important behind a shared NAT or reverse proxy).

---

### NFR9 — Graceful Fallbacks for DeepSeek and Binance

**Problem:** DeepSeek (`services/sentiment_engine.py`) has no fallback — any HTTP error propagates uncaught. Binance REST calls have no retry logic.

**Implementation Steps:**

**Step A: Wrap DeepSeek with a try/except fallback in `AIEngine`**

In `core/ai_engine.py`, change the `_fetch_sentiment` call:
```python
try:
    result = await asyncio.to_thread(self._service.analyze_headlines, articles)
except Exception as exc:
    logger.warning("DeepSeek unavailable (%s) — returning neutral sentiment", exc)
    result = SentimentResult(
        sentiment="neutral",
        confidence=0.0,
        summary="Sentiment analysis unavailable — using neutral fallback.",
        source="fallback",
    )
```

**Step B: Add a `"data_source"` field to `AnalysisResult`**

Add `data_source: str` to the domain model and populate it:
- `"ta_and_ai"` — both TA and sentiment succeeded
- `"ta_only"` — AI/sentiment was unavailable, pure TA signal returned
- `"cached"` — result came from AIEngine cache

This gives the frontend a signal to display a degraded-mode banner.

**Step C: Add retry logic for Binance REST calls**

In `services/binance/__init__.py`, wrap `get_klines()` and `get_current_price()` with a simple retry loop (max 3 attempts, 0.5 s backoff):
```python
for attempt in range(3):
    try:
        return self._client.klines(symbol=symbol, interval=interval, limit=limit)
    except Exception as exc:
        if attempt == 2:
            raise MarketDataException(f"Binance REST failed after 3 attempts: {exc}") from exc
        await asyncio.sleep(0.5 * (attempt + 1))
```

**Step D: Degrade gracefully when Binance is fully unavailable**

In `domain/services/orchestrator.py`, if the `MarketDataException` reaches the orchestrator's top-level handler, return a structured error response with `data_source: "unavailable"` rather than raising HTTP 500.

---

### NFR10 — MongoDB Automated Backup Strategy

**Problem:** No backup strategy exists. A disk failure or accidental `db.dropDatabase()` would result in permanent loss of all user data, trade history, and positions.

**Recommended Approaches (choose based on deployment target):**

#### Option A: MongoDB Atlas (Recommended for Production)
If the database is migrated to MongoDB Atlas (managed cloud):
- **Continuous backups** built-in (point-in-time recovery, 15-minute granularity)
- **Snapshots** auto-scheduled (daily by default, configurable)
- **Zero infrastructure management**
- Change only `MONGO_URI` in `.env` — no code changes required

#### Option B: `mongodump` Cron Script (Self-Hosted)
For a self-hosted MongoDB instance, add a shell script to be run by cron:
```bash
#!/usr/bin/env bash
# scripts/backup_mongo.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/kairos/$TIMESTAMP"
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR" --gzip
# Retain last 7 daily backups
find /backups/kairos -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

Schedule via crontab (daily at 2:00 AM):
```
0 2 * * * /opt/kairos/scripts/backup_mongo.sh >> /var/log/kairos-backup.log 2>&1
```

#### Option C: Python-Level Export (Lightweight, No `mongodump` Required)
Add a `POST /admin/backup` endpoint (admin role only) that serialises all critical collections to a timestamped JSON file in a configured backup path. This is portable but slower for large datasets.

**Minimum Required Collections to Back Up:**
- `users` — account credentials, roles
- `trades` — all executed trade records
- `positions` — current open positions per user
- `user_progress` — learning/quiz progress
- `portfolio` — portfolio snapshots

**Recovery Target (to define in next session):**
- RPO (Recovery Point Objective): 24 hours (daily backup)
- RTO (Recovery Time Objective): < 1 hour (restore from dump)

---

## Summary Table

| NFR | Description | Status | Next Action |
|---|---|---|---|
| NFR1 | Performance: Response Time | Supported (asyncio, gather) | Load-test; set formal SLA |
| NFR2 | Performance: Real-Time Throughput | **Complete** (deque buffer, WS fan-out) | — |
| NFR3 | Availability: Connection Resilience | Supported (exponential backoff, lifespan) | — |
| NFR4 | Security: Auth & Encryption | **Complete** (bcrypt, JWT, RBAC, OAuth) | — |
| NFR5 | Data Privacy: Multi-Tenant Isolation | **Complete** (TenantCollection) | — |
| NFR6 | Maintainability: Architecture Quality | **Complete** (DDD, DI, Adapter pattern) | — |
| NFR7 | Security: Rate Limiting | **Missing** | Implement `slowapi` middleware |
| NFR8 | Observability: Logging | **Complete** (structured JSON, LOG_LEVEL) | — |
| NFR9 | Reliability: Graceful Degradation | **Partial** (Perplexity fallback exists; DeepSeek/Binance missing) | Add DeepSeek fallback + Binance retry |
| NFR10 | Data Durability: Backup & Recovery | **Missing** | Choose Atlas or `mongodump` cron |
| NFR11 | Scalability: Horizontal Scaling Readiness | Partial (stateless JWT, async DB; WS manager is in-process) | Acceptable for current deployment |
| NFR12 | Compliance: Real-Money Trade Safeguard | **Complete** (triple SAFETY_BLOCK) | — |

---

**Next Session Priority Order:**
1. **NFR7** — `slowapi` rate limiting (highest risk surface, 2–3 hours)
2. **NFR9** — DeepSeek fallback + Binance REST retry (reliability, 1–2 hours)
3. **NFR10** — MongoDB backup strategy (data safety, 1 hour for script; Atlas migration is longer)
