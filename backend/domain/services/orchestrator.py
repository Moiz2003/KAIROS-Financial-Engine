"""
Service Orchestration - Facade Pattern
Provides a simple interface for complex domain operations.

Design Pattern: Facade + Dependency Injection
Purpose: Orchestrate adapters and domain logic into cohesive workflows
Reasoning: API layer talks only to Orchestrator, never directly to adapters

The Orchestrator is the "Composition Root" for the domain layer.
It injects all dependencies and coordinates their interaction.
"""

from datetime import datetime
from typing import Optional
from core.exceptions import RiskAssessmentException
from core.logging_config import get_logger
from domain.models import TradeSignal, RiskAssessment, AnalysisResult, TrendType, TradeAction
from domain.services.signal_validator import SignalValidator, ValidationStatus
from services.abstractions import IMarketDataProvider, IAIContextProvider
from domain.entities import MarketAnalyzer
from domain.services import SignalGenerator

logger = get_logger(__name__)


class TradeOrchestrator:
    """
    Facade Pattern: Orchestrates market analysis and signal generation.
    
    Dependency Injection:
    - IMarketDataProvider: Source of candle and price data
    - IAIContextProvider: Source of news sentiment and reasoning
    - SignalGenerator: Pure domain logic for signal generation
    
    Workflow:
    1. Fetch candles from market data adapter
    2. Calculate technical indicators (RSI, EMA, trend)
    3. Generate technical signal (Sniper Strategy)
    4. If signal is actionable (BUY/SELL), call AI for "Reality Check"
    5. Return synthesized trade recommendation
    
    The Orchestrator is transaction-like: all-or-nothing.
    If any step fails, the entire recommendation fails (no partial results).
    """
    
    def __init__(
        self,
        market_provider: IMarketDataProvider,
        ai_provider: IAIContextProvider,
        signal_generator: SignalGenerator = None,
        signal_validator: SignalValidator = None,
    ):
        """
        Initialize orchestrator with injected dependencies.
        
        Args:
            market_provider: Adapter providing market data (Binance)
            ai_provider: Adapter providing AI context (Perplexity)
            signal_generator: Domain service for signal generation (optional, auto-initialized)
        
        Raises:
            ValueError: If required providers are None
        """
        if market_provider is None:
            raise ValueError("market_provider (IMarketDataProvider) is required")
        if ai_provider is None:
            raise ValueError("ai_provider (IAIContextProvider) is required")
        
        self.market_provider = market_provider
        self.ai_provider = ai_provider
        self.signal_generator = signal_generator or SignalGenerator(confidence_threshold=0.65)
        self.signal_validator = signal_validator or SignalValidator()
        self.analyzer = MarketAnalyzer()
    
    def get_trade_recommendation(self, symbol: str, interval: str = "4h", limit: int = 200) -> TradeSignal:
        """
        CRITICAL: Orchestrator's main method.
        
        Generates a synthesized trade recommendation by:
        1. Fetching candles and technical indicators
        2. Generating technical signal (pure domain logic)
        3. Performing "Reality Check" via AI if signal is actionable
        4. Returning final synthesized signal
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            interval: Candle interval (default "4h")
            limit: Number of candles to fetch (default 200 for EMA calculation)
        
        Returns:
            TradeSignal: Complete trade recommendation with reasoning
        
        Raises:
            Exception: If any orchestration step fails (transparent error handling)
        """
        try:
            logger.info(f"Orchestrating trade recommendation for {symbol}")
            
            # STEP 1: Fetch market data
            logger.debug(f"Step 1: Fetching {limit} {interval} candles for {symbol}")
            klines = self.market_provider.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit,
            )
            price_data = self.market_provider.get_current_price(symbol)
            
            # Extract closing prices for analysis
            prices = [float(kline[4]) for kline in klines]  # Close price is index 4
            current_price = float(price_data)
            
            logger.debug(f"Fetched {len(prices)} prices, current: {current_price}")
            
            # STEP 2: Calculate technical indicators
            logger.debug(f"Step 2: Calculating technical indicators")
            rsi = self.analyzer.calculate_rsi(prices, period=14)
            ema_200 = self.analyzer.calculate_ema(prices, period=200)
            trend = self.analyzer.detect_trend(current_price, ema_200, threshold=0.01)
            
            logger.debug(f"RSI: {rsi}, EMA200: {ema_200}, Trend: {trend}, Price: {current_price}")
            
            # STEP 3: Create analysis result
            analysis = AnalysisResult(
                symbol=symbol,
                price=current_price,
                rsi=rsi,
                ema_200=ema_200,
                trend=TrendType(trend),
                timestamp=datetime.utcnow(),
            )
            
            # STEP 4: Generate technical signal (pure domain logic)
            logger.debug(f"Step 3: Generating technical signal via Sniper Strategy")
            technical_signal = self.signal_generator.generate_signal(analysis)
            
            logger.debug(f"Technical signal: {technical_signal.action}, confidence: {technical_signal.confidence}")
            
            # STEP 5: Reality Check (AI sentiment) if signal is actionable
            if technical_signal.action in [TradeAction.BUY, TradeAction.SELL]:
                logger.info(f"Step 4: Performing 'Reality Check' via AI for {technical_signal.action}")
                final_signal = self._apply_ai_reality_check(
                    symbol=symbol,
                    technical_signal=technical_signal,
                    analysis=analysis,
                )
            else:
                logger.debug("Signal is HOLD - skipping AI Reality Check")
                final_signal = technical_signal
            
            logger.info(f"✓ Trade recommendation complete: {final_signal.action}")
            return final_signal
        
        except Exception as e:
            logger.error(f"Orchestration failed for {symbol}: {str(e)}")
            raise
    
    def _apply_ai_reality_check(
        self,
        symbol: str,
        technical_signal: TradeSignal,
        analysis: AnalysisResult,
    ) -> TradeSignal:
        """
        Apply AI "Reality Check" to validate technical signal.
        
        FR22/FR23/FR24 rules are delegated to SignalValidator:
        - BUY + Bearish sentiment => CONTRADICTION (drop trade)
        - BUY + Bullish sentiment => HIGH_CONFIDENCE (approve)
        - Otherwise passthrough/approved
        
        Args:
            symbol: Trading pair
            technical_signal: Initial technical signal
            analysis: Technical analysis result (RSI, EMA, trend)
        
        Returns:
            Potentially adjusted TradeSignal with AI-informed confidence
        """
        try:
            logger.debug(f"AI Reality Check: Fetching sentiment for {symbol}")
            
            # Fetch news sentiment
            raw_sentiment = self.ai_provider.get_news_sentiment(
                topic=symbol.replace("USDT", ""),  # "BTCUSDT" → "BTC"
                context=f"Trading analysis. RSI: {analysis.rsi}, Trend: {analysis.trend.value}"
            )
            sentiment = self.signal_validator.normalize_sentiment(raw_sentiment)
            
            logger.debug(f"News sentiment: {sentiment}")
            
            # Create technical context for AI
            technical_context = (
                f"RSI: {analysis.rsi}, "
                f"EMA200: {analysis.ema_200}, "
                f"Price: {analysis.price}, "
                f"Trend: {analysis.trend.value}, "
                f"Technical Signal: {technical_signal.action.value}"
            )
            
            # Get AI reasoning (News + Math synthesis)
            ai_reasoning = self.ai_provider.get_reasoning(
                symbol=symbol,
                technical_context=technical_context
            )
            
            logger.debug(f"AI Reasoning: {ai_reasoning}")
            
            # Run Reality Check validation (isolated domain logic)
            validation_result = self.signal_validator.reality_check(
                ta_signal=technical_signal,
                ai_sentiment_score=sentiment,
                ai_summary=ai_reasoning,
            )

            if validation_result.status == ValidationStatus.CONTRADICTION:
                logger.warning(
                    f"Reality Check CONTRADICTION for {symbol}: {validation_result.reason}. "
                    "Trade dropped."
                )
            elif validation_result.status == ValidationStatus.HIGH_CONFIDENCE:
                logger.info(
                    f"Reality Check HIGH_CONFIDENCE for {symbol}: {validation_result.reason}. "
                    "Trade approved with elevated confidence."
                )
            else:
                logger.info(f"Reality Check APPROVED for {symbol}: {validation_result.reason}")

            return validation_result.output_signal
        
        except Exception as e:
            logger.warning(f"AI Reality Check failed (using technical signal only): {str(e)}")
            # Fallback: use technical signal unchanged
            return technical_signal
    
