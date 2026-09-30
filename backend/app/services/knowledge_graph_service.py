import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, Set, Tuple
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.knowledge_triple import KnowledgeTriple
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger(__name__)

# Color mapping for entity node types
TYPE_COLORS = {
    "Disease": "#F43F5E",       # Rose
    "Technology": "#6366F1",    # Indigo
    "Method": "#8B5CF6",        # Violet
    "Concept": "#0EA5E9",       # Sky
    "Metric": "#10B981",        # Emerald
    "Dataset": "#F59E0B",       # Amber
    "Tool": "#06B6D4",          # Cyan
    "Person": "#EC4899",        # Pink
    "General": "#64748B",       # Slate
}

EXTRACTION_SYSTEM_PROMPT = """You are an expert knowledge graph extraction engine.
Given the text of a document, extract core semantic knowledge triples in the form:
(Subject, Subject Type, Relation, Object, Object Type)

Entity Types must be one of:
["Disease", "Technology", "Method", "Concept", "Metric", "Dataset", "Tool", "Person", "General"]

Rules:
1. Extract true, factual relationships asserted in the text.
2. Example: ("Parkinson's Disease", "Disease", "detected using", "Voice Analysis", "Method")
3. Example: ("Voice Analysis", "Method", "extracts", "Acoustic Features", "Concept")
4. Keep entities concise (1 to 4 words).
5. Relations should be active/descriptive verb phrases (e.g., "detected using", "implements", "trained on", "requires", "evaluates", "contains", "based on", "authored by").
6. Extract between 5 and 20 high-value triples that capture the core knowledge architecture.

You must respond ONLY with a valid JSON array of objects with the exact schema:
[
  {
    "subject": "string",
    "subject_type": "string",
    "relation": "string",
    "object": "string",
    "object_type": "string"
  }
]
"""

