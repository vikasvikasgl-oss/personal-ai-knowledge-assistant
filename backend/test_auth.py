import sys
from fastapi.testclient import TestClient
from main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User

client = TestClient(app)

def run_tests():
    print("=== Running Backend Authentication Tests ===")

    # Reset test database table
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(User).filter(User.email == "testuser@example.com").delete()
    db.commit()
    db.close()

    # 1. Signup with valid user
    print("\n[1] Testing POST /auth/signup...")
    signup_payload = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "Password123!"
    }
    res = client.post("/auth/signup", json=signup_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    signup_data = res.json()
    assert "access_token" in signup_data
    assert signup_data["user"]["email"] == "testuser@example.com"
    token = signup_data["access_token"]
    print("  -> Passed: User created successfully, token received.")

    # 2. Duplicate signup check
    print("\n[2] Testing duplicate email rejection...")
    res = client.post("/auth/signup", json=signup_payload)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
    assert "already exists" in res.json()["detail"].lower()
    print("  -> Passed: Duplicate registration blocked with clear message.")

    # 3. Invalid email validation
    print("\n[3] Testing invalid email format...")
    invalid_email_payload = {
        "name": "Invalid User",
        "email": "not-an-email",
        "password": "Password123!"
    }
    res = client.post("/auth/signup", json=invalid_email_payload)
    assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"
    print("  -> Passed: Invalid email rejected by schema validation.")

    # 4. Login with correct credentials
    print("\n[4] Testing POST /auth/login with valid credentials...")
    login_payload = {
        "email": "testuser@example.com",
        "password": "Password123!"
    }
    res = client.post("/auth/login", json=login_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    login_data = res.json()
    assert "access_token" in login_data
    token = login_data["access_token"]
    print("  -> Passed: Login succeeded, JWT token acquired.")

    # 5. Login with invalid password
    print("\n[5] Testing POST /auth/login with wrong password...")
    wrong_payload = {
        "email": "testuser@example.com",
        "password": "WrongPassword999!"
    }
    res = client.post("/auth/login", json=wrong_payload)
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
    assert "incorrect" in res.json()["detail"].lower()
    print("  -> Passed: Invalid password rejected with clear message.")

    # 6. GET /auth/me with Bearer token
    print("\n[6] Testing protected GET /auth/me with Bearer token...")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    user_info = res.json()
    assert user_info["email"] == "testuser@example.com"
    assert user_info["name"] == "Test User"
    print("  -> Passed: Protected route /auth/me accessed successfully.")

    # 7. GET /auth/me without token
    print("\n[7] Testing GET /auth/me without token...")
    res = client.get("/auth/me")
    assert res.status_code in (401, 403), f"Expected 401/403, got {res.status_code}: {res.text}"
    print("  -> Passed: Unauthenticated request rejected.")

    # 8. GET /auth/me with bogus token
    print("\n[8] Testing GET /auth/me with invalid token...")
    res = client.get("/auth/me", headers={"Authorization": "Bearer bogus.token.xyz"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
    print("  -> Passed: Invalid token rejected.")

    print("\n ALL AUTHENTICATION TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    run_tests()
