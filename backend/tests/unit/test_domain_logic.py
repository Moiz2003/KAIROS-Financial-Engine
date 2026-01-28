"""
Unit Tests for Domain Logic - Pure Business Logic Testing

Tests the core domain entities and services without external dependencies.
No mocks needed - pure logic tests.

Critical: These tests verify the "Sniper Strategy" implementation per Phase 2 requirements.
"""

import pytest
from datetime import datetime
from domain.entities import MarketAnalyzer, Portfolio
from domain.services import SignalGenerator
from domain.models import AnalysisResult, TradeSignal, TradeAction, TrendType


# ============================================================================
# FIXTURE DATA - "Fake" Market Data for Unit Testing
# ============================================================================

@pytest.fixture
def low_rsi_bullish_analysis():
    """
    Market data where RSI is low (oversold) and trend is bullish.
    This should trigger BUY signal per Sniper Strategy.
    """
    return AnalysisResult(
        symbol="BTCUSDT",
        price=50000.0,
        rsi=25.0,  # Low RSI (< 30, oversold)
        ema_200=49500.0,  # Current price > EMA
        trend=TrendType.BULLISH,
        timestamp=datetime.utcnow(),
    )


@pytest.fixture
def high_rsi_analysis():
    """
    Market data where RSI is high (overbought).
    This should trigger SELL signal per Sniper Strategy.
    """
    return AnalysisResult(
        symbol="BTCUSDT",
        price=52000.0,
        rsi=75.0,  # High RSI (> 70, overbought)
        ema_200=50000.0,
        trend=TrendType.BULLISH,
        timestamp=datetime.utcnow(),
    )


@pytest.fixture
def neutral_analysis():
    """
    Market data with RSI in neutral zone.
    This should trigger HOLD signal.
    """
    return AnalysisResult(
        symbol="BTCUSDT",
        price=50000.0,
        rsi=50.0,  # Neutral RSI
        ema_200=50000.0,
        trend=TrendType.NEUTRAL,
        timestamp=datetime.utcnow(),
    )


@pytest.fixture
def low_rsi_bearish_analysis():
    """
    Market data where RSI is low but trend is bearish.
    This should trigger HOLD (not the bullish setup).
    """
    return AnalysisResult(
        symbol="BTCUSDT",
        price=48000.0,
        rsi=25.0,  # Low RSI but...
        ema_200=50000.0,  # Price < EMA (bearish)
        trend=TrendType.BEARISH,
        timestamp=datetime.utcnow(),
    )


# ============================================================================
# TEST SUITE 1: MarketAnalyzer - Technical Indicator Calculations
# ============================================================================

