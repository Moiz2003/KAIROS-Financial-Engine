import os
import pandas as pd
import pandas_ta as ta
from binance.client import Client
from openai import OpenAI  # We use this for Perplexity
from dotenv import load_dotenv

load_dotenv()

class KairosBrain:
    def __init__(self):
        # 1. Initialize Binance
        self.binance = Client(
            os.getenv("BINANCE_API_KEY"),
            os.getenv("BINANCE_API_SECRET")
        )
        
        # 2. Initialize Perplexity (The Live Brain)
        self.perplexity = OpenAI(
            api_key=os.getenv("PERPLEXITY_API_KEY"),
            base_url="https://api.perplexity.ai"
        )
        
        self.symbol = os.getenv("CRYPTO_SYMBOL", "BTCUSDT")
        self.interval = Client.KLINE_INTERVAL_4HOUR

    def get_market_analysis(self):
        try:
            print(f"⚡ KAIROS: Scanning {self.symbol}...")
            
            # --- PHASE A: HARD MATH ---
            klines = self.binance.get_klines(symbol=self.symbol, interval=self.interval, limit=100)
            df = pd.DataFrame(klines, columns=['time', 'open', 'high', 'low', 'close', 'vol', 'x', 'y', 'z', 'a', 'b', 'c'])
            df['close'] = df['close'].astype(float)
            
            current_price = df['close'].iloc[-1]
            rsi = round(ta.rsi(df['close'], length=14).iloc[-1], 2)
            ema_200 = ta.ema(df['close'], length=200).iloc[-1]
            
            trend = "BULLISH" if current_price > ema_200 else "BEARISH"
            
            # --- PHASE B: PERPLEXITY LIVE REASONING ---
            print("🌐 KAIROS: Checking Live News via Perplexity...")
            
            # We give Perplexity the math AND ask it to check the news
            prompt = f"""
            You are KAIROS, a crypto risk analyst.
            Market Data for {self.symbol}:
            - Price: ${current_price}
            - RSI: {rsi} (Overbought > 70, Oversold < 30)
            - Trend: {trend}

            Your Goal: Check current crypto news for any MAJOR events (hacks, regulations, macro) that explain the price action.
            Then combine the News + The Math to give a 1-sentence recommendation (Buy, Sell, or Wait).
            Keep it strictly under 30 words.
            """
            
            response = self.perplexity.chat.completions.create(
                model="sonar-pro", # Or "sonar-reasoning-pro" for deeper thought
                messages=[
                    {"role": "system", "content": "Be precise and concise."},
                    {"role": "user", "content": prompt}
                ]
            )
            
            ai_advice = response.choices[0].message.content
            
            return {
                "symbol": self.symbol,
                "price": current_price,
                "rsi": rsi,
                "trend": trend,
                "ai_advice": ai_advice,
                "status": "ONLINE"
            }

        except Exception as e:
            return {"status": "ERROR", "message": str(e)}

if __name__ == "__main__":
    brain = KairosBrain()
    print(brain.get_market_analysis())