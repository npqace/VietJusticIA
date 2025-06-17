from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables (.env)
load_dotenv()

# connect to database via env or fallback
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost/lawsphere_db")

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