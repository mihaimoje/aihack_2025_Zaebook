# AI Code Reviewer

AI-powered git pre-commit hook that reviews your code changes before allowing commits. Uses Ollama LLM to analyze diffs, provides interactive chat for fixing issues, and includes a web dashboard for review management.

## How It Works

1. **Pre-commit Hook**: Intercepts git commits and sends the diff to the AI for analysis
2. **AI Review**: Ollama analyzes changes and flags critical issues or suggestions
3. **Dashboard**: View review history, chat with AI about specific findings, and commit anyway if needed
4. **Auto-start**: Hook automatically starts the server if it's not running

## Installation

### Prerequisites

- Node.js (v20+)
- Python 3
- MongoDB
- Ollama with `llama3:8b` model

### Setup

```bash
# Install dependencies
cd backend
npm install

cd ../frontend
npm install
npm run build

# Configure environment
cd ../backend
cp .env.example .env
# Edit .env with your MongoDB URI and Ollama URL

# Start the server
npm start
```

Server runs on `http://localhost:5000`

## Install Git Hook

```bash
# Install in current repository
python setup.py install

# Install in specific repository
python setup.py install /path/to/repo
```

## Usage

### Making Commits

1. Stage your changes: `git add .`
2. Try to commit: `git commit -m "message"`
3. AI reviews your changes automatically
4. If rejected, open the dashboard to view issues and chat with AI
5. Optionally bypass review with "Commit Anyway"

### Dashboard

Access at `http://localhost:5000` to:
- View all code reviews
- Chat with AI about specific findings
- See diff context in conversations
- Bypass AI review and commit directly

### Settings

Configure AI behavior with custom profiles:
- System prompts
- Temperature and max tokens
- Model selection
- Save multiple profiles for different use cases

## Uninstall Hook

```bash
python setup.py uninstall
```
