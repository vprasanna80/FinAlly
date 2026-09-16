import asyncio
import os
from datetime import datetime, timezone

import httpx

from app.config import MASSIVE_API_KEY
from app.market.base import MarketDataProvider
from app.market.cache import PriceCache

BASE_URL = "https://api.polygon.io"
POLL_SECONDS = float(os.environ.get("MASSIVE_POLL_INTERVAL", "15"))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MassiveProvider(MarketDataProvider):
    """Polls the Massive (Polygon.io) REST snapshot endpoint for the union
    of watched tickers on a fixed interval. Conforms to the same interface
    as SimulatorProvider so the rest of the app is agnostic to the source."""

    def __init__(self, cache: PriceCache) -> None:
        super().__init__(cache)
        self._tickers: set[str] = set()
        self._client = httpx.AsyncClient(base_url=BASE_URL, timeout=10.0)

    async def add_ticker(self, ticker: str) -> None:
        if ticker in self._tickers:
            return
        self._tickers.add(ticker)
        await self._poll_once()

    async def run(self, tickers: list[str]) -> None:
        self._tickers.update(tickers)
        try:
            while True:
                await self._poll_once()
                await asyncio.sleep(POLL_SECONDS)
        finally:
            await self._client.aclose()

    async def _poll_once(self) -> None:
        if not self._tickers:
            return
        tickers_param = ",".join(sorted(self._tickers))
        try:
            resp = await self._client.get(
                "/v2/snapshot/locale/us/markets/stocks/tickers",
                params={"tickers": tickers_param, "apiKey": MASSIVE_API_KEY},
            )
            resp.raise_for_status()
            payload = resp.json()
        except (httpx.HTTPError, ValueError):
            return

        timestamp = _now_iso()
        for entry in payload.get("tickers", []):
            ticker = entry.get("ticker")
            last_trade = entry.get("lastTrade") or {}
            day = entry.get("day") or {}
            price = last_trade.get("p") or day.get("c")
            if ticker and price:
                await self.cache.update(ticker, float(price), timestamp)
