# Use Python 3.12 slim image as base
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        curl \
        gcc \
        python3-dev \
        libpq-dev \
    # Download and install gosu for privilege-dropping
    && curl -sSL "https://github.com/tianon/gosu/releases/download/1.17/gosu-amd64" -o /usr/local/bin/gosu \
    && chmod +x /usr/local/bin/gosu \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies in separate layers for better caching
# First, upgrade pip and install large, foundational libraries that change rarely.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Now, copy the requirements file and install the application-specific dependencies.
# This layer will only be re-run if the requirements.txt file changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create logs and artifacts directories
RUN mkdir -p logs /tmp/artifacts

# Expose port (7860 for HuggingFace Spaces, 8000 for local)
EXPOSE 7860
EXPOSE 8000

# Create a non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app

# Create and set permissions for Hugging Face cache and artifacts
RUN mkdir -p /home/appuser/.cache/huggingface && \
    chown -R appuser:appuser /home/appuser/.cache && \
    chown -R appuser:appuser /tmp/artifacts

# Health check - Railway automatically handles this, so we can remove it or make it flexible
# HEALTHCHECK --interval=1m --timeout=30s --start-period=5m --retries=3 \
#     CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Run the application via entrypoint
ENTRYPOINT ["sh", "/usr/local/bin/entrypoint.sh"]
# HuggingFace Spaces uses port 7860, Railway/local uses PORT env var or 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
