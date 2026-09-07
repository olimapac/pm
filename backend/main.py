from pathlib import Path

import json
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

AI_BASE_URL = "https://openrouter.ai/api/v1"
AI_MODEL = "openai/gpt-4o-mini"

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


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatHistoryItem] = []


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


def read_board(conn):
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


@app.get("/api/board")
def get_board():
    with db.get_conn(db.DB_PATH) as conn:
        return read_board(conn)


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
    key = os.getenv("OPENROUTER_API_KEY", "").strip().strip('"').strip("'")
    if key:
        return key
    here = Path(__file__).parent
    for p in (here / ".env", here.parent / ".env"):
        try:
            for line in p.read_text().splitlines():
                if line.strip().startswith("OPENROUTER_API_KEY="):
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
        raise HTTPException(500, "OPENROUTER_API_KEY not configured")
    try:
        client = OpenAI(base_url=AI_BASE_URL, api_key=key)
        resp = client.responses.create(model=AI_MODEL, input="2+2?")
        return {"answer": resp.output_text}
    except AuthenticationError as e:
        logger.warning("AI provider auth failed: %s", e)
        raise HTTPException(401, "AI auth failed")
    except RateLimitError as e:
        logger.warning("AI provider rate limited: %s", e)
        raise HTTPException(429, "AI rate limited")
    except APIStatusError as e:
        logger.warning("AI provider API error %s: %s", e.status_code, e)
        raise HTTPException(e.status_code, "AI request failed")
    except Exception as e:
        logger.warning("AI provider request failed: %s", type(e).__name__)
        raise HTTPException(502, "AI request failed")


AI_CHAT_INSTRUCTIONS = (
    "You manage a Kanban board. Columns are fixed (rename only, never add/delete columns). "
    "Cards can be created, edited, moved, deleted. "
    "Resolve user references (names/titles, case-insensitive) to ids from the board JSON. "
    "Respond with ONLY a single JSON object, no code fences, no prose outside the JSON, "
    "with keys 'reply' (short human message in the same language as the user, default Portuguese) "
    "and optionally 'board_patch' (object with 'ops' array). "
    "Omit 'board_patch' when no board change is needed. "
    "Each op is a FLAT object with an 'op' discriminator field, one of "
    "create_card, update_card, move_card, delete_card, rename_column. "
    'Example: {"op": "create_card", "column_id": 1, "title": "Buy milk", "details": ""}. '
    "Full shapes: create_card needs column_id (int) + title; update_card needs card_id (int) "
    "plus title and/or details; move_card needs card_id, to_column_id (int), to_position (int, 0-based); "
    "delete_card needs card_id; rename_column needs column_id (int) + title. "
    "Create directly in the target column. Only use ids present in the board JSON."
)


def strip_fences(text):
    text = text.strip()
    if text.startswith("```"):
        text = text[3:]
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
        text = text.strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


# NOTE: plain "respond with ONLY JSON" instruction, no reasoning param, no
# text.format=json_schema. Live probes proved constrained decoding + reasoning
# destabilize the previous model via OpenCode Zen (runaway garbage, missing patch);
# gpt-4o-mini via OpenRouter returns clean {reply, board_patch} this way, but
# needs the explicit flat-op example above (else it nests the op as a key).
# The patch schema is enforced server-side in validate_ops instead.
def call_ai_chat(board, message, history):
    key = get_api_key()
    if not key:
        raise HTTPException(500, "OPENROUTER_API_KEY not configured")
    conv = ""
    for h in history[-20:]:
        conv += f"{h.get('role', 'user')}: {h.get('content', '')}\n"
    conv += f"user: {message}"
    instructions = AI_CHAT_INSTRUCTIONS + "\n\nCurrent board JSON:\n" + json.dumps(
        board, ensure_ascii=False
    )
    client = OpenAI(base_url=AI_BASE_URL, api_key=key)
    resp = client.responses.create(
        model=AI_MODEL,
        instructions=instructions,
        input=conv,
    )
    return json.loads(strip_fences(resp.output_text))


def validate_ops(ops):
    allowed = {"create_card", "update_card", "move_card", "delete_card", "rename_column"}
    clean = []
    for op in ops:
        if not isinstance(op, dict) or op.get("op") not in allowed:
            raise ValueError("Invalid op")
        kind = op["op"]
        if kind == "create_card":
            if not isinstance(op.get("column_id"), int) or not isinstance(
                op.get("title"), str
            ):
                raise ValueError("Invalid create_card op")
            if not op["title"].strip():
                raise ValueError("Invalid create_card op")
            details = op.get("details", "")
            if details is not None and not isinstance(details, str):
                raise ValueError("Invalid create_card op")
            clean.append(
                {
                    "op": kind,
                    "column_id": op["column_id"],
                    "title": op["title"],
                    "details": details or "",
                }
            )
        elif kind == "update_card":
            if not isinstance(op.get("card_id"), int):
                raise ValueError("Invalid update_card op")
            title = op.get("title")
            details = op.get("details")
            if title is not None and not isinstance(title, str):
                raise ValueError("Invalid update_card op")
            if details is not None and not isinstance(details, str):
                raise ValueError("Invalid update_card op")
            if title is None and details is None:
                raise ValueError("Invalid update_card op")
            clean.append(
                {"op": kind, "card_id": op["card_id"], "title": title, "details": details}
            )
        elif kind == "move_card":
            if (
                not isinstance(op.get("card_id"), int)
                or not isinstance(op.get("to_column_id"), int)
                or not isinstance(op.get("to_position"), int)
            ):
                raise ValueError("Invalid move_card op")
            clean.append(
                {
                    "op": kind,
                    "card_id": op["card_id"],
                    "to_column_id": op["to_column_id"],
                    "to_position": op["to_position"],
                }
            )
        elif kind == "delete_card":
            if not isinstance(op.get("card_id"), int):
                raise ValueError("Invalid delete_card op")
            clean.append({"op": kind, "card_id": op["card_id"]})
        elif kind == "rename_column":
            if not isinstance(op.get("column_id"), int) or not isinstance(
                op.get("title"), str
            ):
                raise ValueError("Invalid rename_column op")
            if not op["title"].strip():
                raise ValueError("Invalid rename_column op")
            clean.append(
                {"op": kind, "column_id": op["column_id"], "title": op["title"]}
            )
    return clean