class TestMarketAnalyzer:
    """Test pure technical analysis calculations."""

    def test_calculate_rsi_basic(self):
        """RSI calculation should work with minimal data."""
        prices = [100.0, 101.0, 102.0, 103.0, 104.0, 105.0]
        analyzer = MarketAnalyzer()
        rsi = analyzer.calculate_rsi(prices, period=5)
        
        assert isinstance(rsi, float)
        assert 0 <= rsi <= 100

    def test_calculate_rsi_overbought(self):
        """RSI should detect overbought condition (RSI > 70)."""
        # Strong uptrend = high gains, low losses
        rising_prices = [float(i) for i in range(100, 150)]
        analyzer = MarketAnalyzer()
        rsi = analyzer.calculate_rsi(rising_prices, period=14)
        
        assert rsi > 70, f"Expected RSI > 70 for strong uptrend, got {rsi}"

    def test_calculate_rsi_oversold(self):
        """RSI should detect oversold condition (RSI < 30)."""
        # Strong downtrend = low gains, high losses
        falling_prices = [float(i) for i in range(150, 100, -1)]
        analyzer = MarketAnalyzer()
        rsi = analyzer.calculate_rsi(falling_prices, period=14)
        
        assert rsi < 30, f"Expected RSI < 30 for strong downtrend, got {rsi}"

    def test_calculate_rsi_neutral(self):
        """RSI should be neutral (~50) for sideways movement."""
        # Sideways movement = balanced gains and losses
        sideways_prices = [100.0, 101.0, 100.0, 101.0, 100.0, 101.0] * 3
        analyzer = MarketAnalyzer()
        rsi = analyzer.calculate_rsi(sideways_prices, period=14)
        
        assert 40 < rsi < 60, f"Expected RSI ~50 for sideways, got {rsi}"

    def test_calculate_rsi_insufficient_data(self):
        """RSI calculation should fail with insufficient data."""
        analyzer = MarketAnalyzer()
        
        with pytest.raises(ValueError) as exc_info:
            analyzer.calculate_rsi([100.0, 101.0], period=14)
        
        assert "at least" in str(exc_info.value).lower()

    def test_calculate_ema_basic(self):
        """EMA calculation should work."""
        prices = [float(i) for i in range(100, 150)]
        analyzer = MarketAnalyzer()
        ema = analyzer.calculate_ema(prices, period=20)
        
        assert isinstance(ema, float)
        assert ema > 0

    def test_calculate_ema_follows_uptrend(self):
        """EMA should follow uptrend for rising prices."""
        # Strong uptrend
        rising_prices = [float(i) for i in range(100, 300)]
        analyzer = MarketAnalyzer()
        ema = analyzer.calculate_ema(rising_prices, period=50)
        
        # EMA should be high for trending data
        assert ema > 150

    def test_calculate_ema_insufficient_data(self):
        """EMA calculation should fail with insufficient data."""
        analyzer = MarketAnalyzer()
        
        with pytest.raises(ValueError) as exc_info:
            analyzer.calculate_ema([100.0, 101.0], period=200)
        
        assert "at least" in str(exc_info.value).lower()

    def test_detect_trend_bullish(self):
        """Trend should be BULLISH when price > EMA."""
        analyzer = MarketAnalyzer()
        # Price 2% above EMA (exceeds default 1% threshold)
        trend = analyzer.detect_trend(current_price=102.0, ema_200=100.0)
        
        assert trend == "BULLISH"

    def test_detect_trend_bearish(self):
        """Trend should be BEARISH when price < EMA."""
        analyzer = MarketAnalyzer()
        # Price 2% below EMA (exceeds default 1% threshold)
        trend = analyzer.detect_trend(current_price=98.0, ema_200=100.0)
        
        assert trend == "BEARISH"

    def test_detect_trend_neutral(self):
        """Trend should be NEUTRAL when price ≈ EMA."""
        analyzer = MarketAnalyzer()
        trend = analyzer.detect_trend(current_price=100.5, ema_200=100.0)
        
        assert trend == "NEUTRAL"

    def test_detect_trend_with_threshold(self):
        """Trend detection should respect custom threshold."""
        analyzer = MarketAnalyzer()
        # With 5% threshold, price 6% above EMA
        trend = analyzer.detect_trend(
            current_price=106.0,
            ema_200=100.0,
            threshold=0.05
        )
        
        assert trend == "BULLISH"


# ============================================================================
# TEST SUITE 2: Portfolio - Position Tracking
# ============================================================================

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
        with pytest.raises(ValueError):
            Portfolio(initial_balance=0.0)
        
        with pytest.raises(ValueError):
            Portfolio(initial_balance=-1000.0)

    def test_add_position(self):
        """Adding a position should update portfolio."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=1.0, entry_price=5000.0)
        
        assert "BTCUSDT" in portfolio.positions
        assert portfolio.positions["BTCUSDT"]["quantity"] == 1.0
        assert portfolio.current_cash == 5000.0

    def test_add_position_invalid(self):
        """Adding invalid position should fail."""
        portfolio = Portfolio(initial_balance=10000.0)
        
        with pytest.raises(ValueError):
            portfolio.add_position(symbol="BTC", quantity=-1.0, entry_price=50000.0)

    def test_close_position_profit(self):
        """Closing a position with profit should be tracked."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=1.0, entry_price=5000.0)
        
        pnl = portfolio.close_position(symbol="BTCUSDT", exit_price=6000.0)
        
        assert pnl == 1000.0  # $1000 profit

    def test_close_position_loss(self):
        """Closing a position with loss should be tracked."""
        portfolio = Portfolio(initial_balance=10000.0)
        portfolio.add_position(symbol="BTCUSDT", quantity=1.0, entry_price=5000.0)
        
        pnl = portfolio.close_position(symbol="BTCUSDT", exit_price=4000.0)
        
        assert pnl == -1000.0  # $1000 loss

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
        
        drawdown = portfolio.calculate_drawdown({"BTCUSDT": 4000.0})
        
        # Current value = 0 cash + 2 BTC at 4000 = 8000
        # Drawdown = (10000 - 8000) / 10000 * 100 = 20%
        assert drawdown == 20.0


