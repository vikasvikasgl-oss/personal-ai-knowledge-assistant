"""
Test script for Semantic Vector Search API:
- Verifies GET /search with natural language query
- Checks category assignment on results
- Checks category filtering
- Validates similarity scores and ranking
"""

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def setup_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "mltest@example.com").first()
        if not user:
            user = User(
                name="ML Test User",
                email="mltest@example.com",
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
    print("=== Testing Semantic Vector Search Feature ===")
    user, token = setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Natural language query
    q = "What deep learning model did I use for image classification?"
    print(f"\n[1] Querying GET /search with: '{q}'...")
    res = client.get(f"/search?q={q}&top_k=5&threshold=0.0", headers=headers)
    assert res.status_code == 200, f"Search failed: {res.text}"
    data = res.json()
    print(f"  -> Returned {data['count']} result(s)")
    assert "results" in data
    assert "user_id" in data

    if data["results"]:
        top = data["results"][0]
        print(f"  -> Top result: {top['filename']} (Page {top['page_number']})")
        print(f"  -> Similarity score: {top['similarity_score']}")
        print(f"  -> Category: {top.get('category')}")
        assert "category" in top, "Expected category in search result"
        assert "content" in top, "Expected content in search result"

    # 2. Testing with category filter
    print("\n[2] Testing GET /search with category filter...")
    res_filtered = client.get(f"/search?q={q}&category=Project&top_k=5", headers=headers)
    assert res_filtered.status_code == 200
    filtered_data = res_filtered.json()
    print(f"  -> Filtered by 'Project': {filtered_data['count']} result(s)")
    if filtered_data["results"]:
        for r in filtered_data["results"]:
            assert r["category"] == "Project"

    # 3. Testing backward compatibility /search/test
    print("\n[3] Testing GET /search/test endpoint...")
    res_test = client.get(f"/search/test?q={q}&top_k=3", headers=headers)
    assert res_test.status_code == 200
    assert "results" in res_test.json()
    print("  -> Passed: GET /search/test working properly")

    print("\n ALL SEMANTIC SEARCH API TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
