"""
API Layer - Request/Response Models
Pydantic models for HTTP contract validation.

Design Pattern: Data Transfer Object (DTO)
Reasoning: Separate API contract from domain models
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Request Models

class AnalysisRequest(BaseModel):
    """Request for market analysis."""
    symbol: str = Field(..., description="Trading pair, e.g., BTCUSDT")
    interval: str = Field(default="4h", description="Kline interval")
    limit: int = Field(default=100, ge=10, le=1000, description="Number of candles")


class SignalRequest(BaseModel):
    """Request for trading signal."""
    symbol: str = Field(..., description="Trading pair")
    include_news: bool = Field(default=True, description="Include news sentiment")


class ExecuteTradeRequest(BaseModel):
    """Request to execute a trade."""
    symbol: str = Field(..., description="Trading pair")
    action: str = Field(..., description="BUY, SELL, or HOLD")
    quantity: float = Field(..., gt=0, description="Trade quantity")


# Response Models

class AnalysisResponse(BaseModel):
    """Market analysis response."""
    symbol: str
    price: float
    rsi: float
    ema_200: float
    trend: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class SignalResponse(BaseModel):
    """Trading signal response."""
    action: str
    confidence: float
    reasoning: str
    technical_score: float
    sentiment_score: float
    timestamp: datetime
    
    class Config:
        from_attributes = True


class RiskAssessmentResponse(BaseModel):
    """Risk assessment response."""
    approved: bool
    max_position_size: float
    max_leverage: float
    warnings: List[str]
    risk_score: float
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ExecutionResponse(BaseModel):
    """Trade execution response."""
    success: bool
    order_id: str
    symbol: str
    action: str
    quantity: float
    fill_price: float
    timestamp: datetime
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    """Error response."""
    error_code: str
    message: str
    timestamp: datetime
    
    class Config:
        from_attributes = True
