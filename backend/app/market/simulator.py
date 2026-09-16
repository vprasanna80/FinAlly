import asyncio
import random
from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np

from app.config import DEFAULT_TICKERS
from app.market.base import MarketDataProvider
from app.market.cache import PriceCache

TICK_SECONDS = 0.5
MARKET_VOL = 0.001  # shared "market factor" volatility per tick
IDIO_VOL = 0.0015  # per-ticker idiosyncratic volatility per tick
EVENT_PROB = 0.01  # chance per ticker per tick of a sudden move
EVENT_MIN_PCT = 0.02
EVENT_MAX_PCT = 0.05


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class TickerState:
    price: float
    beta: float  # correlation to the shared market factor
    drift: float  # per-tick drift


class SimulatorProvider(MarketDataProvider):
    """Geometric Brownian motion simulator with a shared market factor
    (so correlated tickers like tech stocks tend to move together) and
    occasional random "event" shocks for drama."""

    def __init__(self, cache: PriceCache) -> None:
        super().__init__(cache)
        self._states: dict[str, TickerState] = {}
        self._rng = np.random.default_rng()

    def _new_state(self, ticker: str) -> TickerState:
        seed_price = DEFAULT_TICKERS.get(ticker, round(random.uniform(20, 400), 2))
        beta = round(random.uniform(0.4, 0.9), 2)
        drift = random.uniform(-0.00005, 0.00008)
        return TickerState(price=seed_price, beta=beta, drift=drift)

    async def add_ticker(self, ticker: str) -> None:
        if ticker in self._states:
            return
        state = self._new_state(ticker)
        self._states[ticker] = state
        await self.cache.update(ticker, state.price, _now_iso())

    async def run(self, tickers: list[str]) -> None:
        for ticker in tickers:
            await self.add_ticker(ticker)
        while True:
            await self._tick()
            await asyncio.sleep(TICK_SECONDS)

    async def _tick(self) -> None:
        market_z = float(self._rng.normal())
        timestamp = _now_iso()
        for ticker, state in list(self._states.items()):
            idio_z = float(self._rng.normal())
            ret = state.drift + state.beta * market_z * MARKET_VOL + idio_z * IDIO_VOL
            if self._rng.random() < EVENT_PROB:
                magnitude = self._rng.uniform(EVENT_MIN_PCT, EVENT_MAX_PCT)
                sign = 1.0 if self._rng.random() < 0.5 else -1.0
                ret += sign * magnitude
            state.price = round(max(0.01, state.price * (1 + ret)), 2)
            await self.cache.update(ticker, state.price, timestamp)
