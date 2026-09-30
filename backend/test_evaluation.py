"""
Test suite for Evaluation endpoint
"""
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def test_eval():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "evaluser@example.com").first()
        if not user:
            user = User(
                name="Eval User",
                email="evaluser@example.com",
                hashed_password=hash_password("password123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_access_token(user.id)
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /evaluation
    res = client.get("/evaluation", headers=headers)
    assert res.status_code == 200, f"GET /evaluation failed: {res.text}"
    data = res.json()
    assert "classification" in data
    assert "retrieval" in data

    cls = data["classification"]
    assert "metrics" in cls
    print("Classification Metrics:", cls["metrics"])
    assert "accuracy" in cls["metrics"]
    assert "precision_macro" in cls["metrics"]
    assert "recall_macro" in cls["metrics"]
    assert "f1_macro" in cls["metrics"]
    assert "confusion_matrix" in cls

    ret = data["retrieval"]
    assert "metrics" in ret
    print("Retrieval Metrics:", ret["metrics"])
    assert "average_cosine_similarity" in ret["metrics"]
    assert "top_1_accuracy" in ret["metrics"]
    assert "top_3_accuracy" in ret["metrics"]
    assert "top_5_accuracy" in ret["metrics"]
    assert "mrr" in ret["metrics"]
    assert "query_results" in ret
    assert len(ret["query_results"]) > 0

    # 2. POST /evaluation/run
    run_res = client.post("/evaluation/run", headers=headers)
    assert run_res.status_code == 200, f"POST /evaluation/run failed: {run_res.text}"
    run_data = run_res.json()
    assert "classification" in run_data
    assert "retrieval" in run_data
    print("Trigger evaluation run passed successfully!")

    print("\nALL EVALUATION TESTS PASSED!")

if __name__ == "__main__":
    test_eval()
