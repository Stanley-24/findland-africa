import json
import asyncio
from typing import Any, Optional, Union
from datetime import timedelta
import redis
from functools import wraps
import os
from dotenv import load_dotenv

load_dotenv()

class CacheService:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.memory_cache = {}  # Fallback in-memory cache
        self.cache_ttl = {
            'properties': 300,  # 5 minutes
            'chat_rooms': 60,   # 1 minute
            'messages': 30,     # 30 seconds
            'users': 600,       # 10 minutes
            'property_details': 300,  # 5 minutes
        }
    
    async def connect(self):
        """Connect to Redis if available, otherwise use memory cache"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            print("✅ Connected to Redis cache")
        except Exception as e:
            print(f"⚠️ Redis not available, using memory cache: {e}")
            self.redis_client = None
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            self.redis_client.close()
    
    def _get_cache_key(self, prefix: str, key: str) -> str:
        """Generate cache key"""
        return f"{prefix}:{key}"
    
    async def get(self, prefix: str, key: str) -> Optional[Any]:
        """Get value from cache"""
        cache_key = self._get_cache_key(prefix, key)
        
        if self.redis_client:
            try:
                value = self.redis_client.get(cache_key)
                if value:
                    return json.loads(value)
            except Exception as e:
                print(f"Redis get error: {e}")
        
        # Fallback to memory cache
        return self.memory_cache.get(cache_key)
    
    async def set(self, prefix: str, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        cache_key = self._get_cache_key(prefix, key)
        ttl = ttl or self.cache_ttl.get(prefix, 300)
        
        if self.redis_client:
            try:
                self.redis_client.setex(
                    cache_key, 
                    ttl, 
                    json.dumps(value, default=str)
                )
                return True
            except Exception as e:
                print(f"Redis set error: {e}")
        
        # Fallback to memory cache
        self.memory_cache[cache_key] = value
        return True
    
    async def delete(self, prefix: str, key: str) -> bool:
        """Delete value from cache"""
        cache_key = self._get_cache_key(prefix, key)
        
        if self.redis_client:
            try:
                self.redis_client.delete(cache_key)
            except Exception as e:
                print(f"Redis delete error: {e}")
        
        # Remove from memory cache
        self.memory_cache.pop(cache_key, None)
        return True
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    return self.redis_client.delete(*keys)
            except Exception as e:
                print(f"Redis delete pattern error: {e}")
        
        # For memory cache, we'd need to implement pattern matching
        return 0
    
    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"chat_rooms:*{user_id}*",
            f"messages:*{user_id}*",
            f"users:{user_id}",
        ]
        
        for pattern in patterns:
            await self.delete_pattern(pattern)

# Global cache instance
cache_service = CacheService()

def cache_result(prefix: str, ttl: Optional[int] = None, key_func: Optional[callable] = None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = await cache_service.get(prefix, cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            await cache_service.set(prefix, cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

def cache_invalidate(prefix: str, key_func: Optional[callable] = None):
    """Decorator to invalidate cache after function execution"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Invalidate cache
            if key_func:
                cache_key = key_func(*args, **kwargs)
                await cache_service.delete(prefix, cache_key)
            
            return result
        return wrapper
    return decorator
