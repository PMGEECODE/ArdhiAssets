"""
Simple pub/sub wrapper for session termination events
Uses Redis channels to broadcast session terminations across workers
"""

import logging
import json
from typing import Optional, Callable, Any
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)

class RedisPubSub:
    """Simple Redis pub/sub for session termination events"""
    
    @staticmethod
    async def publish(channel: str, message: str) -> bool:
        """Publish a message to a Redis channel"""
        try:
            redis_conn = await redis_client.get_client()
            result = await redis_conn.publish(channel, message)
            logger.info(f"Published to {channel}: {message} (subscribers: {result})")
            return True
        except Exception as e:
            logger.error(f"Failed to publish to {channel}: {e}")
            return False

    @staticmethod
    async def publish_session_terminated(user_id: str, session_id: str) -> bool:
        """Publish session termination event"""
        channel = f"session:terminated:{user_id}"
        message = json.dumps({
            "event": "session_terminated",
            "session_id": session_id,
            "timestamp": str(__import__("datetime").datetime.utcnow().isoformat())
        })
        return await RedisPubSub.publish(channel, message)

    @staticmethod
    async def subscribe(channel: str):
        """Subscribe to a Redis channel and yield messages"""
        redis_conn = await redis_client.get_client()
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(channel)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"]
        except Exception as e:
            logger.error(f"Error in Redis subscription for {channel}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    @staticmethod
    async def publish_notification(user_id: str, notification_data: dict) -> bool:
        """Publish new notification event"""
        channel = f"notification:user:{user_id}"
        message = json.dumps({
            "event": "new_notification",
            "data": notification_data,
            "timestamp": str(__import__("datetime").datetime.utcnow().isoformat())
        })
        return await RedisPubSub.publish(channel, message)

redis_pubsub = RedisPubSub()
