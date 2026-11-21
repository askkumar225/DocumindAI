# DocuMind AI

> **AI-Powered Enterprise Document Intelligence, Search, Chat & Workflow Platform**

DocuMind AI is a full-stack enterprise document platform combining document processing, OCR, structured AI analysis, semantic search, permission-aware RAG chat, cross-document comparison, risk detection, approval workflows, version management, and complete auditability in one application.

---

## Demo Flow (Interview / Portfolio)

```
Login → Dashboard → Upload Contract → AI Analysis (summary, dates, amounts, risks)
→ Upload Purchase Order → Compare Documents → View Mismatch
→ Ask AI "What is the payment term?" → Answer + Citation
→ Submit for Approval → Manager Reviews → Approve
→ View Audit Trail
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Animated Auth** | Login/Register with AI orb, floating particles, glass cards |
| **JWT + RBAC** | Admin / Manager / Employee roles, server-side enforcement |
| **Document Upload** | PDF, DOCX, PNG, JPG, JPEG — up to 10 MB — validated on upload |
| **OCR** | Tesseract OCR for scanned documents and images |
| **AI Analysis** | Classification, summary, key info, dates, amounts, entities, risks |
| **Semantic Search** | pgvector cosine similarity — searches by meaning, not keywords |
| **RAG Chat** | Permission-aware retrieval — unauthorized chunks never reach the LLM |
| **AI Commands** | Natural-language commands: "Show high-risk contracts", "Summarize this" |
| **Comparison** | Cross-document field comparison with mismatch detection |
| **Risk Detection** | AI detects unlimited liability, auto-renewal, missing info, etc. |
| **Approval Workflow** | Submit → Assign Manager → Review → Approve / Reject / Request Changes |
| **Audit Trail** | Immutable audit log for every important action |
| **Notifications** | In-app notifications for approvals, rejections, risk detections |
| **Analytics** | Role-scoped dashboard with charts, insights, health check |
| **Docker** | Full Docker Compose setup with Nginx, PostgreSQL, Redis, Celery |
| **CI/CD** | GitHub Actions — lint, test, build, secret scan on every push |

---

## Tech Stack

**Backend**
- Python 3.13, Django 5, Django REST Framework
- PostgreSQL 16 + pgvector (vector similarity search)
- Celery + Redis (background processing)
- JWT (djangorestframework-simplejwt)
- OpenAI API (GPT-4o-mini + text-embedding-3-small)
- PyMuPDF (PDF), python-docx (DOCX), Tesseract (OCR)

**Frontend**
- React 18 + TypeScript
- Vite, Tailwind CSS v4
- Framer Motion (animations)
- Axios (API client)
- React Router v6

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy + SPA serving)
- GitHub Actions (CI/CD)

---

## Architecture

```
React + TypeScript
        │
        ▼
Django REST API
        │
 ┌──────┼──────────────┐
 ▼      ▼              ▼
Auth  Documents       Chat
        │               │
        ▼               ▼
  Celery + Redis     Intent Router
        │               │
        ▼           ┌───┴────────────┐
   Extraction       │                │
        │          RAG           AI Actions
        ▼           │                │
  AI Analysis   pgvector          Tools
        │           │
        ▼           ▼
   Workflows       LLM
        │
  ┌─────┼─────┐
  ▼     ▼     ▼
Audit Notif Dashboard
        │
        ▼
  PostgreSQL
```

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.13+
- Node.js 20+
- PostgreSQL 16 (with pgvector) **or** use SQLite dev mode

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env — set LLM_API_KEY, database credentials, etc.

# Run with SQLite (no PostgreSQL needed)
$env:DJANGO_SETTINGS_MODULE="config.settings_dev"
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Docker (Full Production Stack)

```bash
# Copy and configure environment
cp .env.example .env
# Set: SECRET_KEY, DB_PASSWORD, LLM_API_KEY, CORS_ALLOWED_ORIGINS

# Build and start all services
docker compose up --build -d

# Check logs
docker compose logs -f backend

