import os
import io
from fastapi.testclient import TestClient
from main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.document import Document
from app.core.security import create_access_token
from app.services.embedding_service import embed_texts, embed_query

client = TestClient(app)

def run_tests():
    print("=== Running ML Embedding & FAISS Vector Search Tests ===")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Setup primary test user
    user1 = db.query(User).filter(User.email == "testuser@example.com").first()
    assert user1 is not None, "Test user not found in database"
    token1 = create_access_token(user1.id)
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Setup secondary test user for multi-tenant isolation testing
    user2 = db.query(User).filter(User.email == "user2@example.com").first()
    if not user2:
        from app.core.security import hash_password
        user2 = User(
            name="Second User",
            email="user2@example.com",
            hashed_password=hash_password("Password123!")
        )
        db.add(user2)
        db.commit()
        db.refresh(user2)
    token2 = create_access_token(user2.id)
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Clean vector store for test user 1 & 2 before starting
    import shutil
    for uid in (user1.id, user2.id):
        vdir = os.path.join("data", "vectorstore", str(uid))
        if os.path.exists(vdir):
            shutil.rmtree(vdir)

    # 1. Test Embedding Generator
    print("\n[1] Testing sentence-transformers embedding generation...")
    test_texts = [
        "Quantum computing utilizes qubits that exist in superpositions of zero and one.",
        "Deep learning architectures rely on multi-layer neural networks and backpropagation."
    ]
    embs = embed_texts(test_texts)
    assert embs.shape == (2, 384), f"Expected shape (2, 384), got {embs.shape}"
    import numpy as np
    norm = np.linalg.norm(embs[0])
    assert abs(norm - 1.0) < 1e-4, f"Embeddings not normalized to unit length: {norm}"
    print(f"  -> Passed: Model loaded, shape={embs.shape}, unit norm={norm:.4f}")

    # 2. Upload document for User 1
    print("\n[2] Uploading document for User 1 to trigger chunking & FAISS indexing...")
    doc_content = (
        "Project Antigravity Technical Specification.\n\n"
        "Section 1: Architecture and Microservices.\n"
        "The architecture is designed around asynchronous decoupled event streams. "
        "Each service runs inside an isolated container with dedicated storage volumes and zero external exposure.\n\n"
        "Section 2: High Availability and Disaster Recovery.\n"
        "Data replication occurs across multi-region availability zones. "
        "Failover triggers automatically within 200 milliseconds without dropping in-flight transactions.\n"
    )
    files = {"file": ("tech_spec.txt", doc_content.encode("utf-8"), "text/plain")}
    res = client.post("/documents/upload", files=files, headers=headers1)
    assert res.status_code == 201, f"Upload failed: {res.text}"
    doc_data = res.json()
    doc_id = doc_data["id"]
    print(f"  -> Passed: Uploaded doc_id={doc_id}, chunks={doc_data['total_chunks']}")

    # 3. Check FAISS index files on disk
    print("\n[3] Verifying FAISS index and metadata files in data/vectorstore/{user_id}/...")
    user1_index_file = os.path.join("data", "vectorstore", str(user1.id), "index.faiss")
    user1_meta_file = os.path.join("data", "vectorstore", str(user1.id), "metadata.json")
    assert os.path.exists(user1_index_file), f"FAISS index file missing at {user1_index_file}"
    assert os.path.exists(user1_meta_file), f"Metadata file missing at {user1_meta_file}"
    print(f"  -> Passed: FAISS index found at {user1_index_file}")

    # 4. Query GET /search/test?q=... with semantic question
    print("\n[4] Testing GET /search/test?q=... for User 1...")
    res = client.get("/search/test?q=How does disaster recovery and automatic failover work?", headers=headers1)
    assert res.status_code == 200, f"Search failed: {res.text}"
    search_data = res.json()
    assert search_data["count"] >= 1
    top_hit = search_data["results"][0]
    print(f"  -> Top match similarity score: {top_hit['similarity_score']}")
    print(f"  -> Source: {top_hit['filename']} (page {top_hit['page_number']})")
    assert top_hit["similarity_score"] > 0.25, f"Expected similarity score > 0.25, got {top_hit['similarity_score']}"
    assert "Disaster Recovery" in top_hit["content"] or "failover" in top_hit["content"].lower()
    print("  -> Passed: Semantic retrieval matched expected section with high cosine similarity.")

    # 5. Multi-tenant privacy test: User 2 should NOT see User 1's vectors!
    print("\n[5] Testing multi-tenant privacy (User 2 queries same question)...")
    res = client.get("/search/test?q=How does disaster recovery and automatic failover work?", headers=headers2)
    assert res.status_code == 200
    user2_data = res.json()
    assert user2_data["count"] == 0, f"Privacy violation: User 2 retrieved User 1's chunks! ({user2_data['results']})"
    print("  -> Passed: Multi-tenant isolation verified! User 2 received 0 results.")

    # 6. Delete document and test vector removal / index rebuild
    print("\n[6] Testing document deletion and vector index rebuild...")
    res = client.delete(f"/documents/{doc_id}", headers=headers1)
    assert res.status_code == 200

    # Query search again - should return 0 results
    res = client.get("/search/test?q=How does disaster recovery work?", headers=headers1)
    assert res.status_code == 200
    assert res.json()["count"] == 0, "Deleted document chunks still returned in search results!"
    print("  -> Passed: Vectors purged from FAISS index upon document deletion.")

    db.close()
    print("\n ALL VECTOR SEARCH & RETRIEVAL TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    run_tests()
