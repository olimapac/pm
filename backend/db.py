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
  title TEXT NOT NULL DEFAULT 'Meu quadro'
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

SEED_COLUMNS = ["Backlog", "Descoberta", "Em andamento", "Revisão", "Concluído"]

SEED_CARDS = [
    (0, "Alinhar temas do roadmap", "Rascunhar temas trimestrais com impacto esperado e métricas."),
    (0, "Coletar sinais de clientes", "Revisar tags de suporte, notas de vendas e feedback de churn."),
    (1, "Prototipar visão de analytics", "Esboçar o layout inicial do dashboard e os principais detalhamentos."),
    (2, "Refinar linguagem de status", "Padronizar rótulos das colunas e o tom em todo o quadro."),
    (2, "Desenhar layout do cartão", "Hierarquia e espaçamento para leitura rápida de listas densas."),
    (3, "QA de micro-interações", "Verificar estados de hover, foco e carregamento."),
    (4, "Publicar página de marketing", "Texto final aprovado e pacote de assets entregue."),
    (4, "Fechar sprint de onboarding", "Documentar as notas de versão e compartilhar internamente."),
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
                (user_id, "Meu quadro"),
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