# Run migrations (first time)
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser
```

Open **http://localhost** — Nginx routes `/api/*` to Django, `/*` to React.

**Services started:**

| Service  | Role |
|----------|------|
| `postgres` | PostgreSQL 16 with pgvector |
| `redis`    | Celery broker + result backend |
| `backend`  | Django + Gunicorn |
| `celery`   | Background document processing worker |
| `frontend` | React build served by Nginx |
| `nginx`    | Reverse proxy (port 80) |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in values.

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Django secret key (use a long random string in production) |
| `DEBUG` | | `True` for dev, `False` for production |
| `DB_NAME` | ✅ | PostgreSQL database name |
| `DB_USER` | ✅ | PostgreSQL user |
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DB_HOST` | | Hostname (default: `localhost`) |
| `DB_PORT` | | Port (default: `5432`) |
| `REDIS_URL` | | Redis URL (default: `redis://localhost:6379/0`) |
| `LLM_API_KEY` | ✅ | OpenAI API key |
| `LLM_MODEL` | | Model name (default: `gpt-4o-mini`) |
| `EMBEDDING_MODEL` | | Embedding model (default: `text-embedding-3-small`) |
| `ALLOWED_HOSTS` | | Comma-separated hostnames for production |
| `CORS_ALLOWED_ORIGINS` | | Comma-separated frontend origins |

> **Never commit `.env` to Git.** Only `.env.example` (with empty values) is committed.

---

## API Reference

### Authentication
```
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/token/refresh/
GET  /api/auth/me/
```

### Documents
```
POST   /api/documents/upload/
GET    /api/documents/
GET    /api/documents/{id}/
DELETE /api/documents/{id}/
GET    /api/documents/{id}/analysis/
GET    /api/documents/{id}/deep_analysis/
GET    /api/documents/{id}/content/
```

### Chat
```
POST   /api/chat/                        (RAG + AI commands)
POST   /api/chat/public/                 (unauthenticated)
GET    /api/chat/conversations/
DELETE /api/chat/conversations/{id}/
GET    /api/chat/suggested/?document_id=
```

### Comparison
```
POST   /api/comparisons/
GET    /api/comparisons/
GET    /api/comparisons/{id}/
POST   /api/comparisons/{id}/run/
```

### Workflows
```
POST   /api/workflows/approvals/
GET    /api/workflows/approvals/pending/
POST   /api/workflows/approvals/{id}/approve/
POST   /api/workflows/approvals/{id}/reject/
POST   /api/workflows/approvals/{id}/request_changes/
GET    /api/workflows/documents/{id}/risks/
POST   /api/workflows/permissions/
```

### Dashboard & Health
```
GET    /api/dashboard/
GET    /api/dashboard/analytics/
GET    /api/health/
GET    /api/audit/
GET    /api/notifications/
```

---

## RAG Pipeline

```
User Question
      ↓
JWT Authentication
      ↓
Intent Classification (pattern + LLM)
      ↓ CHAT/EXPLAIN        ↓ Action (SEARCH, SUMMARIZE, etc.)
      ↓                     ↓
Embed Query             Tool Dispatch
      ↓                     ↓
Permission Filter    Permission Check
      ↓                     ↓
Vector Search           Database
      ↓                     ↓
Relevant Chunks     Structured Result
      ↓                     ↓
Context Builder      Response Builder
      ↓                     ↓
      └─────────────────────┘
                  ↓
                 LLM
                  ↓
        Answer + Citations
```

**Security:** Authorization is applied *before* the vector search — unauthorized document chunks are never retrieved or passed to the LLM.

---

## Testing

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run specific suites
pytest tests/test_auth.py -v
pytest tests/test_rag_security.py -v
pytest tests/test_workflows.py -v
pytest tests/test_comparison.py -v
pytest tests/test_intent_router.py -v
```

**Test coverage:**
- Authentication (register, login, JWT, protected routes)
- Document upload (validation, RBAC, status)
- Workflow RBAC (approve, reject, role enforcement)
- RAG security (search scoping, chat isolation, admin bypass)
- Comparison (value normalisation, field comparison, mismatch detection)
- Intent routing (all 10 ACTION_TYPES pattern matching)

---

## Project Structure

```
documind-ai/
│
├── backend/                    Django REST API
│   ├── config/                 Settings, URLs, Celery
│   ├── accounts/               Users, JWT, RBAC
│   ├── documents/              Upload, extraction, analysis, chunks
│   │   └── services/           Extractor, OCR, AI, chunker, embeddings, retriever
│   ├── chat/                   Conversations, RAG, AI command center
│   │   └── services/           Intent router, action executor, tools
│   ├── workflows/              Permissions, approvals, risks, comparison
│   ├── notifications/          In-app notifications
│   ├── audit/                  Immutable audit trail
│   ├── dashboard/              Stats, analytics, health check
│   ├── tests/                  pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
│
├── frontend/                   React + TypeScript SPA
│   ├── src/
│   │   ├── components/         Reusable UI components
│   │   │   ├── auth/           Animated auth (orb, background, card)
│   │   │   ├── ai/             Action result renderers
│   │   │   ├── chat/           Chat bubbles, citations, typing indicator
│   │   │   └── chatbot/        Public floating chatbot
│   │   ├── pages/              Full-page route components
│   │   ├── services/           API service layer (authApi, documentApi, etc.)
│   │   ├── store/              In-memory auth store
│   │   └── types/              TypeScript type definitions
│   ├── Dockerfile
│   └── nginx.conf
│
├── nginx/                      Production reverse proxy config
├── .github/workflows/          GitHub Actions CI/CD
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Interview Answers

**"How does document processing work?"**
> When a user uploads a document, Django saves the file and immediately dispatches a Celery task through Redis. The worker extracts text (or runs OCR on scanned documents), runs AI analysis to classify the document and extract structured fields (dates, amounts, entities, risks), splits the text into overlapping chunks, generates vector embeddings via OpenAI, and stores everything in PostgreSQL with pgvector. The frontend polls status every 3 seconds until processing completes.

**"How do you secure the RAG pipeline?"**
> Authorization is applied before the vector search, not after. When a user asks a question, the backend first identifies which document IDs the user is authorized to access based on their role and explicit DocumentPermission records, then performs the cosine similarity search only within that authorized scope. Unauthorized chunks are never retrieved or passed to the LLM.

**"How does the AI command system work?"**
> The chat endpoint first runs an intent classifier (pattern matching → LLM fallback) to detect whether the user is asking a question (RAG) or issuing a command like "show high-risk contracts". If a command is detected, it routes to a specialized tool that queries the database with proper permission scoping and returns structured data for rich frontend rendering.

**"How did you handle enterprise security?"**
> JWT authentication, role-based access control (ADMIN/MANAGER/EMPLOYEE), document-level permissions, server-side enforcement on every endpoint, permission-aware RAG retrieval, complete audit logging, and file validation on upload. The frontend never decides permissions — all authorization happens on the backend.

---

## License

MIT — built as a portfolio project demonstrating full-stack AI engineering.
