"""
API Layer - FastAPI Application Factory
Creates and configures the FastAPI app.

Design Pattern: Factory Pattern
Reasoning: Centralized app configuration and initialization
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import config
from core.logging_config import setup_logging
from api.routes import router as analysis_router
from api.routes.trade import router as trade_router

# Initialize logging
setup_logging(config.log_level, config.log_format)


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
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(analysis_router)
    app.include_router(trade_router)
    
    return app


# Create app instance
app = create_app()
