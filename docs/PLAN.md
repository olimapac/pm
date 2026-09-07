# High level steps for project

## Locked decisions

- AI: OpenAI-compatible `POST https://openrouter.ai/api/v1/responses` with `model=openai/gpt-4o-mini`, `Authorization: Bearer $OPENROUTER_API_KEY` (key in `.env` project root, gitignored). No `reasoning` param (rejected for non-reasoning models), no `text.format=json_schema`; system prompt demands a single JSON object with an explicit flat-op example, schema enforced server-side in `validate_ops`. (History: OpenCode Zen `muse-spark` was dropped after live probes proved constrained decoding degenerates it, then its free tier blocked server-side calls.)
- DB: plain local file `backend/app.db` via stdlib `sqlite3`, created + seeded if missing. No volume, no `.env.example`
- Auth MVP: frontend-only gate (`user` / `password` in React state). Backend Kanban API stays open
- Docker: single container, multi-stage (Node builds frontend, Python + uv + FastAPI serves static at `/`), port 8000
- Tests: target ~80% coverage with useful, valuable tests only. Never add tests just to hit the number; missing 80% is fine
- Frontend: see `frontend/AGENTS.md` (Kanban via backend API, frontend-only auth gate, 5 columns, 8 seeded cards)

## Part 1: Plan - [x]

- [x] Enrich this document with checklists, tests and success criteria per part
- [x] Create `frontend/AGENTS.md` describing the existing code
- [x] Update root `AGENTS.md` to OpenCode Zen model + fix SQLite typo
- [x] Get user approval of the plan
- Tests: this file lists all 10 parts with steps and criteria; `frontend/AGENTS.md` matches `frontend/src`
- Success criteria: user approves plan in chat

## Part 2: Scaffolding - [x]

- [x] `backend/` FastAPI app (uv managed): `GET /api/hello` returns `{"ok": true}`, serves `backend/static/` at `/`
- [x] `Dockerfile` + `docker-compose.yml` (port 8000); image builds, container serves `/` 200 + `/api/hello` 200
- [x] `scripts/start.sh`, `scripts/stop.sh` (Mac/Linux) + `scripts/start.ps1`, `scripts/stop.ps1` (PC); ps1 tested end-to-end (down removes, up serves)
- Tests: `pytest backend/tests/test_hello.py` 2/2 passing; live checks local + in Docker
- Success criteria: hello world works locally, in Docker, and via scripts

## Part 3: Add in Frontend - [x]

- [x] Build frontend (`next build` with `output: export`) and copy static output into `backend/static/`; Dockerfile multi-stage (node build + python serve) rebuilds it in-image
- [x] `/` displays the demo Kanban board with no console errors
- Tests: `npm run test:unit` 6/6 vitest passing, `npm run test:e2e` 3/3 playwright passing; `GET /` in Docker returns 200 with Kanban markup
- Success criteria: same Kanban demo as before, served by FastAPI in Docker

## Part 4: Add in a fake user sign in experience - [x]

- [x] Login screen at `/` when logged out (`LoginForm`); `user` / `password` unlocks board (`AuthGate`); logout button returns to login
- [x] Gate lives only in React state (no backend change)
- Tests: vitest `auth.test.ts` + `AuthGate.test.tsx` (wrong blocked, correct unlocks, logout relocks); playwright login/logout flow + all board tests via login helper
- Success criteria: login/logout with `user` / `password` works locally and in Docker (verified end-to-end in container)

## Part 5: Database modeling - [x]

- [x] Propose schema JSON: `users(id, username)`, `boards(id, user_id, title)`, `columns(id, board_id, title, position)`, `cards(id, column_id, title, details, position)`; 1 board per user for MVP, fixed columns renamable
- [x] Save as `docs/schema.json` and document approach in `docs/DATABASE.md`
- [x] Get user sign off before coding backend
- Tests: user review only, no code yet
- Success criteria: explicit user approval of schema

## Part 6: Backend - [x]

- [x] Create `backend/app.db` with seed (1 user, 1 board, 5 columns, sample cards) when file does not exist
- [x] Routes: `GET /api/board`, `PATCH /api/columns/{id}`, `POST /api/cards`, `PATCH /api/cards/{id}`, `DELETE /api/cards/{id}`, `POST /api/cards/move`
- Tests: `pytest backend/tests/test_board.py` covers seed, CRUD, move, 404s (8 backend tests green)
- Success criteria: API reads/writes persist across process restarts (verified); serves seeded board in Docker

## Part 7: Frontend + Backend - [x]

- [x] `frontend/src/lib/api.ts` fetching `/api/*` (string ids mapped at the boundary); `KanbanBoard` loads/saves via API, rename debounced 400ms
- [x] Loading/error states with retry
- Tests: vitest `api.test.ts` + `KanbanBoard.test.tsx` with mocked fetch (15/15); playwright against real backend incl. persist-across-reload (6/6); dev `/api` proxied to local backend via rewrites
- Success criteria: refresh keeps changes; drag-drop persists via move endpoint (verified local + Docker)

## Part 8: AI connectivity - [x]

- [x] Backend `POST /api/ai/test` sends "2+2?" to OpenRouter `/responses` with `openai/gpt-4o-mini` using `OPENROUTER_API_KEY` from `.env`
- [x] Use `openai>=1.0` python client with `base_url=https://openrouter.ai/api/v1`
- Tests: `pytest backend/tests/test_ai_zen.py` asserts answer contains 4; 401/429 logged without leaking key
- Success criteria: 2+2 test passes locally and in Docker

## Part 9: Board-aware AI with Structured Outputs - [x]

- [x] Backend `POST /api/ai/chat {message, history}` sends system prompt + current board JSON + history with plain "respond with ONLY JSON" instruction (no `reasoning`, no `text.format=json_schema`; ops: create/update/move/delete card, rename column)
- [x] Validate ops server-side (`validate_ops`/`apply_patch` in one transaction), apply patch when present, return `{reply, board, applied}`
- Tests: `pytest backend/tests/test_ai_chat.py` with board fixture (create 2 cards, move 1, edit 1, delete+rename, no-op reply, invalid + malformed rejected with DB unchanged, strip_fences unit)
- Success criteria: all patch scenarios pass; no-patch input returns reply only; live create + no-op verified locally and in Docker

## Part 10: AI sidebar widget - [x]

- [x] Add `AiSidebar` component: history, input, loading state; refetch board automatically when `applied=true` (`refreshSignal` prop on `KanbanBoard`)
- [x] Keep palette from root `AGENTS.md`
- Tests: vitest render/send/loading/error/auto-refresh (`AiSidebar.test.tsx`, `AuthGate` refetch test, `sendChat` client test, 22/22); playwright e2e AI chat skipped (Zen free tier refuses server-side calls, see Locked decisions); kanban e2e 6/6 (drag test runs first on seed geometry + 1920 viewport, see note)
- Success criteria: chat creates/edits/moves 1+ cards (live LLM verified in Part 9; mocked e2e-equivalent in vitest) and UI updates automatically on `applied` (verified)
- Notes: coordinate drag e2e proved sensitive to board geometry/scroll under synthetic pointer events (verified green against the prod build served by FastAPI); AI provider migrated to OpenRouter after Zen blocked server-side use (Part 9 live probes re-verified clean on `gpt-4o-mini`)
