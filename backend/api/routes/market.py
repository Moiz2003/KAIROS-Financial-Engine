"""
Market data WebSocket endpoint — relays the Binance stream to browser clients.

Endpoint:
  WS /api/market/stream  — streams normalised ticker + kline events.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.binance_ws import stream_manager
from core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])


@router.websocket("/stream")
async def market_stream(ws: WebSocket) -> None:
    """
    Each browser client that connects here receives every normalised Binance
    event broadcast by BinanceStreamManager.  The route is stateless —
    BinanceStreamManager owns the client set and all fan-out logic.
    """
    await ws.accept()
    await stream_manager.add_client(ws)
    try:
        while True:
            await ws.receive_text()   # keep the connection alive; client msgs ignored
    except WebSocketDisconnect:
        pass
    finally:
        stream_manager.remove_client(ws)
        logger.debug("Market stream client disconnected")
