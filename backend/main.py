from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
import os
from dotenv import load_dotenv

# Import our app modules
from app.database import engine
# Import models in correct order to avoid relationship issues
from app.models import media, property, user, escrow, chat, monitoring
from app.api.v1 import auth, properties, escrow, chat, monitoring

# Load environment variables
load_dotenv()

# Create database tables
from app.database import Base
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FindLand Africa API",
    description="Real Estate Bridging Loan Platform - MVP",
    version="1.0.0"
)

# CORS middleware for frontend integration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Use environment variable for allowed origins
    allow_credentials=True,  # Allow credentials for authenticated requests
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

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
            "chat": "implemented"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
