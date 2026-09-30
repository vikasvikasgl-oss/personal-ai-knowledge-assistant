import re
import logging
from typing import List, Dict, Any, Set, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.knowledge_triple import KnowledgeTriple
from app.services.embedding_service import embed_texts

logger = logging.getLogger(__name__)

# Predefined domain ontologies for knowledge gap identification
KNOWLEDGE_GAP_RULES = [
    {
        "covered_any": ["cnn", "convolutional", "lstm", "rnn", "recurrent"],
        "missing_all": ["transformer", "attention", "bert", "gpt", "llm"],
        "title": "Architectural Knowledge Gap: Transformers & Attention",
        "description": "You've studied CNN and LSTM architectures for computer vision and sequence modeling, but your knowledge base hasn't covered Transformer mechanisms (e.g. Self-Attention, Vision Transformers, or BERT).",
        "tags": ["Deep Learning", "Transformers", "Sequence Modeling"],
        "action_prompt": "Explain how Transformer attention mechanisms compare to CNN and LSTM architectures for deep learning.",
    },
    {
        "covered_any": ["svm", "support vector", "random forest", "logistic regression", "decision tree"],
        "missing_all": ["deep learning", "neural network", "backpropagation", "multilayer perceptron"],
        "title": "Model Evolution Gap: Deep Neural Networks",
        "description": "Your documents cover classical machine learning classifiers (SVM, Random Forests, Logistic Regression). Adding materials on Deep Neural Networks and gradient descent would expand your benchmark comparisons.",
        "tags": ["Machine Learning", "Neural Networks", "Classification"],
        "action_prompt": "What are the key trade-offs between classical Random Forests and modern Deep Neural Networks?",
    },
    {
        "covered_any": ["parkinson", "voice", "acoustic", "vocal"],
        "missing_all": ["gait", "tremor", "accelerometer", "wearable", "motor"],
        "title": "Clinical Modality Gap: Multi-Modal Parkinson's Biomarkers",
        "description": "Your Parkinson's research is focused on acoustic voice analysis (jitter, shimmer, fundamental frequency). Exploring gait analysis, accelerometer sensors, or motor tremor tracking would create a multi-modal diagnostic system.",
        "tags": ["Biomedical", "Multi-modal", "Parkinson's"],
        "action_prompt": "How can voice analysis biomarkers be combined with gait sensors for multi-modal Parkinson's detection?",
    },
    {
        "covered_any": ["mediapipe", "opencv", "hand tracking", "gesture"],
        "missing_all": ["onnx", "tensorrt", "quantization", "edge", "mobile"],
        "title": "Engineering Gap: Edge Deployment & Model Optimization",
        "description": "You're developing vision pipelines with MediaPipe and OpenCV. Exploring ONNX Runtime, TensorRT, or model quantization will help optimize real-time inference latency on embedded or mobile devices.",
        "tags": ["Computer Vision", "Optimization", "Edge AI"],
        "action_prompt": "How can I optimize a MediaPipe and OpenCV pipeline using ONNX Runtime for low-latency edge deployment?",
    },
    {
        "covered_any": ["fastapi", "rest api", "backend"],
        "missing_all": ["redis", "caching", "celery", "worker", "kafka"],
        "title": "System Architecture Gap: Async Tasks & Caching",
        "description": "You have backend documentation built with FastAPI. Consider exploring distributed task queues (Celery) or Redis caching for scaling document ingestion and retrieval throughput.",
        "tags": ["Architecture", "Scalability", "Backend"],
        "action_prompt": "What are the best practices for implementing Redis caching and asynchronous queues in FastAPI?",
    },
]

