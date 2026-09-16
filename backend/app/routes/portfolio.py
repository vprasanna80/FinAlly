from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import DEFAULT_USER_ID
from app.db.init import get_connection
from app.portfolio import TradeError, compute_portfolio, execute_trade, record_snapshot

router = APIRouter()


class TradeRequest(BaseModel):
    ticker: str
    quantity: float
    side: str


@router.get("/api/portfolio")
async def get_portfolio(request: Request) -> dict:
    conn = get_connection()
    try:
        return await compute_portfolio(conn, request.app.state.cache, DEFAULT_USER_ID)
    finally:
        conn.close()


@router.post("/api/portfolio/trade")
async def post_trade(body: TradeRequest, request: Request) -> dict:
    conn = get_connection()
    try:
        cache = request.app.state.cache
        try:
            trade = await execute_trade(
                conn, cache, DEFAULT_USER_ID, body.ticker, body.side, body.quantity
            )
        except TradeError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        await record_snapshot(conn, cache, DEFAULT_USER_ID)
        portfolio = await compute_portfolio(conn, cache, DEFAULT_USER_ID)
        return {"trade": trade, "portfolio": portfolio}
    finally:
        conn.close()


@router.get("/api/portfolio/history")
async def get_history(request: Request) -> dict:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT total_value, recorded_at FROM portfolio_snapshots "
            "WHERE user_id = ? ORDER BY recorded_at ASC",
            (DEFAULT_USER_ID,),
        ).fetchall()
        return {
            "snapshots": [
                {"total_value": row["total_value"], "recorded_at": row["recorded_at"]}
                for row in rows
            ]
        }
    finally:
        conn.close()
