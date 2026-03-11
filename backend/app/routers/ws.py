from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from jose import jwt, JWTError
import asyncio

from ..utils.security import SECRET_KEY, ALGORITHM
from ..config import settings

router = APIRouter()

async def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except JWTError:
        return None

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str):
    await websocket.accept()
    user_id = await get_user_from_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return

    redis_client = aioredis.from_url(settings.CELERY_BROKER_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"notifications:{user_id}")

    # Create a task to read from pubsub
    async def reader(channel: aioredis.client.PubSub):
        try:
            async for message in channel.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])
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
        await pubsub.unsubscribe(f"notifications:{user_id}")
        await redis_client.close()
