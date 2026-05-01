"""
BinanceStreamManager — single upstream asyncio WebSocket relay.

Opens ONE connection to Binance and fans every normalised message out
to all connected browser clients.  Pure Python dicts — no numpy/pandas.
"""

import asyncio
import json
import logging
import os
import time
from typing import Set

import websockets
from fastapi import WebSocket

from core.ta_engine import ta_engine

logger = logging.getLogger(__name__)

_TESTNET_URL = (
    "wss://testnet.binance.vision/stream"
    "?streams=btcusdt@bookTicker/btcusdt@kline_1m"
)
_LIVE_URL = (
    "wss://stream.binance.com:9443/stream"
    "?streams=btcusdt@bookTicker/btcusdt@kline_1m"
)

_INITIAL_BACKOFF = 1.0   # seconds
_MAX_BACKOFF     = 60.0
_BACKOFF_FACTOR  = 2.0


class BinanceStreamManager:
    def __init__(self, testnet: bool = True) -> None:
        self._url = _TESTNET_URL if testnet else _LIVE_URL
        self._clients: Set[WebSocket] = set()
        self._latest: dict = {}           # last message — sent to late joiners
        self._task: asyncio.Task | None = None

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def start(self) -> None:
        self._task = asyncio.create_task(
            self._listen_forever(), name="binance-ws"
        )
        logger.info("BinanceStreamManager started (%s)", self._url)

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("BinanceStreamManager stopped")

    # ── Client registry ───────────────────────────────────────────────────────

    async def add_client(self, ws: WebSocket) -> None:
        self._clients.add(ws)
        if self._latest:          # send last known state immediately to new joiner
            try:
                await ws.send_text(json.dumps(self._latest))
            except Exception:
                pass
        logger.debug("WS client added (total=%d)", len(self._clients))

    def remove_client(self, ws: WebSocket) -> None:
        self._clients.discard(ws)
        logger.debug("WS client removed (total=%d)", len(self._clients))

    # ── Upstream listener loop ─────────────────────────────────────────────────

    async def _listen_forever(self) -> None:
        backoff = _INITIAL_BACKOFF
        while True:
            try:
                logger.info("Connecting to Binance stream: %s", self._url)
                async with websockets.connect(
                    self._url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    backoff = _INITIAL_BACKOFF     # reset on clean connect
                    logger.info("Binance stream connected")
                    async for raw in ws:
                        await self._handle(raw)

            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.warning(
                    "Binance stream error (%s). Reconnecting in %.1fs",
                    exc, backoff,
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * _BACKOFF_FACTOR, _MAX_BACKOFF)

    # ── Message handling ───────────────────────────────────────────────────────

    async def _handle(self, raw: str) -> None:
        try:
            envelope = json.loads(raw)
        except json.JSONDecodeError:
            return

        stream = envelope.get("stream", "")
        data   = envelope.get("data", envelope)

        if "bookTicker" in stream:
            msg = self._norm_ticker(data)
        elif "kline" in stream:
            msg = self._norm_kline(data)
        else:
            return

        if msg:
            self._latest = msg
            await self._broadcast(msg)
            if msg.get("type") == "kline":
                asyncio.create_task(ta_engine.on_kline(msg))

    @staticmethod
    def _norm_ticker(d: dict) -> dict | None:
        try:
            bid = float(d["b"])
            ask = float(d["a"])
            return {
                "type":   "ticker",
                "symbol": d.get("s", "BTCUSDT"),
                "price":  f"{bid:,.2f}",
                "bid":    f"{bid:,.2f}",
                "ask":    f"{ask:,.2f}",
                "spread": f"{(ask - bid):.2f}",
                "ts":     int(time.time() * 1000),
            }
        except (KeyError, ValueError, TypeError):
            return None

    @staticmethod
    def _norm_kline(d: dict) -> dict | None:
        try:
            k = d["k"]
            return {
                "type":   "kline",
                "symbol": k.get("s", "BTCUSDT"),
                "open":   f"{float(k['o']):,.2f}",
                "close":  f"{float(k['c']):,.2f}",
                "high":   f"{float(k['h']):,.2f}",
                "low":    f"{float(k['l']):,.2f}",
                "volume": f"{float(k['v']):.4f}",
                "closed": bool(k.get("x", False)),
                "ts":     int(time.time() * 1000),
            }
        except (KeyError, ValueError, TypeError):
            return None

    # ── Broadcaster ────────────────────────────────────────────────────────────

    async def _broadcast(self, msg: dict) -> None:
        if not self._clients:
            return
        payload = json.dumps(msg)
        dead: Set[WebSocket] = set()
        for client in self._clients:
            try:
                await client.send_text(payload)
            except Exception:
                dead.add(client)
        self._clients -= dead
        if dead:
            logger.debug("Pruned %d stale client(s)", len(dead))


# Module-level singleton — imported by lifespan and the market route
stream_manager = BinanceStreamManager(
    testnet=os.getenv("BINANCE_TESTNET", "true").lower() != "false"
)
