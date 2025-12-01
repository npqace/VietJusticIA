"""Common schema models used across multiple modules."""
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Common pagination parameters."""
    skip: int = Field(0, ge=0, description="Number of items to skip")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of items to return")