# ============================================================================
# TEST SUITE 3: SignalGenerator - Sniper Strategy Implementation
# ============================================================================

class TestSignalGenerator:
    """Test Sniper Strategy signal generation - CRITICAL FOR PHASE 2."""

    def test_signal_generator_initialization(self):
        """Signal generator should initialize with threshold."""
        generator = SignalGenerator(confidence_threshold=0.65)
        assert generator.confidence_threshold == 0.65

    def test_signal_generator_invalid_threshold(self):
        """Invalid threshold should raise error."""
        with pytest.raises(ValueError):
            SignalGenerator(confidence_threshold=1.5)

    # --------
    # CRITICAL TESTS: Sniper Strategy
    # --------

    def test_sniper_strategy_buy_signal(self, low_rsi_bullish_analysis):
        """
        CRITICAL: Sniper Strategy Rule 1 - BUY Signal
        
        Rule: IF RSI < 30 AND Trend == BULLISH -> Return BUY
        
        Test with fake data (RSI=25, Trend=BULLISH)
        """
        generator = SignalGenerator()
        signal = generator.generate_signal(low_rsi_bullish_analysis)
        
        assert signal.action == TradeAction.BUY, \
            f"Expected BUY, got {signal.action}"
        assert signal.confidence >= 0.65, \
            f"Expected confidence >= 0.65, got {signal.confidence}"
        assert "oversold" in signal.reasoning.lower(), \
            f"Expected 'oversold' in reasoning, got {signal.reasoning}"

    def test_sniper_strategy_sell_signal(self, high_rsi_analysis):
        """
        CRITICAL: Sniper Strategy Rule 2 - SELL Signal
        
        Rule: IF RSI > 70 -> Return SELL
        
        Test with fake data (RSI=75)
        """
        generator = SignalGenerator()
        signal = generator.generate_signal(high_rsi_analysis)
        
        assert signal.action == TradeAction.SELL, \
            f"Expected SELL, got {signal.action}"
        assert signal.confidence >= 0.65, \
            f"Expected confidence >= 0.65, got {signal.confidence}"
        assert "overbought" in signal.reasoning.lower(), \
            f"Expected 'overbought' in reasoning, got {signal.reasoning}"

    def test_sniper_strategy_hold_signal(self, neutral_analysis):
        """
        CRITICAL: Sniper Strategy Rule 3 - HOLD Signal
        
        Rule: ELSE -> Return HOLD
        
        Test with fake data (RSI=50, no clear setup)
        """
        generator = SignalGenerator()
        signal = generator.generate_signal(neutral_analysis)
        
        assert signal.action == TradeAction.HOLD, \
            f"Expected HOLD, got {signal.action}"
        assert signal.confidence == 0.5, \
            f"Expected confidence 0.5 for HOLD, got {signal.confidence}"

    def test_sniper_strategy_no_buy_on_bearish_trend(self, low_rsi_bearish_analysis):
        """
        CRITICAL: Sniper Strategy Edge Case
        
        Rule: BUY requires BOTH RSI < 30 AND Trend == BULLISH
        
        Test with RSI low but trend bearish -> Should NOT buy
        """
        generator = SignalGenerator()
        signal = generator.generate_signal(low_rsi_bearish_analysis)
        
        assert signal.action != TradeAction.BUY, \
            f"Should not BUY with bearish trend, got {signal.action}"

    def test_signal_completeness(self, low_rsi_bullish_analysis):
        """Signal should have all required fields."""
        generator = SignalGenerator()
        signal = generator.generate_signal(low_rsi_bullish_analysis)
        
        assert isinstance(signal, TradeSignal)
        assert signal.action in [TradeAction.BUY, TradeAction.SELL, TradeAction.HOLD]
        assert 0.0 <= signal.confidence <= 1.0
        assert len(signal.reasoning) > 0
        assert 0.0 <= signal.technical_score <= 1.0
        assert signal.timestamp is not None

    def test_signal_deterministic(self, low_rsi_bullish_analysis):
        """Same input should always produce same output."""
        generator = SignalGenerator()
        signal1 = generator.generate_signal(low_rsi_bullish_analysis)
        signal2 = generator.generate_signal(low_rsi_bullish_analysis)
        
        assert signal1.action == signal2.action
        assert signal1.confidence == signal2.confidence

    def test_multiple_signals_in_sequence(self):
        """Test generating multiple signals (workflow test)."""
        generator = SignalGenerator()
        
        # Sequence: HOLD -> BUY -> SELL -> HOLD
        signals = []
        
        # HOLD (neutral)
        neutral = AnalysisResult(
            symbol="BTCUSDT", price=50000.0, rsi=50.0,
            ema_200=50000.0, trend=TrendType.NEUTRAL,
            timestamp=datetime.utcnow()
        )
        signals.append(generator.generate_signal(neutral))
        
        # BUY (oversold bullish)
        buy_setup = AnalysisResult(
            symbol="BTCUSDT", price=50500.0, rsi=28.0,
            ema_200=50000.0, trend=TrendType.BULLISH,
            timestamp=datetime.utcnow()
        )
        signals.append(generator.generate_signal(buy_setup))
        
        # SELL (overbought)
        sell_setup = AnalysisResult(
            symbol="BTCUSDT", price=52000.0, rsi=72.0,
            ema_200=50000.0, trend=TrendType.BULLISH,
            timestamp=datetime.utcnow()
        )
        signals.append(generator.generate_signal(sell_setup))
        
        # Verify sequence
        assert signals[0].action == TradeAction.HOLD
        assert signals[1].action == TradeAction.BUY
        assert signals[2].action == TradeAction.SELL


