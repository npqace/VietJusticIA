#!/bin/sh
# This script is the entrypoint for the Docker container.
# It ensures that the cache directory is owned by the appuser before starting the main application.

# Set ownership of the cache directory at container startup
chown -R appuser:appuser /home/appuser/.cache

# Get port from environment variable provided by Railway, or default to 8000 for local use.
PORT=${PORT:-8000}

# Use gosu to drop privileges and execute the uvicorn server.
# We are overriding the Dockerfile's CMD to ensure we use the correct port
# and disable the --reload flag for production.
exec gosu appuser uvicorn app.main:app --host 0.0.0.0 --port $PORT
