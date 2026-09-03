from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from jose import jwt, JWTError
import asyncio

from ..utils.security import SECRET_KEY, ALGORITHM
from ..config import settings

router = APIRouter()

async def get_user_from_token(token: str | None) -> int | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except (JWTError, ValueError, TypeError):
        return None

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    await websocket.accept()
    if not token:
        await websocket.close(code=1008)
        return
        
    user_id = await get_user_from_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return

    redis_kwargs = {"decode_responses": True}
    if settings.CELERY_BROKER_URL.startswith("rediss://"):
        redis_kwargs["ssl_cert_reqs"] = None

    redis_client = aioredis.from_url(settings.CELERY_BROKER_URL, **redis_kwargs)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"notifications:{user_id}")

    # Create a task to read from pubsub
    async def reader(channel):
        try:
            async for message in channel.listen():
                if isinstance(message, dict) and message.get("type") == "message":
                    await websocket.send_text(str(message.get("data", "")))
        except Exception:
            pass

    task = asyncio.create_task(reader(pubsub))

    try:
        # Keep connection open and handle client disconnects
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        task.cancel()
        try:
            await pubsub.unsubscribe(f"notifications:{user_id}")
            await redis_client.close()
        except Exception:
            pass
