"""
TAEngine — stateful singleton for real-time technical analysis.

Subscribes to BinanceStreamManager kline events via on_kline().
Maintains a rolling deque of closed-candle prices and computes
RSI(14) + EMA(200) on each closed candle using MarketAnalyzer.
All math is pure Python — no numpy/pandas.
"""

import asyncio
import logging
from collections import deque
from datetime import datetime
from typing import ClassVar, Optional

from domain.entities import MarketAnalyzer
from domain.models import AnalysisResult, TradeSignal, TrendType
from domain.services import SignalGenerator

logger = logging.getLogger(__name__)

_BUFFER_SIZE = 500


class TAEngine:
    """Singleton TA engine — computes RSI(14) + EMA(200) on live kline stream."""

    _instance: ClassVar[Optional["TAEngine"]] = None

    def __init__(self, buffer_size: int = _BUFFER_SIZE) -> None:
        self._buffer: deque = deque(maxlen=buffer_size)
        self._latest_analysis: Optional[AnalysisResult] = None
        self._latest_signal: Optional[TradeSignal] = None
        # Lazily created on first on_kline() call so the Lock is always bound
        # to the running event loop (safe on Python 3.9 and 3.10+).
        self._lock: Optional[asyncio.Lock] = None
        self._analyzer = MarketAnalyzer()
        self._signal_generator = SignalGenerator(confidence_threshold=0.65)

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def on_kline(self, msg: dict) -> None:
        """
        Called by BinanceStreamManager for every kline event.
        Only recalculates when msg["closed"] is True.
        Pure Python math — never awaits any I/O.
        """
        if not msg.get("closed"):
            return

        try:
            # _norm_kline formats close as "95,123.45" — strip commas before parsing.
            close_price = float(str(msg.get("close", "0")).replace(",", ""))
            symbol: str = msg.get("symbol", "BTCUSDT")
        except (ValueError, TypeError):
            logger.warning("TAEngine: cannot parse kline close: %s", msg)
            return

        async with self._get_lock():
            self._buffer.append(close_price)
            prices = list(self._buffer)

        buf_len = len(prices)
        logger.debug("TAEngine: buffer=%d close=%.2f", buf_len, close_price)

        # calculate_rsi requires period+1 prices minimum (15 for RSI-14)
        if buf_len < 15:
            return

        try:
            rsi = self._analyzer.calculate_rsi(prices, period=14)

            if buf_len < 200:
                logger.debug(
                    "TAEngine: RSI=%.2f — EMA(200) needs %d more prices",
                    rsi, 200 - buf_len,
                )
                return

            ema_200 = self._analyzer.calculate_ema(prices, period=200)
            trend_str = self._analyzer.detect_trend(close_price, ema_200)

            analysis = AnalysisResult(
                symbol=symbol,
                price=close_price,
                rsi=rsi,
                ema_200=ema_200,
                trend=TrendType(trend_str),
                timestamp=datetime.utcnow(),
            )
            signal = self._signal_generator.generate_signal(analysis)

            async with self._get_lock():
                self._latest_analysis = analysis
                self._latest_signal = signal

            logger.info(
                "TAEngine: RSI=%.2f EMA200=%.2f trend=%s signal=%s conf=%.3f",
                rsi, ema_200, trend_str, signal.action.value, signal.confidence,
            )

        except Exception as exc:
            logger.error("TAEngine: calculation error: %s", exc, exc_info=True)

    def get_latest_analysis(self) -> Optional[AnalysisResult]:
        """Synchronous read — safe to call from any coroutine."""
        return self._latest_analysis

    def get_latest_signal(self) -> Optional[TradeSignal]:
        """Synchronous read — safe to call from any coroutine."""
        return self._latest_signal

    @classmethod
    def instance(cls) -> "TAEngine":
        """Singleton accessor."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


# Module-level singleton — imported by binance_ws and the market route.
ta_engine = TAEngine.instance()
