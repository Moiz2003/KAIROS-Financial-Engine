"""
Domain Layer - Core Entities
Business logic implementations with zero external dependencies.

Pure domain logic - NO framework imports (no fastapi, ccxt, openai)
Only: Standard library + pandas/pandas-ta
"""

from typing import List, Dict, Any
from datetime import datetime
from statistics import mean


class MarketAnalyzer:
    """
    Pure domain entity for technical analysis.
    
    Responsibility: Compute indicators from price data
    - NO external dependencies (framework-agnostic, pure logic)
    - NO side effects (pure functions)
    - Accepts raw data (List[Dict] or List[float])
    - Returns immutable AnalysisResult value object
    
    Design Principles:
    - Single Responsibility: Only computes indicators
    - Pure Functions: No side effects, no I/O, no external calls
    - Testable: No mocks, no external dependencies needed
    - Framework-Agnostic: Can work with any framework (FastAPI, gRPC, CLI)
    """
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> float:
        """
        Calculate Relative Strength Index using standard formula.
        
        RSI = 100 - (100 / (1 + RS))
        where RS = Average Gain / Average Loss
        
        Args:
            prices: List of closing prices (oldest first, ascending order)
            period: RSI period (default 14)
        
        Returns:
            RSI value between 0-100
        
        Raises:
            ValueError: If input is invalid
        """
        if len(prices) < period + 1:
            raise ValueError(
                f"Need at least {period + 1} prices to calculate RSI, got {len(prices)}"
            )
        
        if period < 1:
            raise ValueError(f"Period must be >= 1, got {period}")
        
        # Calculate price changes
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(change))
        
        # Use only last 'period' candles for average
        recent_gains = gains[-period:]
        recent_losses = losses[-period:]
        
        avg_gain = mean(recent_gains) if recent_gains else 0.0
        avg_loss = mean(recent_losses) if recent_losses else 0.0
        
        # Handle edge cases
        if avg_loss == 0:
            return 100.0 if avg_gain > 0 else 50.0
        
        # Standard RSI formula
        rs = avg_gain / avg_loss
        rsi = 100.0 - (100.0 / (1.0 + rs))
        
        return round(rsi, 2)
    
    @staticmethod
    def calculate_ema(prices: List[float], period: int = 200) -> float:
        """
        Calculate Exponential Moving Average.
        
        EMA = Price(t) * Multiplier + EMA(t-1) * (1 - Multiplier)
        Multiplier = 2 / (period + 1)
        
        Args:
            prices: List of closing prices (oldest first, ascending order)
            period: EMA period (default 200)
        
        Returns:
            EMA value
        
        Raises:
            ValueError: If input is invalid
        """
        if len(prices) < period:
            raise ValueError(
                f"Need at least {period} prices to calculate EMA, got {len(prices)}"
            )
        
        if period < 1:
            raise ValueError(f"Period must be >= 1, got {period}")
        
        # Standard EMA formula
        multiplier = 2.0 / (period + 1.0)
        ema = mean(prices[:period])
        
        # Apply EMA calculation to remaining prices
        for price in prices[period:]:
            ema = price * multiplier + ema * (1.0 - multiplier)
        
        return round(ema, 2)
    
    @staticmethod
    def detect_trend(current_price: float, ema_200: float, threshold: float = 0.01) -> str:
        """
        Determine market trend from price relative to 200-period EMA.
        
        Trend Rules:
        - BULLISH: Price > EMA + (EMA * threshold)
        - BEARISH: Price < EMA - (EMA * threshold)
        - NEUTRAL: Otherwise
        
        Args:
            current_price: Current market price
            ema_200: 200-period exponential moving average
            threshold: Percentage threshold for trend confirmation (default 0.01 = 1%)
        
        Returns:
            "BULLISH", "BEARISH", or "NEUTRAL"
        
        Raises:
            ValueError: If inputs are invalid
        """
        if current_price <= 0:
            raise ValueError(f"Price must be positive, got {current_price}")
        if ema_200 <= 0:
            raise ValueError(f"EMA must be positive, got {ema_200}")
        if threshold < 0:
            raise ValueError(f"Threshold must be non-negative, got {threshold}")
        
        upper_band = ema_200 * (1.0 + threshold)
        lower_band = ema_200 * (1.0 - threshold)
        
        if current_price > upper_band:
            return "BULLISH"
        elif current_price < lower_band:
            return "BEARISH"
        else:
            return "NEUTRAL"


