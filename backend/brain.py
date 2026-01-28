from fastapi import FastAPI, HTTPException
import ccxt.async_support as ccxt
import pandas as pd
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# ---------------------------------------------------------
# LIGHTWEIGHT INDICATOR LOGIC (No pandas-ta required)
# ---------------------------------------------------------
def calculate_sma(series, period):
    return series.rolling(window=period).mean()

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def analyze_market_data(df):
    # Calculate Indicators manually
    df['SMA_50'] = calculate_sma(df['close'], 50)
    df['SMA_200'] = calculate_sma(df['close'], 200)
    df['RSI'] = calculate_rsi(df['close'], 14)

    # Get latest values
    latest = df.iloc[-1]
    rsi = latest['RSI']
    price = latest['close']
    sma_50 = latest['SMA_50']
    sma_200 = latest['SMA_200']

    # Logic
    action = "HOLD"
    confidence = 0.5
    reasoning = []

    # RSI Logic
    if rsi < 30:
        action = "BUY"
        confidence += 0.2
        reasoning.append(f"RSI is oversold ({rsi:.1f})")
    elif rsi > 70:
        action = "SELL"
        confidence += 0.2
        reasoning.append(f"RSI is overbought ({rsi:.1f})")

    # Trend Logic (Golden Cross / Death Cross)
    if sma_50 > sma_200:
        if action == "BUY": confidence += 0.2
        reasoning.append("Uptrend detected (SMA 50 > SMA 200)")
    else:
        if action == "SELL": confidence += 0.2
        reasoning.append("Downtrend detected (SMA 50 < SMA 200)")

    return {
        "action": action,
        "confidence": min(confidence, 0.95), # Cap at 95%
        "technical_score": rsi, # Using RSI as proxy for score
        "sentiment_score": 0.0, # Placeholder for Perplexity
        "reasoning": " | ".join(reasoning),
        "timestamp": str(latest.name)
    }

# ---------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------
@app.get("/")
def home():
    return {"message": "KAIROS Lite Brain is Running"}

@app.get("/api/analyze/{symbol}")
async def analyze(symbol: String):
    exchange = ccxt.binance()
    try:
        # 1. Fetch Data
        ohlcv = await exchange.fetch_ohlcv(symbol, timeframe='1h', limit=300)
        if not ohlcv:
            raise HTTPException(status_code=404, detail="No data found")

        # 2. Convert to DataFrame
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('timestamp', inplace=True)

        # 3. Analyze
        result = analyze_market_data(df)
        
        return result

    except Exception as e:
        return {
            "action": "ERROR",
            "confidence": 0,
            "technical_score": 0,
            "sentiment_score": 0,
            "reasoning": str(e),
            "timestamp": ""
        }
    finally:
        await exchange.close()