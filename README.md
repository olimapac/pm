# PM MVP

Kanban board (Next.js + FastAPI) with AI chat sidebar (OpenRouter). Single Docker container, SQLite, fake login (`user` / `password`).

## Run

Create `.env` in the project root:

```bash
OPENROUTER_API_KEY=sk-or-...
```

```bash
./scripts/start.sh   # or scripts/start.ps1 on Windows
```

Open http://127.0.0.1:8000. Stop with `./scripts/stop.sh` (or `stop.ps1`).

## Tests

```bash
<venv-python> -m pytest backend/tests  # from repo root (see backend/AGENTS.md)
```

```bash
cd frontend && npm run test:unit && npm run test:e2e  # e2e needs the backend on 127.0.0.1:8001
```