class Portfolio:
    """
    Mutable entity representing current positions and account state.
    
    Responsibility: Track holdings and calculate account metrics
    - Pure domain logic, NO external dependencies
    - Tracks positions, cash, and portfolio state
    - Calculates P&L and drawdown metrics
    """
    
    def __init__(self, initial_balance: float):
        """
        Initialize portfolio with starting balance.
        
        Args:
            initial_balance: Starting account balance
        
        Raises:
            ValueError: If initial_balance <= 0
        """
        if initial_balance <= 0:
            raise ValueError(f"Initial balance must be positive, got {initial_balance}")
        
        self.initial_balance = initial_balance
        self.current_cash = initial_balance
        self.positions: Dict[str, Dict[str, float]] = {}  # symbol -> {quantity, entry_price}
    
    def add_position(self, symbol: str, quantity: float, entry_price: float) -> None:
        """
        Add or update a position.
        
        Args:
            symbol: Trading symbol (e.g., "BTCUSDT")
            quantity: Position quantity
            entry_price: Entry price per unit
        
        Raises:
            ValueError: If quantity or entry_price <= 0
        """
        if quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {quantity}")
        if entry_price <= 0:
            raise ValueError(f"Entry price must be positive, got {entry_price}")
        if not symbol or len(symbol) < 3:
            raise ValueError(f"Invalid symbol: {symbol}")
        
        if symbol in self.positions:
            self.positions[symbol]["quantity"] += quantity
        else:
            self.positions[symbol] = {
                "quantity": quantity,
                "entry_price": entry_price,
            }
        
        # Update cash
        self.current_cash -= quantity * entry_price
    
    def close_position(self, symbol: str, exit_price: float) -> float:
        """
        Close a position and calculate P&L.
        
        Args:
            symbol: Trading symbol
            exit_price: Exit price per unit
        
        Returns:
            Profit/Loss from the position
        
        Raises:
            ValueError: If position doesn't exist or exit_price < 0
        """
        if symbol not in self.positions:
            raise ValueError(f"No position in {symbol}")
        if exit_price < 0:
            raise ValueError(f"Exit price must be non-negative, got {exit_price}")
        
        position = self.positions[symbol]
        pnl = position["quantity"] * (exit_price - position["entry_price"])
        
        del self.positions[symbol]
        self.current_cash += position["quantity"] * exit_price
        
        return round(pnl, 2)
    
    def get_total_value(self, current_prices: Dict[str, float]) -> float:
        """
        Calculate portfolio total value.
        
        Args:
            current_prices: Dict of {symbol: current_price}
        
        Returns:
            Total portfolio value in USD
        """
        unrealized = sum(
            self.positions[symbol]["quantity"] * current_prices.get(symbol, 0)
            for symbol in self.positions
        )
        return round(self.current_cash + unrealized, 2)
    
    def calculate_drawdown(self, current_prices: Dict[str, float]) -> float:
        """
        Calculate current drawdown percentage.
        
        Drawdown = (Peak Value - Current Value) / Peak Value * 100
        
        Args:
            current_prices: Dict of {symbol: current_price}
        
        Returns:
            Drawdown percentage (0-100)
        """
        peak_value = self.initial_balance
        current_value = self.get_total_value(current_prices)
        
        if current_value >= peak_value:
            return 0.0
        
        drawdown = (peak_value - current_value) / peak_value * 100.0
        return round(drawdown, 2)
