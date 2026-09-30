import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.knowledge_triple import KnowledgeTriple
from app.schemas.knowledge_graph import (
    GraphDataResponse,
    ExtractionStatusResponse,
    TripleResponse
)
from app.services.knowledge_graph_service import (
    extract_and_store_document_triples,
    get_user_graph_data
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=GraphDataResponse)
def get_knowledge_graph(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve the authenticated user's complete knowledge graph.
    Returns nodes (with degree, colors, type, connected documents) and directed edges (with relations).
    """
    return get_user_graph_data(user_id=current_user.id, db=db)

@router.post("/extract/{document_id}", response_model=ExtractionStatusResponse)
def extract_triples_for_document(
    document_id: int,
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-API-Key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract knowledge triples (subject, relation, object) from a specific document using Gemini API.
    Saves triples to the database.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} was not found."
        )

    try:
        triples = extract_and_store_document_triples(
            document_id=document_id,
            user_id=current_user.id,
            db=db,
            api_key=x_gemini_api_key
        )
        return ExtractionStatusResponse(
            document_id=document_id,
            triples_extracted=len(triples),
            status="success",
            message=f"Successfully extracted and saved {len(triples)} knowledge triples from '{doc.original_name}'"
        )
    except Exception as e:
        logger.error(f"Failed to extract triples for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting knowledge triples: {str(e)}"
        )

@router.post("/build-all", status_code=status.HTTP_200_OK)
def extract_triples_all_documents(
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-API-Key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Batch extracts knowledge triples for all documents belonging to the user.
    """
    docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    if not docs:
        return {
            "status": "success",
            "message": "No documents uploaded yet.",
            "processed_documents": 0,
            "total_triples": 0
        }

    total_triples = 0
    processed_count = 0
    for doc in docs:
        try:
            triples = extract_and_store_document_triples(
                document_id=doc.id,
                user_id=current_user.id,
                db=db,
                api_key=x_gemini_api_key
            )
            total_triples += len(triples)
            processed_count += 1
        except Exception as e:
            logger.warning(f"Could not extract triples for doc {doc.id}: {e}")

    return {
        "status": "success",
        "message": f"Extracted {total_triples} knowledge triples across {processed_count} document(s).",
        "processed_documents": processed_count,
        "total_triples": total_triples
    }

@router.get("/node/{node_id}/documents")
def get_node_documents(
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all documents associated with a specific concept or node.
    """
    graph_data = get_user_graph_data(user_id=current_user.id, db=db)
    matched_node = next((n for n in graph_data["nodes"] if n["id"] == node_id), None)
    if not matched_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept node '{node_id}' not found in knowledge graph."
        )

    return {
        "node_id": node_id,
        "label": matched_node["label"],
        "type": matched_node["type"],
        "documents": matched_node["documents"],
        "connected_triples": [
            e for e in graph_data["edges"]
            if e["source"] == node_id or e["target"] == node_id
        ]
    }

@router.delete("/triples/{triple_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_triple(
    triple_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific triple from the knowledge graph.
    """
    triple = db.query(KnowledgeTriple).filter(
        KnowledgeTriple.id == triple_id,
        KnowledgeTriple.user_id == current_user.id
    ).first()

    if not triple:
        raise HTTPException(status_code=404, detail="Triple not found.")

    db.delete(triple)
    db.commit()
    return None
