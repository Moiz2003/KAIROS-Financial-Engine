"""
News Adapter - Data Ingestion
Implements INewsProvider using CryptoPanic's public API.

Scope for FR18 Phase 1:
- HTTP request handling
- Error handling
- Payload mapping to immutable NewsArticle objects
- No sentiment or AI logic
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from domain.news import INewsProvider, NewsArticle


class CryptoPanicAdapter(INewsProvider):
    """
    Adapter for fetching latest crypto headlines from CryptoPanic.

    Environment:
        CRYPTOPANIC_API_KEY: API token (recommended)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://cryptopanic.com/api/v1/posts/",
        timeout: float = 10.0,
    ):
        self.api_key = api_key or os.getenv("CRYPTOPANIC_API_KEY")
        self.base_url = base_url
        self.timeout = timeout

    def get_latest_headlines(self, symbol: str, limit: int = 10) -> List[NewsArticle]:
        """
        Fetch the latest news headlines for a symbol.

        Args:
            symbol: Cryptocurrency symbol (e.g. BTC, ETH, BTCUSDT)
            limit: Maximum number of headlines to return (default 10)

        Returns:
            A list of NewsArticle dataclasses.

        Raises:
            ValueError: Invalid symbol/limit input.
            RuntimeError: Network/API/payload issues.
        """
        if not symbol or not symbol.strip():
            raise ValueError("symbol is required")
        if limit < 1:
            raise ValueError("limit must be >= 1")

        currency = self._normalize_symbol(symbol)

        params: Dict[str, Any] = {
            "currencies": currency,
            "kind": "news",
            "public": "true",
        }
        if self.api_key:
            params["auth_token"] = self.api_key

        request_url = f"{self.base_url}?{urlencode(params)}"

        try:
            request = Request(request_url, method="GET")
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                payload = json.loads(raw)
        except TimeoutError as exc:
            raise RuntimeError(f"News provider timeout for symbol={currency}") from exc
        except HTTPError as exc:
            raise RuntimeError(
                f"News provider HTTP error {exc.code} for symbol={currency}"
            ) from exc
        except URLError as exc:
            raise RuntimeError(f"News provider request failed for symbol={currency}") from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError("News provider returned invalid JSON payload") from exc

        results = payload.get("results") if isinstance(payload, dict) else None
        if not isinstance(results, list):
            raise RuntimeError("News provider payload missing 'results' list")

        articles: List[NewsArticle] = []
        for item in results:
            article = self._map_article(item)
            if article is not None:
                articles.append(article)
            if len(articles) >= limit:
                break

        return articles

    @staticmethod
    def _normalize_symbol(symbol: str) -> str:
        raw = symbol.upper().replace("/", "").strip()
        for suffix in ("USDT", "USD", "USDC", "BUSD"):
            if raw.endswith(suffix) and len(raw) > len(suffix):
                return raw[: -len(suffix)]
        return raw

    @staticmethod
    def _parse_timestamp(value: Any) -> Optional[datetime]:
        if not value or not isinstance(value, str):
            return None

        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None

    def _map_article(self, item: Any) -> Optional[NewsArticle]:
        if not isinstance(item, dict):
            return None

        title = str(item.get("title") or "").strip()
        source_obj = item.get("source") or {}
        source = (
            str(source_obj.get("title") or "").strip()
            if isinstance(source_obj, dict)
            else str(source_obj).strip()
        )
        url = str(item.get("url") or "").strip()

        timestamp = self._parse_timestamp(item.get("published_at") or item.get("created_at"))

        if not title or not source or not url or timestamp is None:
            return None

        return NewsArticle(
            title=title,
            source=source,
            timestamp=timestamp,
            url=url,
        )


class FreeNewsAPIAdapter(CryptoPanicAdapter):
    """
    Generic alias adapter name for projects that want non vendor-specific naming.
    Uses the same implementation as CryptoPanicAdapter for now.
    """

    pass


