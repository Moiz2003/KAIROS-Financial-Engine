"""
Configuration Management (Singleton Pattern)
Loads and validates environment configuration.
Adheres to Single Responsibility Principle.
"""

import os
from typing import Optional
from dotenv import load_dotenv


class Config:
    """
    Singleton configuration class.
    Loads and validates environment variables at startup.
    
    Design Pattern: Singleton
    Reasoning: Only one configuration instance should exist across the application
    """
    
    _instance: Optional["Config"] = None
    
    def __new__(cls) -> "Config":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        load_dotenv()
        
        # Binance Configuration
        self.binance_api_key: str = os.getenv("BINANCE_API_KEY", "")
        self.binance_api_secret: str = os.getenv("BINANCE_API_SECRET", "")
        self.crypto_symbol: str = os.getenv("CRYPTO_SYMBOL", "BTCUSDT")
        self.kline_interval: str = os.getenv("KLINE_INTERVAL", "4h")
        
        # Perplexity Configuration
        self.perplexity_api_key: str = os.getenv("PERPLEXITY_API_KEY", "")
        self.perplexity_model: str = os.getenv("PERPLEXITY_MODEL", "sonar-pro")
        
        # Risk Management Configuration
        self.max_position_size_pct: float = float(os.getenv("MAX_POSITION_SIZE_PCT", "0.05"))
        self.max_drawdown_pct: float = float(os.getenv("MAX_DRAWDOWN_PCT", "0.10"))
        self.min_signal_confidence: float = float(os.getenv("MIN_SIGNAL_CONFIDENCE", "0.65"))
        
        # API Configuration
        self.api_host: str = os.getenv("API_HOST", "0.0.0.0")
        self.api_port: int = int(os.getenv("API_PORT", "8000"))
        self.api_workers: int = int(os.getenv("API_WORKERS", "4"))
        
        # Logging Configuration
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO")
        self.log_format: str = os.getenv("LOG_FORMAT", "json")
        
        # JWT / Authentication Configuration
        self.jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
        self.jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_access_token_expire_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.google_oauth_client_id: str = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
        self.google_oauth_client_secret: str = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
        
        # MongoDB
        self.mongo_uri: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/kairos_engine")

        # CORS — browsers reject wildcard origins when credentials=True
        self.allowed_origins: list[str] = [
            o.strip()
            for o in os.getenv(
                "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
            ).split(",")
            if o.strip()
        ]

        # Cookie security — must be True in production (requires HTTPS)
        self.cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"

        # Pre-computed RBAC roles
        self.admin_api_key: str = os.getenv("ADMIN_API_KEY", "")
        
        self._initialized = True
    
    def validate(self) -> bool:
        """Validate critical configuration is present."""
        required_keys = [
            self.binance_api_key,
            self.binance_api_secret,
            self.perplexity_api_key,
        ]
        
        if not all(required_keys):
            raise ValueError(
                "Missing required environment variables. "
                "Ensure BINANCE_API_KEY, BINANCE_API_SECRET, and PERPLEXITY_API_KEY are set."
            )
        
        return True


# Global singleton instance
config = Config()