def extract_topics_from_text(text: str, top_k: int = 5) -> List[str]:
    """Extract salient keywords/keyphrases using TF-IDF."""
    if not text or len(text.strip()) < 20:
        return []

    # Clean text
    clean = re.sub(r'[^a-zA-Z0-9\s-]', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()

    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=50,
            token_pattern=r'(?u)\b[a-zA-Z][a-zA-Z0-9-]{2,}\b'
        )
        matrix = vectorizer.fit_transform([clean])
        feature_names = vectorizer.get_feature_names_out()
        scores = matrix.toarray()[0]

        top_indices = np.argsort(scores)[::-1][:top_k]
        topics = [feature_names[i].title() for i in top_indices if scores[i] > 0.05]
        return topics
    except Exception as e:
        logger.warning(f"TF-IDF topic extraction notice: {e}")
        # Fallback simple capitalized words
        words = re.findall(r'\b[A-Z][a-z]{3,}\b', text)
        return list(dict.fromkeys(words))[:top_k]

def compute_document_embeddings(docs: List[Document], db: Session) -> Dict[int, np.ndarray]:
    """Compute normalized average chunk embedding per document."""
    doc_vectors = {}
    for doc in docs:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
        if not chunks:
            continue
        texts = [c.content for c in chunks[:5]] # Take up to 5 representative chunks
        chunk_embeddings = embed_texts(texts)
        if len(chunk_embeddings) > 0:
            avg_vector = np.mean(chunk_embeddings, axis=0)
            norm = np.linalg.norm(avg_vector)
            if norm > 0:
                avg_vector = avg_vector / norm
            doc_vectors[doc.id] = avg_vector
    return doc_vectors

