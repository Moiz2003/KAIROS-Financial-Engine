"""
AIEngine — async wrapper around AISentimentService.

FR17: Offloads the blocking DeepSeek/OpenAI-compat HTTP call to a thread pool
      via asyncio.to_thread(), keeping the FastAPI event loop free.
FR18: Caches results by SHA-256 hash of the concatenated article titles.
      A 5-minute TTL prevents redundant LLM calls per symbol refresh cycle.
      Concurrent requests for the same article set are collapsed into a single
      LLM call via per-hash asyncio.Lock deduplication.
"""

import asyncio
import hashlib
import logging
from datetime import datetime
from typing import ClassVar, Dict, List, Optional, Tuple

from domain.news import NewsArticle
from services.sentiment_engine import AISentimentService, SentimentResult

logger = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 300  # FR18: 5-minute TTL


class AIEngine:
    """
    Thread-safe async singleton for AI sentiment analysis.

    The underlying AISentimentService uses urllib (synchronous HTTP).
    AIEngine wraps every call in asyncio.to_thread() so FastAPI's event loop
    is never blocked, even during 10-30 s DeepSeek API latency windows.
    """

    _instance: ClassVar[Optional["AIEngine"]] = None

    def __init__(self) -> None:
        self._service = AISentimentService()
        # hash → (SentimentResult, cached_at_utc)
        self._cache: Dict[str, Tuple[SentimentResult, datetime]] = {}
        # Per-hash asyncio.Lock: ensures only one LLM call fires per unique
        # article set, even under concurrent requests.
        self._inflight: Dict[str, asyncio.Lock] = {}

    # ── Internal helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _compute_hash(articles: List[NewsArticle]) -> str:
        """SHA-256 of pipe-joined titles.  Identical article sets share one slot."""
        combined = "|".join(a.title for a in articles)
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def _is_fresh(self, cached_at: datetime) -> bool:
        return (datetime.utcnow() - cached_at).total_seconds() < _CACHE_TTL_SECONDS

    # ── Public API ─────────────────────────────────────────────────────────────

    async def analyze(self, articles: List[NewsArticle]) -> SentimentResult:
        """
        Async entry point — returns sentiment for the given article list.

        Flow:
        1. Fast path: serve from cache if within 5-minute TTL.
        2. Acquire per-hash Lock to collapse concurrent identical requests.
        3. Re-check cache inside the lock (the winning coroutine may have
           already populated it while we were waiting).
        4. Offload the blocking DeepSeek HTTP call via asyncio.to_thread().
        5. Store result in cache and return.
        """
        if not articles:
            return SentimentResult(
                sentiment_score="Neutral",
                summary="No headlines available for analysis.",
            )

        key = self._compute_hash(articles)

        # Fast path — asyncio is single-threaded; dict reads between awaits are safe.
        entry = self._cache.get(key)
        if entry and self._is_fresh(entry[1]):
            logger.debug("AIEngine: cache hit key=%s…", key[:12])
            return entry[0]

        # Create per-hash Lock on first miss (creation is atomic — no await here).
        if key not in self._inflight:
            self._inflight[key] = asyncio.Lock()

        async with self._inflight[key]:
            # Re-check: a concurrent coroutine may have just populated the cache.
            entry = self._cache.get(key)
            if entry and self._is_fresh(entry[1]):
                logger.debug("AIEngine: cache hit (post-lock) key=%s…", key[:12])
                return entry[0]

            logger.info(
                "AIEngine: dispatching LLM call (%d articles, key=%s…)",
                len(articles), key[:12],
            )
            try:
                result: SentimentResult = await asyncio.to_thread(
                    self._service.analyze_headlines, articles
                )
            except Exception as exc:
                logger.warning(
                    "DeepSeek unavailable (%s) — returning neutral sentiment fallback", exc
                )
                result = SentimentResult(
                    sentiment_score="Neutral",
                    summary="Sentiment analysis unavailable — using neutral fallback.",
                )
            self._cache[key] = (result, datetime.utcnow())
            logger.info(
                "AIEngine: LLM result cached — sentiment=%s key=%s…",
                result.sentiment_score, key[:12],
            )

        return result

    # ── Singleton ──────────────────────────────────────────────────────────────

    @classmethod
    def instance(cls) -> "AIEngine":
        """Return (or create) the module-level singleton."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


# Module-level singleton — imported by debug routes and api/__init__.py.
ai_engine = AIEngine.instance()
