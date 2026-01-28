from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
from datetime import datetime
import logging
import sys
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------
# BLACK BOX LOGGING CONFIGURATION
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="KAIROS Brain")

# CORS configuration for mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ KAIROS Brain initialized successfully")


# ---------------------------------------------------------
# 1. PURE MATH (Manual Pandas - No Heavy Libraries)
# ---------------------------------------------------------
def calculate_sma(series: pd.Series, period: int) -> float:
    """Calculate Simple Moving Average using manual pandas rolling window."""
    try:
        if len(series) < period:
            result = series.mean()
            logger.debug(f"📊 SMA({period}): Insufficient data, using mean = {result:.2f}")
            return float(result)
        
        result = series.rolling(window=period).mean().iloc[-1]
        logger.debug(f"📊 SMA({period}) = {result:.2f}")
        return float(result)
    except Exception as e:
        logger.error(f"❌ SMA calculation failed: {str(e)}")
        return 0.0


def calculate_rsi(series: pd.Series, period: int = 14) -> float:
    """Calculate Relative Strength Index using manual pandas operations."""
    try:
        if len(series) < period + 1:
            logger.debug(f"📊 RSI: Insufficient data, returning neutral 50.0")
            return 50.0
        
        # Calculate price changes
        delta = series.diff()
        
        # Separate gains and losses
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        # Calculate average gains and losses
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        
        # Avoid division by zero
        avg_loss = avg_loss.replace(0, 0.0001)
        
        # Calculate RS and RSI
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        result = float(rsi.iloc[-1])
        logger.info(f"📊 RSI Value = {result:.2f}")
        return result
    except Exception as e:
        logger.error(f"❌ RSI calculation failed: {str(e)}")
        return 50.0


# ---------------------------------------------------------
# 2. API ENDPOINTS
# ---------------------------------------------------------
@app.get("/")
async def root():
    logger.info("🚀 Root endpoint accessed")
    return {
        "service": "KAIROS Brain",
        "status": "operational",
        "version": "2.0.0",
        "timestamp": str(datetime.now())
    }


@app.get("/health")
async def health():
    logger.info("💚 Health check requested")
    return {
        "status": "healthy",
        "timestamp": str(datetime.now())
    }


# ---------------------------------------------------------
# 3. THE BRAIN (Crash-Proof with Black Box Logging)
# ---------------------------------------------------------
@app.get("/api/analyze/{symbol}")
async def analyze(symbol: str):  # Python-style type hint
    """Analyze market data with comprehensive logging for debugging."""
    logger.info(f"🚀 Incoming Request: /api/analyze/{symbol}")
    
    # Format symbol for Binance (e.g., BTCUSDT)
    clean_symbol = symbol.upper().replace("/", "")
    logger.info(f"🔄 Cleaned symbol: {clean_symbol}")
    
    # Binance API URL
    url = f"https://api.binance.com/api/v3/klines?symbol={clean_symbol}&interval=1h&limit=300"
    logger.info(f"📡 Binance API URL: {url}")
    
    try:
        async with httpx.AsyncClient() as client:
            # A. Fetch Data (httpx only - no ccxt)
            logger.info("📡 Sending request to Binance...")
            response = await client.get(url, timeout=10.0)
            logger.info(f"📡 Binance Status Code: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"❌ Binance API Error: {response.status_code} - {error_text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Binance API returned {response.status_code}: {error_text}"
                )

            # B. Parse Data
            data = response.json()
            logger.info(f"📊 Received {len(data)} klines from Binance")
            
            if not data:
                logger.error("❌ No market data available")
                raise HTTPException(status_code=404, detail="No market data available")
            
            # Binance kline columns: [Open Time, Open, High, Low, Close, Volume, ...]
            df = pd.DataFrame(
                data, 
                columns=['timestamp', 'open', 'high', 'low', 'close', 'volume', 
                        'c_time', 'q_vol', 'trades', 'base_vol', 'quote_vol', 'ignore']
            )
            
            # Convert to float
            df['close'] = df['close'].astype(float)
            logger.info(f"📊 Extracted {len(df)} closing prices. Latest: ${df['close'].iloc[-1]:.2f}")
            
            # C. Calculate Indicators
            logger.info("🧮 Calculating technical indicators...")
            df['SMA_50'] = calculate_sma(df['close'], 50)
            df['SMA_200'] = calculate_sma(df['close'], 200)
            df['RSI'] = calculate_rsi(df['close'], 14)

            # D. Make Decision
            latest = df.iloc[-1]
            rsi = float(latest['RSI'])
            sma_50 = float(latest['SMA_50'])
            sma_200 = float(latest['SMA_200'])
            
            logger.info(f"📊 SMA-50: ${sma_50:.2f}, SMA-200: ${sma_200:.2f}")
            logger.info(f"📊 RSI Value: {rsi:.2f}")

            action = "HOLD"
            confidence = 50.0
            reasoning = []
            
            logger.info("🤔 Evaluating trading signals...")

            # Strategy: RSI Signals
            if rsi < 30:
                action = "BUY"
                confidence = 80.0
                reasoning.append(f"RSI Oversold ({rsi:.1f})")
                logger.info(f"💡 RSI Signal: OVERSOLD ({rsi:.2f}) → BUY")
            elif rsi > 70:
                action = "SELL"
                confidence = 80.0
                reasoning.append(f"RSI Overbought ({rsi:.1f})")
                logger.info(f"💡 RSI Signal: OVERBOUGHT ({rsi:.2f}) → SELL")
            else:
                logger.info(f"💡 RSI Signal: NEUTRAL ({rsi:.2f})")
            
            # Strategy: SMA Crossover
            if sma_50 > sma_200:
                if action == "BUY":
                    confidence = min(confidence + 10, 95)
                reasoning.append("Golden Cross (Bullish)")
                logger.info(f"💡 SMA Signal: GOLDEN CROSS (bullish)")
            elif sma_50 < sma_200:
                if action == "SELL":
                    confidence = min(confidence + 10, 95)
                reasoning.append("Death Cross (Bearish)")
                logger.info(f"💡 SMA Signal: DEATH CROSS (bearish)")
            else:
                logger.info(f"💡 SMA Signal: NEUTRAL")

            result = {
                "action": action,
                "confidence": confidence,
                "technical_score": rsi,
                "sentiment_score": 50.0,
                "reasoning": " | ".join(reasoning) if reasoning else "Neutral market conditions",
                "timestamp": str(pd.Timestamp.now())
            }
            
            logger.info(f"✅ Analysis Complete: {action} ({confidence:.1f}% confidence)")
            logger.info(f"📋 Reasoning: {result['reasoning']}")
            
            return result

    except HTTPException as e:
        logger.error(f"❌ HTTPException: {e.status_code} - {e.detail}")
        raise
    except httpx.HTTPStatusError as e:
        error_msg = f"Binance API error: {e.response.status_code} - {e.response.text}"
        logger.error(f"❌ Specific Error Message: {error_msg}")
        raise HTTPException(status_code=e.response.status_code, detail=error_msg)
    except httpx.RequestError as e:
        error_msg = f"Network error connecting to Binance: {str(e)}"
        logger.error(f"❌ Specific Error Message: {error_msg}")
        raise HTTPException(status_code=503, detail=error_msg)
    except Exception as e:
        error_msg = f"Unexpected error: {type(e).__name__} - {str(e)}"
        logger.error(f"❌ Specific Error Message: {error_msg}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
def home():
    return {"status": "Active", "engine": "Lightweight v2"}