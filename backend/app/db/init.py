import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app import config
from app.config import DEFAULT_CASH_BALANCE, DEFAULT_TICKERS, DEFAULT_USER_ID

_SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Lazily create schema and seed default data if missing."""
    conn = get_connection()
    try:
        conn.executescript(_SCHEMA_PATH.read_text())
        conn.commit()

        _seed_user(conn)
        _seed_watchlist(conn)
        conn.commit()
    finally:
        conn.close()


def _seed_user(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT id FROM users_profile WHERE id = ?", (DEFAULT_USER_ID,)
    ).fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO users_profile (id, cash_balance, created_at) VALUES (?, ?, ?)",
            (DEFAULT_USER_ID, DEFAULT_CASH_BALANCE, now_iso()),
        )


def _seed_watchlist(conn: sqlite3.Connection) -> None:
    count = conn.execute(
        "SELECT COUNT(*) AS c FROM watchlist WHERE user_id = ?", (DEFAULT_USER_ID,)
    ).fetchone()["c"]
    if count == 0:
        ts = now_iso()
        conn.executemany(
            "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            [
                (str(uuid.uuid4()), DEFAULT_USER_ID, ticker, ts)
                for ticker in DEFAULT_TICKERS
            ],
        )
