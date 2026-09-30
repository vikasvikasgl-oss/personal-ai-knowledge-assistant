import os
from fastapi.testclient import TestClient
from main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.chat import Conversation, ChatMessage
from app.core.security import create_access_token

client = TestClient(app)

def run_tests():
    print("=== Running RAG Question-Answering & Hallucination Control Tests ===")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Get test user
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    assert user is not None
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Hallucination Control: Ask about an unrelated topic not in knowledge base
    print("\n[1] Testing Hallucination Control (querying absent knowledge)...")
    payload = {
        "question": "What is the average airspeed velocity of an unladen European swallow?",
        "threshold": 0.35
    }
    res = client.post("/chat", json=payload, headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "couldn't find" in data["answer"].lower() or "not find" in data["answer"].lower()
    assert data["confidence_level"] == "low"
    conv_id = data["conversation_id"]
    print(f"  -> Passed: Hallucination prevented! Answer: '{data['answer']}' (Confidence: {data['confidence_score']})")

    # 2. Upload document with known factual knowledge
    print("\n[2] Ingesting targeted document to knowledge base...")
    doc_text = (
        "Customer Service & Warranty Policy Manual 2026.\n\n"
        "Section 4.2: Extended Coverage Terms.\n"
        "The standard warranty period for Model Apex X is strictly thirty-six (36) months "
        "or 50,000 miles, whichever milestone is reached first. "
        "Batteries and high-voltage drive components receive an extended eight-year coverage.\n"
    )
    files = {"file": ("warranty_policy_manual.txt", doc_text.encode("utf-8"), "text/plain")}
    res = client.post("/documents/upload", files=files, headers=headers)
    assert res.status_code == 201
    uploaded_doc = res.json()
    print(f"  -> Ingested doc ID: {uploaded_doc['id']}")

    # 3. Ask question matching uploaded document
    print("\n[3] Testing RAG Question Answering on uploaded document...")
    qa_payload = {
        "question": "What is the warranty period for Model Apex X?",
        "conversation_id": conv_id,
        "threshold": 0.30
    }
    res = client.post("/chat", json=qa_payload, headers=headers)
    assert res.status_code == 200, f"Chat failed: {res.text}"
    qa_data = res.json()
    print(f"  -> Answer: {qa_data['answer'][:160]}...")
    print(f"  -> Confidence score: {qa_data['confidence_score']} (Level: {qa_data['confidence_level']})")
    assert len(qa_data["sources"]) >= 1, "Expected source citations"
    top_source = qa_data["sources"][0]
    assert "warranty" in top_source["filename"].lower()
    print(f"  -> Source cited: {top_source['filename']}, Page {top_source['page']}")
    print("  -> Passed: Context retrieved and answered with source citations!")

    # 4. Verify Chat History saved in DB
    print("\n[4] Verifying chat history in database...")
    res = client.get("/chat/conversations", headers=headers)
    assert res.status_code == 200
    convs = res.json()
    assert len(convs) >= 1
    target_conv = next((c for c in convs if c["id"] == conv_id), None)
    assert target_conv is not None, "Conversation not found in user conversation list"
    assert target_conv["message_count"] >= 4  # 2 questions + 2 answers = 4 messages
    print(f"  -> Passed: Conversation recorded with {target_conv['message_count']} messages.")

    # 5. Verify conversation messages detail
    print("\n[5] Testing GET /chat/conversations/{id}...")
    res = client.get(f"/chat/conversations/{conv_id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert len(detail["messages"]) >= 4
    roles = [m["role"] for m in detail["messages"]]
    assert "user" in roles and "assistant" in roles
    print("  -> Passed: Retrieved conversation thread messages with user and assistant turns.")

    # Cleanup test document
    client.delete(f"/documents/{uploaded_doc['id']}", headers=headers)
    db.close()
    print("\n ALL RAG QA & HALLUCINATION CONTROL TESTS PASSED!\n")

if __name__ == "__main__":
    run_tests()
