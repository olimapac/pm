import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NULL
);
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  title TEXT NOT NULL DEFAULT 'My Board'
);
CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES boards(id),
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(board_id, position)
);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id INTEGER NOT NULL REFERENCES columns(id),
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, position);
"""

SEED_COLUMNS = ["Backlog", "Discovery", "In Progress", "Review", "Done"]

SEED_CARDS = [
    (0, "Align roadmap themes", "Draft quarterly themes with impact statements and metrics."),
    (0, "Gather customer signals", "Review support tags, sales notes, and churn feedback."),
    (1, "Prototype analytics view", "Sketch initial dashboard layout and key drill-downs."),
    (2, "Refine status language", "Standardize column labels and tone across the board."),
    (2, "Design card layout", "Add hierarchy and spacing for scanning dense lists."),
    (3, "QA micro-interactions", "Verify hover, focus, and loading states."),
    (4, "Ship marketing page", "Final copy approved and asset pack delivered."),
    (4, "Close onboarding sprint", "Document release notes and share internally."),
]


@contextmanager
def get_conn(path=DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(path=DB_PATH):
    fresh = not Path(path).exists()
    with get_conn(path) as conn:
        conn.executescript(SCHEMA)
        if fresh:
            user_id = conn.execute(
                "INSERT INTO users (username) VALUES (?)", ("user",)
            ).lastrowid
            board_id = conn.execute(
                "INSERT INTO boards (user_id, title) VALUES (?, ?)",
                (user_id, "My Board"),
            ).lastrowid
            column_ids = [
                conn.execute(
                    "INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)",
                    (board_id, title, pos),
                ).lastrowid
                for pos, title in enumerate(SEED_COLUMNS)
            ]
            counters = {}
            for col_idx, title, details in SEED_CARDS:
                pos = counters.get(col_idx, 0)
                conn.execute(
                    "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
                    (column_ids[col_idx], title, details, pos),
                )
                counters[col_idx] = pos + 1
