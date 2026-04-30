"""
Domain Layer - News Contracts and Value Objects
Defines the domain contract for news ingestion and immutable news article model.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass(frozen=True)
class NewsArticle:
    """
    Immutable value object representing a single news article headline.
    """

    title: str
    source: str
    timestamp: datetime
    url: str

    def __post_init__(self):
        if not self.title or not self.title.strip():
            raise ValueError("NewsArticle.title is required")
        if not self.source or not self.source.strip():
            raise ValueError("NewsArticle.source is required")
        if not self.url or not self.url.strip():
            raise ValueError("NewsArticle.url is required")


class INewsProvider(ABC):
    """
    Domain contract for fetching latest cryptocurrency headlines.
    """

    @abstractmethod
    def get_latest_headlines(self, symbol: str, limit: int = 10) -> List[NewsArticle]:
        """
        Fetch latest news headlines for a cryptocurrency symbol.

        Args:
            symbol: Crypto symbol (e.g., "BTC" or "BTCUSDT")
            limit: Maximum headlines to return

        Returns:
            List of immutable NewsArticle value objects.
        """
        pass
