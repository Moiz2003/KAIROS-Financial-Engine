"""
Binance Service Adapter
Implements IMarketDataProvider using Binance API.

Design Pattern: Adapter Pattern
Reasoning: Adapts external API to internal interface, isolating business logic
"""

import asyncio
import os
from typing import List

from binance.spot import Spot

from core.exceptions import MarketDataException
from core.logging_config import get_logger
from services.abstractions import IMarketDataProvider

logger = get_logger(__name__)


class BinanceAdapter(IMarketDataProvider):
    """
    Adapter Pattern Implementation: Binance Market Data Provider

    Wraps the synchronous Binance Spot SDK and adapts it to the async
    IMarketDataProvider interface.  Blocking SDK calls are offloaded to the
    default thread pool via asyncio.to_thread(); retry back-off uses
    await asyncio.sleep() so the event loop is never blocked.
    """

    def __init__(self, api_key: str, api_secret: str):
        try:
            use_testnet = os.getenv("BINANCE_TESTNET", "false").lower() == "true"
            if use_testnet:
                self.client = Spot(
                    api_key=api_key,
                    api_secret=api_secret,
                    base_url="https://testnet.binance.vision",
                )
                logger.info("Binance Spot client initialized successfully (TESTNET)")
            else:
                self.client = Spot(api_key=api_key, api_secret=api_secret)
                logger.info("Binance Spot client initialized successfully")
        except Exception as e:
            error_msg = f"Failed to initialize Binance client: {str(e)}"
            logger.error(error_msg)
            raise MarketDataException(error_msg)

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        limit: int = 100,
    ) -> List[List]:
        if limit < 1 or limit > 1000:
            raise MarketDataException("Limit must be between 1 and 1000")

        logger.info(f"Fetching {limit} {interval} candles for {symbol}")
        for attempt in range(3):
            try:
                klines = await asyncio.to_thread(
                    self.client.klines, symbol=symbol, interval=interval, limit=limit
                )
                logger.debug(f"Successfully fetched {len(klines)} candles for {symbol}")
                return klines
            except Exception as exc:
                if attempt == 2:
                    raise MarketDataException(
                        f"Binance REST failed after 3 attempts: {exc}"
                    ) from exc
                logger.warning(
                    f"Binance klines attempt {attempt + 1} failed for {symbol}: {exc} — retrying"
                )
                await asyncio.sleep(0.5 * (attempt + 1))

    async def get_current_price(self, symbol: str) -> float:
        for attempt in range(3):
            try:
                ticker = await asyncio.to_thread(self.client.ticker_price, symbol=symbol)
                price = float(ticker["price"])
                logger.debug(f"{symbol} current price: {price}")
                return price
            except Exception as exc:
                if attempt == 2:
                    raise MarketDataException(
                        f"Binance REST failed after 3 attempts: {exc}"
                    ) from exc
                logger.warning(
                    f"Binance price attempt {attempt + 1} failed for {symbol}: {exc} — retrying"
                )
                await asyncio.sleep(0.5 * (attempt + 1))
