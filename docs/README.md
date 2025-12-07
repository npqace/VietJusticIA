# Documentation

Welcome to the VietJusticIA public documentation. This directory contains guides and references for developers working with the project.

## 📚 Documentation Structure

### 🚀 [Development Setup](./development/README.md)
Complete guide for setting up and running the project locally:
- Prerequisites and installation
- Environment configuration
- Database setup
- Running services
- Mobile app configuration

### 🐳 [Docker Setup](./docker/README.md)
Docker configuration and usage:
- Quick start with Docker Compose
- Services overview
- Environment variables
- Common commands
- Database connections

### 🗄️ [Database](./database/)
Database-related documentation:
- [Migration Guide](./database/migration.md) - Document migration guide
- [Parallel Migration](./database/parallel-migration.md) - Multi-key parallel migration strategies

### 🎯 [Features](./features/)
Feature-specific guides:
- [Pipeline Guide](./features/pipeline-guide.md) - Data pipeline usage and configuration

---

## Quick Links

### Essential Guides
- **[Development Setup](./development/README.md)** - Start here for local development
- **[Docker Guide](./docker/README.md)** - Docker setup and configuration

### Common Tasks
- **Set up local environment:** See [Development Guide](./development/README.md)
- **Run data pipeline:** See [Pipeline Guide](./features/pipeline-guide.md)
- **Migrate documents:** See [Migration Guide](./database/migration.md)

---

## Project Overview

VietJusticIA is a comprehensive Vietnamese legal assistance platform consisting of:

1. **AI Engine** - Data crawling, processing, and RAG pipeline
2. **Backend** - FastAPI-based REST API with authentication and AI integration
3. **Mobile App** - React Native + Expo mobile application
4. **Web Portal** - React + Material-UI web portals for lawyers and admins

The system implements a RAG architecture to provide AI-powered legal assistance by retrieving relevant Vietnamese legal documents and generating contextualized responses.

---

## Additional Resources

- **Root README:** See [README.md](../README.md) for project overview
- **Backend README:** See [backend/README.md](../backend/README.md)
- **Web Portal README:** See [web-portal/README.md](../web-portal/README.md)

---

**Last Updated:** December 2025  
**Maintained By:** VietJusticIA Development Team
