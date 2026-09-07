from pathlib import Path

import db
import main
from db import get_conn, init_db
from fastapi.testclient import TestClient

TMP_DB = str(Path(__file__).parent / "test_ai_chat_tmp.db")
OLD_DB = db.DB_PATH


def setup_function(_):
    db.DB_PATH = TMP_DB
    p = Path(db.DB_PATH)
    if p.exists():
        p.unlink()
    init_db(db.DB_PATH)


def teardown_function(_):
    p = Path(db.DB_PATH)
    if p.exists():
        p.unlink()
    db.DB_PATH = OLD_DB


client = TestClient(app=main.app)


def card_count():
    with get_conn(db.DB_PATH) as conn:
        return conn.execute("SELECT COUNT(*) FROM cards").fetchone()[0]


def test_create_two_cards(monkeypatch):
    monkeypatch.setattr(
        main,
        "call_ai_chat",
        lambda board, message, history: {
            "reply": "created",
            "board_patch": {
                "ops": [
                    {"op": "create_card", "column_id": 1, "title": "A"},
                    {"op": "create_card", "column_id": 2, "title": "B", "details": "d"},
                ]
            },
        },
    )
    r = client.post("/api/ai/chat", json={"message": "create A and B", "history": []})
    assert r.status_code == 200
    body = r.json()
    assert body["applied"] is True
    titles = [c["title"] for col in body["board"]["columns"] for c in col["cards"]]
    assert "A" in titles and "B" in titles
    assert card_count() == 10


def test_move_card(monkeypatch):
    monkeypatch.setattr(
        main,
        "call_ai_chat",
        lambda board, message, history: {
            "reply": "moved",
            "board_patch": {
                "ops": [
                    {
                        "op": "move_card",
                        "card_id": 1,
                        "to_column_id": 5,
                        "to_position": 0,
                    }
                ]
            },
        },
    )
    r = client.post("/api/ai/chat", json={"message": "move 1 to Done", "history": []})
    assert r.status_code == 200
    body = r.json()
    assert body["applied"] is True
    done = [c for c in body["board"]["columns"] if c["id"] == 5][0]
    assert done["cards"][0]["id"] == 1


def test_edit_card(monkeypatch):
    monkeypatch.setattr(
        main,
        "call_ai_chat",
        lambda board, message, history: {
            "reply": "edited",
            "board_patch": {
                "ops": [
                    {
                        "op": "update_card",
                        "card_id": 1,
                        "title": "Renamed",
                        "details": "New details",
                    }
                ]
            },
        },
    )
    r = client.post("/api/ai/chat", json={"message": "rename card 1", "history": []})
    assert r.status_code == 200
    body = r.json()
    assert body["applied"] is True
    with get_conn(db.DB_PATH) as conn:
        card = conn.execute("SELECT * FROM cards WHERE id=1").fetchone()
    assert card["title"] == "Renamed" and card["details"] == "New details"


def test_noop_reply(monkeypatch):
    monkeypatch.setattr(
        main, "call_ai_chat", lambda board, message, history: {"reply": "hello"}
    )
    before = card_count()
    r = client.post("/api/ai/chat", json={"message": "hi", "history": []})
    assert r.status_code == 200
    body = r.json()
    assert body["applied"] is False
    assert body["reply"] == "hello"
    assert card_count() == before


def test_delete_and_rename(monkeypatch):
    monkeypatch.setattr(
        main,
        "call_ai_chat",
        lambda board, message, history: {
            "reply": "done",
            "board_patch": {
                "ops": [
                    {"op": "delete_card", "card_id": 1},
                    {"op": "rename_column", "column_id": 1, "title": "Todo"},
                ]
            },
        },
    )
    r = client.post("/api/ai/chat", json={"message": "delete 1, rename", "history": []})
    assert r.status_code == 200
    body = r.json()
    assert body["applied"] is True
    with get_conn(db.DB_PATH) as conn:
        assert conn.execute("SELECT * FROM cards WHERE id=1").fetchone() is None
        col = conn.execute("SELECT * FROM columns WHERE id=1").fetchone()
    assert col["title"] == "Todo"


def test_invalid_schema_rejected(monkeypatch):
    monkeypatch.setattr(
        main,
        "call_ai_chat",
        lambda board, message, history: {
            "reply": "bad",
            "board_patch": {"ops": [{"op": "create_card", "column_id": 999}]},
        },
    )
    before = card_count()
    r = client.post("/api/ai/chat", json={"message": "bad", "history": []})
    assert r.status_code == 422
    assert card_count() == before


def test_malformed_response_rejected(monkeypatch):
    monkeypatch.setattr(main, "call_ai_chat", lambda board, message, history: {})
    before = card_count()
    r = client.post("/api/ai/chat", json={"message": "bad", "history": []})
    assert r.status_code == 422
    assert card_count() == before


def test_strip_fences():
    assert main.strip_fences('{"reply": "hi"}') == '{"reply": "hi"}'
    assert (
        main.strip_fences('```json\n{"reply": "hi"}\n```') == '{"reply": "hi"}'
    )
    assert main.strip_fences('```\n{"reply": "hi"}\n```') == '{"reply": "hi"}'
