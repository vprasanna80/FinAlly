import json
import uuid

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.config import DEFAULT_USER_ID
from app.db.init import get_connection, now_iso
from app.llm import get_chat_response
from app.portfolio import TradeError, compute_portfolio, execute_trade, record_snapshot

router = APIRouter()

HISTORY_LIMIT = 20


class ChatRequest(BaseModel):
    message: str


def _build_portfolio_context(portfolio: dict, watchlist_tickers: list[str]) -> str:
    lines = [
        f"Cash balance: ${portfolio['cash_balance']:.2f}",
        f"Total portfolio value: ${portfolio['total_value']:.2f}",
    ]
    if portfolio["positions"]:
        lines.append("Positions:")
        for p in portfolio["positions"]:
            lines.append(
                f"- {p['ticker']}: {p['quantity']:g} shares @ avg ${p['avg_cost']:.2f}, "
                f"current ${p['current_price']:.2f}, "
                f"P&L ${p['unrealized_pnl']:.2f} ({p['unrealized_pnl_pct']:.2f}%)"
            )
    else:
        lines.append("Positions: none")
    lines.append("Watchlist: " + (", ".join(watchlist_tickers) or "empty"))
    return "\n".join(lines)


@router.post("/api/chat")
async def chat(body: ChatRequest, request: Request) -> dict:
    conn = get_connection()
    cache = request.app.state.cache
    try:
        portfolio = await compute_portfolio(conn, cache, DEFAULT_USER_ID)
        watchlist_tickers = [
            row["ticker"]
            for row in conn.execute(
                "SELECT ticker FROM watchlist WHERE user_id = ? ORDER BY added_at ASC",
                (DEFAULT_USER_ID,),
            ).fetchall()
        ]
        portfolio_context = _build_portfolio_context(portfolio, watchlist_tickers)

        history_rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? "
            "ORDER BY created_at DESC LIMIT ?",
            (DEFAULT_USER_ID, HISTORY_LIMIT),
        ).fetchall()
        history = [{"role": row["role"], "content": row["content"]} for row in reversed(history_rows)]

        response = await get_chat_response(history, body.message, portfolio_context)

        executed_actions: dict = {"trades": [], "watchlist_changes": [], "errors": []}

        for trade in response.trades:
            try:
                result = await execute_trade(
                    conn, cache, DEFAULT_USER_ID, trade.ticker, trade.side, trade.quantity
                )
                executed_actions["trades"].append(result)
            except TradeError as exc:
                executed_actions["errors"].append(str(exc))

        if response.trades:
            await record_snapshot(conn, cache, DEFAULT_USER_ID)

        for change in response.watchlist_changes:
            ticker = change.ticker.strip().upper()
            if change.action == "add":
                existing = conn.execute(
                    "SELECT id FROM watchlist WHERE user_id = ? AND ticker = ?",
                    (DEFAULT_USER_ID, ticker),
                ).fetchone()
                if not existing:
                    conn.execute(
                        "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
                        (str(uuid.uuid4()), DEFAULT_USER_ID, ticker, now_iso()),
                    )
                    conn.commit()
                    await request.app.state.provider.add_ticker(ticker)
                    executed_actions["watchlist_changes"].append(
                        {"ticker": ticker, "action": "add"}
                    )
            elif change.action == "remove":
                cur = conn.execute(
                    "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
                    (DEFAULT_USER_ID, ticker),
                )
                conn.commit()
                if cur.rowcount:
                    executed_actions["watchlist_changes"].append(
                        {"ticker": ticker, "action": "remove"}
                    )

        created_at = now_iso()
        conn.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), DEFAULT_USER_ID, "user", body.message, None, created_at),
        )
        conn.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                DEFAULT_USER_ID,
                "assistant",
                response.message,
                json.dumps(executed_actions),
                now_iso(),
            ),
        )
        conn.commit()

        return {"message": response.message, "actions": executed_actions}
    finally:
        conn.close()
