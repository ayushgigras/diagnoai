# Contributing to DiagnoAI

Welcome to the DiagnoAI project! We appreciate your interest in contributing. Please follow these guidelines to ensure a smooth collaboration process.

## Local Development Environment

To set up your local development environment:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd DiagnoAI
   ```
2. **Setup Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Update .env with necessary credentials and secrets
   ```
3. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Ensure VITE_API_URL is correctly pointed to your backend
   ```

## Branch Naming Convention

Please follow our standard branch naming conventions mapping to the type of work:
- `feature/<feature-name>` for new features
- `fix/<bug-name>` for bug fixes
- `test/<test-name>` for adding or updating tests

## Running Tests

Testing is crucial to maintain DiagnoAI's reliability.

**Backend Tests**:
```bash
cd backend
pytest tests/ -v
```

**Frontend Tests**:
```bash
cd frontend
npm test
```

## Pull Request Checklist

Before submitting a Pull Request, please ensure the following checklist is completed:
- [ ] ALL backend and frontend tests pass.
- [ ] NO secrets or sensitive data (e.g., `.env`, `.db`, production API keys) are committed.
- [ ] `frontend/.env.example` and `backend/.env.example` are updated if any new environment variables were introduced.
- [ ] Code has been manually verified in the development environment.

## Code Style Guidelines

- **Python**: Follows standard PEP8 guidelines. Ensure type hints are used consistently correctly where possible.
- **TypeScript / React**: Follows standard ESLint configurations and Prettier conventions. Maintain proper functional component setups with hooks.
