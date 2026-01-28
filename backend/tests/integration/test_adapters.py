"""
Integration Tests for Service Adapters

Tests the Adapter Pattern implementations against real external services.
Tests marked with @pytest.mark.integration can be skipped during fast unit testing.

Design Pattern: Adapter Pattern verification - ensures external APIs are properly adapted.
"""

import os
import pytest
from datetime import datetime

from core.exceptions import MarketDataException, AIContextException
from services.binance import BinanceAdapter
from services.perplexity import PerplexityAdapter


# ============================================================================
# FIXTURES - Real API Credentials from .env
# ============================================================================

@pytest.fixture
def binance_api_key():
    """Get Binance API key from environment."""
    key = os.getenv("BINANCE_API_KEY")
    if not key:
        pytest.skip("BINANCE_API_KEY not set in .env")
    return key


@pytest.fixture
def binance_api_secret():
    """Get Binance API secret from environment."""
    secret = os.getenv("BINANCE_API_SECRET")
    if not secret:
        pytest.skip("BINANCE_API_SECRET not set in .env")
    return secret


@pytest.fixture
def perplexity_api_key():
    """Get Perplexity API key from environment."""
    key = os.getenv("PERPLEXITY_API_KEY")
    if not key:
        pytest.skip("PERPLEXITY_API_KEY not set in .env")
    return key


@pytest.fixture
def binance_adapter(binance_api_key, binance_api_secret):
    """Create Binance adapter with real credentials."""
    return BinanceAdapter(binance_api_key, binance_api_secret)


@pytest.fixture
def perplexity_adapter(perplexity_api_key):
    """Create Perplexity adapter with real credentials."""
    return PerplexityAdapter(perplexity_api_key)


# ============================================================================
# TEST SUITE 1: Binance Market Data Adapter
# ============================================================================

class TestBinanceAdapter:
    """Integration tests for Binance adapter against real API."""

    @pytest.mark.integration
    def test_binance_adapter_initialization(self, binance_adapter):
        """Adapter should initialize with valid credentials."""
        assert binance_adapter is not None
        assert binance_adapter.client is not None

    @pytest.mark.integration
    def test_binance_get_current_price(self, binance_adapter):
        """
        CRITICAL: Should fetch current price from Binance.
        
        Tests Adapter Pattern: BinanceAdapter wraps raw Binance API,
        returning clean price float and wrapping exceptions.
        """
        price = binance_adapter.get_current_price("BTCUSDT")
        
        assert isinstance(price, float)
        assert price > 0
        assert price < 1_000_000  # Sanity check: BTC < $1M

    @pytest.mark.integration
    def test_binance_get_klines(self, binance_adapter):
        """
        CRITICAL: Should fetch candlestick data from Binance.
        
        Tests that adapter returns proper kline data structure without
        exposing raw Binance API details.
        """
        klines = binance_adapter.get_klines(
            symbol="BTCUSDT",
            interval="1h",
            limit=100
        )
        
        assert isinstance(klines, list)
        assert len(klines) > 0
        assert len(klines) == 100
        
        # Verify kline structure [time, open, high, low, close, volume, ...]
        first_kline = klines[0]
        assert len(first_kline) >= 6
        
        # Verify numeric values
        timestamp = int(first_kline[0])
        assert timestamp > 0
        
        open_price = float(first_kline[1])
        close_price = float(first_kline[4])
        assert open_price > 0
        assert close_price > 0

    @pytest.mark.integration
    def test_binance_klines_4h_interval(self, binance_adapter):
        """Should fetch 4-hour candles correctly."""
        klines = binance_adapter.get_klines(
            symbol="ETHUSDT",
            interval="4h",
            limit=50
        )
        
        assert len(klines) == 50

    @pytest.mark.integration
    def test_binance_klines_daily_interval(self, binance_adapter):
        """Should fetch daily candles correctly."""
        klines = binance_adapter.get_klines(
            symbol="BNBUSDT",
            interval="1d",
            limit=30
        )
        
        assert len(klines) == 30

    @pytest.mark.integration
    def test_binance_error_handling_invalid_symbol(self, binance_adapter):
        """Adapter should wrap API errors as MarketDataException."""
        with pytest.raises(MarketDataException):
            binance_adapter.get_current_price("INVALID_PAIR_XYZ")

    @pytest.mark.integration
    def test_binance_error_handling_invalid_limit(self, binance_adapter):
        """Adapter should validate parameters and raise MarketDataException."""
        with pytest.raises(MarketDataException):
            # Limit > 1000 should raise
            binance_adapter.get_klines(
                symbol="BTCUSDT",
                interval="1h",
                limit=2000
            )

    @pytest.mark.integration
    def test_binance_multiple_symbols(self, binance_adapter):
        """Adapter should handle multiple trading pairs."""
        symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
        prices = {}
        
        for symbol in symbols:
            prices[symbol] = binance_adapter.get_current_price(symbol)
            assert prices[symbol] > 0
        
        # All prices should be fetched
        assert len(prices) == 3

    @pytest.mark.integration
    def test_binance_klines_data_format(self, binance_adapter):
        """
        Klines data should have proper OHLCV format.
        
        Verifies adapter returns data in expected format:
        [time, open, high, low, close, volume, closeTime, quoteVolume, trades, buyBaseVolume, buyQuoteVolume, ignore]
        """
        klines = binance_adapter.get_klines(
            symbol="BTCUSDT",
            interval="1h",
            limit=1
        )
        
        kline = klines[0]
        
        # Unpack OHLCV
        time = int(kline[0])
        open_price = float(kline[1])
        high_price = float(kline[2])
        low_price = float(kline[3])
        close_price = float(kline[4])
        volume = float(kline[5])
        
        # Verify OHLC relationship
        assert high_price >= open_price
        assert high_price >= close_price
        assert low_price <= open_price
        assert low_price <= close_price
        assert volume > 0


