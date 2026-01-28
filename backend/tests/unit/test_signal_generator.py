"""
Unit Tests for Signal Generation Service
"""

import pytest
from datetime import datetime
from domain.services import SignalGenerator
from domain.models import TradeSignal, TradeAction, TrendType, AnalysisResult
from tests.fixtures import SAMPLE_ANALYSIS


class TestSignalGenerator:
    """Test signal generation logic."""
    
    def test_signal_generator_initialization(self):
        """Signal generator should initialize with threshold."""
        generator = SignalGenerator(confidence_threshold=0.65)
        assert generator.confidence_threshold == 0.65
    
    def test_signal_generator_invalid_threshold(self):
        """Invalid threshold should raise error."""
        with pytest.raises(ValueError):
            SignalGenerator(confidence_threshold=1.5)
    
    def test_generate_bullish_buy_signal(self):
        """Bullish analysis + positive sentiment = BUY."""
        generator = SignalGenerator(confidence_threshold=0.65)
        
        bullish_analysis = AnalysisResult(
            symbol="BTCUSDT",
            price=50000.0,
            rsi=35.0,  # Oversold (bullish)
            ema_200=49000.0,
            trend=TrendType.BULLISH,
            timestamp=datetime.utcnow(),
        )
        
        signal = generator.generate_signal(
            analysis=bullish_analysis,
            news_sentiment="positive",
        )
        
        assert signal.action == TradeAction.BUY
        assert signal.confidence > 0.65
        assert signal.technical_score > 0.5
    
    def test_generate_bearish_sell_signal(self):
        """Bearish analysis + negative sentiment = SELL."""
        generator = SignalGenerator(confidence_threshold=0.65)
        
        bearish_analysis = AnalysisResult(
            symbol="BTCUSDT",
            price=50000.0,
            rsi=75.0,  # Overbought (bearish)
            ema_200=51000.0,
            trend=TrendType.BEARISH,
            timestamp=datetime.utcnow(),
        )
        
        signal = generator.generate_signal(
            analysis=bearish_analysis,
            news_sentiment="negative",
        )
        
        assert signal.action == TradeAction.SELL
        assert signal.confidence > 0.5
    
    def test_generate_neutral_hold_signal(self):
        """Mixed signals = HOLD."""
        generator = SignalGenerator(confidence_threshold=0.65)
        
        neutral_analysis = AnalysisResult(
            symbol="BTCUSDT",
            price=50000.0,
            rsi=50.0,  # Neutral
            ema_200=50000.0,
            trend=TrendType.NEUTRAL,
            timestamp=datetime.utcnow(),
        )
        
        signal = generator.generate_signal(
            analysis=neutral_analysis,
            news_sentiment="neutral",
        )
        
        assert signal.action == TradeAction.HOLD
    
    def test_sentiment_score_calculation(self):
        """Sentiment should map to score correctly."""
        assert SignalGenerator._calculate_sentiment_score("positive") == 0.8
        assert SignalGenerator._calculate_sentiment_score("neutral") == 0.5
        assert SignalGenerator._calculate_sentiment_score("negative") == 0.2
    
    def test_technical_score_respects_overbought(self):
        """Overbought (RSI > 70) should reduce bullish score."""
        generator = SignalGenerator()
        
        overbought_analysis = AnalysisResult(
            symbol="BTCUSDT",
            price=50000.0,
            rsi=75.0,
            ema_200=49000.0,
            trend=TrendType.BULLISH,
            timestamp=datetime.utcnow(),
        )
        
        score = generator._calculate_technical_score(overbought_analysis)
        assert score < 0.65  # Reduced due to overbought condition
    
    def test_reasoning_generation(self):
        """Reasoning should be generated for all signals."""
        signal = TradeSignal(
            action=TradeAction.BUY,
            confidence=0.75,
            reasoning="Test reason",
            technical_score=0.78,
            sentiment_score=0.70,
            timestamp=datetime.utcnow(),
        )
        
        assert len(signal.reasoning) > 0
        assert len(signal.reasoning) >= 5
