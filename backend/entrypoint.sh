#!/bin/sh
# This script is the entrypoint for the Docker container.

# Fix ownership to ensure the appuser can write to volumes
chown -R appuser:appuser /home/appuser/.cache
chown -R appuser:appuser /app/logs

# Only wait for postgres if running in docker-compose (local development)
if [ -n "$POSTGRES_HOST" ] && [ "$POSTGRES_HOST" = "postgres" ]; then
  echo "Waiting for local PostgreSQL to be healthy..."
  while ! pg_isready -h postgres -p 5432 -U "${POSTGRES_USER:-postgres}" > /dev/null 2>&1; do
    sleep 1
  done
  echo "PostgreSQL is ready."
fi

# Run database migrations before starting the app
echo "Running database migrations..."
gosu appuser alembic upgrade head
echo "Database migrations complete."

# Get port from environment variable, or default to 8000
PORT=${PORT:-8000}

# Execute the main application (uvicorn server) as the appuser
echo "Starting Uvicorn server on port $PORT..."
exec gosu appuser "$@"
