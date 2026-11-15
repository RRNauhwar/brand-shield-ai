# BrandShield AI

**Your Brand's Intelligence Layer Before Every Publication.**

BrandShield AI is an intelligent brand-governance platform that reviews organisational content before publication. It compares submitted content against approved brand guidelines, terminology, facts, messaging policies and visual assets to identify compliance issues and recommend corrections.

---

## Features

### Core Capabilities
- **Brand Knowledge Hub** — Upload and manage brand guidelines (PDF, DOCX, TXT), terminology rules, approved facts, brand voice definitions, and visual assets
- **Hybrid AI Compliance Engine** — Three-layer analysis combining deterministic rule checks, RAG-powered guideline retrieval, and LLM content analysis
- **Intelligent Correction Engine** — Accept, reject, or manually edit AI-suggested corrections while preserving original content
- **Review & Approval Workflow** — Submit content for human review with full comment threads and status tracking
- **Governance Analytics** — Real-time dashboards built from actual audit data showing compliance trends, violation patterns, and review metrics
- **Visual Brand Compliance** — Logo comparison, colour analysis, OCR text extraction, and basic accessibility checks

### Key Differentiators
- Every finding includes evidence references from your actual brand guidelines
- Rule-based engine ensures deterministic detection of terminology and policy violations
- RAG retrieval provides relevant guideline context to the LLM — no hallucinated references
- Full revision history preserves all content changes
- Organisation-level data isolation with role-based access control

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│   React/Vite    │────▶│   FastAPI Backend     │────▶│  Supabase    │
│   Frontend      │◀────│                       │◀────│  PostgreSQL  │
│                 │     │  ┌──────────────────┐ │     │  + pgvector  │
│  - TypeScript   │     │  │  Rule Engine     │ │     │              │
│  - Tailwind CSS │     │  │  RAG Retrieval   │ │     │  Supabase    │
│  - Recharts     │     │  │  LLM Analyzer    │ │     │  Auth        │
│  - Lucide React │     │  │  Visual Analyzer │ │     │              │
│                 │     │  └──────────────────┘ │     │  Supabase    │
│  Deployed on    │     │                       │     │  Storage     │
│  Vercel         │     │  Deployed on Render   │     │              │
└─────────────────┘     └──────────────────────┘     └──────────────┘
```

### Compliance Analysis Pipeline

```
Content Submitted
       │
       ▼
┌──────────────┐
│ Text/File    │
│ Extraction   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│          Parallel Analysis               │
│                                          │
│  ┌────────────┐  ┌─────────────────────┐ │
│  │ Rule-Based │  │ RAG Retrieval       │ │
│  │ Engine     │  │ (pgvector search)   │ │
│  │            │  │         │           │ │
│  │ • Terms    │  │         ▼           │ │
│  │ • Prohibs  │  │ ┌───────────────┐   │ │
│  │ • Mandates │  │ │ LLM Analysis  │   │ │
│  │ • Facts    │  │ │ (OpenAI/      │   │ │
│  └─────┬──────┘  │ │  Gemini)      │   │ │
│        │         │ └───────┬───────┘   │ │
│        │         └─────────┼───────────┘ │
└────────┼───────────────────┼─────────────┘
         │                   │
         ▼                   ▼
    ┌────────────────────────────┐
    │  Finding Normalisation    │
    │  • Deduplicate            │
    │  • Categorise severity    │
    │  • Calculate score        │
    └────────────┬──────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │  Audit Report           │
    │  with Evidence-Backed   │
    │  Findings               │
    └─────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend | Python, FastAPI, Pydantic |
