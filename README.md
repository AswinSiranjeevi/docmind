# DocMind — RAG Document Q&A

> Upload any document. Ask questions. Get cited answers — powered by **Llama 3.3 70B** and **ChromaDB**. Completely free to run.

![CI](https://github.com/YOUR_USERNAME/docmind/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![LangChain](https://img.shields.io/badge/LangChain-0.3-1C3C3C)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Stack (100% Free)

| Layer | Technology |
|---|---|
| LLM | **Llama 3.3 70B** via Groq API (free tier) |
| Embeddings | **all-MiniLM-L6-v2** via sentence-transformers (local, no API) |
| Vector Store | **ChromaDB** (persistent on disk) |
| RAG Framework | **LangChain 0.3** |
| Backend | **FastAPI** + Uvicorn |
| Frontend | **React 18** + Vite |
| Streaming | Server-Sent Events (SSE) |
| Deployment | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Features

- **Drag & drop upload** — PDF, DOCX, TXT, Markdown
- **Real-time streaming** — token-by-token answers via SSE
- **Source citations** — every answer shows which document chunks matched, with relevance scores and excerpts
- **Document management** — upload, view, and delete indexed documents
- **Persistent storage** — ChromaDB survives container restarts
- **Auto API docs** — Swagger UI at `/docs`

---

## Architecture

```
User → React (Vite)
         ↓ SSE + REST
       FastAPI Backend
         ↓                    ↓
  DocumentProcessor      Query Handler
  PDF/DOCX/TXT/MD            ↓
         ↓           ChromaDB similarity search
  LangChain Splitter         ↓
  (1000 char chunks)   Top-5 chunks → LangChain prompt
         ↓                   ↓
  all-MiniLM-L6-v2    Llama 3.3 70B (Groq)
  local embeddings           ↓
         ↓             Streamed response → SSE → UI
      ChromaDB
```

---

## Quick Start

### 1. Get a free Groq API key

Sign up at **https://console.groq.com** — free, no credit card required.

### 2. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/docmind.git
cd docmind

# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` and paste your Groq key:
```
GROQ_API_KEY=gsk_your_key_here
```

### 3. Run with Docker

```bash
docker compose up --build
```

| URL | Service |
|---|---|
| http://localhost:3000 | Frontend |
| http://localhost:8000/docs | API Docs (Swagger) |

### 4. Without Docker (local dev)

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload & index a document |
| `POST` | `/api/query/stream` | Ask a question (SSE stream) |
| `GET` | `/api/documents` | List all indexed documents |
| `DELETE` | `/api/documents/{doc_id}` | Remove a document |
| `GET` | `/api/stats` | Index stats |

---

## Project Structure

```
docmind/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── api/routes.py     # All endpoints
│   │   └── rag/
│   │       ├── processor.py  # Document loading & chunking
│   │       ├── vectorstore.py# ChromaDB + local embeddings
│   │       └── chain.py      # RAG chain with Groq streaming
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── ChatInterface.jsx   # SSE streaming chat
│   │       ├── UploadZone.jsx      # Drag & drop
│   │       ├── DocumentList.jsx    # Manage docs
│   │       └── SourceCitation.jsx  # Cited sources
│   ├── vite.config.js
│   └── Dockerfile
├── .github/workflows/ci.yml  # Lint + build + docker CI
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## License

MIT
