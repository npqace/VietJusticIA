from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url
from pathlib import Path
from pymongo import MongoClient
from pymongo.database import Database

# Load environment variables from project root .env file
# Navigate up from backend/app/database/database.py to project root
project_root = Path(__file__).parent.parent.parent.parent
dotenv_path = project_root / ".env"
load_dotenv(dotenv_path=dotenv_path)

# connect to database via env or fallback
DATABASE_URL = os.getenv("DATABASE_URL")

# MongoDB configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "vietjusticia")

# MongoDB client (created at module level but shared)
_mongo_client = None

def get_mongo_client() -> MongoClient:
    """Get or create MongoDB client (singleton pattern)."""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(MONGO_URL)
    return _mongo_client

def get_mongo_db() -> Database:
    """
    Dependency function to get MongoDB database.
    
    Use this in FastAPI endpoints via Depends(get_mongo_db).
    Returns the configured MongoDB database instance.
    """
    client = get_mongo_client()
    return client[MONGO_DB_NAME]

# Parse components from DATABASE_URL
def get_db_params(database_url):
    url = make_url(database_url)
    return url.username, url.password, url.host, url.database

# Function to create DB if not exists
def create_database_if_not_exists(database_url):
    user, password, host, db = get_db_params(database_url)

    try:
        # Connect to PostgreSQL server (template1 database)
        conn = psycopg2.connect(
            host=host,
            user=user,
            password=password,
            dbname='postgres'  # Connect to default database to check/create the target one
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db}'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute(f'CREATE DATABASE "{db}"')
            print(f"Database '{db}' created.")
        else:
            print(f"Database '{db}' already exists.")

        cursor.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"Could not connect to PostgreSQL server: {e}")
        print("Please ensure PostgreSQL is running and the connection details are correct.")
        # exit(1) # Or handle it more gracefully

# Call the function before engine creation
create_database_if_not_exists(DATABASE_URL)

# create engine
engine = create_engine(DATABASE_URL)

# create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# create base class
Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models
    print("Creating database tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("Database tables are ready.")