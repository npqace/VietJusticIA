#!/bin/sh
# This script is the entrypoint for the Docker container.
# It ensures that the cache directory is owned by the appuser before starting the main application.

# Set ownership of the cache directory at container startup
chown -R appuser:appuser /home/appuser/.cache

# Use gosu to drop privileges and execute the command passed to this script (e.g., the uvicorn server)
exec gosu appuser "$@"
