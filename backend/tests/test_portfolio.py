import pytest

from app.db.init import get_connection
from app.market.cache import PriceCache
from app.portfolio import TradeError, compute_portfolio, execute_trade, record_snapshot

USER = "default"


@pytest.fixture()
def cache():
    return PriceCache()


@pytest.mark.asyncio
async def test_buy_with_sufficient_cash(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        trade = await execute_trade(conn, cache, USER, "AAPL", "buy", 10)
        assert trade["ticker"] == "AAPL"
        assert trade["price"] == 100.0

        portfolio = await compute_portfolio(conn, cache, USER)
        assert portfolio["cash_balance"] == pytest.approx(10000.0 - 1000.0)
        assert len(portfolio["positions"]) == 1
        assert portfolio["positions"][0]["quantity"] == 10
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_buy_with_insufficient_cash_raises(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        with pytest.raises(TradeError, match="Insufficient cash"):
            await execute_trade(conn, cache, USER, "AAPL", "buy", 1000)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_sell_more_than_owned_raises(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        await execute_trade(conn, cache, USER, "AAPL", "buy", 5)
        with pytest.raises(TradeError, match="Insufficient shares"):
            await execute_trade(conn, cache, USER, "AAPL", "sell", 10)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_sell_without_position_raises(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        with pytest.raises(TradeError, match="Insufficient shares"):
            await execute_trade(conn, cache, USER, "AAPL", "sell", 1)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_trade_with_no_price_raises(temp_db, cache):
    conn = get_connection()
    try:
        with pytest.raises(TradeError, match="No price available"):
            await execute_trade(conn, cache, USER, "ZZZZ", "buy", 1)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_invalid_side_raises(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        with pytest.raises(TradeError, match="Invalid side"):
            await execute_trade(conn, cache, USER, "AAPL", "hold", 1)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_non_positive_quantity_raises(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        with pytest.raises(TradeError, match="Quantity must be positive"):
            await execute_trade(conn, cache, USER, "AAPL", "buy", 0)
        with pytest.raises(TradeError, match="Quantity must be positive"):
            await execute_trade(conn, cache, USER, "AAPL", "buy", -5)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_avg_cost_weighted_average_on_repeat_buys(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        await execute_trade(conn, cache, USER, "AAPL", "buy", 10)  # 10 @ 100
        await cache.update("AAPL", 200.0, "t2")
        await execute_trade(conn, cache, USER, "AAPL", "buy", 10)  # 10 @ 200

        portfolio = await compute_portfolio(conn, cache, USER)
        position = portfolio["positions"][0]
        assert position["quantity"] == 20
        assert position["avg_cost"] == pytest.approx(150.0)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_selling_all_shares_removes_position(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        await execute_trade(conn, cache, USER, "AAPL", "buy", 10)
        await execute_trade(conn, cache, USER, "AAPL", "sell", 10)

        portfolio = await compute_portfolio(conn, cache, USER)
        assert portfolio["positions"] == []
        assert portfolio["cash_balance"] == pytest.approx(10000.0)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_sell_at_a_loss_updates_pnl(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        await execute_trade(conn, cache, USER, "AAPL", "buy", 10)
        await cache.update("AAPL", 50.0, "t2")

        portfolio = await compute_portfolio(conn, cache, USER)
        position = portfolio["positions"][0]
        assert position["unrealized_pnl"] == pytest.approx(-500.0)
        assert position["unrealized_pnl_pct"] == pytest.approx(-50.0)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_record_snapshot_persists_total_value(temp_db, cache):
    await cache.update("AAPL", 100.0, "t1")
    conn = get_connection()
    try:
        await execute_trade(conn, cache, USER, "AAPL", "buy", 10)
        total = await record_snapshot(conn, cache, USER)

        rows = conn.execute("SELECT total_value FROM portfolio_snapshots").fetchall()
        assert len(rows) == 1
        assert rows[0]["total_value"] == pytest.approx(total)
    finally:
        conn.close()