def extract_triples_heuristic(text: str, document_title: str = "") -> List[Dict[str, str]]:
    """
    Heuristic rule-based fallback to extract semantic triples when Gemini is not available or offline.
    Identifies common relational patterns in scientific, technical, and general texts.
    """
    triples: List[Dict[str, str]] = []
    seen: Set[Tuple[str, str, str]] = set()

    clean_title = re.sub(r'\.(pdf|docx|txt|png|jpg|jpeg)$', '', document_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'^[a-f0-9]{32}_', '', clean_title).strip()

    # Pre-defined domain mapping for common project and document terms
    lower_text = text.lower()

    # Pattern matchers for relational expressions:
    # 1. "X is detected using / detected by Y"
    # 2. "X uses / utilizes / applies Y"
    # 3. "X implements / implemented with Y"
    # 4. "X based on / built upon Y"
    # 5. "X evaluates / tested on Y"
    # 6. "X trained on Y"
    # 7. "X achieves / outperforms Y"
    patterns = [
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:is\s+)?detected\s+(?:using|by|with)\s+([A-Z][A-Za-z0-9\s\'-]{2,25})', "detected using", "Disease", "Method"),
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:uses|utilizes|employs|relies\s+on)\s+([A-Z][A-Za-z0-9\s\'-]{2,25})', "uses", "Technology", "Tool"),
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:implements|implemented\s+in|built\s+with)\s+([A-Z][A-Za-z0-9\s\'-]{2,25})', "implements", "Technology", "Technology"),
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:is\s+)?based\s+on\s+([A-Z][A-Za-z0-9\s\'-]{2,25})', "based on", "Concept", "Method"),
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:is\s+)?trained\s+on\s+([A-Z][A-Za-z0-9\s\'-]{2,25})', "trained on", "Method", "Dataset"),
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:evaluates|assesses|measures)\s+([A-Z][A-Za-z0-9\s\'-]{2,25})', "measures", "Method", "Metric"),
        (r'([A-Z][A-Za-z0-9\s\'-]{2,25})\s+(?:achieves|attains|reaches)\s+([A-Z0-9\s%.\'-]{2,25}\s*(?:accuracy|precision|recall|f1|auc))', "achieves", "Method", "Metric"),
    ]

    for pat, rel, s_type, o_type in patterns:
        for match in re.finditer(pat, text):
            subj = match.group(1).strip()
            obj = match.group(2).strip()
            if len(subj) >= 3 and len(obj) >= 3 and subj.lower() != obj.lower():
                key = (subj.lower(), rel.lower(), obj.lower())
                if key not in seen:
                    seen.add(key)
                    triples.append({
                        "subject": subj,
                        "subject_type": s_type,
                        "relation": rel,
                        "object": obj,
                        "object_type": o_type
                    })

    # Domain-specific heuristics for common scenarios
    if "parkinson" in lower_text:
        main_topic = "Parkinson's Disease"
        if "voice" in lower_text or "acoustic" in lower_text:
            triples.append({"subject": main_topic, "subject_type": "Disease", "relation": "detected using", "object": "Voice Analysis", "object_type": "Method"})
            triples.append({"subject": "Voice Analysis", "subject_type": "Method", "relation": "extracts", "object": "Acoustic Features", "object_type": "Concept"})
        if "machine learning" in lower_text or "svm" in lower_text or "random forest" in lower_text:
            triples.append({"subject": main_topic, "subject_type": "Disease", "relation": "diagnosed via", "object": "Machine Learning", "object_type": "Technology"})
        if "accuracy" in lower_text:
            triples.append({"subject": "Machine Learning", "subject_type": "Technology", "relation": "evaluated by", "object": "Classification Accuracy", "object_type": "Metric"})

    if "mediapipe" in lower_text:
        triples.append({"subject": "Gesture Recognition", "subject_type": "Concept", "relation": "powered by", "object": "MediaPipe", "object_type": "Technology"})
        if "opencv" in lower_text:
            triples.append({"subject": "MediaPipe", "subject_type": "Technology", "relation": "integrated with", "object": "OpenCV", "object_type": "Tool"})
        if "hand" in lower_text:
            triples.append({"subject": "MediaPipe", "subject_type": "Technology", "relation": "detects", "object": "Hand Landmarks", "object_type": "Concept"})

    if "faiss" in lower_text:
        triples.append({"subject": "Vector Search", "subject_type": "Method", "relation": "indexed by", "object": "FAISS", "object_type": "Technology"})
        if "sentence-transformers" in lower_text or "minilm" in lower_text:
            triples.append({"subject": "FAISS", "subject_type": "Technology", "relation": "stores embeddings from", "object": "all-MiniLM-L6-v2", "object_type": "Technology"})

    if "fastapi" in lower_text:
        triples.append({"subject": "Backend API", "subject_type": "Technology", "relation": "built with", "object": "FastAPI", "object_type": "Technology"})
        if "react" in lower_text:
            triples.append({"subject": "Frontend", "subject_type": "Technology", "relation": "communicates with", "object": "FastAPI", "object_type": "Technology"})

    # Ensure document title connection
    if clean_title and len(clean_title) >= 3 and not any(t["subject"].lower() == clean_title.lower() for t in triples):
        if triples:
            first_obj = triples[0]["subject"]
            triples.insert(0, {
                "subject": clean_title,
                "subject_type": "Concept",
                "relation": "discusses",
                "object": first_obj,
                "object_type": triples[0]["subject_type"]
            })

    return triples[:20]

