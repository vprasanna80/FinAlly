import asyncio
import json

from fastapi import APIRouter, Request
from starlette.responses import StreamingResponse

router = APIRouter()

STREAM_INTERVAL = 0.5


@router.get("/api/stream/prices")
async def stream_prices(request: Request) -> StreamingResponse:
    cache = request.app.state.cache

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            prices = await cache.get_all()
            payload = json.dumps({"prices": prices})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(STREAM_INTERVAL)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
