"""
Test Fixtures and Shared Utilities
"""

from datetime import datetime
from domain.models import AnalysisResult, TradeSignal, TradeAction, TrendType


# Sample Data

SAMPLE_PRICES = [
    100.0, 101.5, 102.3, 103.1, 104.5, 105.2, 104.8, 105.5, 106.2, 107.1,
    108.3, 109.1, 110.5, 111.2, 110.8, 111.5, 112.2, 113.1, 114.5, 115.2,
]

SAMPLE_ANALYSIS = AnalysisResult(
    symbol="BTCUSDT",
    price=50000.0,
    rsi=65.0,
    ema_200=49500.0,
    trend=TrendType.BULLISH,
    timestamp=datetime.utcnow(),
)

SAMPLE_BUY_SIGNAL = TradeSignal(
    action=TradeAction.BUY,
    confidence=0.75,
    reasoning="Bullish trend with strong momentum",
    technical_score=0.78,
    sentiment_score=0.70,
    timestamp=datetime.utcnow(),
)

SAMPLE_SELL_SIGNAL = TradeSignal(
    action=TradeAction.SELL,
    confidence=0.82,
    reasoning="Overbought condition detected",
    technical_score=0.85,
    sentiment_score=0.75,
    timestamp=datetime.utcnow(),
)
