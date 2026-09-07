from pathlib import Path

import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from openai import APIStatusError, AuthenticationError, OpenAI, RateLimitError
from pydantic import BaseModel

import db

app = FastAPI(title="PM MVP")

STATIC_DIR = Path(__file__).parent / "static"

logger = logging.getLogger(__name__)

ZEN_BASE_URL = "https://opencode.ai/zen/v1"
ZEN_MODEL = "muse-spark-1.3-contributor-free"

db.init_db()


class ColumnRename(BaseModel):
    title: str


class CardCreate(BaseModel):
    column_id: int
    title: str
    details: str = ""


class CardUpdate(BaseModel):
    title: str | None = None
    details: str | None = None


class CardMove(BaseModel):
    card_id: int
    to_column_id: int
    to_position: int


def ordered_ids(conn, column_id, exclude=None):
    rows = conn.execute(
        "SELECT id FROM cards WHERE column_id=? ORDER BY position, id",
        (column_id,),
    ).fetchall()
    ids = [r["id"] for r in rows]
    if exclude in ids:
        ids.remove(exclude)
    return ids


def write_order(conn, column_id, ids):
    for pos, card_id in enumerate(ids):
        conn.execute(
            "UPDATE cards SET column_id=?, position=? WHERE id=?",
            (column_id, pos, card_id),
        )


@app.get("/api/hello")
def hello():
    return {"ok": True}


@app.get("/api/board")
def get_board():
    with db.get_conn(db.DB_PATH) as conn:
        board = conn.execute("SELECT * FROM boards LIMIT 1").fetchone()
        if board is None:
            raise HTTPException(404, "No board")
        columns = []
        for col in conn.execute(
            "SELECT * FROM columns WHERE board_id=? ORDER BY position",
            (board["id"],),
        ).fetchall():
            cards = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM cards WHERE column_id=? ORDER BY position",
                    (col["id"],),
                ).fetchall()
            ]
            columns.append({**dict(col), "cards": cards})
        return {**dict(board), "columns": columns}


@app.patch("/api/columns/{column_id}")
def rename_column(column_id: int, body: ColumnRename):
    with db.get_conn(db.DB_PATH) as conn:
        cur = conn.execute(
            "UPDATE columns SET title=? WHERE id=?", (body.title, column_id)
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "Column not found")
        return dict(
            conn.execute("SELECT * FROM columns WHERE id=?", (column_id,)).fetchone()
        )


@app.post("/api/cards", status_code=201)
def create_card(body: CardCreate):
    with db.get_conn(db.DB_PATH) as conn:
        col = conn.execute(
            "SELECT id FROM columns WHERE id=?", (body.column_id,)
        ).fetchone()
        if col is None:
            raise HTTPException(404, "Column not found")
        position = conn.execute(
            "SELECT COUNT(*) FROM cards WHERE column_id=?", (body.column_id,)
        ).fetchone()[0]
        card_id = conn.execute(
            "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
            (body.column_id, body.title, body.details, position),
        ).lastrowid
        return dict(
            conn.execute("SELECT * FROM cards WHERE id=?", (card_id,)).fetchone()
        )


@app.patch("/api/cards/{card_id}")
def update_card(card_id: int, body: CardUpdate):
    with db.get_conn(db.DB_PATH) as conn:
        card = conn.execute("SELECT * FROM cards WHERE id=?", (card_id,)).fetchone()
        if card is None:
            raise HTTPException(404, "Card not found")
        conn.execute(
            "UPDATE cards SET title=COALESCE(?, title), details=COALESCE(?, details) WHERE id=?",
            (body.title, body.details, card_id),
        )
        return dict(
            conn.execute("SELECT * FROM cards WHERE id=?", (card_id,)).fetchone()
        )


@app.delete("/api/cards/{card_id}")
def delete_card(card_id: int):
    with db.get_conn(db.DB_PATH) as conn:
        card = conn.execute("SELECT * FROM cards WHERE id=?", (card_id,)).fetchone()
        if card is None:
            raise HTTPException(404, "Card not found")
        conn.execute("DELETE FROM cards WHERE id=?", (card_id,))
        write_order(conn, card["column_id"], ordered_ids(conn, card["column_id"]))
        return {"deleted": card_id}


@app.post("/api/cards/move")
def move_card(body: CardMove):
    with db.get_conn(db.DB_PATH) as conn:
        card = conn.execute(
            "SELECT * FROM cards WHERE id=?", (body.card_id,)
        ).fetchone()
        if card is None:
            raise HTTPException(404, "Card not found")
        target = conn.execute(
            "SELECT id FROM columns WHERE id=?", (body.to_column_id,)
        ).fetchone()
        if target is None:
            raise HTTPException(404, "Column not found")
        if card["column_id"] == body.to_column_id:
            ids = ordered_ids(conn, body.to_column_id, exclude=body.card_id)
        else:
            write_order(
                conn,
                card["column_id"],
                ordered_ids(conn, card["column_id"], exclude=body.card_id),
            )
            ids = ordered_ids(conn, body.to_column_id)
        pos = max(0, min(body.to_position, len(ids)))
        ids.insert(pos, body.card_id)
        write_order(conn, body.to_column_id, ids)
        return dict(
            conn.execute("SELECT * FROM cards WHERE id=?", (body.card_id,)).fetchone()
        )


def get_api_key():
    key = os.getenv("OPENCODE_API_KEY", "").strip().strip('"').strip("'")
    if key:
        return key
    here = Path(__file__).parent
    for p in (here / ".env", here.parent / ".env"):
        try:
            for line in p.read_text().splitlines():
                if line.strip().startswith("OPENCODE_API_KEY="):
                    v = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if v:
                        return v
        except OSError:
            continue
    return ""


@app.post("/api/ai/test")
def ai_test():
    key = get_api_key()
    if not key:
        raise HTTPException(500, "OPENCODE_API_KEY not configured")
    try:
        client = OpenAI(base_url=ZEN_BASE_URL, api_key=key)
        resp = client.responses.create(
            model=ZEN_MODEL, input="2+2?", reasoning={"effort": "medium"}
        )
        return {"answer": resp.output_text}
    except AuthenticationError as e:
        logger.warning("Zen auth failed: %s", e)
        raise HTTPException(401, "AI auth failed")
    except RateLimitError as e:
        logger.warning("Zen rate limited: %s", e)
        raise HTTPException(429, "AI rate limited")
    except APIStatusError as e:
        logger.warning("Zen API error %s: %s", e.status_code, e)
        raise HTTPException(e.status_code, "AI request failed")
    except Exception as e:
        logger.warning("Zen request failed: %s", type(e).__name__)
        raise HTTPException(502, "AI request failed")


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
