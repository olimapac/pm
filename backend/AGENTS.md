Backend: FastAPI (managed with uv, see pyproject.toml + uv.lock).

- `main.py` - app with `GET /api/hello`, Kanban routes (`GET /api/board`, `PATCH /api/columns/{id}`, `POST|PATCH|DELETE /api/cards...`, `POST /api/cards/move`), `POST /api/ai/test` (OpenRouter `openai/gpt-4o-mini` via `openai` client, key from `OPENROUTER_API_KEY`), `POST /api/ai/chat` (board-aware: `call_ai_chat` + server-side `validate_ops`/`apply_patch`, returns `{reply, board, applied}`) and static files from `static/` served at `/`
- `db.py` - sqlite3 helpers (`DB_PATH=backend/app.db`, `init_db` with seed, closing `get_conn`)
- `static/` - built frontend (`next build` output) served at `/`
- `tests/` - pytest suite, run from repo root: `<venv> -m pytest backend/tests`