Backend: FastAPI (managed with uv, see pyproject.toml + uv.lock).

- `main.py` - app with `GET /api/hello` and static files from `static/` served at `/`
- `static/` - built frontend (`next build` output) served at `/`
- `tests/` - pytest suite, run from repo root: `<venv> -m pytest backend/tests`