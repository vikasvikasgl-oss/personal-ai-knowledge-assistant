from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.api import api_router
from app.api.v1.endpoints import auth, documents, search, chat, memories, knowledge_graph, dashboard, recommendations, evaluation
from app.services.embedding_service import get_embedding_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure database tables exist
    Base.metadata.create_all(bind=engine)

    # SQLite schema upgrade: ensure 'category' and 'category_confidence' columns exist
    try:
        with engine.connect() as conn:
            cursor = conn.exec_driver_sql("PRAGMA table_info(documents);")
            cols = [row[1] for row in cursor.fetchall()]
            if "category" not in cols:
                conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN category VARCHAR(100) DEFAULT 'Study Material';")
            if "category_confidence" not in cols:
                conn.exec_driver_sql("ALTER TABLE documents ADD COLUMN category_confidence FLOAT DEFAULT 0.0;")
            conn.commit()
    except Exception as e:
        print(f"Notice: SQLite column check: {e}")

    # Pre-load sentence-transformers model all-MiniLM-L6-v2 once at startup
    try:
        get_embedding_model()
    except Exception as e:
        print(f"Warning: Embedding model pre-loading deferred or encountered: {e}")

    # Pre-load document classifier scikit-learn pipeline
    try:
        from app.services.classifier_service import get_classifier
        get_classifier()
    except Exception as e:
        print(f"Notice: Document classifier pre-loading: {e}")

    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount endpoints:
# 1. Under /api/v1 (e.g. /api/v1/auth/login, /api/v1/documents, /api/v1/search)
app.include_router(api_router, prefix=settings.API_V1_STR)
# 2. Directly under root paths (/auth, /documents, /search) as requested
app.include_router(auth.router, prefix="/auth", tags=["auth-root"])
app.include_router(documents.router, prefix="/documents", tags=["documents-root"])
app.include_router(search.router, prefix="/search", tags=["search-root"])
app.include_router(chat.router, prefix="/chat", tags=["chat-root"])
app.include_router(memories.router, prefix="/memories", tags=["memories-root"])
app.include_router(knowledge_graph.router, prefix="/knowledge-graph", tags=["knowledge-graph-root"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard-root"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations-root"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation-root"])

@app.get("/health", tags=["system"])
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
