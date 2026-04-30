"""
AI Sentiment Engine Service
Implements FR17/FR19/FR20 and FR21 summary generation.

Responsibilities:
- Accept a list of NewsArticle value objects
- Build a strict prompt for DeepSeek/OpenAI chat-completions API
- Parse and validate strict JSON output
- Fail safe to Neutral sentiment if API fails or output is malformed
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from core.logging_config import get_logger
from domain.news import NewsArticle

logger = get_logger(__name__)


VALID_SENTIMENTS = {"Bullish", "Bearish", "Neutral"}


@dataclass(frozen=True)
class SentimentResult:
    """Immutable sentiment analysis result."""

    sentiment_score: str
    summary: str


class AISentimentService:
    """
    AI service for validating market sentiment from news headlines.

    Supports OpenAI-compatible APIs (OpenAI, DeepSeek, etc.) via configurable
    `base_url`, `api_key`, and `model`.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 20.0,
        client: Optional[Any] = None,
    ):
        self.api_key = (
            api_key
            or os.getenv("DEEPSEEK_API_KEY")
            or os.getenv("LLM_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        )
        self.model = model or os.getenv("LLM_MODEL", "deepseek-chat")
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
        self.timeout = timeout

        # Optional injectable callable for testing/mocking.
        # Signature: (request_payload: Dict[str, Any]) -> str
        self.client = client

    def analyze_headlines(self, articles: List[NewsArticle]) -> SentimentResult:
        """
        Analyze a list of headlines and return strict sentiment output.

        Fails safe to Neutral when:
        - API fails
        - request times out
        - model returns malformed/non-JSON output
        - required fields are missing/invalid
        """
        if not articles:
            return self._neutral_result("No recent headlines available for analysis.")

        prompt = self._build_strict_prompt(articles)

        try:
            content = self._call_llm(prompt)
            payload = self._parse_json_response(content)
            return self._validate_payload(payload)
        except Exception as exc:
            logger.error(f"Sentiment analysis failed, defaulting to Neutral: {exc}")
            return self._neutral_result(
                "Sentiment service fallback triggered due to temporary analysis failure."
            )

    def _build_strict_prompt(self, articles: List[NewsArticle]) -> str:
        """
        Build strict prompt that forces JSON-only response.

        Required JSON schema:
        {
          "sentiment_score": "Bullish|Bearish|Neutral",
          "summary": "brief market landscape summary"
        }
        """
        lines = []
        for idx, article in enumerate(articles, start=1):
            lines.append(
                f"{idx}. title=\"{article.title}\" | source=\"{article.source}\" | "
                f"timestamp=\"{article.timestamp.isoformat()}\""
            )

        headlines_block = "\n".join(lines)

        return (
            "You are a financial news sentiment classifier.\n"
            "Read the following cryptocurrency headlines and infer market sentiment.\n"
            "Return ONLY valid JSON with exactly these keys: sentiment_score, summary.\n"
            "Rules:\n"
            "- sentiment_score MUST be exactly one of: Bullish, Bearish, Neutral\n"
            "- summary MUST be a concise market landscape summary (max 45 words)\n"
            "- Do not include markdown, explanations, or extra keys\n"
            "- If evidence is mixed or unclear, use Neutral\n"
            "JSON format required:\n"
            '{"sentiment_score":"Bullish|Bearish|Neutral","summary":"..."}\n\n'
            "Headlines:\n"
            f"{headlines_block}"
        )

    def _call_llm(self, prompt: str) -> str:
        """Call OpenAI-compatible chat-completions endpoint and return text content."""
        if not self.api_key and self.client is None:
            raise ValueError("Missing LLM API key (DEEPSEEK_API_KEY or LLM_API_KEY)")

        request_payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Output strictly valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }

        if self.client is not None:
            content = self.client(request_payload)
            if not content or not isinstance(content, str):
                raise ValueError("Injected LLM client returned empty/invalid content")
            return content

        endpoint = f"{self.base_url.rstrip('/')}/chat/completions"
        raw_body = json.dumps(request_payload).encode("utf-8")

        req = Request(
            endpoint,
            data=raw_body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

        try:
            with urlopen(req, timeout=self.timeout) as response:
                response_raw = response.read().decode("utf-8")
                envelope = json.loads(response_raw)
        except TimeoutError as exc:
            raise RuntimeError("LLM API timeout") from exc
        except HTTPError as exc:
            raise RuntimeError(f"LLM API HTTP error: {exc.code}") from exc
        except URLError as exc:
            raise RuntimeError("LLM API network error") from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError("LLM API returned malformed JSON envelope") from exc

        try:
            content = envelope["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError("LLM API envelope missing choices.message.content") from exc

        if not content or not isinstance(content, str):
            raise RuntimeError("LLM API returned empty content")

        return content

    def _parse_json_response(self, raw: str) -> Dict[str, Any]:
        """Parse strict JSON response; attempts safe extraction if wrapper text exists."""
        text = raw.strip()

        # First try direct parse.
        try:
            payload = json.loads(text)
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            pass

        # Fallback: extract first JSON object bounds.
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("Malformed JSON response from LLM")

        sliced = text[start : end + 1]
        payload = json.loads(sliced)
        if not isinstance(payload, dict):
            raise ValueError("Parsed JSON is not an object")

        return payload

    def _validate_payload(self, payload: Dict[str, Any]) -> SentimentResult:
        """Validate response schema and coerce to safe immutable output."""
        sentiment_raw = str(payload.get("sentiment_score", "")).strip()
        summary_raw = str(payload.get("summary", "")).strip()

        if sentiment_raw not in VALID_SENTIMENTS:
            raise ValueError(f"Invalid sentiment_score: {sentiment_raw}")

        if not summary_raw:
            raise ValueError("Missing summary")

        return SentimentResult(sentiment_score=sentiment_raw, summary=summary_raw)

    @staticmethod
    def _neutral_result(summary: str) -> SentimentResult:
        return SentimentResult(sentiment_score="Neutral", summary=summary)
