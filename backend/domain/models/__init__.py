"""
Domain Layer - Value Objects and Models
These are immutable, comparable objects representing core business concepts.
Dependency-free domain models support unit testing.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List
from enum import Enum


class TrendType(str, Enum):
    """Market trend classification."""
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class TradeAction(str, Enum):
    """Trading action recommendation."""
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass(frozen=True)
class AnalysisResult:
    """
    Immutable value object representing market analysis result.
    
    Design Pattern: Value Object
    Reasoning: Represents a measurement at a point in time; immutable, comparable
    """
    symbol: str
    price: float
    rsi: float
    ema_200: float
    trend: TrendType
    timestamp: datetime
    
    def __post_init__(self):
        """Validate state."""
        if not (0 <= self.rsi <= 100):
            raise ValueError(f"RSI must be between 0 and 100, got {self.rsi}")
        if self.price <= 0:
            raise ValueError(f"Price must be positive, got {self.price}")


@dataclass(frozen=True)
class TradeSignal:
    """
    Immutable value object representing a trading signal.
    
    Design Pattern: Value Object
    Reasoning: Represents a recommendation at a point in time; immutable for consistency
    """
    action: TradeAction
    confidence: float  # 0.0 to 1.0
    reasoning: str
    technical_score: float  # 0.0 to 1.0
    sentiment_score: float  # 0.0 to 1.0
    timestamp: datetime
    
    def __post_init__(self):
        """Validate state."""
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Confidence must be 0.0-1.0, got {self.confidence}")
        if not (0.0 <= self.technical_score <= 1.0):
            raise ValueError(f"Technical score must be 0.0-1.0, got {self.technical_score}")
        if not (0.0 <= self.sentiment_score <= 1.0):
            raise ValueError(f"Sentiment score must be 0.0-1.0, got {self.sentiment_score}")
        if not self.reasoning or len(self.reasoning) < 5:
            raise ValueError("Reasoning must be provided and meaningful")


@dataclass(frozen=True)
class RiskAssessment:
    """
    Immutable value object representing risk evaluation of a trade.
    
    Design Pattern: Value Object
    Reasoning: Captures a risk decision; immutable for audit trail
    """
    approved: bool
    max_position_size: float
    max_leverage: float
    warnings: List[str]
    risk_score: float  # 0.0 (safe) to 1.0 (dangerous)
    timestamp: datetime
    
    def __post_init__(self):
        """Validate state."""
        if self.max_position_size < 0:
            raise ValueError(f"Max position size must be non-negative")
        if not (0.0 <= self.risk_score <= 1.0):
            raise ValueError(f"Risk score must be 0.0-1.0, got {self.risk_score}")


@dataclass(frozen=True)
class ExecutionResult:
    """
    Immutable value object representing trade execution outcome.
    
    Design Pattern: Value Object
    Reasoning: Record of what happened; immutable for historical accuracy
    """
    success: bool
    order_id: str
    symbol: str
    action: TradeAction
    quantity: float
    fill_price: float
    timestamp: datetime
    error_message: str = ""
    
    def __post_init__(self):
        """Validate state."""
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive")
        if self.fill_price < 0:
            raise ValueError(f"Fill price must be non-negative")
