from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
import os
from dotenv import load_dotenv
import asyncio

# Import our app modules
from app.database import engine
from app.cache import cache_service
# Import models in correct order to avoid relationship issues
from app.models import user, property, media, escrow, chat, monitoring, agent_application
# Import relationship models after base models
from app.models import favorite, like

# Configure all relationships after all models are imported
from app.database import Base
Base.registry.configure()

from app.api.v1 import auth, properties, escrow, chat, monitoring, agent_applications, favorites, likes

# Load environment variables
load_dotenv()

# Create database tables
from app.database import Base
Base.metadata.create_all(bind=engine)

# Database indexes are created automatically via SQLAlchemy

app = FastAPI(
    title="FindLand Africa API",
    description="Real Estate Bridging Loan Platform - MVP",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Initialize cache service on startup"""
    await cache_service.connect()
    print("🚀 FastAPI application started with caching enabled")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await cache_service.disconnect()
    print("🛑 FastAPI application shutdown")

# CORS middleware for frontend integration
cors_origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add cache middleware for performance
from app.middleware.cache_middleware import CacheMiddleware
app.add_middleware(CacheMiddleware, cache_duration=300)

@app.get("/")
async def root():
    """Hello World endpoint for MVP testing"""
    environment = os.getenv("ENVIRONMENT", "development")
    return {
        "message": "FindLand Africa API is running! 🏗️",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "environment": environment
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "FindLand Africa API",
        "timestamp": datetime.now().isoformat()
    }

# Include API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(properties.router, prefix="/api/v1")
app.include_router(escrow.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(monitoring.router, prefix="/api/v1")
app.include_router(agent_applications.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")
app.include_router(likes.router, prefix="/api/v1")

# Include fast API routers (with performance improvements)
from app.api.v1 import properties_fast, chat_fast
app.include_router(properties_fast.router, prefix="/api/v1")
app.include_router(chat_fast.router, prefix="/api/v1")

@app.get("/api/v1/status")
async def api_status():
    """API status endpoint"""
    return {
        "api_version": "v1",
        "status": "operational",
        "features": {
            "auth": "implemented",
            "properties": "implemented", 
            "escrow": "implemented",
            "chat": "implemented",
            "favorites": "implemented",
            "likes": "implemented",
            "caching": "implemented",
            "fast_endpoints": "implemented"
        },
        "performance": {
            "caching_enabled": True,
            "database_indexes": True,
            "fast_queries": True,
            "response_caching": True
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/performance")
async def performance_metrics():
    """Performance metrics endpoint"""
    import psutil
    import os
    
    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Get process metrics
    process = psutil.Process(os.getpid())
    process_memory = process.memory_info()
    
    return {
        "system": {
            "cpu_percent": cpu_percent,
            "memory_total": memory.total,
            "memory_available": memory.available,
            "memory_percent": memory.percent,
            "disk_total": disk.total,
            "disk_free": disk.free,
            "disk_percent": (disk.used / disk.total) * 100
        },
        "process": {
            "memory_rss": process_memory.rss,
            "memory_vms": process_memory.vms,
            "cpu_percent": process.cpu_percent(),
            "num_threads": process.num_threads()
        },
        "cache": {
            "redis_connected": cache_service.redis_client is not None,
            "memory_cache_size": len(cache_service.memory_cache)
        },
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
