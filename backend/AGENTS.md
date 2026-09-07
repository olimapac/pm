Backend: FastAPI (managed with uv, see pyproject.toml + uv.lock).

- `main.py` - app with `GET /api/hello`, Kanban routes (`GET /api/board`, `PATCH /api/columns/{id}`, `POST|PATCH|DELETE /api/cards...`, `POST /api/cards/move`), `POST /api/ai/test` (Zen `muse-spark-1.3-contributor-free` via `openai` client, key from `OPENCODE_API_KEY`) and static files from `static/` served at `/`
- `db.py` - sqlite3 helpers (`DB_PATH=backend/app.db`, `init_db` with seed, closing `get_conn`)
- `static/` - built frontend (`next build` output) served at `/`
- `tests/` - pytest suite, run from repo root: `<venv> -m pytest backend/tests`