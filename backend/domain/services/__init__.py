"""
Signal Generation Domain Service
Applies "Sniper Strategy" rules to generate trading signals.

Pure Domain Logic: NO external dependencies (no fastapi, ccxt, openai)
Only: Standard library + domain models

Design Pattern: Domain Service (Business Rules)
Reasoning: Complex business logic that doesn't fit in a single entity
"""

from typing import Optional
from domain.models import AnalysisResult, TradeSignal, TradeAction, TrendType
from datetime import datetime


class SignalGenerator:
    """
    Pure domain service for signal generation.
    
    Implements "Sniper Strategy":
    - BUY Signal: RSI < 30 AND Trend == BULLISH
    - SELL Signal: RSI > 70
    - HOLD Signal: Otherwise
    
    Responsibility: Convert market analysis into trading signals
    - NO external dependencies
    - Pure business logic
    - Easily unit testable
    
    Design Principles:
    - Single Responsibility: Only generates signals based on rules
    - Framework-Agnostic: Works with any framework
    - Deterministic: Same inputs always produce same outputs
    """
    
    def __init__(self, confidence_threshold: float = 0.65):
        """
        Initialize signal generator.
        
        Args:
            confidence_threshold: Minimum confidence to generate signal (0.0-1.0)
        
        Raises:
            ValueError: If threshold not in valid range
        """
        if not (0.0 <= confidence_threshold <= 1.0):
            raise ValueError(f"Confidence threshold must be 0.0-1.0, got {confidence_threshold}")
        
        self.confidence_threshold = confidence_threshold
    
    def generate_signal(self, analysis: AnalysisResult) -> TradeSignal:
        """
        Generate trading signal using Sniper Strategy rules.
        
        Strategy Rules:
        1. BUY: RSI < 30 AND Trend == BULLISH
           - Reasoning: Oversold bounce in uptrend
        2. SELL: RSI > 70
           - Reasoning: Overbought condition (strong sell signal)
        3. HOLD: All other conditions
           - Reasoning: Wait for clearer setup
        
        Args:
            analysis: AnalysisResult with price, RSI, EMA, trend
        
        Returns:
            TradeSignal with action, confidence, and reasoning
        
        Raises:
            ValueError: If analysis is invalid
        """
        if not isinstance(analysis, AnalysisResult):
            raise ValueError(f"Expected AnalysisResult, got {type(analysis)}")
        
        # Calculate action using Sniper Strategy rules
        if analysis.rsi < 30 and analysis.trend == TrendType.BULLISH:
            action = TradeAction.BUY
            confidence = self._calculate_buy_confidence(analysis)
            reasoning = f"Sniper: Oversold (RSI {analysis.rsi:.1f}) in bullish trend"
        
        elif analysis.rsi > 70:
            action = TradeAction.SELL
            confidence = self._calculate_sell_confidence(analysis)
            reasoning = f"Sniper: Overbought (RSI {analysis.rsi:.1f})"
        
        else:
            action = TradeAction.HOLD
            confidence = self._calculate_hold_confidence(analysis)
            reasoning = f"Sniper: No clear signal (RSI {analysis.rsi:.1f}, Trend {analysis.trend})"
        
        return TradeSignal(
            action=action,
            confidence=confidence,
            reasoning=reasoning,
            technical_score=self._calculate_technical_score(analysis),
            sentiment_score=0.5,  # No sentiment in pure domain logic
            timestamp=datetime.utcnow(),
        )
    
    @staticmethod
    def _calculate_buy_confidence(analysis: AnalysisResult) -> float:
        """
        Calculate confidence for BUY signal.
        
        Factors:
        - Lower RSI = higher confidence (more oversold)
        - Price well above EMA = higher confidence
        
        Returns:
            Confidence between 0.65 and 1.0
        """
        # RSI factor: 0 RSI = 1.0 confidence, 30 RSI = 0.7 confidence
        rsi_factor = 1.0 - (analysis.rsi / 30.0) * 0.3
        
        # Price position factor
        ema_diff = analysis.price / analysis.ema_200
        price_factor = 0.8 if ema_diff > 0.99 else 0.7
        
        confidence = (rsi_factor * 0.6 + price_factor * 0.4)
        return round(min(1.0, max(0.65, confidence)), 3)
    
    @staticmethod
    def _calculate_sell_confidence(analysis: AnalysisResult) -> float:
        """
        Calculate confidence for SELL signal.
        
        Factors:
        - Higher RSI = higher confidence (more overbought)
        - Price well above EMA = higher confidence
        
        Returns:
            Confidence between 0.65 and 1.0
        """
        # RSI factor: 100 RSI = 1.0 confidence, 70 RSI = 0.7 confidence
        rsi_factor = ((analysis.rsi - 70.0) / 30.0) * 0.3 + 0.7
        
        # Price position factor
        ema_diff = analysis.price / analysis.ema_200
        price_factor = 0.9 if ema_diff > 1.02 else 0.7
        
        confidence = (rsi_factor * 0.6 + price_factor * 0.4)
        return round(min(1.0, max(0.65, confidence)), 3)
    
    @staticmethod
    def _calculate_hold_confidence(analysis: AnalysisResult) -> float:
        """
        Calculate confidence for HOLD signal (always neutral).
        
        Returns:
            Confidence = 0.5 (no action)
        """
        return 0.5
    
    @staticmethod
    def _calculate_technical_score(analysis: AnalysisResult) -> float:
        """
        Calculate overall technical score (0.0 to 1.0).
        
        Factors:
        - RSI position (0-100 maps to 0.0-1.0)
        - Trend alignment
        
        Returns:
            Technical score between 0.0 and 1.0
        """
        # RSI contribution: 30 RSI = low score, 70 RSI = high score
        rsi_score = (analysis.rsi - 30.0) / 40.0 if 30 <= analysis.rsi <= 70 else (
            0.0 if analysis.rsi < 30 else 1.0
        )
        
        # Trend contribution
        trend_score = {
            TrendType.BULLISH: 0.7,
            TrendType.BEARISH: 0.3,
            TrendType.NEUTRAL: 0.5,
        }.get(analysis.trend, 0.5)
        
        combined_score = (rsi_score * 0.5 + trend_score * 0.5)
        return round(min(1.0, max(0.0, combined_score)), 3)
