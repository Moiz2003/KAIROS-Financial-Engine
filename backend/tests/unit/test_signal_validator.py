"""Unit tests for SignalValidator Reality Check rules (FR22/FR23/FR24)."""

from datetime import datetime

from domain.models import TradeAction, TradeSignal
from domain.services.signal_validator import SignalValidator, ValidationStatus


def _ta_buy_signal(confidence: float = 0.72) -> TradeSignal:
    return TradeSignal(
        action=TradeAction.BUY,
        confidence=confidence,
        reasoning="TA Buy setup",
        technical_score=0.76,
        sentiment_score=0.5,
        timestamp=datetime.utcnow(),
    )


def test_reality_check_contradiction_buy_vs_bearish():
    validator = SignalValidator()

    result = validator.reality_check(
        ta_signal=_ta_buy_signal(),
        ai_sentiment_score="Bearish",
        ai_summary="Macro risk pressure remains elevated.",
    )

    assert result.status == ValidationStatus.CONTRADICTION
    assert result.approved_for_execution is False
    assert result.output_signal.action == TradeAction.HOLD
    assert "CONTRADICTION" in result.output_signal.reasoning


def test_reality_check_high_confidence_buy_plus_bullish():
    validator = SignalValidator()

    result = validator.reality_check(
        ta_signal=_ta_buy_signal(confidence=0.71),
        ai_sentiment_score="Bullish",
        ai_summary="Momentum and narrative alignment remain positive.",
    )

    assert result.status == ValidationStatus.HIGH_CONFIDENCE
    assert result.approved_for_execution is True
    assert result.output_signal.action == TradeAction.BUY
    assert result.output_signal.confidence >= 0.90
    assert "HighConfidenceSignal" in result.output_signal.reasoning


def test_reality_check_normalizes_positive_to_bullish():
    validator = SignalValidator()

    result = validator.reality_check(
        ta_signal=_ta_buy_signal(),
        ai_sentiment_score="positive",
        ai_summary="Headlines show improving risk appetite.",
    )

    assert result.status == ValidationStatus.HIGH_CONFIDENCE
    assert result.output_signal.action == TradeAction.BUY
