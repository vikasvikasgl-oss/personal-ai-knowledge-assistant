import os
import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384
BASE_VECTOR_DIR = os.path.join("data", "vectorstore")

def get_user_vector_dir(user_id: int) -> str:
    """Return the vector store directory path for a specific user."""
    path = os.path.join(BASE_VECTOR_DIR, str(user_id))
    os.makedirs(path, exist_ok=True)
    return path

def get_user_index_paths(user_id: int):
    """Return (index_path, metadata_path, embeddings_path) for user."""
    user_dir = get_user_vector_dir(user_id)
    return (
        os.path.join(user_dir, "index.faiss"),
        os.path.join(user_dir, "metadata.json"),
        os.path.join(user_dir, "embeddings.npy")
    )

def add_document_vectors(
    user_id: int,
    document_id: int,
    filename: str,
    chunks: List[Dict[str, Any]],
    embeddings: np.ndarray
):
    """
    Store embeddings in user's isolated FAISS index and persist metadata.
    """
    if len(chunks) == 0 or embeddings.shape[0] == 0:
        return

    import faiss

    index_path, meta_path, emb_path = get_user_index_paths(user_id)

    # 1. Load or initialize FAISS index
    if os.path.exists(index_path):
        try:
            index = faiss.read_index(index_path)
        except Exception as e:
            logger.warning(f"Error reading index for user {user_id}: {e}. Creating new index.")
            index = faiss.IndexFlatIP(EMBEDDING_DIM)
    else:
        index = faiss.IndexFlatIP(EMBEDDING_DIM)

    # 2. Load existing metadata and embeddings
    existing_meta: List[Dict[str, Any]] = []
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                existing_meta = json.load(f)
        except Exception:
            existing_meta = []

    existing_embs = None
    if os.path.exists(emb_path):
        try:
            existing_embs = np.load(emb_path)
        except Exception:
            existing_embs = None

    # 3. Prepare new metadata entries
    new_meta: List[Dict[str, Any]] = []
    for chunk in chunks:
        new_meta.append({
            "chunk_id": chunk.get("id"),
            "document_id": document_id,
            "filename": filename,
            "page_number": chunk.get("page_number", 1),
            "chunk_index": chunk.get("chunk_index", 0),
            "content": chunk.get("content", ""),
            "token_count": chunk.get("token_count", 0),
        })

    # 4. Add to FAISS index
    embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
    index.add(embeddings)

    # 5. Concatenate embeddings array for future rebuilding
    if existing_embs is not None and len(existing_embs) > 0:
        updated_embs = np.vstack([existing_embs, embeddings])
    else:
        updated_embs = embeddings

    # 6. Save atomically
    faiss.write_index(index, index_path)
    np.save(emb_path, updated_embs)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(existing_meta + new_meta, f, ensure_ascii=False, indent=2)

    logger.info(f"User {user_id}: added {len(chunks)} vectors. Total in index: {index.ntotal}")

def remove_document_vectors(user_id: int, document_id: int):
    """
    Remove all vectors associated with document_id and rebuild user's FAISS index.
    """
    import faiss

    index_path, meta_path, emb_path = get_user_index_paths(user_id)

    if not os.path.exists(meta_path) or not os.path.exists(emb_path):
        return

    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata: List[Dict[str, Any]] = json.load(f)
        embeddings = np.load(emb_path)
    except Exception as e:
        logger.error(f"Error loading index files for document removal: {e}")
        return

    # Filter out entries belonging to document_id
    keep_indices = [i for i, m in enumerate(metadata) if m.get("document_id") != document_id]
    remaining_metadata = [metadata[i] for i in keep_indices]

    # Rebuild index
    new_index = faiss.IndexFlatIP(EMBEDDING_DIM)

    if keep_indices and len(keep_indices) > 0:
        remaining_embeddings = np.ascontiguousarray(embeddings[keep_indices], dtype=np.float32)
        new_index.add(remaining_embeddings)
        np.save(emb_path, remaining_embeddings)
    else:
        remaining_embeddings = np.empty((0, EMBEDDING_DIM), dtype=np.float32)
        if os.path.exists(emb_path):
            os.remove(emb_path)

    faiss.write_index(new_index, index_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(remaining_metadata, f, ensure_ascii=False, indent=2)

    logger.info(f"User {user_id}: removed vectors for doc {document_id}. Remaining vectors: {new_index.ntotal}")

def search_user_vectors(
    user_id: int,
    query_vector: np.ndarray,
    top_k: int = 5,
    score_threshold: float = 0.0
) -> List[Dict[str, Any]]:
    """
    Search user's private FAISS index using cosine similarity.
    Returns:
        List of dicts with:
        - document_id
        - filename
        - page_number
        - chunk_index
        - content
        - similarity_score
    """
    import faiss

    index_path, meta_path, _ = get_user_index_paths(user_id)

    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        return []

    try:
        index = faiss.read_index(index_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata: List[Dict[str, Any]] = json.load(f)
    except Exception as e:
        logger.error(f"Error reading vector index for user {user_id}: {e}")
        return []

    if index.ntotal == 0 or len(metadata) == 0:
        return []

    query_vector = np.ascontiguousarray(query_vector, dtype=np.float32)
    k = min(top_k, index.ntotal)
    distances, indices = index.search(query_vector, k)

    results: List[Dict[str, Any]] = []
    for score, idx in zip(distances[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        
        sim_score = float(score)
        if sim_score < score_threshold:
            continue

        item = metadata[idx]
        results.append({
            "chunk_id": item.get("chunk_id"),
            "document_id": item.get("document_id"),
            "filename": item.get("filename"),
            "page_number": item.get("page_number", 1),
            "chunk_index": item.get("chunk_index", 0),
            "content": item.get("content", ""),
            "token_count": item.get("token_count", 0),
            "similarity_score": round(sim_score, 4),
        })

    return results
