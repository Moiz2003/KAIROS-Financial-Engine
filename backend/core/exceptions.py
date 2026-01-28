"""
Custom Domain Exceptions
All exceptions should inherit from KairosException for consistent error handling.
"""


class KairosException(Exception):
    """Base exception for all KAIROS domain errors."""
    
    def __init__(self, message: str, error_code: str = "KAIROS_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ConfigurationException(KairosException):
    """Raised when configuration is invalid or missing."""
    
    def __init__(self, message: str):
        super().__init__(message, "CONFIG_ERROR")


class MarketDataException(KairosException):
    """Raised when market data cannot be retrieved."""
    
    def __init__(self, message: str):
        super().__init__(message, "MARKET_DATA_ERROR")


class AIContextException(KairosException):
    """Raised when AI context (news, analysis) cannot be retrieved."""
    
    def __init__(self, message: str):
        super().__init__(message, "AI_CONTEXT_ERROR")


class SignalGenerationException(KairosException):
    """Raised when signal generation fails."""
    
    def __init__(self, message: str):
        super().__init__(message, "SIGNAL_GENERATION_ERROR")


class RiskAssessmentException(KairosException):
    """Raised when risk assessment fails."""
    
    def __init__(self, message: str):
        super().__init__(message, "RISK_ASSESSMENT_ERROR")


class TradeExecutionException(KairosException):
    """Raised when trade execution fails."""
    
    def __init__(self, message: str):
        super().__init__(message, "TRADE_EXECUTION_ERROR")


class ValidationException(KairosException):
    """Raised when domain validation fails."""
    
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")
