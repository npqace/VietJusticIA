# VietJusticia Docker Setup

This document explains how to set up and run the VietJusticia project using Docker with PostgreSQL 16.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose (usually included with Docker Desktop)

## Quick Start

1. **Copy environment template**:
   ```bash
   cp env.template .env
   ```

2. **Edit environment variables** in `.env`:
   - Change `POSTGRES_PASSWORD` to a secure password
   - Update other variables as needed

3. **Start the services**:
   ```bash
   docker-compose up -d
   ```

4. **Check service status**:
   ```bash
   docker-compose ps
   ```

## Services

### PostgreSQL Database
- **Image**: postgres:16
- **Container Name**: vietjusticia_postgres
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: vietjusticia (configurable via `POSTGRES_DB`)
- **Username**: postgres (configurable via `POSTGRES_USER`)
- **Data Persistence**: Uses Docker volume `postgres_data`

### Backend API
- **Build**: Built from `./backend/Dockerfile`
- **Container Name**: vietjusticia_backend
- **Port**: 8000 (configurable via `BACKEND_PORT`)
- **Dependencies**: Waits for PostgreSQL to be healthy
- **Auto-reload**: Enabled for development

### PgAdmin (Optional)
- **Image**: dpage/pgadmin4:latest
- **Container Name**: vietjusticia_pgadmin
- **Port**: 5050 (configurable via `PGADMIN_PORT`)
- **Access**: http://localhost:5050
- **Default Login**: 
  - Email: admin@vietjusticia.com (configurable)
  - Password: admin_password_here (configurable)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | vietjusticia | Database name |
| `POSTGRES_USER` | postgres | Database user |
| `POSTGRES_PASSWORD` | password | Database password (⚠️ Change this!) |
| `POSTGRES_PORT` | 5432 | PostgreSQL port |
| `BACKEND_PORT` | 8000 | Backend API port |
| `PGADMIN_EMAIL` | admin@vietjusticia.com | PgAdmin login email |
| `PGADMIN_PASSWORD` | admin | PgAdmin login password |
| `PGADMIN_PORT` | 5050 | PgAdmin web interface port |
| `ENVIRONMENT` | development | Application environment |

## Commands

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

## Data Ingestion (Building the Vector Store)

Before using the AI chat feature, you must process your source documents and populate the Qdrant vector database. This is a one-time process you should run after adding or changing your source documents.

```bash
# Run the ingestion script from within the backend container
docker-compose exec backend python scripts/build_vector_store.py
```

## Database Migration

The backend service automatically connects to PostgreSQL and creates tables using SQLAlchemy. For production deployments, you may want to run Alembic migrations:

```bash
# From the host machine (requires Python environment)
cd backend
alembic upgrade head

# Or from within the container
docker-compose exec backend alembic upgrade head
```

## Connecting to Database

### From Host Machine
- **Host**: localhost
- **Port**: 5432 (or your configured `POSTGRES_PORT`)
- **Database**: vietjusticia
- **Username**: postgres
- **Password**: (your configured password)

### From Backend Container
- **Host**: postgres (container name)
- **Port**: 5432
- **Database**: vietjusticia
- **Username**: postgres
- **Password**: (your configured password)

## Troubleshooting

### Database Connection Issues
1. Check if PostgreSQL container is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify environment variables are correct in `.env`

### Backend Issues
1. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

2. Rebuild backend container:
   ```bash
   docker-compose build backend
   docker-compose up -d backend
   ```

### PgAdmin Access Issues
1. Ensure PgAdmin is running:
   ```bash
   docker-compose ps pgadmin
   ```

2. Access PgAdmin at http://localhost:5050
3. Use the email/password from your `.env` file

### Data Persistence
- Database data is stored in Docker volume `postgres_data`
- To reset database, stop services and remove volumes:
  ```bash
  docker-compose down -v
  ```

## Security Notes

1. **Change default passwords** in your `.env` file
2. For production, use Docker secrets or external secret management
3. Consider using environment-specific Docker Compose files
4. Ensure `.env` files are in `.gitignore` (already configured)

## Production Considerations

1. Use a reverse proxy (nginx) for the backend
2. Set up SSL/TLS certificates
3. Configure proper backup strategies for PostgreSQL data
4. Use Docker Swarm or Kubernetes for orchestration
5. Implement proper logging and monitoring
6. Use multi-stage builds to optimize image sizes
