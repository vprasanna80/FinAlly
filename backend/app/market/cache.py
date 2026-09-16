import asyncio
from dataclasses import asdict, dataclass


@dataclass
class PricePoint:
    ticker: str
    price: float
    prev_price: float
    change: float
    change_pct: float
    direction: str  # "up" | "down" | "flat"
    timestamp: str


class PriceCache:
    """In-memory latest-price cache, written by a market data provider and
    read by the SSE stream and REST endpoints. Single shared instance."""

    def __init__(self) -> None:
        self._data: dict[str, PricePoint] = {}
        self._lock = asyncio.Lock()

    async def update(self, ticker: str, price: float, timestamp: str) -> None:
        async with self._lock:
            prev = self._data.get(ticker)
            prev_price = prev.price if prev else price
            change = price - prev_price
            change_pct = (change / prev_price * 100) if prev_price else 0.0
            direction = "up" if change > 0 else "down" if change < 0 else "flat"
            self._data[ticker] = PricePoint(
                ticker=ticker,
                price=price,
                prev_price=prev_price,
                change=change,
                change_pct=change_pct,
                direction=direction,
                timestamp=timestamp,
            )

    async def get_all(self) -> list[dict]:
        async with self._lock:
            return [asdict(p) for p in self._data.values()]

    async def get(self, ticker: str) -> dict | None:
        async with self._lock:
            point = self._data.get(ticker)
            return asdict(point) if point else None

    async def has(self, ticker: str) -> bool:
        async with self._lock:
            return ticker in self._data
