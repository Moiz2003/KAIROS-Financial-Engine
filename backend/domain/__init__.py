"""
Domain Layer - Entity Implementations
Core business logic following SOLID principles.
"""

from . import models
from .news import INewsProvider, NewsArticle

__all__ = [
    "models",
    "INewsProvider",
    "NewsArticle",
]
