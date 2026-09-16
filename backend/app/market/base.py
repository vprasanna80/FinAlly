from abc import ABC, abstractmethod

from app.market.cache import PriceCache


class MarketDataProvider(ABC):
    """Common interface for the simulator and the Massive REST poller.
    Downstream code (SSE stream, portfolio routes) only ever talks to the
    shared PriceCache, so it is agnostic to which provider is active."""

    def __init__(self, cache: PriceCache) -> None:
        self.cache = cache

    @abstractmethod
    async def run(self, tickers: list[str]) -> None:
        """Seed `tickers` into the cache, then update it forever until cancelled."""

    @abstractmethod
    async def add_ticker(self, ticker: str) -> None:
        """Start tracking a new ticker, seeding an initial price into the cache."""