class RiskManager:
    """
    Pure domain service for risk assessment.
    
    Responsibility: Validate trade safety before execution
    Dependencies: Risk policy (injected)
    
    Adheres to:
    - Single Responsibility: Only evaluates risk
    - Policy Injection: Risk limits are configurable
    """
    
    def __init__(
        self,
        max_position_size_pct: float = 0.05,
        max_drawdown_pct: float = 0.10,
        max_leverage: float = 1.0,
    ):
        """
        Initialize risk manager.
        
        Args:
            max_position_size_pct: Max position as % of account (0.05 = 5%)
            max_drawdown_pct: Max allowed drawdown before halt (0.10 = 10%)
            max_leverage: Maximum leverage allowed
        """
        self.max_position_size_pct = max_position_size_pct
        self.max_drawdown_pct = max_drawdown_pct
        self.max_leverage = max_leverage
    
    def assess(
        self,
        signal: TradeSignal,
        account_balance: float,
        current_drawdown_pct: float = 0.0,
    ) -> RiskAssessment:
        """
        Assess risk of a trade signal.
        
        Args:
            signal: Trading signal to assess
            account_balance: Current account balance
            current_drawdown_pct: Current drawdown percentage
        
        Returns:
            RiskAssessment with approval status and constraints
        
        Raises:
            RiskAssessmentException: If assessment fails
        """
        try:
            warnings = []
            approved = True
            
            # Check drawdown limit
            if current_drawdown_pct >= self.max_drawdown_pct:
                warnings.append(
                    f"Account drawdown {current_drawdown_pct:.2f}% "
                    f"exceeds limit {self.max_drawdown_pct:.2f}%"
                )
                approved = False
            
            # Check signal confidence
            if signal.confidence < 0.5:
                warnings.append(
                    f"Signal confidence {signal.confidence:.2f} below threshold"
                )
                approved = False
            
            # Calculate max position size
            max_position_size = self._calculate_max_position_size(
                signal.confidence,
                account_balance,
            )
            
            # Calculate risk score
            risk_score = self._calculate_risk_score(
                signal,
                current_drawdown_pct,
            )
            
            return RiskAssessment(
                approved=approved,
                max_position_size=max_position_size,
                max_leverage=self.max_leverage,
                warnings=warnings,
                risk_score=risk_score,
                timestamp=datetime.utcnow(),
            )
        
        except Exception as e:
            logger.error(f"Risk assessment failed: {str(e)}")
            raise RiskAssessmentException(str(e))
    
    def _calculate_max_position_size(
        self,
        confidence: float,
        account_balance: float,
    ) -> float:
        """
        Calculate maximum position size.
        
        Position size scales with confidence:
        - Low confidence: Smaller position
        - High confidence: Larger position (up to max)
        """
        base_size = account_balance * self.max_position_size_pct
        adjusted_size = base_size * confidence
        return round(adjusted_size, 2)
    
    def _calculate_risk_score(
        self,
        signal: TradeSignal,
        current_drawdown_pct: float,
    ) -> float:
        """
        Calculate overall risk score (0 = safe, 1 = dangerous).
        
        Factors:
        - Low signal confidence = high risk
        - High drawdown = high risk
        """
        confidence_risk = 1.0 - signal.confidence
        drawdown_risk = current_drawdown_pct / 100.0
        
        risk = (confidence_risk * 0.6) + (drawdown_risk * 0.4)
        return round(min(1.0, max(0.0, risk)), 3)
