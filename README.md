# VietJusticIA - Your AI Legal Assistant

This repository contains the source code for VietJusticIA, a comprehensive legal assistant application. It includes a backend server, a mobile application, and data processing scripts for populating the legal document database.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Python](https://www.python.org/downloads/) (3.9 or higher)
- [Conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/) for Python environment management
- [Git](https://git-scm.com/downloads/)
- [Docker](https://www.docker.com/products/docker-desktop/)

## Project Setup and Execution

Follow these steps to get the project up and running locally.

### 1. Clone the Repository

First, clone the repository to your local machine:
```bash
git clone https://github.com/npqace/VietJusticIA.git
cd VietJusticIA
```

### 2. Set Up the Python Environment

This project uses a Conda environment to manage Python dependencies for the data processing scripts.

a. **Create and activate the Conda environment:**
```bash
conda create --name fyp python=3.9
conda activate fyp
```

b. **Install Python dependencies for the crawler:**
```bash
pip install -r ai-engine/data/crawler/requirements.txt
```

### 3. Run the Data Processing Scripts

To use the application, you first need to crawl and process the legal document data.

a. **Run the web crawler:**
*(Instructions for running the main crawler script should be added here if applicable. For now, we will focus on consolidating existing data.)*

b. **Consolidate the document data:**
This script processes the raw crawled data and creates the `documents.json` file required by the mobile app.
```bash
python ai-engine/data/crawler/consolidate_data.py
```
**Note:** The generated `documents.json` file is large and is ignored by Git. You must run this script to generate it locally.

### 4. Running the Project with Docker

This project uses Docker Compose to run the backend server and database.

a. **Create a `.env` file:**
Copy the `env.template` file to a new file named `.env`.
```bash
cp env.template .env
```

b. **Configure your environment:**
Open the `.env` file and set the necessary environment variables. At a minimum, you should set a secure password for `POSTGRES_PASSWORD`.

c. **Start the services:**
Run the following command to start the backend server and the database in detached mode:
```bash
docker-compose up -d
```

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