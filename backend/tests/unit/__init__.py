"""
Unit Tests for Domain Entities
Fast, pure logic tests with no external dependencies.
"""

import pytest
from domain.entities import MarketAnalyzer, Portfolio
from core.exceptions import ValidationException
from tests.fixtures import SAMPLE_PRICES


class TestMarketAnalyzer:
    """Test market analysis calculations."""
    
    def test_calculate_rsi_basic(self):
        """RSI should be calculated correctly."""
        analyzer = MarketAnalyzer()
        rsi = analyzer.calculate_rsi(SAMPLE_PRICES, period=14)
        
        assert isinstance(rsi, float)
        assert 0 <= rsi <= 100
    
    def test_calculate_rsi_overbought(self):
        """RSI should detect overbought (> 70)."""
        analyzer = MarketAnalyzer()
        rising_prices = [float(i) for i in range(100, 200)]
        rsi = analyzer.calculate_rsi(rising_prices, period=14)
        
        assert rsi > 70  # Overbought
    
    def test_calculate_rsi_oversold(self):
        """RSI should detect oversold (< 30)."""
        analyzer = MarketAnalyzer()
        falling_prices = [float(i) for i in range(200, 100, -1)]
        rsi = analyzer.calculate_rsi(falling_prices, period=14)
        
        assert rsi < 30  # Oversold
    
    def test_calculate_rsi_insufficient_data(self):
        """RSI calculation should fail with insufficient data."""
        analyzer = MarketAnalyzer()
        
        with pytest.raises(ValidationException):
            analyzer.calculate_rsi([100.0, 101.0, 102.0], period=14)
    
    def test_calculate_ema_basic(self):
        """EMA should be calculated correctly."""
        analyzer = MarketAnalyzer()
        ema = analyzer.calculate_ema(SAMPLE_PRICES, period=10)
        
        assert isinstance(ema, float)
        assert ema > 0
    
    def test_calculate_ema_follows_trend(self):
        """EMA should follow uptrend for rising prices."""
        analyzer = MarketAnalyzer()
        rising_prices = [float(i * 10) for i in range(1, 300)]
        ema = analyzer.calculate_ema(rising_prices, period=50)
        
        # EMA should be close to last price for trending data
        assert ema > rising_prices[-50]
    
    def test_determine_trend_bullish(self):
        """Trend should be BULLISH when price > EMA."""
        trend = MarketAnalyzer.determine_trend(
            current_price=100.0,
            ema_200=98.0,
        )
        assert trend == "BULLISH"
    
    def test_determine_trend_bearish(self):
        """Trend should be BEARISH when price < EMA."""
        trend = MarketAnalyzer.determine_trend(
            current_price=98.0,
            ema_200=100.0,
        )
        assert trend == "BEARISH"
    
    def test_determine_trend_neutral(self):
        """Trend should be NEUTRAL when price ≈ EMA."""
        trend = MarketAnalyzer.determine_trend(
            current_price=100.0,
            ema_200=100.5,
        )
        assert trend == "NEUTRAL"


class TestPortfolio:
    """Test portfolio management."""
    
    def test_portfolio_initialization(self):
        """Portfolio should initialize with balance."""
        portfolio = Portfolio(initial_balance=10000.0)
        
        assert portfolio.initial_balance == 10000.0
        assert portfolio.current_cash == 10000.0
        assert len(portfolio.positions) == 0
    
    def test_portfolio_invalid_balance(self):
        """Portfolio should reject non-positive balance."""
        with pytest.raises(ValidationException):
            Portfolio(initial_balance=0.0)
        
        with pytest.raises(ValidationException):
            Portfolio(initial_balance=-1000.0)
    
    def test_add_position(self):
        """Adding a position should update portfolio."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=1.0, entry_price=50000.0)
        
        assert "BTCUSDT" in portfolio.positions
        assert portfolio.positions["BTCUSDT"]["quantity"] == 1.0
        assert portfolio.current_cash == 10000.0 - 50000.0
    
    def test_add_position_invalid(self):
        """Adding invalid position should fail."""
        portfolio = Portfolio(initial_balance=10000.0)
        
        with pytest.raises(ValidationException):
            portfolio.add_position(symbol="BTC", quantity=-1.0, entry_price=50000.0)
    
    def test_close_position(self):
        """Closing a position should calculate P&L."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=1.0, entry_price=50000.0)
        
        pnl = portfolio.close_position(symbol="BTCUSDT", exit_price=51000.0)
        
        assert pnl == 1000.0  # $1000 profit
        assert "BTCUSDT" not in portfolio.positions
    
    def test_get_total_value(self):
        """Total value should include cash and positions."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=1.0, entry_price=5000.0)
        
        total = portfolio.get_total_value({"BTCUSDT": 6000.0})
        
        # 5000 cash remaining + 1 BTC at 6000 = 11000
        assert total == 11000.0
    
    def test_calculate_drawdown(self):
        """Drawdown should be calculated correctly."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=2.0, entry_price=5000.0)
        
        current_value = portfolio.get_total_value({"BTCUSDT": 4000.0})
        drawdown = portfolio.calculate_drawdown({"BTCUSDT": 4000.0})
        
        # Current value = 0 cash + 2 BTC at 4000 = 8000
        # Drawdown = (10000 - 8000) / 10000 = 0.20 = 20%
        assert drawdown == 20.0
