"""
Trade Executor Domain Service
Validates and prepares trades for execution.

Design Pattern: Domain Service (Business Rules)
"""

from datetime import datetime
from core.exceptions import ValidationException
from core.logging_config import get_logger
from domain.models import RiskAssessment, ExecutionResult, TradeAction

logger = get_logger(__name__)


class TradeExecutor:
    """
    Pure domain service for trade validation.
    
    Responsibility: Validate trade constraints
    Dependencies: Injected executor service (for actual execution)
    """
    
    @staticmethod
    def validate_execution(
        assessment: RiskAssessment,
        quantity: float,
        symbol: str,
    ) -> bool:
        """
        Validate that trade meets constraints.
        
        Args:
            assessment: Risk assessment for this trade
            quantity: Trade quantity
            symbol: Trading symbol
        
        Returns:
            True if valid
        
        Raises:
            ValidationException: If invalid
        """
        if not assessment.approved:
            raise ValidationException("Risk assessment did not approve trade")
        
        if quantity <= 0:
            raise ValidationException("Quantity must be positive")
        
        if quantity > assessment.max_position_size:
            raise ValidationException(
                f"Quantity {quantity} exceeds max position "
                f"{assessment.max_position_size}"
            )
        
        if not symbol or len(symbol) < 3:
            raise ValidationException(f"Invalid symbol: {symbol}")
        
        return True
    
    @staticmethod
    def create_execution_result(
        success: bool,
        order_id: str,
        symbol: str,
        action: TradeAction,
        quantity: float,
        fill_price: float,
        error_message: str = "",
    ) -> ExecutionResult:
        """Create a properly formed execution result."""
        return ExecutionResult(
            success=success,
            order_id=order_id,
            symbol=symbol,
            action=action,
            quantity=quantity,
            fill_price=fill_price,
            timestamp=datetime.utcnow(),
            error_message=error_message,
        )
