# VietJusticIA - Your AI Legal Assistant

This repository contains the source code for VietJusticIA, a comprehensive legal assistant application. It includes a backend server, a mobile application, and data processing scripts for populating the legal document database.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Git](https://git-scm.com/downloads/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Python](https://www.python.org/downloads/) (3.11 or higher recommended)
- [Node.js](https://nodejs.org/) (LTS version recommended)

## Local Development Setup

Follow these steps to get the project up and running on your local machine.

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
```

c. **Populate the MongoDB Database:**
The project comes with pre-crawled legal data. Run the following script to load this data into your MongoDB database.
```bash
python backend/scripts/migrate_to_mongo.py
```

### 4. Run Core Services with Docker

This command starts the backend server, PostgreSQL database, and MongoDB database using Docker Compose.

```bash
docker-compose up -d
```
The `-d` flag runs the containers in detached mode (in the background).

### 5. Set Up and Run the Mobile App

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
*You are now fully set up! The mobile app should be able to connect to the local backend server.*
