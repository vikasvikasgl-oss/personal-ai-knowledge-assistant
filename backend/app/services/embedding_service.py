import logging
from typing import List, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Global singleton instance for the sentence-transformers model
_embedding_model = None

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

def get_embedding_model():
    """
    Load sentence-transformers model all-MiniLM-L6-v2 once at startup / first call.
    Uses singleton caching so the model remains in memory.
    """
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model '{MODEL_NAME}' into memory...")
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer(MODEL_NAME)
            logger.info(f"Embedding model '{MODEL_NAME}' successfully loaded.")
        except Exception as e:
            logger.error(f"Failed to load sentence-transformers model '{MODEL_NAME}': {e}")
            raise RuntimeError(f"Could not load embedding model: {str(e)}")
    return _embedding_model

def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Encode a list of text strings into normalized float32 vectors.
    Returns:
        numpy.ndarray of shape (len(texts), EMBEDDING_DIM)
    """
    if not texts:
        return np.empty((0, EMBEDDING_DIM), dtype=np.float32)

    model = get_embedding_model()
    # normalize_embeddings=True ensures L2 norm is 1, so Inner Product == Cosine Similarity
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True
    )
    return np.asarray(embeddings, dtype=np.float32)

def embed_query(query: str) -> np.ndarray:
    """
    Encode a single query string into a normalized 2D vector of shape (1, EMBEDDING_DIM).
    """
    model = get_embedding_model()
    embedding = model.encode(
        query,
        normalize_embeddings=True,
        convert_to_numpy=True
    )
    return np.asarray([embedding], dtype=np.float32)