# ============================================================================
# TEST SUITE 2: Perplexity AI Adapter
# ============================================================================

class TestPerplexityAdapter:
    """Integration tests for Perplexity adapter against real API."""

    @pytest.mark.integration
    def test_perplexity_adapter_initialization(self, perplexity_adapter):
        """Adapter should initialize with valid credentials."""
        assert perplexity_adapter is not None
        assert perplexity_adapter.client is not None
        assert perplexity_adapter.model == "sonar-pro"

    @pytest.mark.integration
    def test_perplexity_custom_prompt_injection(self, perplexity_api_key):
        """Adapter should support custom prompt injection for News + Math synthesis."""
        custom_prompt = "For {symbol}, analyze: 1) NEWS sentiment, 2) MATH patterns (RSI {rsi}). Respond in <20 words."
        
        adapter = PerplexityAdapter(
            perplexity_api_key,
            news_math_prompt=custom_prompt
        )
        
        assert adapter.news_math_prompt == custom_prompt

    @pytest.mark.integration
    def test_perplexity_get_news_sentiment(self, perplexity_adapter):
        """
        CRITICAL: Should fetch news sentiment from Perplexity.
        
        Tests Adapter Pattern: PerplexityAdapter wraps raw OpenAI API,
        returns normalized sentiment and wraps exceptions.
        """
        sentiment = perplexity_adapter.get_news_sentiment(
            topic="Bitcoin",
            context="Current market conditions"
        )
        
        assert isinstance(sentiment, str)
        assert sentiment in ["positive", "negative", "neutral"]
        assert len(sentiment) > 0

    @pytest.mark.integration
    def test_perplexity_get_reasoning(self, perplexity_adapter):
        """
        CRITICAL: Should get AI reasoning for market action.
        
        Tests News + Math synthesis prompt injection.
        """
        reasoning = perplexity_adapter.get_reasoning(
            symbol="BTCUSDT",
            technical_context="RSI: 25, Trend: BULLISH, Price > EMA200"
        )
        
        assert isinstance(reasoning, str)
        assert len(reasoning) > 0
        # Reasoning should be somewhat concise (News + Math synthesis)
        assert len(reasoning) < 500

    @pytest.mark.integration
    def test_perplexity_sentiment_for_multiple_topics(self, perplexity_adapter):
        """Adapter should analyze sentiment for different topics."""
        topics = ["Bitcoin", "Ethereum", "Stock Market"]
        sentiments = {}
        
        for topic in topics:
            sentiments[topic] = perplexity_adapter.get_news_sentiment(
                topic=topic,
                context="Current market analysis"
            )
            assert sentiments[topic] in ["positive", "negative", "neutral"]
        
        assert len(sentiments) == 3

    @pytest.mark.integration
    def test_perplexity_reasoning_with_different_contexts(self, perplexity_adapter):
        """Adapter should generate reasoning for different market conditions."""
        contexts = [
            "RSI: 15, Trend: BULLISH, Oversold",
            "RSI: 85, Trend: BULLISH, Overbought",
            "RSI: 50, Trend: NEUTRAL, Sideways",
        ]
        
        for context in contexts:
            reasoning = perplexity_adapter.get_reasoning(
                symbol="ETHUSDT",
                technical_context=context
            )
            assert len(reasoning) > 0
            assert len(reasoning) < 500


