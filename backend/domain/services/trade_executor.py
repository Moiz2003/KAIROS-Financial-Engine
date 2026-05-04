"""
Trade Execution Service - Facade for Binance Order Execution
Executes buy/sell orders safely using Binance test orders.

Design Pattern: Adapter Pattern + Facade
Purpose: Isolate trade execution logic and wrap Binance API calls
Safety: Uses create_test_order by default (not new_order)
"""

import os
from decimal import Decimal, ROUND_DOWN
from datetime import datetime
from core.exceptions import TradeExecutionException
from core.logging_config import get_logger
from domain.models import TradeSignal, TradeAction, ExecutionResult
from services.abstractions import IMarketDataProvider

logger = get_logger(__name__)

# FR26 — Module-level SAFETY_BLOCK: fires at import time.
# If someone sets BINANCE_MAINNET=true the entire module refuses to load,
# making accidental real-money execution structurally impossible.
if os.getenv("BINANCE_MAINNET", "false").strip().lower() == "true":
    raise RuntimeError(
        "SAFETY_BLOCK: BINANCE_MAINNET=true detected. "
        "Real-money execution is disabled in this build. "
        "Unset BINANCE_MAINNET to use testnet mode."
    )


class TradeExecutor:
    """
    Facade for executing trades on Binance.

    Responsibility:
    1. Accept a TradeSignal + USDT amount
    2. Run the FR26 risk gate (RiskManager.assess())
    3. Calculate quantity = amount / current_price, floored to exchange stepSize
    4. Send order to Binance using test_order (safe by default)
    5. Return ExecutionResult

    Safety Mechanism:
    - Triple SAFETY_BLOCK (module, __init__, execute_trade) rejects BINANCE_MAINNET=true
    - Uses new_order_test by default (simulated, no real execution)
    """

    # Fallback step sizes (BTC=5 decimal places on Binance spot)
    _STEP_SIZES: dict = {
        "BTCUSDT": 0.00001,
        "ETHUSDT": 0.0001,
        "SOLUSDT": 0.01,
        "BNBUSDT": 0.001,
        "ADAUSDT": 1.0,
    }

    def __init__(self, market_provider: IMarketDataProvider):
        # Belt-and-suspenders __init__ guard (FR26)
        if os.getenv("BINANCE_MAINNET", "false").strip().lower() == "true":
            raise RuntimeError("SAFETY_BLOCK: BINANCE_MAINNET=true detected.")

        if market_provider is None:
            raise ValueError("market_provider (IMarketDataProvider) is required")

        self.market_provider = market_provider

        # Lazy import avoids circular import at module load time
        # (orchestrator.py → domain.services → trade_executor.py → orchestrator.py)
        from domain.services.orchestrator import RiskManager
        self._risk_manager = RiskManager()

        logger.info("TradeExecutor initialized with market data provider")

    async def execute_trade(
        self,
        signal: TradeSignal,
        symbol: str = "BTCUSDT",
        amount: float = 500.0,
        account_balance: float = 10_000.0,
    ) -> ExecutionResult:
        """
        Execute a trade based on a TradeSignal.

        CRITICAL LOGIC:
        1. Innermost SAFETY_BLOCK guard (FR26)
        2. Validate signal (BUY or SELL only)
        3. FR26 Risk gate — RiskManager.assess() must approve
        4. Fetch current price from market provider
        5. quantity = amount / current_price, floored to exchange stepSize
        6. Send test order to Binance
        7. Return ExecutionResult

        Args:
            signal:          TradeSignal from the orchestration pipeline
            symbol:          Trading pair (default "BTCUSDT")
            amount:          USDT notional the user wants to trade (default 500 USDT)
            account_balance: Total account balance used by risk gate (default 10 000 USDT)

        Returns:
            ExecutionResult: Order ID, status, price, quantity, timestamp

        Raises:
            TradeExecutionException: If risk gate rejects or order execution fails
        """
        # Innermost guard — catches env changes at runtime (FR26)
        if os.getenv("BINANCE_MAINNET", "false").strip().lower() == "true":
            raise RuntimeError("SAFETY_BLOCK: BINANCE_MAINNET=true detected.")

        try:
            logger.info(f"Executing trade signal: {signal.action} for {symbol}")

            # STEP 1: Validate signal
            if signal.action == TradeAction.HOLD:
                raise TradeExecutionException("Cannot execute HOLD signal")

            # STEP 2: FR26 Risk gate
            risk = self._risk_manager.assess(signal, account_balance)
            if not risk.approved:
                reason = "; ".join(risk.warnings) if risk.warnings else "risk gate rejected"
                logger.warning("Risk gate rejected trade for %s: %s", symbol, reason)
                raise TradeExecutionException(f"Risk gate rejected: {reason}")

            logger.debug(
                "Risk gate approved — risk_score=%.3f, max_position=%.2f",
                risk.risk_score,
                risk.max_position_size,
            )

            # STEP 3: Get current price
            try:
                current_price = await self.market_provider.get_current_price(symbol)
                logger.debug(f"Current {symbol} price: {current_price}")
            except Exception as e:
                error_msg = f"Failed to get current price for {symbol}: {str(e)}"
                logger.error(error_msg)
                raise TradeExecutionException(error_msg)

            # STEP 4: Calculate quantity from user-supplied USDT amount
            step_size = self._get_step_size(symbol)
            raw_quantity = float(amount) / float(current_price)
            quantity = self._floor_to_step(raw_quantity, step_size)
            if quantity <= 0:
                raise TradeExecutionException(
                    f"Calculated quantity {raw_quantity:.8f} is below minimum "
                    f"stepSize {step_size} for {symbol}"
                )
            notional = quantity * float(current_price)
            logger.debug(
                "Position size: %.8f %s @ %s = %.4f USDT (requested %.2f USDT)",
                quantity, symbol, current_price, notional, amount,
            )
            try:
                order_result = self._send_test_order(
                    symbol=symbol,
                    side=signal.action.value,
                    quantity=quantity,
                    price=current_price,
                )
                logger.info(f"Test order executed successfully: {order_result}")
            except Exception as e:
                error_msg = f"Failed to execute test order: {str(e)}"
                logger.error(error_msg)
                raise TradeExecutionException(error_msg)

            # STEP 5: Build and return ExecutionResult
            execution = ExecutionResult(
                success=True,
                order_id=order_result.get(
                    "orderId", "TEST-" + str(int(datetime.now().timestamp()))
                ),
                symbol=symbol,
                action=signal.action,
                quantity=quantity,
                fill_price=float(current_price),
                timestamp=datetime.now(),
                error_message="",
            )

            logger.info(f"Trade execution completed: {execution.order_id}")
            return execution

        except TradeExecutionException:
            raise
        except Exception as e:
            error_msg = f"Unexpected error during trade execution: {str(e)}"
            logger.error(error_msg)
            raise TradeExecutionException(error_msg)

    def _get_step_size(self, symbol: str) -> float:
        """Return the LOT_SIZE stepSize for *symbol* from Binance, or a known default."""
        try:
            binance_client = self.market_provider.client
            info = binance_client.exchange_info(symbol=symbol)
            for f in info.get("filters", []):
                if f.get("filterType") == "LOT_SIZE":
                    step = float(f["stepSize"])
                    if step > 0:
                        return step
        except Exception as exc:
            logger.warning("Could not fetch stepSize for %s, using default: %s", symbol, exc)
        return self._STEP_SIZES.get(symbol, 0.00001)

    @staticmethod
    def _floor_to_step(quantity: float, step_size: float) -> float:
        """Floor *quantity* down to the nearest valid *step_size* increment."""
        step = Decimal(str(step_size))
        qty = Decimal(str(quantity))
        floored = (qty / step).to_integral_value(rounding=ROUND_DOWN) * step
        return float(floored)

    def _send_test_order(
        self, symbol: str, side: str, quantity: float, price: float
    ) -> dict:
        """
        Send a TEST order to Binance using new_order_test.

        SAFETY: Simulated — no real funds are moved.
        """
        try:
            logger.debug(f"Sending TEST order: {side} {quantity} {symbol} @ {price}")

            if not hasattr(self.market_provider, "client"):
                raise ValueError(
                    "market_provider must be BinanceAdapter with client attribute"
                )

            binance_client = self.market_provider.client

            order = binance_client.new_order_test(
                symbol=symbol,
                side=side,
                type="LIMIT",
                timeInForce="GTC",
                quantity=quantity,
                price=price,
            )

            logger.debug(f"Test order response: {order}")
            return order

        except Exception as e:
            logger.error(f"Binance test order failed: {str(e)}")
            raise

    def _send_real_order(
        self, symbol: str, side: str, quantity: float, price: float
    ) -> dict:
        """
        Send a REAL order to Binance.

        WARNING: Deducts real funds. Only use after extensive testnet testing.
        The module-level SAFETY_BLOCK prevents this from ever being reached
        unless BINANCE_MAINNET is set — which itself is blocked at import.
        """
        try:
            logger.warning(f"REAL ORDER: {side} {quantity} {symbol} @ {price}")

            if not hasattr(self.market_provider, "client"):
                raise ValueError(
                    "market_provider must be BinanceAdapter with client attribute"
                )

            binance_client = self.market_provider.client

            order = binance_client.new_order(
                symbol=symbol,
                side=side,
                type="LIMIT",
                timeInForce="GTC",
                quantity=quantity,
                price=price,
            )

            logger.warning(f"REAL order executed: {order}")
            return order

        except Exception as e:
            logger.error(f"Binance real order failed: {str(e)}")
            raise