class CoinDeskNewsAdapter(INewsProvider):
    """
    Adapter for CoinDesk developer news API.

    Environment:
        COINDESK_API_KEY: API token
        COINDESK_NEWS_URL: Optional endpoint override
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 15.0,
    ):
        self.api_key = api_key or os.getenv("COINDESK_API_KEY")
        self.base_url = base_url or os.getenv(
            "COINDESK_NEWS_URL",
            "https://data-api.coindesk.com/news/v1/article/list",
        )
        self.timeout = timeout

    def get_latest_headlines(self, symbol: str, limit: int = 10) -> List[NewsArticle]:
        if not symbol or not symbol.strip():
            raise ValueError("symbol is required")
        if limit < 1:
            raise ValueError("limit must be >= 1")

        if not self.api_key:
            raise RuntimeError("COINDESK_API_KEY is required for CoinDeskNewsAdapter")

        currency = CryptoPanicAdapter._normalize_symbol(symbol)
        params: Dict[str, Any] = {
            "lang": "EN",
            "limit": limit,
            "categories": "MARKET",
        }

        request_url = f"{self.base_url}?{urlencode(params)}"

        try:
            request = Request(
                request_url,
                method="GET",
                headers={
                    "Authorization": f"Apikey {self.api_key}",
                    "X-API-KEY": self.api_key,
                },
            )
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                payload = json.loads(raw)
        except TimeoutError as exc:
            raise RuntimeError(f"CoinDesk news timeout for symbol={currency}") from exc
        except HTTPError as exc:
            raise RuntimeError(
                f"CoinDesk news HTTP error {exc.code} for symbol={currency}"
            ) from exc
        except URLError as exc:
            raise RuntimeError(f"CoinDesk news request failed for symbol={currency}") from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError("CoinDesk returned invalid JSON payload") from exc

        data = payload.get("Data") if isinstance(payload, dict) else None
        if data is None and isinstance(payload, dict):
            data = payload.get("data")

        # Some endpoints may return array directly.
        if isinstance(payload, list):
            data = payload

        if not isinstance(data, list):
            raise RuntimeError("CoinDesk payload missing article list")

        articles: List[NewsArticle] = []
        for item in data:
            mapped = self._map_article(item)
            if mapped is not None:
                articles.append(mapped)
            if len(articles) >= limit:
                break

        return articles

    def _map_article(self, item: Any) -> Optional[NewsArticle]:
        if not isinstance(item, dict):
            return None

        title = str(
            item.get("TITLE")
            or item.get("title")
            or item.get("headline")
            or ""
        ).strip()

        # Extract source name from SOURCE_DATA object, with safe fallback.
        source_raw: Optional[str] = None
        source_data = item.get("SOURCE_DATA")
        if isinstance(source_data, dict):
            source_raw = source_data.get("NAME")
        if not source_raw:
            source_raw = item.get("source")
        source = str(source_raw or "CoinDesk").strip()

        url = str(item.get("URL") or item.get("url") or "").strip()

        ts = item.get("PUBLISHED_ON") or item.get("published_on") or item.get("published_at")
        timestamp = None
        if isinstance(ts, (int, float)):
            timestamp = datetime.utcfromtimestamp(ts)
        elif isinstance(ts, str):
            timestamp = CryptoPanicAdapter._parse_timestamp(ts)

        if not title or not url or timestamp is None:
            return None

        return NewsArticle(title=title, source=source, timestamp=timestamp, url=url)


def get_news_provider() -> INewsProvider:
    """
    Factory: select provider by NEWS_PROVIDER env.

    Supported values:
    - "coindesk"
    - "cryptopanic" (default)
    """
    provider = os.getenv("NEWS_PROVIDER", "cryptopanic").strip().lower()
    if provider == "coindesk":
        return CoinDeskNewsAdapter()
    return CryptoPanicAdapter()
