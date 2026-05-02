"""
AI Targets Route — POST /api/ai/targets

Uses the DeepSeek API (OpenAI-compat) to suggest entry, take-profit,
and stop-loss levels for a given asset ticker and current price.

Auth: any authenticated user (get_current_user — same guard as /api/trades/logs).
Rate: 10 requests / minute per IP (generous for an AI call, avoids abuse).
"""

import asyncio
import json
import os
from urllib.request import Request as URLRequest, urlopen
from urllib.error import HTTPError, URLError

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.dependencies import get_current_user
from core.logging_config import get_logger
from core.rate_limiter import limiter

logger = get_logger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TargetRequest(BaseModel):
    ticker: str
    current_price: float


class TargetResponse(BaseModel):
    suggested_entry: float
    suggested_take_profit: float
    suggested_stop_loss: float
    rationale: str


# ---------------------------------------------------------------------------
# DeepSeek call (synchronous — runs in thread pool via asyncio.to_thread)
# ---------------------------------------------------------------------------

def _call_deepseek(ticker: str, current_price: float) -> TargetResponse:
    api_key = (
        os.getenv("DEEPSEEK_API_KEY")
        or os.getenv("LLM_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )
    base_url = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
    model    = os.getenv("LLM_MODEL", "deepseek-chat")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured: missing DEEPSEEK_API_KEY environment variable.",
        )

    price_context = (
        f"currently trading at ${current_price:.4f}"
        if current_price > 0
        else "at its current market price (use your knowledge to estimate)"
    )

    prompt = (
        f"You are a professional quantitative trader. "
        f"The asset {ticker} is {price_context}.\n\n"
        "Respond with ONLY valid JSON — no markdown fences, no extra text:\n"
        "{\n"
        '  "suggested_entry": <float>,\n'
        '  "suggested_take_profit": <float>,\n'
        '  "suggested_stop_loss": <float>,\n'
        '  "rationale": "<one concise sentence explaining the logic>"\n'
        "}\n\n"
        "Rules:\n"
        "- suggested_entry: near or slightly below current price\n"
        "- suggested_take_profit: 5–15% above entry\n"
        "- suggested_stop_loss: 2–5% below entry\n"
        "- All values must be positive floats\n"
        "- rationale must be a single sentence under 120 characters"
    )

    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 256,
        "stream": False,
    }).encode("utf-8")

    req = URLRequest(
        f"{base_url}/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=30) as resp:
            raw = json.loads(resp.read().decode("utf-8"))

        content = raw["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if the model wraps output
        if content.startswith("```"):
            lines = content.split("\n")
            # Drop first line (``` or ```json) and last line (```)
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            content = content.strip()

        data = json.loads(content)
        return TargetResponse(
            suggested_entry=float(data["suggested_entry"]),
            suggested_take_profit=float(data["suggested_take_profit"]),
            suggested_stop_loss=float(data["suggested_stop_loss"]),
            rationale=str(data["rationale"]),
        )

    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        logger.error("DeepSeek HTTP %s for %s: %s", exc.code, ticker, body[:200])
        if exc.code == 401:
            raise HTTPException(status_code=502, detail="DeepSeek API key is invalid or expired.")
        if exc.code == 429:
            raise HTTPException(status_code=429, detail="DeepSeek rate limit hit — retry in a few seconds.")
        raise HTTPException(status_code=502, detail=f"AI provider error: HTTP {exc.code}")

    except (URLError, TimeoutError) as exc:
        logger.error("DeepSeek connection error for %s: %s", ticker, exc)
        raise HTTPException(status_code=504, detail="AI provider timed out. Retry in a moment.")

    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        logger.error("DeepSeek response parse error for %s: %s", ticker, exc)
        raise HTTPException(status_code=502, detail="AI returned an unparseable response.")


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/targets", response_model=TargetResponse, status_code=200)
@limiter.limit("10/minute")
async def get_ai_targets(
    request: Request,
    body: TargetRequest,
    current_user: dict = Depends(get_current_user),
) -> TargetResponse:
    """
    POST /api/ai/targets

    Ask DeepSeek for suggested entry, take-profit, and stop-loss levels
    for the given ticker at the given current price.

    Requires any valid auth session (same guard as /api/trades/logs).
    """
    logger.info(
        "AI targets request: %s @ %.4f (user=%s)",
        body.ticker, body.current_price, current_user.get("sub", "?"),
    )
    return await asyncio.to_thread(_call_deepseek, body.ticker, body.current_price)
