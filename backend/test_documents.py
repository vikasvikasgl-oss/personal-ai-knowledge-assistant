import os
import io
from fastapi.testclient import TestClient
from main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.core.security import create_access_token

client = TestClient(app)

def run_tests():
    print("=== Running Backend Document Ingestion & Chunking Tests ===")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Setup or retrieve test user
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    if not user:
        from app.core.security import hash_password
        user = User(
            name="Test User",
            email="testuser@example.com",
            hashed_password=hash_password("Password123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Authenticated as test user ID={user.id}")

    # 1. Test TXT file upload and chunking
    print("\n[1] Testing TXT document upload and chunking...")
    # Create sample text with multiple paragraphs to test chunking
    sample_text = (
        "Artificial Intelligence in Healthcare: A Comprehensive Guide.\n\n"
        "Chapter 1: Foundations of Medical RAG.\n"
        "Retrieval-Augmented Generation bridges the gap between static LLM knowledge and real-time clinical notes. "
        "By indexing medical guidelines with dense vector embeddings, clinicians can query vast repositories without hallucinations.\n\n"
        "Chapter 2: Data Privacy and Isolated Storage.\n"
        "Healthcare mandates strict multi-tenant isolation. Each practitioner or institution must operate within an isolated FAISS partition. "
        "Patient records must never cross tenant boundaries, ensuring HIPAA and GDPR compliance.\n\n"
        "Chapter 3: OCR and Unstructured Document Ingestion.\n"
        "Handwritten notes and scanned lab reports are digitized using optical character recognition (OCR). "
        "The resulting text is normalized, split into overlapping chunks, and assigned provenance metadata including page numbers.\n"
    ) * 3  # Ensure adequate word count for multiple chunks

    txt_file = io.BytesIO(sample_text.encode("utf-8"))
    files = {"file": ("ai_healthcare_guide.txt", txt_file, "text/plain")}

    res = client.post("/documents/upload", files=files, headers=headers)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    doc_data = res.json()
    doc_id = doc_data["id"]
    assert doc_data["status"] == "Ready"
    assert doc_data["total_chunks"] >= 1
    print(f"  -> Passed: Document created (id={doc_id}, chunks={doc_data['total_chunks']}, status={doc_data['status']})")

    # Verify physical file exists in uploads/{user_id}/
    expected_path = os.path.join("data", "uploads", str(user.id), doc_data["filename"])
    assert os.path.exists(expected_path), f"File not found on disk at {expected_path}"
    print(f"  -> Passed: File stored at {expected_path}")

    # 2. Verify chunks stored with metadata
    print("\n[2] Verifying chunks and metadata in database...")
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    assert len(chunks) == doc_data["total_chunks"]
    for c in chunks:
        assert c.user_id == user.id
        assert c.chunk_index >= 0
        assert c.page_number >= 1
        assert len(c.content) > 0
    print(f"  -> Passed: Verified {len(chunks)} chunks with user_id, page_number, and chunk_index.")

    # 3. Test GET /documents
    print("\n[3] Testing GET /documents...")
    res = client.get("/documents", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    list_data = res.json()
    assert list_data["total"] >= 1
    found = any(d["id"] == doc_id for d in list_data["documents"])
    assert found, "Created document not found in user document list"
    print(f"  -> Passed: User document list returned {list_data['total']} documents.")

    # 4. Test DELETE /documents/{id}
    print(f"\n[4] Testing DELETE /documents/{doc_id}...")
    res = client.delete(f"/documents/{doc_id}", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    # Verify document and chunks removed from DB
    deleted_doc = db.query(Document).filter(Document.id == doc_id).first()
    assert deleted_doc is None, "Document still exists in DB after deletion"
    remaining_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    assert len(remaining_chunks) == 0, "Chunks still exist in DB after document deletion"
    assert not os.path.exists(expected_path), "File still exists on disk after deletion"
    print("  -> Passed: Document, chunks, and physical file cleanly deleted.")

    db.close()
    print("\n ALL DOCUMENT PROCESSING TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    run_tests()
