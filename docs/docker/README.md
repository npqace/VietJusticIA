# Docker Setup Guide

Complete guide for setting up and running VietJusticIA using Docker.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Services Overview](#services-overview)
3. [Environment Variables](#environment-variables)
4. [Common Commands](#common-commands)
5. [Connecting to Databases](#connecting-to-databases)

---

## Quick Start

### 1. Copy Environment Template

```bash
cp env.template .env
```

### 2. Edit Environment Variables

Open `.env` and set:
- `POSTGRES_PASSWORD` - Secure password for PostgreSQL
- `GOOGLE_API_KEY` - Your Google Gemini API key
- `SECRET_KEY` - JWT secret key

### 3. Start All Services

```bash
docker-compose up -d
```

The `-d` flag runs containers in detached mode (background).

### 4. Check Service Status

```bash
docker-compose ps
```

### 5. View Logs

```bash
docker-compose logs -f backend
```

---

## Services Overview

### PostgreSQL Database

- **Image:** `postgres:16`
- **Container Name:** `vietjusticia_postgres`
- **Port:** `5432` (configurable via `POSTGRES_PORT`)
- **Database:** `vietjusticia` (configurable via `POSTGRES_DB`)
- **Username:** `postgres` (configurable via `POSTGRES_USER`)
- **Data Persistence:** Docker volume `postgres_data`

### MongoDB Database

- **Image:** `mongo:latest`
- **Container Name:** `vietjusticia_mongo`
- **Port:** `27017`
- **Data Persistence:** Docker volume `mongo_data`

### Qdrant Vector Database

- **Image:** `qdrant/qdrant:latest`
- **Container Name:** `vietjusticia_qdrant`
- **Ports:** `6333` (API), `6334` (gRPC)
- **Data Persistence:** Docker volume `qdrant_data`

### Backend API

- **Build:** Built from `./backend/Dockerfile`
- **Container Name:** `vietjusticia_backend`
- **Port:** `8000` (configurable via `BACKEND_PORT`)
- **Dependencies:** Waits for PostgreSQL and MongoDB to be healthy
- **Auto-reload:** Enabled for development

### PgAdmin (Optional)

- **Image:** `dpage/pgadmin4:latest`
- **Container Name:** `vietjusticia_pgadmin`
- **Port:** `5050` (configurable via `PGADMIN_PORT`)
- **Access:** http://localhost:5050
- **Default Login:**
  - Email: `admin@vietjusticia.com` (configurable)
  - Password: `admin` (configurable)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `vietjusticia` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `password` | Database password (⚠️ Change this!) |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `BACKEND_PORT` | `8000` | Backend API port |
| `PGADMIN_EMAIL` | `admin@vietjusticia.com` | PgAdmin login email |
| `PGADMIN_PASSWORD` | `admin` | PgAdmin login password |
| `PGADMIN_PORT` | `5050` | PgAdmin web interface port |
| `ENVIRONMENT` | `development` | Application environment |
| `GOOGLE_API_KEY` | - | Google Gemini API key (required) |
| `SECRET_KEY` | - | JWT secret key (required) |

---

## Common Commands

### Start Services

```bash
# Start all services in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up -d postgres
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ This will delete database data)
docker-compose down -v
```

### View Logs

```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs postgres
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend
```

### Database Operations

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d vietjusticia

# Run database migrations (from host)
cd backend
alembic upgrade head

# Or from within the container
docker-compose exec backend alembic upgrade head
```

### Development Commands

```bash
# Rebuild backend after code changes
docker-compose build backend
docker-compose up -d backend

# Restart a service
docker-compose restart backend

# View running containers
docker-compose ps
```

### Data Ingestion

Before using the AI chat feature, populate the Qdrant vector database:

```bash
# Run the ingestion script from within the backend container
docker-compose exec backend python scripts/build_vector_store.py
```

---

## Connecting to Databases

### From Host Machine

- **PostgreSQL:**
  - Host: `localhost`
  - Port: `5432` (or your configured `POSTGRES_PORT`)
  - Database: `vietjusticia`
  - Username: `postgres`
  - Password: (your configured password)

- **MongoDB:**
  - Host: `localhost`
  - Port: `27017`
  - Connection String: `mongodb://localhost:27017/`

- **Qdrant:**
  - Host: `localhost`
  - Port: `6333`
  - URL: `http://localhost:6333`

### From Backend Container

- **PostgreSQL:**
  - Host: `postgres` (container name)
  - Port: `5432`
  - Database: `vietjusticia`
  - Username: `postgres`
  - Password: (your configured password)

- **MongoDB:**
  - Host: `mongodb` (container name)
  - Port: `27017`
  - Connection String: `mongodb://mongodb:27017/`

- **Qdrant:**
  - Host: `qdrant` (container name)
  - Port: `6333`
  - URL: `http://qdrant:6333`

---

## Mobile App Configuration

For the mobile app to connect to your local Docker backend:

Create `mobile/.env`:

```env
# iOS Simulator / Mac
API_URL=http://localhost:8000

# Android Emulator
# API_URL=http://10.0.2.2:8000

# Physical Device (replace with your computer's local IP)
# API_URL=http://192.168.1.xxx:8000
```

**Find your local IP:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

WebSocket connections will automatically use:
- `ws://localhost:8000` for localhost
- `wss://your-domain.com` for production (HTTPS → WSS)

---

## Security Notes

1. **Change default passwords** in your `.env` file
2. For production, use Docker secrets or external secret management
3. Consider using environment-specific Docker Compose files
4. Ensure `.env` files are in `.gitignore` (already configured)

---

## Production Considerations

1. Use a reverse proxy (nginx) for the backend
2. Set up SSL/TLS certificates
3. Configure proper backup strategies for PostgreSQL data
4. Use Docker Swarm or Kubernetes for orchestration
5. Implement proper logging and monitoring
6. Use multi-stage builds to optimize image sizes

---

**Last Updated:** November 2024
