import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import DEFAULT_USER_ID
from app.db.init import get_connection, now_iso

router = APIRouter()


class WatchlistAddRequest(BaseModel):
    ticker: str


@router.get("/api/watchlist")
async def get_watchlist(request: Request) -> dict:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT ticker FROM watchlist WHERE user_id = ? ORDER BY added_at ASC",
            (DEFAULT_USER_ID,),
        ).fetchall()
        cache = request.app.state.cache
        items = []
        for row in rows:
            point = await cache.get(row["ticker"])
            items.append({"ticker": row["ticker"], **(point or {})})
        return {"watchlist": items}
    finally:
        conn.close()


@router.post("/api/watchlist", status_code=201)
async def add_ticker(body: WatchlistAddRequest, request: Request) -> dict:
    ticker = body.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM watchlist WHERE user_id = ? AND ticker = ?",
            (DEFAULT_USER_ID, ticker),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail=f"'{ticker}' is already on the watchlist")
        conn.execute(
            "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), DEFAULT_USER_ID, ticker, now_iso()),
        )
        conn.commit()
        await request.app.state.provider.add_ticker(ticker)
        return {"ticker": ticker}
    finally:
        conn.close()


@router.delete("/api/watchlist/{ticker}")
async def remove_ticker(ticker: str, request: Request) -> dict:
    ticker = ticker.strip().upper()
    conn = get_connection()
    try:
        cur = conn.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
            (DEFAULT_USER_ID, ticker),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"'{ticker}' is not on the watchlist")
        return {"ticker": ticker}
    finally:
        conn.close()
