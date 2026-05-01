"""
API Layer - FastAPI Application Factory
Creates and configures the FastAPI app.

Design Pattern: Factory Pattern
Reasoning: Centralized app configuration and initialization
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from core.config import config
from core.database import Database
from core.logging_config import setup_logging
from core.rate_limiter import limiter
from api.routes import router as analysis_router
from api.routes.trade import router as trade_router
from api.routes.debug import router as debug_router
from api.routes.auth import router as auth_router
from api.routes.user_progress import router as progress_router
from api.routes.market import router as market_router
from api.routes.trades import router as trades_router
from api.routes.portfolio import router as portfolio_router
from api.routes.admin import router as admin_router
from core.binance_ws import stream_manager
from core.ta_engine import ta_engine  # noqa: F401 — ensures singleton init at startup
from core.ai_engine import ai_engine  # noqa: F401 — ensures singleton init at startup

# Initialize logging
setup_logging(config.log_level, config.log_format)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — connects/disconnects MongoDB and Binance stream."""
    await Database.connect()

    # FR21: Ensure news collection TTL index (24-hour auto-expiry on `timestamp`).
    try:
        await Database.get_collection("news").create_index(
            [("timestamp", 1)],
            expireAfterSeconds=86400,
            name="news_ttl_24h",
            background=True,
        )
    except Exception as _idx_err:
        # Non-fatal — index may already exist with the same spec.
        pass

    stream_manager.start()
    yield
    await stream_manager.stop()
    await Database.close()


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application.
    
    Returns:
        Configured FastAPI app
    """
    app = FastAPI(
        title="KAIROS - Human-in-the-Loop Financial Decision Engine",
        description="FastAPI backend for KAIROS trading system",
        version="0.1.0",
        lifespan=lifespan,
    )

    # NFR7: Rate limiting state and error handler
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # CORS middleware
    # allow_origins cannot be ["*"] when allow_credentials=True — browsers reject it.
    # Origins are configured via the ALLOWED_ORIGINS env var.
    cors_origins = list(dict.fromkeys([
        *config.allowed_origins,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(analysis_router)
    app.include_router(trade_router)
    app.include_router(debug_router)
    app.include_router(auth_router)
    app.include_router(progress_router)
    app.include_router(market_router)
    app.include_router(trades_router)
    app.include_router(portfolio_router)
    app.include_router(admin_router)
    
    return app


# Create app instance
app = create_app()
