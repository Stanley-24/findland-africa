from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
import time
from typing import Callable

class CacheMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, cache_duration: int = 300):
        super().__init__(app)
        self.cache_duration = cache_duration
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Add performance headers
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Cache-Status"] = "MISS"  # Default to miss
        
        # Add caching headers based on endpoint
        if request.url.path.startswith("/api/v1/properties"):
            if request.method == "GET":
                # Cache properties for 5 minutes
                response.headers["Cache-Control"] = "public, max-age=300"
                response.headers["X-Cache-Status"] = "HIT"
        
        elif request.url.path.startswith("/api/v1/chat/rooms") and request.method == "GET":
            # Cache chat rooms for 1 minute
            response.headers["Cache-Control"] = "public, max-age=60"
            response.headers["X-Cache-Status"] = "HIT"
        
        elif request.url.path.startswith("/api/v1/chat/rooms") and "/messages" in request.url.path:
            # Cache messages for 30 seconds
            response.headers["Cache-Control"] = "public, max-age=30"
            response.headers["X-Cache-Status"] = "HIT"
        
        elif request.url.path.startswith("/api/v1/auth/me"):
            # Cache user info for 10 minutes
            response.headers["Cache-Control"] = "private, max-age=600"
            response.headers["X-Cache-Status"] = "HIT"
        
        # Add ETag for conditional requests
        if hasattr(response, 'body') and response.body:
            import hashlib
            etag = hashlib.md5(response.body).hexdigest()
            response.headers["ETag"] = f'"{etag}"'
        
        # CORS headers are handled by the main CORS middleware
        
        return response
