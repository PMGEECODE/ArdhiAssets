# backend/app/core/redis_client.py

"""
Redis client singleton for application-wide caching and session management
"""

import redis.asyncio as redis
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisClient:
    """Singleton Redis client wrapper"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    async def get_client(cls) -> redis.Redis:
        """Get or create Redis client instance"""
        if cls._instance is None:
            try:
                # Extract connection URL from settings
                redis_url = str(settings.REDIS_URL)
                logger.info(f"Connecting to Redis at {redis_url}")
                
                cls._instance = await redis.from_url(
                    redis_url,
                    encoding="utf8",
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_keepalive=True,
                    health_check_interval=30,
                )
                await cls._instance.ping()
                logger.info("Redis connection successful")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise
        
        return cls._instance
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._instance:
            try:
                await cls._instance.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")
            finally:
                cls._instance = None


# Singleton instance
redis_client = RedisClient()
