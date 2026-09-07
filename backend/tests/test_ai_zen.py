import main
from fastapi.testclient import TestClient

client = TestClient(app=main.app)


def test_ai_test_answers_4():
    r = client.post("/api/ai/test")
    assert r.status_code == 200
    assert "4" in r.json()["answer"]


def test_ai_auth_failure_hides_key(monkeypatch):
    monkeypatch.setattr(main, "get_api_key", lambda: "bad-key")
    r = client.post("/api/ai/test")
    assert r.status_code == 401
    assert "bad-key" not in r.text
