"""
Signal Validator Domain Service
Implements Reality Check rules for TA signal vs AI sentiment.

FR22: Reality Check between math signal and NLP sentiment
FR23: HighConfidenceSignal when TA BUY + AI Bullish
FR24: CONTRADICTION when TA BUY + AI Bearish (drop trade)

This service is pure domain logic and intentionally isolated from any
execution/exchange modules.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from domain.models import TradeAction, TradeSignal


class ValidationStatus(str, Enum):
    """Outcome of TA + AI reality check."""

    CONTRADICTION = "CONTRADICTION"
    HIGH_CONFIDENCE = "HIGH_CONFIDENCE"
    APPROVED = "APPROVED"


@dataclass(frozen=True)
class ValidationResult:
    """Immutable validation result."""

    status: ValidationStatus
    output_signal: TradeSignal
    approved_for_execution: bool
    reason: str


class SignalValidator:
    """Domain service for validating preliminary TA signals with AI sentiment."""

    @staticmethod
    def normalize_sentiment(sentiment_score: str) -> str:
        """
        Normalize sentiment labels from different providers.

        Accepts values such as:
        - Bullish / Bearish / Neutral
        - positive / negative / neutral
        """
        value = (sentiment_score or "").strip().lower()

        if value in {"bullish", "positive"}:
            return "Bullish"
        if value in {"bearish", "negative"}:
            return "Bearish"
        return "Neutral"

    def reality_check(
        self,
        ta_signal: TradeSignal,
        ai_sentiment_score: str,
        ai_summary: str = "",
    ) -> ValidationResult:
        """
        Apply Reality Check rules between TA and AI sentiment.

        Rules:
        - TA BUY + AI Bearish -> CONTRADICTION, drop trade
        - TA BUY + AI Bullish -> HIGH_CONFIDENCE, approve trade
        - Otherwise -> APPROVED passthrough
        """
        normalized_sentiment = self.normalize_sentiment(ai_sentiment_score)
        sentiment_score = self._sentiment_to_score(normalized_sentiment)

        # FR24: Contradiction
        if ta_signal.action == TradeAction.BUY and normalized_sentiment == "Bearish":
            dropped_signal = TradeSignal(
                action=TradeAction.HOLD,
                confidence=0.5,
                reasoning=(
                    "CONTRADICTION: TA signaled BUY but AI sentiment is Bearish. "
                    "Trade dropped by Reality Check."
                    f" Summary: {ai_summary}" if ai_summary else
                    "CONTRADICTION: TA signaled BUY but AI sentiment is Bearish. Trade dropped by Reality Check."
                ),
                technical_score=ta_signal.technical_score,
                sentiment_score=sentiment_score,
                timestamp=datetime.utcnow(),
            )
            return ValidationResult(
                status=ValidationStatus.CONTRADICTION,
                output_signal=dropped_signal,
                approved_for_execution=False,
                reason="TA BUY contradicts AI Bearish sentiment",
            )

        # FR23: High confidence confirmation
        if ta_signal.action == TradeAction.BUY and normalized_sentiment == "Bullish":
            high_confidence_signal = TradeSignal(
                action=TradeAction.BUY,
                confidence=max(ta_signal.confidence, 0.90),
                reasoning=(
                    "HighConfidenceSignal: TA BUY is confirmed by AI Bullish sentiment."
                    f" Summary: {ai_summary}" if ai_summary else
                    "HighConfidenceSignal: TA BUY is confirmed by AI Bullish sentiment."
                ),
                technical_score=ta_signal.technical_score,
                sentiment_score=sentiment_score,
                timestamp=datetime.utcnow(),
            )
            return ValidationResult(
                status=ValidationStatus.HIGH_CONFIDENCE,
                output_signal=high_confidence_signal,
                approved_for_execution=True,
                reason="TA BUY aligned with AI Bullish sentiment",
            )

        passthrough_signal = TradeSignal(
            action=ta_signal.action,
            confidence=ta_signal.confidence,
            reasoning=(
                f"RealityCheck: TA action {ta_signal.action.value} with AI sentiment {normalized_sentiment}. "
                f"{ai_summary}".strip()
            ),
            technical_score=ta_signal.technical_score,
            sentiment_score=sentiment_score,
            timestamp=datetime.utcnow(),
        )
        return ValidationResult(
            status=ValidationStatus.APPROVED,
            output_signal=passthrough_signal,
            approved_for_execution=ta_signal.action in {TradeAction.BUY, TradeAction.SELL},
            reason="No contradiction detected",
        )

    @staticmethod
    def _sentiment_to_score(sentiment: str) -> float:
        return {"Bullish": 0.8, "Neutral": 0.5, "Bearish": 0.2}.get(sentiment, 0.5)
