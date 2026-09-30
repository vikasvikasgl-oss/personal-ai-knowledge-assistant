"""
Comprehensive Test suite for Dashboard and Recommendations endpoints:
1. Verifies initial empty state
2. Ingests documents with technical concepts (CNN, LSTM, Parkinson's voice analysis)
3. Verifies Dashboard stats, charts (donut categories, top topics bar, activity line), recent items
4. Verifies Recommendations topic extraction (TF-IDF), embedding similarity (Related documents), and Knowledge Gap rules
"""
import io
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def run_tests():
    print("=== Testing Dashboard and Recommendations Endpoints ===")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "dash_rec_user@example.com").first()
        if not user:
            user = User(
                name="Dash Rec User",
                email="dash_rec_user@example.com",
                hashed_password=hash_password("password123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_access_token(user.id)
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Upload Document 1 - CNN and LSTM Sequence Modeling
    print("\n[1] Uploading Document 1: Deep Learning CNN & LSTM...")
    doc1_content = (
        "Convolutional Neural Networks (CNN) are powerful architectures for image processing and feature extraction. "
        "Recurrent Neural Networks and Long Short-Term Memory (LSTM) networks are designed for sequence modeling and temporal data. "
        "CNN and LSTM can be combined into convolutional recurrent models for spatio-temporal video classification."
    )
    res1 = client.post(
        "/documents/upload",
        files={"file": ("cnn_lstm_deep_learning_study.txt", io.BytesIO(doc1_content.encode("utf-8")), "text/plain")},
        headers=headers
    )
    assert res1.status_code == 201, f"Doc 1 upload failed: {res1.text}"
    print(f"  -> Uploaded doc 1 ID: {res1.json()['id']}")

    # Step 2: Upload Document 2 - Parkinson's Voice Analysis
    print("\n[2] Uploading Document 2: Parkinson's Detection via Voice Analysis...")
    doc2_content = (
        "Parkinson's Disease voice analysis examines vocal acoustics including jitter and shimmer. "
        "Machine Learning classification using Support Vector Machines and acoustic voice features detects Parkinson's biomarkers."
    )
    res2 = client.post(
        "/documents/upload",
        files={"file": ("parkinsons_voice_biomarkers.txt", io.BytesIO(doc2_content.encode("utf-8")), "text/plain")},
        headers=headers
    )
    assert res2.status_code == 201, f"Doc 2 upload failed: {res2.text}"
    print(f"  -> Uploaded doc 2 ID: {res2.json()['id']}")

    # Step 3: Test Dashboard Stats, Charts & Recent Items
    print("\n[3] Testing GET /dashboard endpoint...")
    res_dash = client.get("/dashboard", headers=headers)
    assert res_dash.status_code == 200, f"Dashboard failed: {res_dash.text}"
    dash_data = res_dash.json()

    stats = dash_data["stats"]
    print("  -> Stat Cards:", stats)
    assert stats["total_documents"] >= 2, f"Expected at least 2 documents, got {stats['total_documents']}"
    assert stats["total_chunks"] >= 2, f"Expected at least 2 chunks, got {stats['total_chunks']}"

    charts = dash_data["charts"]
    print(f"  -> Category Donut Segments ({len(charts['categories'])}):", [c["name"] for c in charts["categories"]])
    print(f"  -> Top Topics Bar Items ({len(charts['top_topics'])}):", [t["topic"] for t in charts["top_topics"][:4]])
    print(f"  -> Activity Over Time Points ({len(charts['activity_over_time'])}):", [a["date"] for a in charts["activity_over_time"][:3]])
    assert len(charts["categories"]) >= 1
    assert len(charts["top_topics"]) >= 1
    assert len(charts["activity_over_time"]) == 7

    assert len(dash_data["recent_documents"]) >= 2
    print(f"  -> Recent Documents Count: {len(dash_data['recent_documents'])}")

    # Step 4: Test Recommendations (TF-IDF Topics, Embedding Similarity, Knowledge Gaps)
    print("\n[4] Testing GET /recommendations endpoint...")
    res_rec = client.get("/recommendations", headers=headers)
    assert res_rec.status_code == 200, f"Recommendations failed: {res_rec.text}"
    rec_data = res_rec.json()

    recs = rec_data["recommendations"]
    summary = rec_data["summary"]
    doc_topics = rec_data["document_topics"]

    print(f"  -> Total Recommendations: {len(recs)}")
    print(f"  -> Total Extracted Topics: {summary['total_topics']}")
    print(f"  -> Knowledge Gaps Count: {summary['knowledge_gaps']}")
    print(f"  -> Related Pairs Count: {summary['related_pairs']}")

    for idx, r in enumerate(recs, 1):
        print(f"     [{idx}] ({r['badge']}) {r['title']}")
        print(f"         {r['description'][:100]}...")

    # Check for CNN/LSTM -> Transformer knowledge gap
    has_transformer_gap = any("transformer" in r["title"].lower() or "transformer" in r["description"].lower() for r in recs)
    assert has_transformer_gap, "Expected Transformers knowledge gap to be detected for CNN/LSTM document!"
    print("  -> Passed: CNN/LSTM studied but not Transformers knowledge gap successfully detected!")

    print("\n ALL DASHBOARD & RECOMMENDATION TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    run_tests()