# ============================================================================
# TEST SUITE 3: End-to-End Adapter Integration Workflow
# ============================================================================

class TestAdapterIntegration:
    """Integration tests for using adapters together."""

    @pytest.mark.integration
    def test_fetch_market_data_and_get_reasoning(self, binance_adapter, perplexity_adapter):
        """
        CRITICAL: End-to-end workflow using both adapters.
        
        1. Fetch price from Binance
        2. Fetch candles from Binance
        3. Get AI reasoning from Perplexity
        
        This simulates the real KAIROS workflow.
        """
        # Step 1: Get current price
        price = binance_adapter.get_current_price("BTCUSDT")
        assert price > 0
        
        # Step 2: Get candle data
        klines = binance_adapter.get_klines("BTCUSDT", "1h", limit=20)
        assert len(klines) == 20
        
        # Step 3: Get AI reasoning
        technical_context = f"Price: {price}, Last 20 candles fetched, Trend analysis pending"
        reasoning = perplexity_adapter.get_reasoning(
            symbol="BTCUSDT",
            technical_context=technical_context
        )
        assert len(reasoning) > 0
        
        # Verify workflow completed successfully
        assert price > 0
        assert len(klines) > 0
        assert len(reasoning) > 0

    @pytest.mark.integration
    def test_adapter_error_handling_binance_bad_credentials(self):
        """Adapter should raise MarketDataException with invalid credentials."""
        with pytest.raises(MarketDataException):
            adapter = BinanceAdapter("invalid_key", "invalid_secret")
            adapter.get_current_price("BTCUSDT")

    @pytest.mark.integration
    def test_adapter_exception_wrapping(self, binance_adapter):
        """
        Adapter Pattern Verification: Exceptions should be wrapped.
        
        Raw Binance library exceptions should not leak out.
        Instead, they should be wrapped as MarketDataException.
        """
        try:
            binance_adapter.get_klines("INVALID_PAIR", "1h", limit=100)
            pytest.fail("Should have raised MarketDataException")
        except MarketDataException as e:
            # Good: exception is wrapped
            assert "Failed to fetch klines" in str(e)
        except Exception as e:
            # Bad: raw exception leaked
            pytest.fail(f"Raw exception leaked: {type(e).__name__}: {e}")


# ============================================================================
# CONFIGURATION NOTES
# ============================================================================

"""
To run these integration tests:

1. Ensure .env contains:
   - BINANCE_API_KEY=<your_key>
   - BINANCE_API_SECRET=<your_secret>
   - PERPLEXITY_API_KEY=<your_key>

2. Run ONLY integration tests:
   pytest tests/integration/test_adapters.py -v -m integration

3. Skip integration tests during fast development:
   pytest tests/unit/ -v  # Only runs unit tests (integration tests marked with @pytest.mark.integration are skipped)

4. Run full test suite:
   pytest tests/ -v

Adapter Pattern Verification:
✅ BinanceAdapter: Wraps python-binance client, exposes only IMarketDataProvider interface
✅ PerplexityAdapter: Wraps OpenAI client, exposes only IAIContextProvider interface
✅ Exception Handling: All raw exceptions wrapped as custom exceptions
✅ Prompt Injection: Perplexity supports "News + Math" synthesis via constructor
"""
