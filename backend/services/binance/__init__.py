"""
Binance Service Adapter
Implements IMarketDataProvider using Binance API.

Design Pattern: Adapter Pattern
Reasoning: Adapts external API to internal interface, isolating business logic
"""

from typing import List
import os
from binance.spot import Spot
from core.exceptions import MarketDataException
from core.logging_config import get_logger
from services.abstractions import IMarketDataProvider

logger = get_logger(__name__)


class BinanceAdapter(IMarketDataProvider):
    """
    Adapter Pattern Implementation: Binance Market Data Provider
    
    Wraps the Binance Spot API client and adapts it to the IMarketDataProvider interface.
    All exceptions from the Binance client are caught and wrapped as MarketDataException.
    """
    
    def __init__(self, api_key: str, api_secret: str):
        """
        Initialize Binance Spot client with credentials.
        
        Args:
            api_key: Binance API key from .env
            api_secret: Binance API secret from .env
        
        Raises:
            MarketDataException: If client initialization fails
        """
        try:
            # Check if testnet mode is enabled via environment variable
            use_testnet = os.getenv("BINANCE_TESTNET", "false").lower() == "true"
            
            if use_testnet:
                # Use testnet endpoint
                self.client = Spot(
                    api_key=api_key,
                    api_secret=api_secret,
                    base_url="https://testnet.binance.vision"
                )
                logger.info("Binance Spot client initialized successfully (TESTNET)")
            else:
                # Use production endpoint
                self.client = Spot(api_key=api_key, api_secret=api_secret)
                logger.info("Binance Spot client initialized successfully")
        except Exception as e:
            error_msg = f"Failed to initialize Binance client: {str(e)}"
            logger.error(error_msg)
            raise MarketDataException(error_msg)
    
    def get_klines(
        self,
        symbol: str,
        interval: str,
        limit: int = 100,
    ) -> List[List]:
        """
        Fetch candlestick data from Binance API.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            interval: Kline interval (e.g., "4h", "1d", "1h")
            limit: Number of candles to fetch (default 100, max 1000)
        
        Returns:
            List of klines: [[time, open, high, low, close, volume, ...], ...]
        
        Raises:
            MarketDataException: If API call fails or parameters are invalid
        """
        try:
            if limit < 1 or limit > 1000:
                raise ValueError("Limit must be between 1 and 1000")
            
            logger.info(f"Fetching {limit} {interval} candles for {symbol}")
            klines = self.client.klines(
                symbol=symbol,
                interval=interval,
                limit=limit,
            )
            logger.debug(f"Successfully fetched {len(klines)} candles for {symbol}")
            return klines
        except ValueError as e:
            error_msg = f"Invalid parameters for klines: {str(e)}"
            logger.error(error_msg)
            raise MarketDataException(error_msg)
        except Exception as e:
            error_msg = f"Failed to fetch klines for {symbol}: {str(e)}"
            logger.error(error_msg)
            raise MarketDataException(error_msg)
    
    def get_current_price(self, symbol: str) -> float:
        """
        Fetch current price from Binance using ticker endpoint.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
        
        Returns:
            Current price as float
        
        Raises:
            MarketDataException: If API call fails or price is invalid
        """
        try:
            # Use ticker endpoint to fetch current price
            ticker = self.client.ticker_price(symbol=symbol)
            price = float(ticker["price"])
            logger.debug(f"{symbol} current price: {price}")
            return price
        except ValueError as e:
            error_msg = f"Invalid price data for {symbol}: {str(e)}"
            logger.error(error_msg)
            raise MarketDataException(error_msg)
        except Exception as e:
            error_msg = f"Failed to fetch current price for {symbol}: {str(e)}"
            logger.error(error_msg)
            raise MarketDataException(error_msg)
