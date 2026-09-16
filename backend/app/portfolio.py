import sqlite3
import uuid

from app.db.init import now_iso
from app.market.cache import PriceCache


class TradeError(Exception):
    """Raised when a trade fails validation (bad input, insufficient cash/shares)."""


async def _get_price(cache: PriceCache, ticker: str) -> float | None:
    point = await cache.get(ticker)
    return point["price"] if point else None


async def compute_portfolio(conn: sqlite3.Connection, cache: PriceCache, user_id: str) -> dict:
    user_row = conn.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
    ).fetchone()
    cash_balance = user_row["cash_balance"] if user_row else 0.0

    rows = conn.execute(
        "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ? AND quantity > 0",
        (user_id,),
    ).fetchall()

    positions = []
    positions_value = 0.0
    for row in rows:
        price = await _get_price(cache, row["ticker"])
        current_price = price if price is not None else row["avg_cost"]
        market_value = current_price * row["quantity"]
        cost_basis = row["avg_cost"] * row["quantity"]
        unrealized_pnl = market_value - cost_basis
        unrealized_pnl_pct = (unrealized_pnl / cost_basis * 100) if cost_basis else 0.0
        positions_value += market_value
        positions.append(
            {
                "ticker": row["ticker"],
                "quantity": row["quantity"],
                "avg_cost": row["avg_cost"],
                "current_price": current_price,
                "market_value": market_value,
                "unrealized_pnl": unrealized_pnl,
                "unrealized_pnl_pct": unrealized_pnl_pct,
            }
        )

    total_value = cash_balance + positions_value
    return {
        "cash_balance": cash_balance,
        "positions": positions,
        "positions_value": positions_value,
        "total_value": total_value,
    }


async def execute_trade(
    conn: sqlite3.Connection,
    cache: PriceCache,
    user_id: str,
    ticker: str,
    side: str,
    quantity: float,
) -> dict:
    ticker = ticker.strip().upper()
    side = side.strip().lower()
    if side not in ("buy", "sell"):
        raise TradeError(f"Invalid side '{side}', must be 'buy' or 'sell'")
    if quantity is None or quantity <= 0:
        raise TradeError("Quantity must be positive")

    price = await _get_price(cache, ticker)
    if price is None:
        raise TradeError(f"No price available for '{ticker}'")

    user_row = conn.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
    ).fetchone()
    cash_balance = user_row["cash_balance"] if user_row else 0.0

    pos_row = conn.execute(
        "SELECT id, quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
        (user_id, ticker),
    ).fetchone()

    cost = price * quantity

    if side == "buy":
        if cost > cash_balance + 1e-9:
            raise TradeError(f"Insufficient cash: need ${cost:.2f}, have ${cash_balance:.2f}")
        new_cash = cash_balance - cost
        if pos_row:
            new_quantity = pos_row["quantity"] + quantity
            new_avg_cost = ((pos_row["avg_cost"] * pos_row["quantity"]) + cost) / new_quantity
            conn.execute(
                "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE id = ?",
                (new_quantity, new_avg_cost, now_iso(), pos_row["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, ticker, quantity, price, now_iso()),
            )
    else:
        owned = pos_row["quantity"] if pos_row else 0.0
        if quantity > owned + 1e-9:
            raise TradeError(f"Insufficient shares: trying to sell {quantity}, own {owned}")
        new_cash = cash_balance + cost
        new_quantity = owned - quantity
        if new_quantity <= 1e-9:
            conn.execute("DELETE FROM positions WHERE id = ?", (pos_row["id"],))
        else:
            conn.execute(
                "UPDATE positions SET quantity = ?, updated_at = ? WHERE id = ?",
                (new_quantity, now_iso(), pos_row["id"]),
            )

    conn.execute("UPDATE users_profile SET cash_balance = ? WHERE id = ?", (new_cash, user_id))

    trade_id = str(uuid.uuid4())
    executed_at = now_iso()
    conn.execute(
        "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (trade_id, user_id, ticker, side, quantity, price, executed_at),
    )
    conn.commit()

    return {
        "id": trade_id,
        "ticker": ticker,
        "side": side,
        "quantity": quantity,
        "price": price,
        "executed_at": executed_at,
    }


async def record_snapshot(conn: sqlite3.Connection, cache: PriceCache, user_id: str) -> float:
    portfolio = await compute_portfolio(conn, cache, user_id)
    conn.execute(
        "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, portfolio["total_value"], now_iso()),
    )
    conn.commit()
    return portfolio["total_value"]
