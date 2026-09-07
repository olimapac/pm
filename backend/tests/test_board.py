import db
from db import get_conn, init_db
from fastapi.testclient import TestClient
from main import app
from pathlib import Path


TMP_DB = str(Path(__file__).parent / "test_board_tmp.db")


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


client = TestClient(app)


def test_fresh_db_seed():
    with get_conn(db.DB_PATH) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM columns").fetchone()[0] == 5
        assert conn.execute("SELECT COUNT(*) FROM cards").fetchone()[0] == 8


def test_get_board_shape():
    board = client.get("/api/board").json()
    assert [c["title"] for c in board["columns"]] == [
        "Backlog",
        "Discovery",
        "In Progress",
        "Review",
        "Done",
    ]
    assert [len(c["cards"]) for c in board["columns"]] == [2, 1, 2, 1, 2]


def test_rename_column():
    r = client.patch("/api/columns/1", json={"title": "Todo"})
    assert r.status_code == 200 and r.json()["title"] == "Todo"
    assert client.patch("/api/columns/999", json={"title": "X"}).status_code == 404


def test_card_crud():
    created = client.post(
        "/api/cards", json={"column_id": 1, "title": "New", "details": "D"}
    )
    assert created.status_code == 201
    card_id = created.json()["id"]
    assert client.post(
        "/api/cards", json={"column_id": 999, "title": "X"}
    ).status_code == 404

    updated = client.patch(f"/api/cards/{card_id}", json={"title": "Renamed"})
    assert updated.json()["title"] == "Renamed" and updated.json()["details"] == "D"
    assert client.patch("/api/cards/999", json={"title": "X"}).status_code == 404

    assert client.delete(f"/api/cards/{card_id}").json() == {"deleted": card_id}
    assert client.delete(f"/api/cards/{card_id}").status_code == 404
    with get_conn(db.DB_PATH) as conn:
        positions = [
            r[0]
            for r in conn.execute(
                "SELECT position FROM cards WHERE column_id=1 ORDER BY position"
            ).fetchall()
        ]
    assert positions == list(range(len(positions)))


def test_move_across_and_within_columns():
    moved = client.post(
        "/api/cards/move", json={"card_id": 1, "to_column_id": 5, "to_position": 0}
    ).json()
    assert (moved["column_id"], moved["position"]) == (5, 0)
    board = client.get("/api/board").json()
    done = [c for c in board["columns"] if c["id"] == 5][0]
    assert done["cards"][0]["id"] == 1

    backlog_before = [c["id"] for c in board["columns"][0]["cards"]]
    last = backlog_before[-1]
    client.post(
        "/api/cards/move",
        json={"card_id": last, "to_column_id": 1, "to_position": 0},
    )
    backlog_after = client.get("/api/board").json()["columns"][0]["cards"]
    assert backlog_after[0]["id"] == last


def test_move_404s():
    assert client.post(
        "/api/cards/move",
        json={"card_id": 999, "to_column_id": 1, "to_position": 0},
    ).status_code == 404
    assert client.post(
        "/api/cards/move",
        json={"card_id": 1, "to_column_id": 999, "to_position": 0},
    ).status_code == 404