def extract_triples_with_gemini(text: str, document_title: str = "", api_key: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Extract knowledge triples using Gemini API, falling back to heuristic parsing if needed.
    """
    key = api_key or settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")

    if not key or key == "your_gemini_api_key_here":
        logger.info("Gemini API key not configured. Using intelligent heuristic knowledge triple extractor.")
        return extract_triples_heuristic(text, document_title)

    truncated_text = text[:8000] # Fit comfortably in context window
    user_prompt = f"Document Title: {document_title}\n\nDocument Text:\n{truncated_text}\n\nExtract knowledge triples:"
    candidate_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

    # 1. Attempt using google.generativeai SDK
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        for model_name in candidate_models:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=EXTRACTION_SYSTEM_PROMPT
                )
                response = model.generate_content(
                    user_prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    raw_text = response.text.strip()
                    if raw_text.startswith("```"):
                        raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
                        raw_text = re.sub(r'\s*```$', '', raw_text)
                    parsed = json.loads(raw_text)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        logger.info(f"Successfully extracted {len(parsed)} triples using Gemini SDK ({model_name}).")
                        return validate_and_clean_triples(parsed)
            except Exception as m_err:
                logger.debug(f"Gemini SDK model {model_name} attempt failed: {m_err}")
                continue
    except Exception as sdk_err:
        logger.warning(f"Gemini SDK triple extraction failed: {sdk_err}. Trying REST API fallback.")

    # 2. REST API Fallback
    for model_name in candidate_models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": f"{EXTRACTION_SYSTEM_PROMPT}\n\n{user_prompt}"}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 2048,
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            raw_text = parts[0]["text"].strip()
                            if raw_text.startswith("```"):
                                raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
                                raw_text = re.sub(r'\s*```$', '', raw_text)
                            parsed = json.loads(raw_text)
                            if isinstance(parsed, list) and len(parsed) > 0:
                                logger.info(f"Successfully extracted {len(parsed)} triples using Gemini REST API ({model_name}).")
                                return validate_and_clean_triples(parsed)
        except Exception as http_err:
            logger.debug(f"Gemini REST triple extraction attempt ({model_name}) failed: {http_err}.")
            continue

    # Fallback to heuristic
    logger.info("Falling back to heuristic extraction.")
    return extract_triples_heuristic(text, document_title)

def validate_and_clean_triples(raw_triples: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Validate schema and sanitize triple fields."""
    valid = []
    seen = set()
    for item in raw_triples:
        if not isinstance(item, dict):
            continue
        subj = str(item.get("subject", "")).strip()
        rel = str(item.get("relation", "")).strip()
        obj = str(item.get("object", "")).strip()
        s_type = str(item.get("subject_type", "Concept")).strip().capitalize()
        o_type = str(item.get("object_type", "Concept")).strip().capitalize()

        if not subj or not rel or not obj:
            continue
        if subj.lower() == obj.lower():
            continue

        key = (subj.lower(), rel.lower(), obj.lower())
        if key in seen:
            continue
        seen.add(key)

        valid.append({
            "subject": subj,
            "subject_type": s_type if s_type in TYPE_COLORS else "Concept",
            "relation": rel,
            "object": obj,
            "object_type": o_type if o_type in TYPE_COLORS else "Concept"
        })
    return valid[:25]

def extract_and_store_document_triples(
    document_id: int,
    user_id: int,
    db: Session,
    text: Optional[str] = None,
    api_key: Optional[str] = None
) -> List[KnowledgeTriple]:
    """
    Extracts triples for a document and stores them in the database.
    Replaces existing triples for the document if re-run.
    """
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found for user {user_id}")

    # If text is not provided, aggregate from document chunks
    if not text:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index).all()
        text = "\n\n".join([c.content for c in chunks]) if chunks else doc.original_name

    triples_data = extract_triples_with_gemini(text=text, document_title=doc.original_name, api_key=api_key)

    # Delete previous triples for this document to prevent stale duplicates
    db.query(KnowledgeTriple).filter(KnowledgeTriple.document_id == document_id).delete()
    db.commit()

    created_triples = []
    for t in triples_data:
        triple_record = KnowledgeTriple(
            user_id=user_id,
            document_id=document_id,
            subject=t["subject"],
            subject_type=t.get("subject_type", "Concept"),
            relation=t["relation"],
            object=t["object"],
            object_type=t.get("object_type", "Concept"),
            confidence=1.0
        )
        db.add(triple_record)
        created_triples.append(triple_record)

    db.commit()
    for record in created_triples:
        db.refresh(record)

    logger.info(f"Stored {len(created_triples)} knowledge triples for document {document_id}")
    return created_triples

