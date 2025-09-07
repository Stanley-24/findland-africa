from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to local development database
    DATABASE_URL = "postgresql://stanley@localhost:5432/realestate_local"

# Use PostgreSQL database with optimized configuration for performance
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    pool_size=20,        # Increase pool size for better concurrency
    max_overflow=30,     # Allow more connections when needed
    pool_timeout=30,     # Timeout for getting connection from pool
    connect_args={
        "sslmode": "disable",  # Disable SSL for local development
        "connect_timeout": 5,  # Reduce connection timeout
        "application_name": "realestate_fastapi"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Global session for reuse (more efficient for read operations)
_global_session = None

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_global_db():
    """Get a global database session for reuse (use with caution)"""
    global _global_session
    if _global_session is None:
        _global_session = SessionLocal()
    return _global_session

def close_global_db():
    """Close the global database session"""
    global _global_session
    if _global_session:
        _global_session.close()
        _global_session = None