def generate_recommendations(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Analyzes user documents, extracts topics with TF-IDF/KeyBERT logic,
    computes embedding similarity between document pairs, and identifies knowledge gaps.
    """
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    if not docs:
        return {
            "recommendations": [
                {
                    "id": "rec_starter",
                    "type": "topic_deep_dive",
                    "badge": "Getting Started",
                    "title": "Begin Building Your Knowledge Vault",
                    "description": "Upload PDFs, research papers, resumes, or study guides in My Documents. The assistant will classify them, index vector embeddings, and detect semantic links.",
                    "similarity_score": 100,
                    "tags": ["Starter", "Onboarding"],
                    "documents": [],
                    "action_prompt": "What types of documents can I upload to build my knowledge base?"
                }
            ],
            "document_topics": [],
            "total_recommendations": 1,
            "summary": {"total_documents": 0, "total_topics": 0, "knowledge_gaps": 0}
        }

    # 1. Extract topics per document
    doc_topics_list = []
    all_user_topics: Set[str] = set()
    combined_user_text: List[str] = []

    for doc in docs:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).order_by(DocumentChunk.chunk_index).all()
        doc_text = " ".join([c.content for c in chunks]) if chunks else doc.original_name
        combined_user_text.append(doc_text)

        # Extract topics
        topics = extract_topics_from_text(doc_text, top_k=5)

        # Also pull extracted triples for this doc if available
        triples = db.query(KnowledgeTriple).filter(KnowledgeTriple.document_id == doc.id).all()
        for t in triples:
            if t.subject and len(t.subject) < 30:
                topics.append(t.subject.title())
            if t.object and len(t.object) < 30:
                topics.append(t.object.title())

        # Deduplicate preserving order
        unique_topics = list(dict.fromkeys(topics))[:6]
        all_user_topics.update([t.lower() for t in unique_topics])

        doc_topics_list.append({
            "document_id": doc.id,
            "document_name": doc.original_name,
            "category": doc.category or "Study Material",
            "topics": unique_topics
        })

    full_corpus = " ".join(combined_user_text).lower()

    recommendations: List[Dict[str, Any]] = []

    # 2. Embedding similarity between document pairs (Related Documents)
    doc_vectors = compute_document_embeddings(docs, db)
    doc_map = {d.id: d for d in docs}
    doc_ids = list(doc_vectors.keys())

    pair_seen = set()
    for i in range(len(doc_ids)):
        for j in range(i + 1, len(doc_ids)):
            id_a, id_b = doc_ids[i], doc_ids[j]
            vec_a, vec_b = doc_vectors[id_a], doc_vectors[id_b]
            similarity = float(np.dot(vec_a, vec_b))

            if similarity >= 0.30:  # Meaningful semantic relatedness
                doc_a, doc_b = doc_map[id_a], doc_map[id_b]
                pair_key = tuple(sorted([id_a, id_b]))
                if pair_key not in pair_seen:
                    pair_seen.add(pair_key)

                    # Find shared topics
                    topics_a = set([t.lower() for t in next((d["topics"] for d in doc_topics_list if d["document_id"] == id_a), [])])
                    topics_b = set([t.lower() for t in next((d["topics"] for d in doc_topics_list if d["document_id"] == id_b), [])])
                    shared = list(topics_a.intersection(topics_b))
                    shared_label = ", ".join([s.title() for s in shared[:3]]) if shared else "shared domain concepts"

                    match_pct = int(round(similarity * 100))
                    recommendations.append({
                        "id": f"rel_{id_a}_{id_b}",
                        "type": "related_docs",
                        "badge": "Related Documents",
                        "title": f"Strong Semantic Overlap: {doc_a.original_name} & {doc_b.original_name}",
                        "description": f"These documents share {match_pct}% embedding similarity. They explore complementary perspectives covering {shared_label}.",
                        "similarity_score": match_pct,
                        "tags": [doc_a.category or "Document", doc_b.category or "Document"],
                        "documents": [
                            {"id": doc_a.id, "name": doc_a.original_name, "category": doc_a.category},
                            {"id": doc_b.id, "name": doc_b.original_name, "category": doc_b.category},
                        ],
                        "action_prompt": f"Synthesize the key points connecting '{doc_a.original_name}' and '{doc_b.original_name}'."
                    })

    # 3. Knowledge Gap & Next Step Detection based on domain rules
    knowledge_gaps_count = 0
    for rule in KNOWLEDGE_GAP_RULES:
        has_covered = any(k in full_corpus for k in rule["covered_any"])
        missing_all = not any(m in full_corpus for m in rule["missing_all"])

        if has_covered and missing_all:
            knowledge_gaps_count += 1
            recommendations.append({
                "id": f"gap_{rule['covered_any'][0]}",
                "type": "knowledge_gap",
                "badge": "Knowledge Gap",
                "title": rule["title"],
                "description": rule["description"],
                "similarity_score": 88,
                "tags": rule["tags"],
                "documents": [
                    {"id": d.id, "name": d.original_name, "category": d.category}
                    for d in docs if any(k in d.original_name.lower() or any(k in t.lower() for t in next((item["topics"] for item in doc_topics_list if item["document_id"] == d.id), [])) for k in rule["covered_any"])
                ][:2],
                "action_prompt": rule["action_prompt"]
            })

    # 4. If fewer than 2 recommendations, add high-value topic synthesis
    if len(recommendations) < 3 and len(doc_topics_list) > 0:
        top_topic = doc_topics_list[0]["topics"][0] if doc_topics_list[0]["topics"] else "Core Subject"
        first_doc = docs[0]
        recommendations.append({
            "id": "rec_synthesis",
            "type": "topic_deep_dive",
            "badge": "Topic Deep-Dive",
            "title": f"Deepen Understanding of {top_topic}",
            "description": f"'{first_doc.original_name}' introduces key ideas around {top_topic}. Generate a self-assessment or practice quiz using the Ask AI assistant.",
            "similarity_score": 92,
            "tags": [top_topic, first_doc.category or "Study Material"],
            "documents": [{"id": first_doc.id, "name": first_doc.original_name, "category": first_doc.category}],
            "action_prompt": f"Create 3 challenging review questions based on the concepts in '{first_doc.original_name}'."
        })

    return {
        "recommendations": recommendations,
        "document_topics": doc_topics_list,
        "total_recommendations": len(recommendations),
        "summary": {
            "total_documents": len(docs),
            "total_topics": len(all_user_topics),
            "knowledge_gaps": knowledge_gaps_count,
            "related_pairs": len(pair_seen)
        }
    }
