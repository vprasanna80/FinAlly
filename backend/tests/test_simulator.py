import asyncio

import pytest

from app.market.base import MarketDataProvider
from app.market.cache import PriceCache
from app.market.simulator import SimulatorProvider


def test_simulator_conforms_to_interface():
    assert issubclass(SimulatorProvider, MarketDataProvider)


@pytest.mark.asyncio
async def test_add_ticker_seeds_cache():
    cache = PriceCache()
    provider = SimulatorProvider(cache)

    await provider.add_ticker("AAPL")

    point = await cache.get("AAPL")
    assert point is not None
    assert point["price"] > 0
    assert point["ticker"] == "AAPL"


@pytest.mark.asyncio
async def test_add_ticker_is_idempotent():
    cache = PriceCache()
    provider = SimulatorProvider(cache)

    await provider.add_ticker("AAPL")
    first_state = provider._states["AAPL"]
    await provider.add_ticker("AAPL")

    assert provider._states["AAPL"] is first_state
    assert len(provider._states) == 1


@pytest.mark.asyncio
async def test_tick_produces_valid_positive_prices():
    cache = PriceCache()
    provider = SimulatorProvider(cache)
    for ticker in ["AAPL", "GOOGL", "MSFT"]:
        await provider.add_ticker(ticker)

    for _ in range(50):
        await provider._tick()

    for ticker in ["AAPL", "GOOGL", "MSFT"]:
        point = await cache.get(ticker)
        assert point["price"] > 0
        assert isinstance(point["price"], float)
        assert point["direction"] in ("up", "down", "flat")


@pytest.mark.asyncio
async def test_tick_updates_change_direction():
    cache = PriceCache()
    provider = SimulatorProvider(cache)
    await provider.add_ticker("AAPL")
    initial_price = provider._states["AAPL"].price

    await provider._tick()

    point = await cache.get("AAPL")
    expected_direction = (
        "up" if point["price"] > initial_price else "down" if point["price"] < initial_price else "flat"
    )
    assert point["direction"] == expected_direction
    assert point["prev_price"] == initial_price


@pytest.mark.asyncio
async def test_prices_stay_bounded_over_many_ticks():
    """GBM with small per-tick vol shouldn't blow up or go to zero over a
    realistic number of ticks."""
    cache = PriceCache()
    provider = SimulatorProvider(cache)
    await provider.add_ticker("AAPL")
    start_price = provider._states["AAPL"].price

    for _ in range(500):
        await provider._tick()

    point = await cache.get("AAPL")
    assert 0 < point["price"] < start_price * 10
