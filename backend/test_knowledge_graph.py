"""
Test suite for Knowledge Graph feature:
1. Document upload and automatic triple extraction (subject, relation, object)
2. Triple extraction verification (e.g. Parkinson's, detected using, Voice Analysis)
3. GET /knowledge-graph (nodes, edges, stats, colors)
4. GET /knowledge-graph/node/{node_id}/documents (connected documents for a concept)
5. POST /knowledge-graph/build-all (batch extraction)
"""

import io
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.knowledge_triple import KnowledgeTriple
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def setup_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "kguser@example.com").first()
        if not user:
            user = User(
                name="KG Test User",
                email="kguser@example.com",
                hashed_password=hash_password("password123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_access_token(user.id)
        return user, token
    finally:
        db.close()

def run_tests():
    print("=== Testing Knowledge Graph Triple Extraction & Retrieval ===")
    user, token = setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload a sample document containing biomedical / technical relations
    print("\n[1] Uploading document with relational text...")
    doc_content = (
        "Parkinson's Disease is a progressive neurodegenerative disorder. "
        "Parkinson's is detected using Voice Analysis of sustained phonations. "
        "Voice Analysis extracts acoustic features including jitter, shimmer, and fundamental frequency. "
        "Machine Learning algorithms like Support Vector Machines classify vocal biomarkers. "
        "The model achieves 91.4% classification accuracy on clinical benchmark datasets."
    )
    file_bytes = io.BytesIO(doc_content.encode("utf-8"))
    
    upload_res = client.post(
        "/documents/upload",
        files={"file": ("parkinsons_detection_study.txt", file_bytes, "text/plain")},
        headers=headers
    )
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    doc_data = upload_res.json()
    doc_id = doc_data["id"]
    print(f"  -> Uploaded document ID {doc_id}: '{doc_data['original_name']}'")

    # 2. Verify triples stored in knowledge_triples table
    print("\n[2] Verifying extracted triples in database...")
    db = SessionLocal()
    try:
        triples = db.query(KnowledgeTriple).filter(
            KnowledgeTriple.document_id == doc_id,
            KnowledgeTriple.user_id == user.id
        ).all()
        print(f"  -> Found {len(triples)} extracted triple(s) for document {doc_id}:")
        for t in triples:
            print(f"     * ({t.subject}) --[{t.relation}]--> ({t.object})  [{t.subject_type} -> {t.object_type}]")
        
        assert len(triples) >= 1, "Expected at least 1 triple to be extracted"
        # Check specifically for Parkinson's / Voice Analysis or similar key relationship
        has_rel = any(
            "parkinson" in t.subject.lower() or "voice" in t.object.lower() or "voice" in t.subject.lower()
            for t in triples
        )
        assert has_rel, "Expected domain relations connecting Parkinson's and Voice Analysis"
        print("  -> Passed: Triples successfully extracted and stored!")
    finally:
        db.close()

    # 3. Test GET /knowledge-graph endpoint
    print("\n[3] Testing GET /knowledge-graph endpoint...")
    graph_res = client.get("/knowledge-graph", headers=headers)
    assert graph_res.status_code == 200, f"Graph retrieval failed: {graph_res.text}"
    graph_data = graph_res.json()
    print(f"  -> Total Nodes: {graph_data['total_nodes']}")
    print(f"  -> Total Edges: {graph_data['total_edges']}")
    print(f"  -> Available Node Types: {graph_data['node_types']}")
    assert graph_data["total_nodes"] > 0
    assert graph_data["total_edges"] > 0

    first_node = graph_data["nodes"][0]
    print(f"  -> Sample Node: ID='{first_node['id']}', Label='{first_node['label']}', Type='{first_node['type']}', Color='{first_node['color']}'")
    assert "color" in first_node
    assert "document_ids" in first_node
    print("  -> Passed: Graph data schema correctly formatted with nodes and directed edges!")

    # 4. Test GET /knowledge-graph/node/{node_id}/documents
    node_id = first_node["id"]
    print(f"\n[4] Testing GET /knowledge-graph/node/{node_id}/documents...")
    node_doc_res = client.get(f"/knowledge-graph/node/{node_id}/documents", headers=headers)
    assert node_doc_res.status_code == 200
    node_docs = node_doc_res.json()
    print(f"  -> Node '{node_docs['label']}' is connected to {len(node_docs['documents'])} document(s)")
    for d in node_docs["documents"]:
        print(f"     - Document ID {d['id']}: {d['name']}")
    assert len(node_docs["documents"]) >= 1
    print("  -> Passed: Connected documents for concept retrieved successfully!")

    # 5. Test POST /knowledge-graph/build-all
    print("\n[5] Testing POST /knowledge-graph/build-all...")
    batch_res = client.post("/knowledge-graph/build-all", headers=headers)
    assert batch_res.status_code == 200
    print(f"  -> Batch response: {batch_res.json()['message']}")

    print("\n ALL KNOWLEDGE GRAPH TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    run_tests()
