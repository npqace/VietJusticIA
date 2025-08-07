from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import pymysql
from dotenv import load_dotenv

# Load environment variables (.env)
load_dotenv()

# connect to database via env or fallback
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost/lawsphere_db")

# Parse components from DATABASE_URL
def get_db_params(database_url):
    import re
    match = re.match(r"mysql\+pymysql://(.*?):(.*?)@(.*?)/(.*?)$", database_url)
    if not match:
        raise ValueError("Invalid DATABASE_URL format")
    user, password, host, db = match.groups()
    return user, password, host, db

# Function to create DB if not exists
def create_database_if_not_exists(database_url):
    user, password, host, db = get_db_params(database_url)

    # Connect to MySQL server (without specifying a DB)
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db}`")
        print(f"✅ Database '{db}' checked/created.")
    finally:
        connection.close()

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