| Database | PostgreSQL (Supabase) with pgvector |
| Authentication | Supabase Auth with RBAC |
| AI/ML | OpenAI API / Google Gemini API |
| Embeddings | OpenAI text-embedding-3-small |
| Document Processing | PyMuPDF, python-docx |
| Visual Analysis | OpenCV, Pytesseract |
| Storage | Supabase Storage |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account (free tier works)
- OpenAI API key and/or Google Gemini API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd brandshield-ai
```

### 2. Database Setup

**Option A — Zero-Config Local Persistent Mode (Default & Hackathon Ready):**
BrandShield AI includes a built-in persistent relational SQLite storage engine with NumPy vector cosine similarity search (`backend/data/brandshield_local.db`). If Supabase credentials are omitted or left as placeholders, the platform runs completely self-contained with full persistence, vector indexing, audit trails, and analytics out of the box.

**Option B — Supabase PostgreSQL + pgvector (Cloud Production):**
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable the `vector` extension in Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Run the migration files in order:
   ```bash
   # In the Supabase SQL Editor, run:
   # 1. backend/migrations/001_initial_schema.sql
   ```
4. Create a storage bucket named `brand-assets` with public access.

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your actual values

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your actual values

# Run the dev server
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key (optional, used as fallback)
CORS_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
MAX_FILE_SIZE_MB=50
APP_ENV=development
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Framework preset: Vite
4. Add environment variables in Vercel dashboard
5. Deploy

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Render dashboard
7. Deploy

---

## Demo Workspace

The application includes a preconfigured demo workspace for **NovaTech** (a fictional cybersecurity company). To access:

1. Click **"Try Demo Workspace"** on the login page
2. The demo workspace includes:
   - Sample brand guidelines
   - Terminology rules (use "customers" not "consumers")
   - Prohibited messaging (no absolute security guarantees)
   - Approved facts (NovaTech's actual capabilities)
   - Sample content submissions with audit reports
   - A compliant sample and a non-compliant sample

> **Note:** Demo data is clearly labelled. The demo workspace uses the same backend analysis pipeline as real workspaces.

---

## API Documentation

Once the backend is running, interactive API documentation is available at:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Build Check
```bash
cd frontend
npm run build
```

---

## AI Model & External Service Disclosures

- **OpenAI API** (gpt-4o-mini): Used for content compliance analysis. Content submitted for audit is sent to OpenAI for analysis. OpenAI's data usage policies apply.
- **OpenAI Embeddings** (text-embedding-3-small): Used to generate vector embeddings of brand guidelines for semantic search.
- **Google Gemini API** (gemini-2.0-flash): Optional alternative to OpenAI for content analysis.
- **Supabase**: Cloud database, authentication, and file storage provider.

If no AI API keys are configured, the system falls back to rule-based analysis and heuristic checks. Fallback results are clearly labelled as such.

---

## Known Limitations

1. **Visual analysis** is limited to basic colour extraction, OCR, and image similarity — complex layout analysis is not supported
2. **Confidence scores** are model-generated estimates, not statistically calibrated probabilities
3. **Typography detection** in images is limited to what OCR can extract
4. **Document chunking** uses character-based splitting; semantic paragraph detection is approximate
5. **Real-time collaboration** is not implemented — users must refresh to see others' changes
6. **Notification system** shows UI indicators but does not send email/push notifications
7. **File size limit** is 50MB per upload by default

---

## Project Structure

```
brandshield-ai/
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application entry point
│   │   ├── core/
│   │   │   ├── config.py           # Settings and configuration
│   │   │   └── security.py         # Auth and permission utilities
│   │   ├── api/routes/
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── organisations.py    # Organisation management
│   │   │   ├── brand.py            # Brand knowledge CRUD
│   │   │   ├── content.py          # Content submission
│   │   │   ├── audit.py            # Audit execution and retrieval
│   │   │   ├── corrections.py      # Correction management
│   │   │   ├── reviews.py          # Review workflow
│   │   │   ├── analytics.py        # Analytics endpoints
│   │   │   └── demo.py             # Demo setup
│   │   ├── schemas/                # Pydantic models
│   │   ├── services/               # Business logic
│   │   │   ├── document_processor.py
│   │   │   ├── embedding_service.py
│   │   │   ├── retrieval_service.py
│   │   │   ├── rule_engine.py
│   │   │   ├── llm_analyzer.py
│   │   │   ├── audit_service.py
│   │   │   ├── correction_service.py
│   │   │   ├── visual_analyzer.py
│   │   │   ├── approval_service.py
│   │   │   └── analytics_service.py
│   │   └── database/
│   │       └── client.py
│   ├── migrations/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # Reusable UI components
│   │   │   ├── layout/             # Layout components
│   │   │   ├── brand/              # Brand-specific components
│   │   │   ├── audit/              # Audit components
│   │   │   ├── review/             # Review components
│   │   │   └── analytics/          # Analytics components
│   │   ├── pages/                  # Route pages
│   │   ├── layouts/                # Page layouts
│   │   ├── contexts/               # React contexts
│   │   ├── hooks/                  # Custom hooks
│   │   ├── services/               # API service layer
│   │   ├── types/                  # TypeScript types
│   │   └── utils/                  # Utility functions
│   ├── package.json
│   └── vite.config.ts
└── .gitignore
```

---

## License

This project was built for the hackathon competition. All rights reserved.

---

*Built with ❤️ by the BrandShield AI team*
