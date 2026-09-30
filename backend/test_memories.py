"""
Test suite for Personal AI Memories:
1. Detect facts the user states in chat (e.g. 'My project uses MediaPipe') and store them in memories table
2. Include relevant memories in RAG context when answering later questions
3. CRUD API endpoints: GET /memories, POST /memories, PUT /memories/{id}, DELETE /memories/{id}
"""

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.memory import Memory
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def setup_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "memoryuser@example.com").first()
        if not user:
            user = User(
                name="Memory Test User",
                email="memoryuser@example.com",
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
    print("=== Testing Personal AI Memories Feature ===")
    user, token = setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. User states a personal fact in chat: "My project uses MediaPipe"
    print("\n[1] Testing fact detection in chat message...")
    statement = "My project uses MediaPipe for hand tracking and gesture detection."
    chat_res = client.post(
        "/chat",
        json={"question": statement},
        headers=headers
    )
    assert chat_res.status_code == 200, f"Chat statement failed: {chat_res.text}"

    # Verify fact stored in memories table
    db = SessionLocal()
    try:
        stored = db.query(Memory).filter(Memory.user_id == user.id).all()
        print(f"  -> Detected and stored {len(stored)} memory fact(s):")
        for m in stored:
            print(f"     - [ID {m.id}] {m.content} (Category: {m.category}, Source: {m.source})")
        assert len(stored) >= 1, "Expected memory to be auto-detected and saved"
        assert any("mediapipe" in m.content.lower() for m in stored), "Expected 'MediaPipe' fact in memories"
        print("  -> Passed: Personal fact successfully detected and saved!")
    finally:
        db.close()

    # 2. Later question queries personal fact without document context
    print("\n[2] Testing memory retrieval in later question answering...")
    later_question = "What library does my project use for gesture tracking?"
    qa_res = client.post(
        "/chat",
        json={"question": later_question},
        headers=headers
    )
    assert qa_res.status_code == 200, f"Chat query failed: {qa_res.text}"
    qa_data = qa_res.json()
    print(f"  -> Question: '{later_question}'")
    print(f"  -> Answer: {qa_data['answer'][:160]}...")
    print(f"  -> Confidence score: {qa_data['confidence_score']} ({qa_data['confidence_level']})")
    print(f"  -> Sources cited: {[s['filename'] + ' - ' + s['snippet'] for s in qa_data['sources']]}")

    assert any(s["filename"] == "Personal Memory" for s in qa_data["sources"]), "Expected 'Personal Memory' source citation"
    print("  -> Passed: Memory successfully included in RAG context and cited as source!")

    # 3. Test GET /memories endpoint
    print("\n[3] Testing GET /memories...")
    list_res = client.get("/memories", headers=headers)
    assert list_res.status_code == 200
    memories_data = list_res.json()
    print(f"  -> Found {memories_data['total']} memories for user")
    assert memories_data["total"] >= 1

    memory_id = memories_data["memories"][0]["id"]

    # 4. Test PUT /memories/{id} (edit)
    print(f"\n[4] Testing PUT /memories/{memory_id} (editing memory)...")
    updated_content = "User's project uses MediaPipe v0.10 and OpenCV for gesture analysis"
    put_res = client.put(
        f"/memories/{memory_id}",
        json={"content": updated_content, "category": "Tech Stack"},
        headers=headers
    )
    assert put_res.status_code == 200
    assert put_res.json()["content"] == updated_content
    assert put_res.json()["category"] == "Tech Stack"
    print(f"  -> Memory updated: {put_res.json()['content']}")
    print("  -> Passed: Memory edited successfully!")

    # 5. Test manual POST /memories
    print("\n[5] Testing manual POST /memories...")
    post_res = client.post(
        "/memories",
        json={"content": "User prefers dark mode UI and concise Markdown explanations", "category": "Preference"},
        headers=headers
    )
    assert post_res.status_code == 201
    manual_id = post_res.json()["id"]
    print(f"  -> Manually created memory [ID {manual_id}]: {post_res.json()['content']}")
    print("  -> Passed: Manual memory creation works!")

    # 6. Test DELETE /memories/{id}
    print(f"\n[6] Testing DELETE /memories/{manual_id}...")
    del_res = client.delete(f"/memories/{manual_id}", headers=headers)
    assert del_res.status_code == 200
    print("  -> Passed: Memory deleted successfully!")

    print("\n ALL PERSONAL MEMORY TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
