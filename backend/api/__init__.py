"""
API Layer - FastAPI Application Factory
Creates and configures the FastAPI app.

Design Pattern: Factory Pattern
Reasoning: Centralized app configuration and initialization
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import config
from core.database import Database
from core.logging_config import setup_logging
from api.routes import router as analysis_router
from api.routes.trade import router as trade_router
from api.routes.debug import router as debug_router
from api.routes.auth import router as auth_router
from api.routes.user_progress import router as progress_router
from api.routes.market import router as market_router
from core.binance_ws import stream_manager

# Initialize logging
setup_logging(config.log_level, config.log_format)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — connects/disconnects MongoDB and Binance stream."""
    await Database.connect()
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
    
    # CORS middleware
    # allow_origins cannot be ["*"] when allow_credentials=True — browsers reject it.
    # Origins are configured via the ALLOWED_ORIGINS env var.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
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
    
    return app


# Create app instance
app = create_app()
