-- VietJusticia Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create the database if it doesn't exist (handled by POSTGRES_DB env var)
-- This file ensures the database is properly set up

-- Create extensions that might be useful for the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes or other initial setup can be added here
-- Note: Table creation will be handled by SQLAlchemy/Alembic migrations

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'VietJusticia database initialized successfully';
END $$;
