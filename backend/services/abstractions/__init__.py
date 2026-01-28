"""
Service Layer - Abstractions (Interfaces)
Define contracts for external service integrations.

Design Pattern: Adapter Pattern + Dependency Inversion Principle
Reasoning: Business logic depends on abstractions, not concrete implementations
"""

from abc import ABC, abstractmethod
from typing import List, Dict
from domain.models import ExecutionResult, TradeAction


class IMarketDataProvider(ABC):
    """
    Interface for market data sources.
    
    Implementations: BinanceMarketData, MockMarketData, etc.
    """
    
    @abstractmethod
    def get_klines(
        self,
        symbol: str,
        interval: str,
        limit: int = 100,
    ) -> List[List]:
        """
        Fetch candlestick data.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            interval: Kline interval (e.g., "4h")
            limit: Number of candles to fetch
        
        Returns:
            List of [time, open, high, low, close, volume, ...]
        """
        pass
    
    @abstractmethod
    def get_current_price(self, symbol: str) -> float:
        """
        Fetch current price.
        
        Args:
            symbol: Trading pair
        
        Returns:
            Current price
        """
        pass


class IAIContextProvider(ABC):
    """
    Interface for AI-driven context (news, sentiment).
    
    Implementations: PerplexityAI, MockAI, etc.
    """
    
    @abstractmethod
    def get_news_sentiment(self, topic: str, context: str) -> str:
        """
        Analyze news and return sentiment.
        
        Args:
            topic: Topic to analyze (e.g., "Bitcoin")
            context: Additional context to consider
        
        Returns:
            Sentiment: "positive", "negative", or "neutral"
        """
        pass
    
    @abstractmethod
    def get_reasoning(
        self,
        symbol: str,
        technical_context: str,
    ) -> str:
        """
        Get AI reasoning for market action.
        
        Args:
            symbol: Trading pair
            technical_context: Technical analysis context
        
        Returns:
            AI reasoning text
        """
        pass


class ITradeExecutorService(ABC):
    """
    Interface for trade execution.
    
    Implementations: BinanceExecutor, MockExecutor, etc.
    """
    
    @abstractmethod
    def execute_trade(
        self,
        symbol: str,
        action: TradeAction,
        quantity: float,
        price: float,
    ) -> ExecutionResult:
        """
        Execute a trade on the exchange.
        
        Args:
            symbol: Trading pair
            action: BUY, SELL, or HOLD
            quantity: Trade quantity
            price: Target price
        
        Returns:
            ExecutionResult with outcome
        """
        pass
    
    @abstractmethod
    def get_account_balance(self) -> Dict[str, float]:
        """
        Get current account balance.
        
        Returns:
            Dict of {asset: quantity}
        """
        pass
