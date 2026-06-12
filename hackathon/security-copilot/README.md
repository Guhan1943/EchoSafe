# Security Intelligence Copilot (MVP)

AI-powered cybersecurity intelligence platform that collects news from trusted sources, verifies findings with AI, routes them for analyst review, generates stakeholder-specific content, and publishes approved communications.

## Quick Start (Docker)

```bash
cd security-copilot
cp .env.example .env
# Optional: set OPENAI_API_KEY in .env for AI verification and content generation

docker compose up --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Default Login

- **Email:** `admin@securitycopilot.dev`
- **Password:** `Admin123!`

## Architecture

```
┌─────────────┐     REST/JWT      ┌──────────────────────────────────────┐
│  React UI   │ ◄──────────────► │  FastAPI Backend                      │
│  (MUI)      │                   │  ├── API Layer (v1 routes)           │
└─────────────┘                   │  ├── Service Layer                   │
                                  │  ├── Repository Layer                │
                                  │  └── SQLAlchemy Models               │
                                  └──────────┬───────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
              PostgreSQL              OpenAI API              RSS Feeds
              (articles, users,       (verification,          (THN, BleepingComputer,
               audit, content)         content generation)      SecurityWeek, etc.)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DATABASE.md](docs/DATABASE.md) for details.

## Features

| Phase | Capability |
|-------|------------|
| Collection | RSS ingestion, scheduled polling, duplicate detection, source management |
| Verification | AI analysis, CVE extraction, NVD validation, trust scoring |
| Review | Analyst approve/reject workflow with audit trail |
| Risk | Severity, business impact, affected products, recommended actions |
| Content | Executive brief, customer advisory, technical analysis, newsletter, social post |
| Publishing | Internal publish, export, publish history |
| Analytics | Collection stats, trust distribution, source performance |

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | User management, source config, AI settings, analytics, audit logs |
| **Analyst** | Review intelligence, verify, approve/reject, generate & publish content |
| **Viewer** | View approved/published intelligence and dashboards |

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Start PostgreSQL and set DATABASE_URL in .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
cd backend
pytest -v
```

## API

REST API with OpenAPI documentation at `/docs`. All endpoints are versioned under `/api/v1`.

Key endpoint groups: `auth`, `users`, `sources`, `articles`, `approvals`, `content`, `publishing`, `analytics`, `audit`, `settings`, `collector`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT, APScheduler
- **Frontend:** React, TypeScript, Material UI, Redux Toolkit, TanStack Query
- **AI:** OpenAI API (configurable via Admin → System Settings)
