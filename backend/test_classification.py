"""
Test suite for ML-based Document Classification:
- Tests model evaluation metrics loaded from JSON
- Tests classifier_service inference directly on category text
- Tests document upload with automatic category assignment
- Tests document listing with category filtering
"""

import io
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password, create_access_token
from app.services.classifier_service import classify_document, get_classification_metrics

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
    print("=== Testing ML Document Classification ===")

    # 1. Evaluation metrics from JSON
    print("\n[1] Checking evaluation results from JSON...")
    metrics = get_classification_metrics()
    assert "metrics" in metrics, "Missing 'metrics' key in evaluation results"
    acc = metrics["metrics"]["accuracy"]
    f1 = metrics["metrics"]["f1_macro"]
    print(f"  -> Accuracy: {acc*100:.1f}%, F1-Score: {f1*100:.1f}%")
    print(f"  -> Categories: {metrics['categories']}")
    print("  -> Passed: Metrics verified from classification_metrics.json")

    # 2. Direct classification inference tests
    print("\n[2] Testing direct inference on sample category texts...")
    samples = [
        ("Resume/Career", "John Doe - Senior Software Engineer. Professional Experience at Acme Corp: Built distributed microservices in Go and Python. Education: B.S. in Computer Science."),
        ("Research Paper", "Abstract: We present a novel transformer architecture with linear attention complexity for deep sequence learning. Experimental results demonstrate state-of-the-art BLEU scores on WMT14."),
        ("Project", "Project Architecture Document & README: Personal AI Knowledge Assistant. Microservices topology, docker-compose deployment, PostgreSQL schema, and REST API specification."),
        ("Assignment", "Assignment 4: Database Normalization and SQL queries. Problem 1: Compute candidate keys and decompose relation R into BCNF. Due Sunday at 11:59 PM."),
        ("Personal Notes", "Personal Journal & Weekend Reflection: Morning run around the lake, picked up fresh espresso beans, bought groceries (avocados, bread, milk). Call grandma tomorrow."),
        ("Study Material", "Calculus Chapter 6 Study Guide: Integration by parts formula, trigonometric substitution, partial fractions, and infinite series convergence tests.")
    ]

    for expected, text in samples:
        res = classify_document(text)
        print(f"  -> Text snippet [{expected}]: Classified as '{res['category']}' (Confidence: {res['confidence']*100:.1f}%)")
        assert res["category"] == expected, f"Expected {expected}, got {res['category']}"

    print("  -> Passed: All 6 category samples correctly classified!")

    # 3. Document upload with automatic classification
    print("\n[3] Testing document upload with automatic classification...")
    user, token = setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    test_doc_content = """Project Architecture Specification: Cloud IoT Fleet Manager
System Overview: Distributed telemetry ingestion pipeline built with FastAPI and MQTT.
Architecture: Edge devices push sensor readings every 10 seconds to an Apache Kafka broker.
Database: Time-series metrics stored in ClickHouse with automated partitioning.
Milestones: Sprint 1 MVP due November 15."""

    file_bytes = io.BytesIO(test_doc_content.encode("utf-8"))
    upload_res = client.post(
        "/documents/upload",
        files={"file": ("project_iot_architecture.txt", file_bytes, "text/plain")},
        headers=headers
    )

    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    uploaded_data = upload_res.json()
    print(f"  -> Uploaded doc: '{uploaded_data['original_name']}'")
    print(f"  -> Assigned Category: '{uploaded_data.get('category')}' (Confidence: {uploaded_data.get('category_confidence')})")
    assert uploaded_data.get("category") == "Project", f"Expected 'Project', got {uploaded_data.get('category')}"
    print("  -> Passed: Document automatically classified on upload!")

    # 4. Category filtering on GET /documents
    print("\n[4] Testing GET /documents with category filtering...")
    # Filter by Project
    res_project = client.get("/documents?category=Project", headers=headers)
    assert res_project.status_code == 200
    docs_project = res_project.json()["documents"]
    assert len(docs_project) >= 1
    assert all(d["category"] == "Project" for d in docs_project)
    print(f"  -> Filtered 'Project': Found {len(docs_project)} document(s)")

    # Filter by Resume/Career (should not include our Project doc)
    res_resume = client.get("/documents?category=Resume/Career", headers=headers)
    assert res_resume.status_code == 200
    docs_resume = res_resume.json()["documents"]
    assert all(d["category"] == "Resume/Career" for d in docs_resume)
    print(f"  -> Filtered 'Resume/Career': Found {len(docs_resume)} document(s)")

    # 5. GET /documents/metrics/evaluation
    print("\n[5] Testing GET /documents/metrics/evaluation endpoint...")
    metrics_res = client.get("/documents/metrics/evaluation")
    assert metrics_res.status_code == 200
    m_data = metrics_res.json()
    assert "metrics" in m_data
    assert m_data["model_type"] == "TF-IDF + Logistic Regression"
    print(f"  -> Retrieved metrics endpoint: Accuracy {m_data['metrics']['accuracy']*100:.1f}%")
    print("  -> Passed: Metrics endpoint live and working!")

    print("\n ALL ML DOCUMENT CLASSIFICATION TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
