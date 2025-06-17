from .database import engine
from . import models

def create_tables():
    models.Base.metadata.create_all(bind=engine)