def apply_patch(conn, ops):
    for op in ops:
        kind = op["op"]
        if kind == "create_card":
            col = conn.execute(
                "SELECT id FROM columns WHERE id=?", (op["column_id"],)
            ).fetchone()
            if col is None:
                raise ValueError("Column not found")
            position = conn.execute(
                "SELECT COUNT(*) FROM cards WHERE column_id=?", (op["column_id"],)
            ).fetchone()[0]
            conn.execute(
                "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
                (op["column_id"], op["title"], op["details"], position),
            )
        elif kind == "update_card":
            card = conn.execute(
                "SELECT * FROM cards WHERE id=?", (op["card_id"],)
            ).fetchone()
            if card is None:
                raise ValueError("Card not found")
            conn.execute(
                "UPDATE cards SET title=COALESCE(?, title), details=COALESCE(?, details) WHERE id=?",
                (op["title"], op["details"], op["card_id"]),
            )
        elif kind == "move_card":
            card = conn.execute(
                "SELECT * FROM cards WHERE id=?", (op["card_id"],)
            ).fetchone()
            if card is None:
                raise ValueError("Card not found")
            target = conn.execute(
                "SELECT id FROM columns WHERE id=?", (op["to_column_id"],)
            ).fetchone()
            if target is None:
                raise ValueError("Column not found")
            if card["column_id"] == op["to_column_id"]:
                ids = ordered_ids(conn, op["to_column_id"], exclude=op["card_id"])
            else:
                write_order(
                    conn,
                    card["column_id"],
                    ordered_ids(conn, card["column_id"], exclude=op["card_id"]),
                )
                ids = ordered_ids(conn, op["to_column_id"])
            pos = max(0, min(op["to_position"], len(ids)))
            ids.insert(pos, op["card_id"])
            write_order(conn, op["to_column_id"], ids)
        elif kind == "delete_card":
            card = conn.execute(
                "SELECT * FROM cards WHERE id=?", (op["card_id"],)
            ).fetchone()
            if card is None:
                raise ValueError("Card not found")
            conn.execute("DELETE FROM cards WHERE id=?", (op["card_id"],))
            write_order(conn, card["column_id"], ordered_ids(conn, card["column_id"]))
        elif kind == "rename_column":
            cur = conn.execute(
                "UPDATE columns SET title=? WHERE id=?", (op["title"], op["column_id"])
            )
            if cur.rowcount == 0:
                raise ValueError("Column not found")


@app.post("/api/ai/chat")
def ai_chat(body: ChatRequest):
    with db.get_conn(db.DB_PATH) as conn:
        board = read_board(conn)
    try:
        data = call_ai_chat(
            board, body.message, [h.model_dump() for h in body.history]
        )
    except HTTPException:
        raise
    except AuthenticationError as e:
        logger.warning("AI provider auth failed: %s", e)
        raise HTTPException(401, "AI auth failed")
    except RateLimitError as e:
        logger.warning("AI provider rate limited: %s", e)
        raise HTTPException(429, "AI rate limited")
    except APIStatusError as e:
        logger.warning("AI provider API error %s: %s", e.status_code, e)
        raise HTTPException(e.status_code, "AI request failed")
    except json.JSONDecodeError:
        logger.warning("AI provider returned invalid JSON")
        raise HTTPException(502, "AI request failed")
    except Exception as e:
        logger.warning("AI provider request failed: %s", type(e).__name__)
        raise HTTPException(502, "AI request failed")
    if not isinstance(data, dict) or not isinstance(data.get("reply"), str):
        raise HTTPException(422, "Invalid AI response schema")
    patch = data.get("board_patch")
    ops = []
    if patch is not None:
        if not isinstance(patch, dict) or not isinstance(patch.get("ops"), list):
            raise HTTPException(422, "Invalid AI response schema")
        try:
            ops = validate_ops(patch["ops"])
        except ValueError as e:
            raise HTTPException(422, str(e))
    applied = False
    if ops:
        try:
            with db.get_conn(db.DB_PATH) as conn:
                apply_patch(conn, ops)
        except ValueError as e:
            raise HTTPException(422, str(e))
        applied = True
    with db.get_conn(db.DB_PATH) as conn:
        fresh = read_board(conn)
    return {"reply": data["reply"], "board": fresh, "applied": applied}


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
