import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from starlette.responses import FileResponse, JSONResponse

from app.config import DEFAULT_USER_ID, MASSIVE_API_KEY
from app.db.init import get_connection, init_db
from app.market.cache import PriceCache
from app.market.massive import MassiveProvider
from app.market.simulator import SimulatorProvider
from app.portfolio import record_snapshot
from app.routes import chat, health, portfolio, stream, watchlist

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SNAPSHOT_INTERVAL_SECONDS = 30


async def _snapshot_loop(cache: PriceCache) -> None:
    while True:
        await asyncio.sleep(SNAPSHOT_INTERVAL_SECONDS)
        conn = get_connection()
        try:
            await record_snapshot(conn, cache, DEFAULT_USER_ID)
        finally:
            conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    cache = PriceCache()
    provider = MassiveProvider(cache) if MASSIVE_API_KEY else SimulatorProvider(cache)
    app.state.cache = cache
    app.state.provider = provider

    conn = get_connection()
    try:
        tickers = [row["ticker"] for row in conn.execute("SELECT DISTINCT ticker FROM watchlist")]
    finally:
        conn.close()

    provider_task = asyncio.create_task(provider.run(tickers))
    snapshot_task = asyncio.create_task(_snapshot_loop(cache))

    try:
        yield
    finally:
        provider_task.cancel()
        snapshot_task.cancel()
        for task in (provider_task, snapshot_task):
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(title="FinAlly", lifespan=lifespan)

app.include_router(health.router)
app.include_router(stream.router)
app.include_router(portfolio.router)
app.include_router(watchlist.router)
app.include_router(chat.router)


if STATIC_DIR.exists():

    @app.get("/")
    async def serve_root():
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse({"detail": "Frontend not built"}, status_code=404)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse({"detail": "Not found"}, status_code=404)
