from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url

# Load environment variables (.env)
load_dotenv()

# connect to database via env or fallback
DATABASE_URL = os.getenv("DATABASE_URL")

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
            print(f"✅ Database '{db}' created.")
        else:
            print(f"✅ Database '{db}' already exists.")

        cursor.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"❌ Could not connect to PostgreSQL server: {e}")
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
    from . import models  # This line is crucial
    print("Creating database tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("Database tables are ready.")