"""
API Layer - Route Handlers
FastAPI endpoints for market analysis and trading.

Design Pattern: Controller / Facade consumer
Reasoning: Thin layer that converts HTTP requests to domain operations via Orchestrator
Principle: NEVER call adapters directly - always go through Orchestrator
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from core.exceptions import KairosException
from core.logging_config import get_logger
from core.di_container import get_container
from api.models import AnalysisRequest, SignalResponse

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/analyze/{symbol}", response_model=SignalResponse)
async def analyze_market(symbol: str, interval: str = "4h", limit: int = 200):
    """
    CRITICAL: Get trade recommendation for a symbol.
    
    Facade Pattern: This endpoint ONLY calls the Orchestrator.
    Never calls adapters directly.
    
    Orchestrator handles:
    1. Fetching candles from Binance
    2. Calculating technical indicators
    3. Generating technical signal
    4. Performing AI reality check
    5. Returning synthesized recommendation
    
    Args:
        symbol: Trading pair (e.g., "BTCUSDT")
        interval: Candle interval (default "4h")
        limit: Number of candles (default 200)
    
    Returns:
        SignalResponse: Trade recommendation with reasoning
    
    Raises:
        HTTPException: If analysis fails
    """
    try:
        logger.info(f"API Request: /analyze/{symbol}")
        
        # Get container and orchestrator
        container = get_container()
        orchestrator = container.get_orchestrator()
        
        # Call orchestrator (single source of truth)
        signal = orchestrator.get_trade_recommendation(
            symbol=symbol,
            interval=interval,
            limit=limit,
        )
        
        # Convert to response model
        response = SignalResponse(
            action=signal.action.value,
            confidence=signal.confidence,
            reasoning=signal.reasoning,
            technical_score=signal.technical_score,
            sentiment_score=signal.sentiment_score,
            timestamp=signal.timestamp,
        )
        
        logger.info(f"✓ Analysis complete: {signal.action.value} (confidence: {signal.confidence:.2f})")
        return response
    
    except KairosException as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={"error_code": e.error_code, "message": e.message},
        )
    except ValueError as e:
        logger.error(f"Invalid input: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