# ============================================================================
# INTEGRATION TESTS: End-to-End Workflow
# ============================================================================

class TestDomainIntegration:
    """Test domain layer integration workflows."""

    def test_complete_trading_workflow(self):
        """Test a complete trading workflow with pure domain logic."""
        # 1. Initialize portfolio
        portfolio = Portfolio(initial_balance=10000.0)
        
        # 2. Analyze market (fake data)
        analyzer = MarketAnalyzer()
        prices = [float(i) for i in range(100, 130)]
        rsi = analyzer.calculate_rsi(prices, period=14)
        ema = analyzer.calculate_ema(prices, period=20)
        trend = analyzer.detect_trend(prices[-1], ema)
        
        # 3. Create analysis result
        analysis = AnalysisResult(
            symbol="BTCUSDT",
            price=prices[-1],
            rsi=rsi,
            ema_200=ema,
            trend=TrendType(trend),
            timestamp=datetime.utcnow()
        )
        
        # 4. Generate signal
        generator = SignalGenerator()
        signal = generator.generate_signal(analysis)
        
        # 5. Verify signal and portfolio can work together
        assert signal.action in [TradeAction.BUY, TradeAction.SELL, TradeAction.HOLD]
        assert portfolio.initial_balance > 0
        
        # 6. Simulate trade execution
        if signal.action == TradeAction.BUY:
            portfolio.add_position("BTCUSDT", quantity=0.1, entry_price=prices[-1])
            assert len(portfolio.positions) > 0
