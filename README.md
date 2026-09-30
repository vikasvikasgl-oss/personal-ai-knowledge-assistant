# 🧠 Personal AI Knowledge Assistant & Vault

A full-stack, enterprise-grade AI Knowledge Vault and Retrieval-Augmented Generation (RAG) system. Upload documents (PDF, DOCX, TXT, Images), automatically classify categories, build semantic FAISS vector indices, explore interactive multi-document knowledge graphs, uncover topic gaps, and evaluate ML & retrieval performance.

---

## 🌟 Key Features

1. **📊 Executive Dashboard (`/dashboard`)**
   - High-level metrics: Total documents indexed, FAISS chunks, questions asked, and user memories.
   - Interactive charts (Recharts): Category distribution donut, top semantic topics bar chart, and activity-over-time trend line.
   - Recent activity list and one-click quick actions.

2. **📁 Document Vault & Automated Ingestion (`/documents`)**
   - Drag-and-drop file upload supporting **PDF**, **DOCX**, **TXT**, and **Images (PNG, JPG, WebP)**.
   - **Tesseract OCR engine** fallback for scanned documents and images.
   - **Automated ML Classification**: Scikit-Learn TF-IDF classifier assigns categories (*Study Material, Resume/Career, Research Paper, Project, Assignment, Personal Notes*).
   - Chunk inspection modal with token counts and per-user isolated storage.

3. **🔍 Semantic Vector Search (`/search`)**
   - Dense vector retrieval powered by `sentence-transformers/all-MiniLM-L6-v2` and FAISS.
   - Cosine similarity threshold slider, category filtering, and highlighted query term snippets.
   - Per-user FAISS vector index partition isolation.

4. **💬 Context-Aware RAG Chat (`/chat`)**
   - Grounded Q&A synthesized using **Google Gemini 2.5 Flash** with citations and source chunk references.
   - Retrieval confidence scoring (*High, Medium, Low*) with clickable source previews.
   - Multi-session conversation history and markdown rendering with syntax-highlighted code blocks.

5. **🕸️ Interactive Knowledge Graph (`/graph`)**
   - Automated triple extraction (*Subject → Relation → Object*) using Gemini.
   - Interactive physics-based graph canvas powered by `vis-network` with draggable nodes, zoom, entity search, and type filtering (*Disease, Technology, Method, Concept, Metric, Dataset, Tool, Person*).
   - Node detail inspector and direct *"Ask AI about this entity"* routing.

6. **💡 Topic Analysis & Knowledge Gap Recommendations (`/recommendations`)**
   - Automated topic extraction per document using **KeyBERT** / TF-IDF.
   - Cosine similarity matrix identifying related document pairings.
   - Knowledge gap detection highlighting missing concepts and suggested study topics.

7. **🧪 ML & Vector Retrieval Evaluation Hub (`/evaluation`)**
   - **Classification Metrics**: Precision, Recall, F1-Score, accuracy, and full confusion matrix heatmap.
   - **Retrieval Metrics**: Average Cosine Similarity, Top-1 / Top-3 / Top-5 Retrieval Accuracy, and Mean Reciprocal Rank (MRR).
   - Query breakdown verification table, one-click *"Run Evaluation"*, and **PDF report export** using jsPDF.

8. **🛡️ Personal Vault Settings & Memory Management (`/settings`)**
   - View and manage persistent user memories used to personalize chat responses.
   - System theme switcher (*Light, Dark, System*), storage statistics, and profile management.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + Vite + Tailwind CSS)"]
        UI[Dashboard, Vault, Search, Chat, Graph, Recommendations, Evaluation]
        Context[Auth, Theme, Toast, ErrorBoundary]
    end

    subgraph Server["Backend API (FastAPI)"]
        API[API Router /api/v1]
        AuthSvc[JWT & Bcrypt Auth]
        IngestSvc[Text Extraction & Tesseract OCR]
        MLClassifier[TF-IDF Document Classifier]
        EmbeddingSvc[all-MiniLM-L6-v2 Embeddings]
        FAISSSvc[FAISS Vector Store (Per-User Partition)]
        LLMSvc[Gemini 2.5 Flash RAG & KG Extraction]
        RecSvc[KeyBERT & Similarity Analysis]
        EvalSvc[ML & Retrieval Evaluator]
    end

    subgraph Storage["Data Tier"]
        DB[(SQLite app.db)]
        FAISS_DIR[(data/faiss/{user_id}/)]
        UPLOADS[(data/uploads/{user_id}/)]
    end

    UI -->|JWT Auth Requests| API
    API --> AuthSvc
    API --> IngestSvc --> MLClassifier
    IngestSvc --> EmbeddingSvc --> FAISSSvc
    API --> LLMSvc
    API --> RecSvc
    API --> EvalSvc
    AuthSvc --> DB
    FAISSSvc --> FAISS_DIR
    IngestSvc --> UPLOADS
```

---

## 📋 Prerequisites

- **Python**: version 3.10, 3.11, or 3.12
- **Node.js**: version 18.x or 20.x+ (and npm)
- **Tesseract OCR** (Required for OCR on images and scanned PDFs)
- **Google Gemini API Key**: Free tier available at [Google AI Studio](https://aistudio.google.com/)

---

## 🔍 Installing Tesseract OCR

Tesseract is used by the document processor for extracting text from images and scanned documents.

### Windows
1. **Via Winget (Recommended)**:
   ```powershell
   winget install UB-Mannheim.TesseractOCR
   ```
2. **Or Manual Installer**:
   - Download the installer from: [UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
   - Install to `C:\Program Files\Tesseract-OCR`
   - Add `C:\Program Files\Tesseract-OCR` to your system `PATH` environment variable.

### macOS
```bash
brew install tesseract
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y tesseract-ocr libtesseract-dev
```

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `backend/.env`:

```bash
# Windows PowerShell:
Copy-Item backend/.env.example backend/.env

