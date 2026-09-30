import logging
from typing import List, Dict, Any
from app.services.embedding_service import embed_query
from app.services.vector_store import search_user_vectors

logger = logging.getLogger(__name__)

def retrieve_relevant_chunks(
    user_id: int,
    query: str,
    top_k: int = 5,
    score_threshold: float = 0.0
) -> List[Dict[str, Any]]:
    """
    Retrieval service:
    1. Embeds question using sentence-transformers (all-MiniLM-L6-v2)
    2. Queries user's private FAISS index
    3. Returns top-k most relevant chunks with cosine similarity scores, filename, page number, and chunk index
    """
    cleaned_query = query.strip()
    if not cleaned_query:
        return []

    # Generate query embedding
    query_vector = embed_query(cleaned_query)

    # Perform vector search against user index
    matches = search_user_vectors(
        user_id=user_id,
        query_vector=query_vector,
        top_k=top_k,
        score_threshold=score_threshold
    )

    return matches
