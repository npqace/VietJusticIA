# VietJusticIA - Your AI Legal Assistant

This repository contains the source code for VietJusticIA, a comprehensive legal assistant application. It includes a backend server, a mobile application, and data processing scripts for populating the legal document database.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Git](https://git-scm.com/downloads/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Python](https://www.python.org/downloads/) (3.11 or higher recommended)
- [Node.js](https://nodejs.org/) (LTS version recommended)

## 📚 Documentation

**📖 [Full Documentation](./docs/README.md)** - Complete guides and references

**Quick Links:**
- [Development Setup](./docs/development/README.md) - Local development guide
- [Docker Setup](./docs/docker/README.md) - Docker configuration

---

## Local Development Setup

Follow these steps to get the project up and running on your local machine.

**💡 For detailed setup instructions, see [Development Guide](./docs/development/README.md)**

### 1. Clone the Repository

First, clone the repository to your local machine:
```bash
git clone https://github.com/npqace/VietJusticIA.git
cd VietJusticIA
```

### 2. Configure Environment Variables

The project uses environment variables to configure database connections and other secrets.

a. **Create a `.env` file:**
Copy the `env.template` file to a new file named `.env`. This file is ignored by Git to protect your secrets.
```bash
# For Windows (Command Prompt)
copy env.template .env

# For macOS/Linux
cp env.template .env
```

b. **Set Your Password:**
Open the newly created `.env` file in a text editor and set a secure password for `POSTGRES_PASSWORD`.

### 3. Backend & Data Setup

These steps prepare the Python environment and populate the databases with the necessary data.

a. **Create a Python Virtual Environment:**
It is highly recommended to use a virtual environment to manage project-specific dependencies.
```bash
# Create the virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

b. **Install Python Dependencies:**
Install all required packages for the backend and data scripts.
```bash
pip install -r backend/requirements.txt
pip install -r ai-engine/requirements.txt
```

c. **Set Up Environment Variables for AI Engine:**
Create an `.env` file in the `ai-engine/` directory for local script execution:
```bash
# Copy from root .env or create new
cd ai-engine
# Create .env with:
# MONGO_URL=mongodb://localhost:27017/
# QDRANT_URL=http://localhost:6333
# GOOGLE_API_KEY=<your-google-api-key>
```

### 4. Run Core Services with Docker

**⚠️ Important:** Make sure Docker is running before starting the services.

This command starts the backend server, PostgreSQL database, MongoDB database, and Qdrant vector database using Docker Compose.

```bash
docker-compose up -d
```
The `-d` flag runs the containers in detached mode (in the background).

**Verify Services are Running:**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend
```

**Note:** The data pipeline (next step) requires these services to be running, as it needs to connect to MongoDB and Qdrant.

### 5. Populate the Databases (Data Pipeline)

**⚠️ Important:** Docker services must be running before running the data pipeline.

The application requires legal document data to function. You need to run the complete data pipeline:

**Option 1: Full Pipeline (Recommended for First-Time Setup)**
```bash
cd ai-engine

# Run the complete pipeline: crawl → clean → migrate → vectorize
# This will crawl 100 documents as a starting point
python pipeline.py --max-docs 100
```

**Option 2: Using Pre-Crawled Data (If Available)**
If you have pre-crawled data, you can skip the crawling step:
```bash
cd ai-engine

# Skip crawling, only migrate and vectorize existing data
python pipeline.py --skip-crawl --skip-clean --migration-max-docs 200
```

**💡 For detailed pipeline options and workflows, see [Data Pipeline Guide](./docs/features/pipeline-guide.md)**

**Note:** The pipeline includes:
1. **Crawling** - Scrapes legal documents from the source (requires Chrome browser setup - see [Crawler Guide](./ai-engine/data/crawler/README.md))
2. **Cleaning** - Processes and cleans the raw text
3. **Migration** - Stores documents in MongoDB with AI-generated diagrams
4. **Vectorization** - Builds the Qdrant vector store for semantic search

**⚠️ Crawler Setup Required:** If running the full pipeline, you'll need to set up the crawler first:
- Get an authentication token from `aitracuuluat.vn`
- Launch Chrome with remote debugging enabled
- See [Crawler Setup Guide](./ai-engine/data/crawler/README.md) for detailed instructions

### 6. Set Up and Run the Mobile App

The mobile app is built with React Native and Expo.

a. **Navigate to the mobile directory:**
```bash
cd mobile
```

b. **Install Node.js dependencies:**
```bash
npm install
```

c. **Start the Expo development server:**
```bash
npx expo start
```
This will open a new browser tab with the Expo developer tools. You can then run the app on a physical device using the Expo Go app or on a simulator/emulator on your computer.

---

## 🎉 Setup Complete!

You are now fully set up! The mobile app should be able to connect to the local backend server.

### Quick Verification Checklist

- ✅ Docker services running (`docker-compose ps`)
- ✅ Backend API accessible at `http://localhost:8000`
- ✅ MongoDB contains legal documents (check via MongoDB client or backend logs)
- ✅ Qdrant vector store populated (check via Qdrant dashboard at `http://localhost:6333/dashboard`)
- ✅ Mobile app connected and able to search documents

### Next Steps

- **Add More Documents:** Run the pipeline again with more documents:
  ```bash
  cd ai-engine
  python pipeline.py --max-docs 500
  ```

- **View Documentation:** Check out the [full documentation](./docs/README.md) for detailed guides

- **Troubleshooting:** See [troubleshooting guides](./docs/development/README.md#troubleshooting) if you encounter issues