def get_user_graph_data(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Assembles user's knowledge graph into nodes and edges formatted for vis-network or react-force-graph.
    Strictly isolated to user_id.
    """
    triples = (
        db.query(KnowledgeTriple)
        .filter(KnowledgeTriple.user_id == user_id)
        .all()
    )

    if not triples:
        return {
            "nodes": [],
            "edges": [],
            "total_nodes": 0,
            "total_edges": 0,
            "total_triples": 0,
            "node_types": list(TYPE_COLORS.keys())
        }

    # Fetch referenced documents for metadata mapping
    doc_ids = list({t.document_id for t in triples})
    docs = db.query(Document).filter(Document.id.in_(doc_ids)).all()
    doc_map = {d.id: d for d in docs}

    nodes_map: Dict[str, Dict[str, Any]] = {}
    edges_list: List[Dict[str, Any]] = []

    def normalize_id(text: str) -> str:
        return re.sub(r'\s+', '_', text.strip().lower())

    for t in triples:
        s_id = normalize_id(t.subject)
        o_id = normalize_id(t.object)

        doc = doc_map.get(t.document_id)
        doc_info = {
            "id": t.document_id,
            "name": doc.original_name if doc else f"Document #{t.document_id}",
            "category": doc.category if doc else "Uncategorized"
        }

        # Register Subject Node
        if s_id not in nodes_map:
            nodes_map[s_id] = {
                "id": s_id,
                "label": t.subject,
                "type": t.subject_type,
                "color": TYPE_COLORS.get(t.subject_type, TYPE_COLORS["General"]),
                "document_ids": [t.document_id],
                "documents": [doc_info],
                "degree": 1
            }
        else:
            nodes_map[s_id]["degree"] += 1
            if t.document_id not in nodes_map[s_id]["document_ids"]:
                nodes_map[s_id]["document_ids"].append(t.document_id)
                nodes_map[s_id]["documents"].append(doc_info)

        # Register Object Node
        if o_id not in nodes_map:
            nodes_map[o_id] = {
                "id": o_id,
                "label": t.object,
                "type": t.object_type,
                "color": TYPE_COLORS.get(t.object_type, TYPE_COLORS["General"]),
                "document_ids": [t.document_id],
                "documents": [doc_info],
                "degree": 1
            }
        else:
            nodes_map[o_id]["degree"] += 1
            if t.document_id not in nodes_map[o_id]["document_ids"]:
                nodes_map[o_id]["document_ids"].append(t.document_id)
                nodes_map[o_id]["documents"].append(doc_info)

        # Create Edge
        doc_name = doc.original_name if doc else f"Document #{t.document_id}"
        edge_id = f"e_{t.id}"
        edges_list.append({
            "id": edge_id,
            "from": s_id,
            "to": o_id,
            "source": s_id,
            "target": o_id,
            "label": t.relation,
            "title": f"<b>{t.subject}</b> <i>{t.relation}</i> <b>{t.object}</b><br><small>Source: {doc_name}</small>",
            "relation": t.relation,
            "document_id": t.document_id,
            "document_name": doc_name,
            "arrows": "to"
        })

    # Scale node size by connectivity degree
    formatted_nodes = []
    for node in nodes_map.values():
        size = 18 + min(node["degree"] * 4, 30)
        formatted_nodes.append({
            **node,
            "value": node["degree"],
            "size": size,
            "font": {"color": "#1E293B", "size": 13, "face": "Inter, system-ui"}
        })

    return {
        "nodes": formatted_nodes,
        "edges": edges_list,
        "total_nodes": len(formatted_nodes),
        "total_edges": len(edges_list),
        "total_triples": len(triples),
        "node_types": list(TYPE_COLORS.keys())
    }
