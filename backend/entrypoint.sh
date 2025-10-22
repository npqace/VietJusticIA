#!/bin/sh
# This script is the entrypoint for the Docker container.

# Fix ownership to ensure the appuser can write to volumes
chown -R appuser:appuser /home/appuser/.cache
chown -R appuser:appuser /app/ai-engine
chown -R appuser:appuser /app/logs

echo "Waiting for PostgreSQL to be healthy..."
# Use pg_isready to wait for the database to be ready
# The service name 'postgres' is used as the host
while ! pg_isready -h postgres -p 5432 -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready."

# Run database migrations before starting the app
echo "Running database migrations..."
gosu appuser alembic upgrade head
echo "Database migrations complete."

# Get port from environment variable, or default to 8000
PORT=${PORT:-8000}

# Execute the main application (uvicorn server) as the appuser
echo "Starting Uvicorn server..."
exec gosu appuser uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload
