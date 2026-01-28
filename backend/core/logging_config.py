"""
Logging Configuration (Singleton Pattern)
Centralizes logging setup to ensure consistent logging across the application.

Design Pattern: Singleton
Reasoning: Logging infrastructure should be initialized once and shared globally
"""

import logging
import logging.config
import json
from typing import Optional


class LoggingConfig:
    """Centralized logging configuration."""
    
    _instance: Optional["LoggingConfig"] = None
    _logger: Optional[logging.Logger] = None
    
    def __new__(cls) -> "LoggingConfig":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @staticmethod
    def setup_logging(
        level: str = "INFO",
        log_format: str = "text"
    ) -> logging.Logger:
        """
        Setup application logging.
        
        Args:
            level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            log_format: Output format (text or json)
        
        Returns:
            Configured logger instance
        """
        
        if LoggingConfig._logger is not None:
            return LoggingConfig._logger
        
        # Create logger
        logger = logging.getLogger("kairos")
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        
        # Clear existing handlers
        logger.handlers = []
        
        # Create console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        
        # Create formatter
        if log_format.lower() == "json":
            formatter = JsonFormatter()
        else:
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
        
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        LoggingConfig._logger = logger
        return logger


class JsonFormatter(logging.Formatter):
    """JSON logging formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


def setup_logging(
    level: str = "INFO",
    log_format: str = "text"
) -> logging.Logger:
    """
    Convenience function to setup logging.
    
    Args:
        level: Logging level
        log_format: Output format
    
    Returns:
        Configured logger instance
    """
    return LoggingConfig.setup_logging(level, log_format)


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger.
    
    Args:
        name: Logger name (typically __name__ from the module)
    
    Returns:
        Named logger instance
    """
    return logging.getLogger(f"kairos.{name}")