# Linux / macOS:
cp backend/.env.example backend/.env
```

### Environment Variable Reference

| Variable | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | No | `sqlite:///./data/app.db` | SQLAlchemy connection string (SQLite or PostgreSQL) |
| `JWT_SECRET` | **Yes (Prod)** | `super-secret-jwt-key...` | Secret key for signing auth tokens. **Change in production!** |
| `GEMINI_API_KEY` | **Yes** | `""` | Google Gemini API key for RAG chat and knowledge graph extraction |
| `TESSERACT_CMD` | Optional | Auto-detected from PATH | Full executable path to Tesseract (e.g. `C:\Program Files\Tesseract-OCR\tesseract.exe`) |
| `MAX_UPLOAD_SIZE_MB` | No | `50` | Maximum file size allowed for document uploads (in MB) |

> 🔒 **Security Notice:** Always set a strong, random `JWT_SECRET` in production:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

---

## 🚀 Quick Start (One-Command Startup)

We provide one-command startup scripts that automatically initialize environments, check dependencies, and launch both backend and frontend servers:

### Windows (PowerShell)
```powershell
.\start.ps1
```

### Windows (Double-Click Batch File)
Double-click `start.bat` in the project root directory.

### Linux / macOS (Bash)
```bash
chmod +x start.sh
./start.sh
```

---

## 🛠️ Manual Installation & Run Guide

If you prefer running services manually in separate terminals:

### 1. Backend Setup (FastAPI)
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn main:app --reload --port 8000
```
Backend will be available at:
- **API URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

### 2. Frontend Setup (React + Vite)
```bash
cd frontend

# Install npm packages
npm install

# Start development server
npm run dev
```
Frontend will be available at:
- **Application URL**: `http://localhost:5173`

---

## 🐳 Production Deployment with Docker & Docker Compose

For a fully containerized, production-grade deployment with Nginx and persistent data storage:

### 1. Configure Environment
```bash
# Copy and configure environment variables
cp .env.example .env
```

### 2. Build & Launch Containers
```bash
docker-compose up --build -d
```

- **Frontend & Reverse Proxy**: `http://localhost:80` (or `http://localhost:5173`)
- **Backend API**: `http://localhost:8000`
- **Persistent Data**: SQLite database, uploads, and FAISS indices are mounted in `./backend/data`.

---

## ☁️ Cloud Deployment Options

### Option A: Render.com (1-Click Blueprint)
1. Push your repository to GitHub / GitLab.
2. In [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Connect your repository — Render will automatically read [`render.yaml`](file:///c:/Users/vikas/OneDrive/vikas_One_Drive/OneDrive/Scans/p4_ds/render.yaml) and provision the backend API and frontend static site.

### Option B: Railway.app / Fly.io / AWS ECS
- Build and push the Docker containers from [`backend/Dockerfile`](file:///c:/Users/vikas/OneDrive/vikas_One_Drive/OneDrive/Scans/p4_ds/backend/Dockerfile) and [`frontend/Dockerfile`](file:///c:/Users/vikas/OneDrive/vikas_One_Drive/OneDrive/Scans/p4_ds/frontend/Dockerfile).
- Mount persistent volume to `/app/data` for database & vector indices.

---

## 🔒 Security & Data Isolation Architecture

- **Per-User Vector Isolation**: Each user's FAISS index is created in its own partition (`data/faiss/{user_id}/index.faiss`). Searches are physically separated and cannot bleed into other accounts.
- **Per-User File Storage**: Documents are stored in `data/uploads/{user_id}/`.
- **CORS Control**: Restricted to trusted local development origins (`localhost:5173`, `127.0.0.1:5173`, `localhost:3000`).
- **File Validation**: Strict allowlist check for extensions (`.pdf`, `.docx`, `.txt`, `.png`, `.jpg`, `.webp`) and a hard limit on file size (50MB).
- **Authentication**: Passwords hashed with `bcrypt`, stateless session authentication with signed JWT tokens (`HS256`).

---

## 📁 Project Directory Structure

```text
p4_ds/
├── README.md               # Complete Project Documentation
├── .env.example            # Environment variables template
├── start.ps1               # One-command startup script (PowerShell)
├── start.bat               # Windows batch launcher
├── start.sh                # Linux/macOS startup script
├── backend/
│   ├── main.py             # FastAPI entrypoint, lifespan, & CORS
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Backend config template
│   ├── data/               # SQLite DB, uploads, & FAISS partitions
│   └── app/
│       ├── core/           # Config, database engine, & security
│       ├── models/         # SQLAlchemy models (User, Document, Chunk, Triple, etc.)
│       ├── schemas/        # Pydantic request/response schemas
│       ├── api/            # FastAPI route endpoints (/auth, /documents, /chat, etc.)
│       └── services/       # RAG, FAISS, KeyBERT, OCR, Classifier, Evaluation
└── frontend/
    ├── package.json        # Frontend dependencies
    ├── vite.config.js      # Vite configuration
    ├── tailwind.config.js  # Tailwind CSS theme configuration
    └── src/
        ├── App.jsx         # App router & global providers
        ├── index.css       # Tailwind directives & design utilities
        ├── components/     # Navbar, Sidebar, ErrorBoundary, Skeletons
        ├── context/        # AuthContext, ThemeContext, ToastContext
        ├── pages/          # 8 core application pages
        └── services/       # Axios API client
```

---

## 📄 License
MIT License. Built with ❤️ for private, secure, personal knowledge augmentation.
