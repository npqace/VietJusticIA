# Development Setup Guide

Complete guide for setting up VietJusticIA for local development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running Services](#running-services)
6. [Mobile App Setup](#mobile-app-setup)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [Git](https://git-scm.com/downloads/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python](https://www.python.org/downloads/) (3.11 or higher)
- [Node.js](https://nodejs.org/) (LTS version recommended)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/npqace/VietJusticIA.git
cd VietJusticIA
```

### 2. Configure Environment Variables

Copy the environment template and configure your settings:

```bash
# Copy template
cp env.template .env

# Edit .env file with your configuration
# Set POSTGRES_PASSWORD, GOOGLE_API_KEY, SECRET_KEY, etc.
```

### 3. Start Services

```bash
# Start all services (PostgreSQL, MongoDB, Qdrant, Backend)
docker-compose up -d

# Check service status
docker-compose ps
```

### 4. Run Database Migrations

```bash
# Run PostgreSQL migrations
docker-compose exec backend alembic upgrade head
```

### 5. Start Mobile App

```bash
cd mobile
npm install
npx expo start
```

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@postgres:5432/vietjusticia
POSTGRES_DB=vietjusticia
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# MongoDB Configuration
MONGO_URL=mongodb://mongodb:27017/
MONGO_DB_NAME=vietjusticia

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=

# Application Secrets
SECRET_KEY=your-secret-key-here
REFRESH_SECRET_KEY=your-refresh-secret-key-here

# Google API
GOOGLE_API_KEY=your-google-api-key-here

# Application Settings
ENVIRONMENT=development
BACKEND_PORT=8000
```

---

## Database Setup

### PostgreSQL

PostgreSQL is automatically started with Docker Compose. The database is created automatically based on `POSTGRES_DB` environment variable.

**Access PostgreSQL:**
- Host: `localhost`
- Port: `5432`
- Database: `vietjusticia`
- Username: `postgres`
- Password: (from your `.env` file)

**Run Migrations:**
```bash
docker-compose exec backend alembic upgrade head
```

### MongoDB

MongoDB is automatically started with Docker Compose. Collections are created automatically on first use.

**Access MongoDB:**
- Host: `localhost`
- Port: `27017`
- Connection String: `mongodb://localhost:27017/`

### Qdrant

Qdrant vector database is automatically started with Docker Compose.

**Access Qdrant:**
- Host: `localhost`
- Port: `6333`
- URL: `http://localhost:6333`

---

## Running Services

### Backend API

The backend API runs automatically with Docker Compose:

- **URL:** http://localhost:8000
- **Health Check:** http://localhost:8000/health
- **API Docs:** http://localhost:8000/docs

**View Logs:**
```bash
docker-compose logs -f backend
```

### Web Portal

Start the web portal development server:

```bash
cd web-portal
npm install
npm run dev
```

- **URL:** http://localhost:5173

### Mobile App

Start the Expo development server:

```bash
cd mobile
npm install
npx expo start
```

Follow the Expo CLI instructions to run on:
- iOS Simulator
- Android Emulator
- Physical device (via Expo Go app)

---

## Mobile App Configuration

### Local Development

Create `mobile/.env`:

```env
# For iOS Simulator / Mac
API_URL=http://localhost:8000

# For Android Emulator
# API_URL=http://10.0.2.2:8000

# For Physical Device (use your computer's local IP)
# API_URL=http://192.168.1.xxx:8000
```

**Find your local IP:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

---

## Project Structure

```
vietjusticia/
├── backend/          # FastAPI backend application
├── mobile/           # React Native mobile app
├── web-portal/       # React web portal
├── ai-engine/        # Data processing pipeline
├── docker-compose.yml # Docker services configuration
└── .env              # Environment variables (not in git)
```

---

## Common Development Tasks

### Rebuild Backend After Code Changes

```bash
docker-compose build backend
docker-compose up -d backend
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### View Service Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend
```

### Access Database Shells

```bash
# PostgreSQL shell
docker-compose exec postgres psql -U postgres -d vietjusticia

# MongoDB shell
docker-compose exec mongodb mongosh
```

---

## Next Steps

- See [Architecture Documentation](./../architecture/) for system design details
- See [Docker Guide](./../docker/README.md) for Docker-specific information
- See [Deployment Guide](./../deployment/README.md) for production deployment

---

**Last Updated:** December 2025
