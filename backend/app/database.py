from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to local dev DB
    DATABASE_URL = "postgresql://stanley@localhost:5432/realestate_local"

# Detect if Neon/Render (production)
is_production = "neon.tech" in DATABASE_URL or os.getenv("ENVIRONMENT") == "production"

# Base pool settings
pool_settings = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "pool_timeout": 30,
}

if is_production:
    # Neon/Postgres on Render – keep pools small, connections are expensive
    pool_settings.update({
        "pool_size": 5,
        "max_overflow": 10,
    })
    connect_args = {"application_name": "realestate_fastapi"}  # Neon already sets sslmode in URL
else:
    # Local development
    pool_settings.update({
        "pool_size": 10,
        "max_overflow": 20,
    })
    connect_args = {
        "sslmode": "disable",
        "connect_timeout": 5,
        "application_name": "realestate_fastapi",
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **pool_settings
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
