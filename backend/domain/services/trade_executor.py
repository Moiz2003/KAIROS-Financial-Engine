"""
Trade Execution Service - Facade for Binance Order Execution
Executes buy/sell orders safely using Binance test orders.

Design Pattern: Adapter Pattern + Facade
Purpose: Isolate trade execution logic and wrap Binance API calls
Safety: Uses create_test_order by default (not new_order)
"""

from datetime import datetime
from typing import Optional
from core.exceptions import TradeExecutionException
from core.logging_config import get_logger
from domain.models import TradeSignal, TradeAction, ExecutionResult
from services.abstractions import IMarketDataProvider

logger = get_logger(__name__)


class TradeExecutor:
    """
    Facade for executing trades on Binance.
    
    Responsibility:
    1. Accept a TradeSignal
    2. Calculate position size (hardcoded to 0.001 BTC for MVP)
    3. Send order to Binance using test_order (safe by default)
    4. Return ExecutionResult
    
    Safety Mechanism:
    - Uses new_order_test by default (simulated, no real execution)
    - Can be switched to new_order for production
    - Validates signal and position size before execution
    - Wraps all Binance exceptions as TradeExecutionException
    
    Design Principle:
    - Stateless: No state between executions
    - Idempotent-safe: Each call is independent
    - Transparent error handling: Exceptions propagate with context
    """
    
    # MVP Configuration
    POSITION_SIZE_BTC = 0.001  # Hardcoded to 0.001 BTC for MVP
    
    def __init__(self, market_provider: IMarketDataProvider):
        """
        Initialize Trade Executor with market data provider.
        
        Args:
            market_provider: IMarketDataProvider (Binance adapter) for price lookups
        
        Raises:
            ValueError: If market_provider is None
        """
        if market_provider is None:
            raise ValueError("market_provider (IMarketDataProvider) is required")
        
        self.market_provider = market_provider
        logger.info("TradeExecutor initialized with market data provider")
    
    def execute_trade(self, signal: TradeSignal, symbol: str = "BTCUSDT") -> ExecutionResult:
        """
        Execute a trade based on a TradeSignal.
        
        CRITICAL LOGIC:
        1. Validate the signal (action must be BUY or SELL)
        2. Get current price from market provider
        3. Calculate quantity based on POSITION_SIZE_BTC
        4. Send test order to Binance
        5. Return ExecutionResult
        
        Args:
            signal: TradeSignal object with action, confidence, reasoning
            symbol: Trading pair (default "BTCUSDT")
        
        Returns:
            ExecutionResult: Order ID, status, price, timestamp
        
        Raises:
            TradeExecutionException: If order execution fails
        """
        try:
            logger.info(f"Executing trade signal: {signal.action} for {symbol}")
            
            # STEP 1: Validate signal
            if signal.action == TradeAction.HOLD:
                raise TradeExecutionException("Cannot execute HOLD signal")
            
            logger.debug(f"Signal validation passed: {signal.action}, confidence={signal.confidence}")
            
            # STEP 2: Get current price
            try:
                current_price = self.market_provider.get_current_price(symbol)
                logger.debug(f"Current {symbol} price: {current_price}")
            except Exception as e:
                error_msg = f"Failed to get current price for {symbol}: {str(e)}"
                logger.error(error_msg)
                raise TradeExecutionException(error_msg)
            
            # STEP 3: Calculate quantity
            # Position size is fixed at 0.001 BTC
            quantity = self.POSITION_SIZE_BTC
            logger.debug(f"Position size: {quantity} BTC at price {current_price} = {quantity * current_price} USDT")
            
            # STEP 4: Send test order to Binance
            try:
                order_result = self._send_test_order(
                    symbol=symbol,
                    side=signal.action.value,  # "BUY" or "SELL"
                    quantity=quantity,
                    price=current_price
                )
                logger.info(f"Test order executed successfully: {order_result}")
            except Exception as e:
                error_msg = f"Failed to execute test order: {str(e)}"
                logger.error(error_msg)
                raise TradeExecutionException(error_msg)
            
            # STEP 5: Build and return ExecutionResult
            execution = ExecutionResult(
                success=True,
                order_id=order_result.get("orderId", "TEST-" + str(int(datetime.now().timestamp()))),
                symbol=symbol,
                action=signal.action,
                quantity=quantity,
                fill_price=current_price,
                timestamp=datetime.now(),
                error_message=""
            )
            
            logger.info(f"Trade execution completed: {execution.order_id}")
            return execution
            
        except TradeExecutionException:
            raise  # Re-raise known exceptions
        except Exception as e:
            error_msg = f"Unexpected error during trade execution: {str(e)}"
            logger.error(error_msg)
            raise TradeExecutionException(error_msg)
    
    def _send_test_order(self, symbol: str, side: str, quantity: float, price: float) -> dict:
        """
        Send a TEST order to Binance using new_order_test.
        
        SAFETY: This uses new_order_test (simulated), not new_order (real execution).
        This is the MVP default. Production can switch to new_order if needed.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            side: "BUY" or "SELL"
            quantity: Order quantity in BTC
            price: Limit price in USDT
        
        Returns:
            dict: Order response from Binance (contains orderId, status, etc.)
        
        Raises:
            Exception: If Binance API call fails
        """
        try:
            logger.debug(f"Sending TEST order: {side} {quantity} {symbol} @ {price}")
            
            # Access the underlying Binance client from market_provider
            # The market_provider (BinanceAdapter) wraps the Spot client
            if not hasattr(self.market_provider, 'client'):
                raise ValueError("market_provider must be BinanceAdapter with client attribute")
            
            binance_client = self.market_provider.client
            
            # Use new_order_test for MVP (safe, simulated)
            order = binance_client.new_order_test(
                symbol=symbol,
                side=side,
                type="LIMIT",
                timeInForce="GTC",  # Good-Till-Cancelled
                quantity=quantity,
                price=price
            )
            
            logger.debug(f"Test order response: {order}")
            return order
            
        except Exception as e:
            error_msg = f"Binance test order failed: {str(e)}"
            logger.error(error_msg)
            raise
    
    def _send_real_order(self, symbol: str, side: str, quantity: float, price: float) -> dict:
        """
        Send a REAL order to Binance using new_order.
        
        WARNING: This executes REAL trades and deducts funds from the account.
        Only use in production after extensive testing with test_order.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            side: "BUY" or "SELL"
            quantity: Order quantity in BTC
            price: Limit price in USDT
        
        Returns:
            dict: Order response from Binance (contains orderId, status, fills, etc.)
        
        Raises:
            Exception: If Binance API call fails
        """
        try:
            logger.warning(f"REAL ORDER: {side} {quantity} {symbol} @ {price}")
            
            if not hasattr(self.market_provider, 'client'):
                raise ValueError("market_provider must be BinanceAdapter with client attribute")
            
            binance_client = self.market_provider.client
            
            # Use new_order for REAL execution
            order = binance_client.new_order(
                symbol=symbol,
                side=side,
                type="LIMIT",
                timeInForce="GTC",  # Good-Till-Cancelled
                quantity=quantity,
                price=price
            )
            
            logger.warning(f"REAL order executed: {order}")
            return order
            
        except Exception as e:
            error_msg = f"Binance real order failed: {str(e)}"
            logger.error(error_msg)
            raise
