from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_hello():
    r = client.get("/api/hello")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_root_serves_html():
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
