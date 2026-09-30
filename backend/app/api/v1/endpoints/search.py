from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.services.retrieval_service import retrieve_relevant_chunks

router = APIRouter()

class SearchResultItem(BaseModel):
    chunk_id: Optional[int] = None
    document_id: Optional[int] = None
    filename: Optional[str] = None
    category: Optional[str] = "Study Material"
    page_number: int = 1
    chunk_index: int = 0
    content: str
    token_count: Optional[int] = 0
    similarity_score: float

class SearchResponse(BaseModel):
    query: str
    user_id: int
    category_filter: Optional[str] = None
    count: int
    results: List[SearchResultItem]

def execute_semantic_search(
    q: str,
    top_k: int,
    threshold: float,
    category: Optional[str],
    current_user: User,
    db: Session
) -> SearchResponse:
    # Fetch extra candidates if filtering by category
    fetch_k = top_k * 3 if category and category.lower() != "all" else top_k

    matches = retrieve_relevant_chunks(
        user_id=current_user.id,
        query=q,
        top_k=fetch_k,
        score_threshold=threshold
    )

    # Attach document category from database
    doc_ids = list(set([m["document_id"] for m in matches if m.get("document_id")]))
    doc_cat_map = {}
    if doc_ids:
        docs = db.query(Document.id, Document.category).filter(Document.id.in_(doc_ids)).all()
        doc_cat_map = {d.id: (d.category or "Study Material") for d in docs}

    for m in matches:
        m["category"] = doc_cat_map.get(m.get("document_id"), "Study Material")

    # Filter by category if specified
    if category and category.lower() != "all":
        matches = [m for m in matches if m.get("category") == category]

    trimmed = matches[:top_k]

    return SearchResponse(
        query=q,
        user_id=current_user.id,
        category_filter=category if (category and category.lower() != "all") else None,
        count=len(trimmed),
        results=trimmed
    )

@router.get("", response_model=SearchResponse)
def semantic_search(
    q: str = Query(..., min_length=1, description="Question or natural language search query"),
    top_k: int = Query(10, ge=1, le=50, description="Maximum number of chunks to return"),
    threshold: float = Query(0.0, ge=-1.0, le=1.0, description="Minimum cosine similarity threshold"),
    category: Optional[str] = Query(None, description="Optional document category filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Semantic vector retrieval across user's private document partition:
    - Encodes query with sentence-transformers all-MiniLM-L6-v2
    - Performs cosine similarity search over FAISS index
    - Attaches document category and ranks matches
    - Filters by category if requested
    """
    return execute_semantic_search(q, top_k, threshold, category, current_user, db)

@router.get("/test", response_model=SearchResponse)
def test_search(
    q: str = Query(..., min_length=1, description="Question or search query text"),
    top_k: int = Query(5, ge=1, le=50, description="Maximum number of chunks to retrieve"),
    threshold: float = Query(0.0, ge=-1.0, le=1.0, description="Minimum cosine similarity threshold"),
    category: Optional[str] = Query(None, description="Optional document category filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Backward-compatible test endpoint."""
    return execute_semantic_search(q, top_k, threshold, category, current_user, db)
