import os
import shutil
import uuid
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.schemas.document import DocumentResponse, DocumentDetailResponse, DocumentListResponse
from app.services.text_processor import extract_document_pages, chunk_document_text
from app.services.embedding_service import embed_texts
from app.services.vector_store import add_document_vectors, remove_document_vectors
from app.services.classifier_service import classify_document, get_classification_metrics

router = APIRouter()

ALLOWED_EXTENSIONS = {
    "pdf": "pdf",
    "docx": "docx",
    "doc": "docx",
    "txt": "txt",
    "text": "txt",
    "png": "image",
    "jpg": "image",
    "jpeg": "image",
    "webp": "image",
}

@router.get("/metrics/evaluation", tags=["classification"])
def get_evaluation_metrics():
    """Returns the trained model's evaluation metrics (accuracy, precision, recall, F1) from JSON."""
    return get_classification_metrics()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and process a document:
    - Verifies file type (PDF, DOCX, TXT, PNG, JPG)
    - Saves file to data/uploads/{user_id}/
    - Extracts text (pdfplumber/pypdf, python-docx, txt, pytesseract OCR)
    - Automatically classifies category with scikit-learn TF-IDF model
    - Cleans and chunks into ~500 token blocks with 50 token overlap
    - Records document and chunk metadata in database
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    original_name = file.filename
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not supported. Supported types: PDF, DOCX, TXT, PNG, JPG."
        )

    file_type = ALLOWED_EXTENSIONS[ext]

    # Store files in data/uploads/{user_id}/ as required
    user_upload_dir = os.path.join("data", "uploads", str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}_{original_name}"
    file_path = os.path.join(user_upload_dir, unique_filename)

    # Save to disk with file size validation (max 50 MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds the 50MB limit ({file_size / (1024 * 1024):.1f}MB uploaded)."
            )
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Create initial Document record
    document = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_name=original_name,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        category="Study Material",
        category_confidence=0.0,
        status="Processing",
        total_pages=1,
        total_chunks=0
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Extract text and chunk
    try:
        pages = extract_document_pages(file_path, file_type)
        total_pages = len(pages)

        # Automatic ML document classification
        full_text = " ".join([p[1] if isinstance(p, (tuple, list)) else (p.get("text", "") if isinstance(p, dict) else str(p)) for p in pages])
        if not full_text.strip():
            full_text = original_name

        classification_result = classify_document(full_text)
        document.category = classification_result.get("category", "Study Material")
        document.category_confidence = classification_result.get("confidence", 0.0)

        chunks = chunk_document_text(pages, target_tokens=500, overlap_tokens=50)

        # Save chunks with metadata
        for chunk in chunks:
            doc_chunk = DocumentChunk(
                document_id=document.id,
                user_id=current_user.id,
                chunk_index=chunk["chunk_index"],
                page_number=chunk["page_number"],
                content=chunk["content"],
                token_count=chunk["token_count"]
            )
            db.add(doc_chunk)

        # Generate embeddings and add to user's FAISS index
        if chunks:
            chunk_texts = [c["content"] for c in chunks]
            embeddings = embed_texts(chunk_texts)
            add_document_vectors(
                user_id=current_user.id,
                document_id=document.id,
                filename=original_name,
                chunks=chunks,
                embeddings=embeddings
            )

        document.total_pages = max(1, total_pages)
        document.total_chunks = len(chunks)
        document.status = "Ready"
        db.commit()
        db.refresh(document)

        # Extract knowledge graph triples (subject, relation, object)
        try:
            from app.services.knowledge_graph_service import extract_and_store_document_triples
            extract_and_store_document_triples(
                document_id=document.id,
                user_id=current_user.id,
                db=db,
                text=full_text
            )
        except Exception as kg_err:
            logger.warning(f"Knowledge triple extraction notice for doc {document.id}: {kg_err}")

    except Exception as proc_err:
        db.rollback()
        document.status = "Failed"
        document.error_message = str(proc_err)
        db.commit()
        db.refresh(document)

    return document

@router.get("", response_model=DocumentListResponse)
def get_user_documents(
    category: Optional[str] = Query(None, description="Filter documents by category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all documents owned by current authenticated user, with optional category filtering."""
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if category and category.lower() != "all":
        query = query.filter(Document.category == category)

    docs = query.order_by(Document.created_at.desc()).all()

    return DocumentListResponse(
        documents=docs,
        total=len(docs)
    )

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve document details including chunks for preview."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")

    return doc

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete document and all associated chunks.
    Removes the physical file from the user's upload directory.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")

    # Remove physical file if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # Remove vectors from user's FAISS index
    try:
        remove_document_vectors(user_id=current_user.id, document_id=document_id)
    except Exception as v_err:
        logger.warning(f"Error purging vectors for doc {document_id}: {v_err}")

    # Delete from DB (cascade deletes chunks automatically)
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully", "id": document_id}
