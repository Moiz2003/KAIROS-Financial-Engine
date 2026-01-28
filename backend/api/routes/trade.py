"""
Trade Execution API Routes
Endpoints for executing and managing trades.

Design Pattern: Facade + Dependency Injection
Purpose: Expose trade execution through HTTP API
Constraint: API routes ONLY call TradeExecutor (via DI Container)
Never directly access adapters or domain logic
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel, Field

from core.di_container import get_container
from core.exceptions import TradeExecutionException, KairosException
from core.logging_config import get_logger
from domain.models import TradeAction
from api.models import ExecutionResponse

logger = get_logger(__name__)

# Create router for trade endpoints
router = APIRouter(prefix="/api", tags=["trade"])


# Request Models

class TradeExecutionRequest(BaseModel):
    """Request to execute a trade."""
    symbol: str = Field(..., description="Trading pair, e.g., BTCUSDT")
    action: str = Field(..., description="BUY or SELL")
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTCUSDT",
                "action": "BUY"
            }
        }


# Endpoints

@router.post("/trade", response_model=ExecutionResponse, status_code=201)
async def execute_trade(request: TradeExecutionRequest) -> ExecutionResponse:
    """
    Execute a trade on Binance.
    
    CRITICAL: This endpoint ONLY calls TradeExecutor.
    It NEVER directly calls adapters or domain logic.
    
    Workflow:
    1. Validate request (action is BUY or SELL)
    2. Get TradeExecutor from DI container
    3. Get latest trade signal from Orchestrator
    4. Execute trade via TradeExecutor
    5. Return ExecutionResponse
    
    Args:
        request: TradeExecutionRequest with symbol and action
    
    Returns:
        ExecutionResponse: Order ID, status, price, timestamp
    
    Status Codes:
        201: Trade executed successfully (test order sent)
        400: Invalid request (bad action, symbol, etc.)
        500: System error (Binance API failure, etc.)
    """
    try:
        logger.info(f"Trade execution request: {request.action} {request.symbol}")
        
        # STEP 1: Validate request
        if request.action not in ["BUY", "SELL"]:
            error_msg = f"Invalid action '{request.action}'. Must be 'BUY' or 'SELL'"
            logger.warning(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        symbol = request.symbol.upper()
        action = TradeAction(request.action)
        
        # STEP 2: Get container and TradeExecutor
        try:
            container = get_container()
            trade_executor = container.get_trade_executor()
            
            if trade_executor is None:
                error_msg = "TradeExecutor not available in DI container"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
        except Exception as e:
            error_msg = f"Failed to initialize TradeExecutor: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # STEP 3: Create a synthetic TradeSignal from the action
        # In production, this would fetch the latest signal from Orchestrator
        from domain.models import TradeSignal
        signal = TradeSignal(
            action=action,
            confidence=0.8,  # MVP: assume high confidence
            reasoning=f"Manual {action} request via API",
            technical_score=0.8,
            sentiment_score=0.8,
            timestamp=datetime.now()
        )
        
        # STEP 4: Execute trade via TradeExecutor
        try:
            execution_result = trade_executor.execute_trade(signal, symbol)
            logger.info(f"Trade executed: {execution_result.order_id}")
        except TradeExecutionException as e:
            error_msg = f"Trade execution failed: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        except Exception as e:
            error_msg = f"Unexpected error during trade execution: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # STEP 5: Return ExecutionResponse
        response = ExecutionResponse(
            success=execution_result.success,
            order_id=execution_result.order_id,
            symbol=execution_result.symbol,
            action=execution_result.action.value,
            quantity=execution_result.quantity,
            fill_price=execution_result.fill_price,
            timestamp=execution_result.timestamp,
            error_message=execution_result.error_message if not execution_result.success else None
        )
        
        logger.info(f"Trade execution response: {response}")
        return response
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/trade/history", status_code=200)
async def get_trade_history(
    limit: int = Query(10, ge=1, le=100, description="Number of recent trades"),
    symbol: Optional[str] = Query(None, description="Filter by symbol")
) -> dict:
    """
    Get trade execution history.
    
    PLACEHOLDER: In Phase 6, this will fetch from trade persistence layer.
    Currently returns a stub response.
    
    Args:
        limit: Number of recent trades to return
        symbol: Optional filter by trading pair
    
    Returns:
        List of ExecutionResponse objects
    """
    logger.info(f"Trade history request: limit={limit}, symbol={symbol}")
    
    return {
        "message": "Trade history endpoint - Phase 6 (persistence layer)",
        "status": "coming_soon"
    }
