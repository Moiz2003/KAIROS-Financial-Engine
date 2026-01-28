"""
Dependency Injection Container - Composition Root
Centralizes service initialization and wiring.

Design Pattern: Factory Pattern + Service Locator
Purpose: Single place where all services are created and composed
Principle: Application wires services in one place (composition root)

This module acts as the "Composition Root" for the entire application.
All service initialization happens here, ensuring:
- Centralized configuration
- Easy to mock/swap implementations
- Testability via fixture injection
"""

import os
from core.config import config
from core.logging_config import get_logger
from services.binance import BinanceAdapter
from services.perplexity import PerplexityAdapter
from domain.services import SignalGenerator
from domain.services.orchestrator import TradeOrchestrator
from domain.services.trade_executor import TradeExecutor

logger = get_logger(__name__)


class ServiceContainer:
    """
    DI Container: Initializes and manages all services.
    
    Responsibilities:
    - Load credentials from environment
    - Initialize adapters
    - Initialize domain services
    - Wire everything into Orchestrator
    - Provide singleton access
    
    Usage:
        container = ServiceContainer()
        orchestrator = container.get_orchestrator()
    """
    
    _instance = None  # Singleton
    
    def __new__(cls):
        """Implement singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize services (only once due to singleton)."""
        if self._initialized:
            return
        
        logger.info("Initializing Service Container...")
        
        # Initialize adapters
        self._initialize_adapters()
        
        # Initialize domain services
        self._initialize_domain_services()
        
        # Initialize orchestrator
        self._initialize_orchestrator()
        
        # Initialize trade executor
        self._initialize_trade_executor()
        
        self._initialized = True
        logger.info("Service Container initialized successfully")
    
    def _initialize_adapters(self):
        """Initialize external service adapters."""
        logger.debug("Initializing adapters...")
        
        # Binance adapter
        binance_key = os.getenv("BINANCE_API_KEY")
        binance_secret = os.getenv("BINANCE_API_SECRET")
        
        if not binance_key or not binance_secret:
            logger.warning("Binance credentials not set - adapter initialization will be deferred")
            self.binance_adapter = None
        else:
            try:
                self.binance_adapter = BinanceAdapter(binance_key, binance_secret)
                logger.info("✓ Binance adapter initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Binance adapter: {e}")
                self.binance_adapter = None
        
        # Perplexity adapter
        perplexity_key = os.getenv("PERPLEXITY_API_KEY")
        
        if not perplexity_key:
            logger.warning("Perplexity credentials not set - adapter initialization will be deferred")
            self.perplexity_adapter = None
        else:
            try:
                self.perplexity_adapter = PerplexityAdapter(perplexity_key)
                logger.info("✓ Perplexity adapter initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Perplexity adapter: {e}")
                self.perplexity_adapter = None
    
    def _initialize_domain_services(self):
        """Initialize pure domain services."""
        logger.debug("Initializing domain services...")
        
        # Signal generator (pure domain logic, no external dependencies)
        self.signal_generator = SignalGenerator(confidence_threshold=0.65)
        logger.info("✓ Signal generator initialized")
    
    def _initialize_orchestrator(self):
        """Initialize the orchestrator with all dependencies."""
        logger.debug("Initializing orchestrator...")
        
        if not self.binance_adapter:
            raise ValueError("Binance adapter required for orchestrator (check BINANCE_API_KEY, BINANCE_API_SECRET)")
        
        if not self.perplexity_adapter:
            raise ValueError("Perplexity adapter required for orchestrator (check PERPLEXITY_API_KEY)")
        
        self.orchestrator = TradeOrchestrator(
            market_provider=self.binance_adapter,
            ai_provider=self.perplexity_adapter,
            signal_generator=self.signal_generator,
        )
        logger.info("✓ Orchestrator initialized")
    
    def _initialize_trade_executor(self):
        """Initialize the trade executor."""
        logger.debug("Initializing trade executor...")
        
        if not self.binance_adapter:
            raise ValueError("Binance adapter required for trade executor (check BINANCE_API_KEY, BINANCE_API_SECRET)")
        
        self.trade_executor = TradeExecutor(
            market_provider=self.binance_adapter,
        )
        logger.info("✓ Trade executor initialized")
    
    def get_orchestrator(self) -> TradeOrchestrator:
        """
        Get the orchestrator instance.
        
        Returns:
            TradeOrchestrator: Main service for trade recommendations
        
        Raises:
            ValueError: If orchestrator not initialized
        """
        if not hasattr(self, 'orchestrator') or self.orchestrator is None:
            raise ValueError("Orchestrator not initialized. Check adapter initialization logs.")
        return self.orchestrator
    
    def get_signal_generator(self) -> SignalGenerator:
        """Get the signal generator (domain service)."""
        return self.signal_generator
    
    def get_binance_adapter(self) -> BinanceAdapter:
        """Get the Binance adapter."""
        if self.binance_adapter is None:
            raise ValueError("Binance adapter not initialized")
        return self.binance_adapter
    
    def get_perplexity_adapter(self) -> PerplexityAdapter:
        """Get the Perplexity adapter."""
        if self.perplexity_adapter is None:
            raise ValueError("Perplexity adapter not initialized")
        return self.perplexity_adapter
    
    def get_trade_executor(self) -> TradeExecutor:
        """
        Get the trade executor instance.
        
        Returns:
            TradeExecutor: Service for executing trades on Binance
        
        Raises:
            ValueError: If trade executor not initialized
        """
        if not hasattr(self, 'trade_executor') or self.trade_executor is None:
            raise ValueError("Trade executor not initialized. Check Binance adapter initialization logs.")
        return self.trade_executor


# Global singleton container
_container = None


def get_container() -> ServiceContainer:
    """
    Get or create the global service container.
    
    Returns:
        ServiceContainer: Singleton instance
    
    Usage in FastAPI routes:
        container = get_container()
        orchestrator = container.get_orchestrator()
    """
    global _container
    if _container is None:
        _container = ServiceContainer()
    return _container


def reset_container():
    """Reset the container (useful for testing)."""
    global _container
    if _container is not None:
        _container._initialized = False
    _container = None
