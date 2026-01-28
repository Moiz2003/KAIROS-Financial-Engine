"""
Perplexity AI Service Adapter
Implements IAIContextProvider using Perplexity API (sonar-pro model).

Design Pattern: Adapter Pattern
Reasoning: Adapts external AI API to internal interface, wrapping all exceptions.
Prompt Engineering: Synthesizes news sentiment with technical math analysis.
"""

from openai import OpenAI
from core.exceptions import AIContextException
from core.logging_config import get_logger
from services.abstractions import IAIContextProvider

logger = get_logger(__name__)


class PerplexityAdapter(IAIContextProvider):
    """
    Adapter Pattern Implementation: Perplexity AI Context Provider
    
    Wraps the Perplexity API (via OpenAI client) and adapts it to IAIContextProvider interface.
    Uses sonar-pro model for real-time news synthesis with technical analysis.
    All exceptions are caught and wrapped as AIContextException.
    """
    
    def __init__(
        self,
        api_key: str,
        model: str = "sonar-pro",
        news_math_prompt: str = None,
    ):
        """
        Initialize Perplexity client with optional prompt injection.
        
        Args:
            api_key: Perplexity API key from .env
            model: Model to use (default: sonar-pro)
            news_math_prompt: Custom prompt template for News + Math synthesis
                If None, uses default synthesis prompt
        
        Raises:
            AIContextException: If client initialization fails
        """
        try:
            self.client = OpenAI(
                api_key=api_key,
                base_url="https://api.perplexity.ai",
            )
            self.model = model
            
            # Default "News + Math" synthesis prompt template
            if news_math_prompt is None:
                self.news_math_prompt = (
                    "Analyze {symbol} by synthesizing: "
                    "1) CURRENT NEWS SENTIMENT (positive/negative/neutral) "
                    "2) MATHEMATICAL PATTERNS (RSI {rsi}, price vs EMA {ema_analysis}). "
                    "Provide a brief (<30 words) combined assessment."
                )
            else:
                self.news_math_prompt = news_math_prompt
            
            logger.info(f"Perplexity client initialized with model: {model}")
        except Exception as e:
            error_msg = f"Failed to initialize Perplexity client: {str(e)}"
            logger.error(error_msg)
            raise AIContextException(error_msg)
    
    def get_news_sentiment(self, topic: str, context: str) -> str:
        """
        Analyze current news sentiment using Perplexity sonar-pro (real-time).
        
        Args:
            topic: Topic to analyze (e.g., "Bitcoin")
            context: Additional context for analysis
        
        Returns:
            Sentiment classification: "positive", "negative", or "neutral"
        
        Raises:
            AIContextException: If API call fails
        """
        try:
            prompt = (
                f"Analyze CURRENT NEWS sentiment for {topic}. "
                f"Context: {context}. "
                f"Reply with ONLY ONE word: positive, negative, or neutral."
            )
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a financial sentiment analyst. Be concise and definitive.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            
            sentiment = response.choices[0].message.content.strip().lower()
            
            # Normalize response to valid sentiment values
            valid_sentiments = {"positive", "negative", "neutral"}
            if sentiment not in valid_sentiments:
                logger.warning(f"Unexpected sentiment response: '{sentiment}'. Defaulting to 'neutral'.")
                sentiment = "neutral"
            
            logger.info(f"{topic} sentiment: {sentiment}")
            return sentiment
        
        except Exception as e:
            error_msg = f"Failed to get sentiment for {topic}: {str(e)}"
            logger.error(error_msg)
            raise AIContextException(error_msg)
    
    def get_reasoning(self, symbol: str, technical_context: str) -> str:
        """
        Get AI reasoning for market action using News + Math synthesis.
        
        Combines real-time news analysis with technical indicators for holistic view.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            technical_context: Technical analysis context (e.g., "RSI: 25, Trend: BULLISH")
        
        Returns:
            AI reasoning text synthesizing news and math
        
        Raises:
            AIContextException: If API call fails
        """
        try:
            # Inject News + Math prompt
            prompt = (
                f"Synthesize current news + technical math for {symbol}.\n"
                f"Technical: {technical_context}\n"
                f"Provide (<40 words): news sentiment, tech score, combined recommendation."
            )
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a crypto analyst synthesizing NEWS SENTIMENT + MATHEMATICAL PATTERNS. "
                            "Combine real-time news with technical indicators for actionable insights. "
                            "Be precise, concise, and quantitative."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            
            reasoning = response.choices[0].message.content.strip()
            logger.info(f"{symbol} AI reasoning generated: {len(reasoning)} chars")
            return reasoning
        
        except Exception as e:
            error_msg = f"Failed to get reasoning for {symbol}: {str(e)}"
            logger.error(error_msg)
            raise AIContextException(error_msg)
