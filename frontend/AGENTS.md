# Frontend - Kanban Studio

Next.js 16 + React 19 + Tailwind CSS 4. Kanban board persisted via the backend API, frontend-only auth gate, AI chat sidebar driving board edits via `POST /api/ai/chat`.

## Structure

- `src/app/page.tsx` - renders `<AuthGate />`
- `src/components/AuthGate.tsx` - `authed` state; login form or (logout button + board + AI panel side by side, `boardRefresh` counter)
- `src/components/AiPanel.tsx` - right side split: `AiSidebar` chat on top, `AiTraceTerminal` IDE-style LLM trace below; owns trace blocks, reports trace start/end from chat calls
- `src/components/AiSidebar.tsx` - chat history, input, loading/error states; `sendChat` per message, calls `onApplied` when `applied=true` so the board refetches; reports `onTraceStart`/`onTraceEnd` (client round-trip ms + server `meta`) per call
- `src/components/AiTraceTerminal.tsx` - dark mono terminal (`ai-trace`): one block per LLM call with server trace steps, wait highlight on `[llm]`, final OK line with server/client time + input/output/total tokens, error blocks, Clear button
- `src/app/layout.tsx` - fonts (Space_Grotesk display, Manrope body), metadata "Kanban Studio"
- `src/app/globals.css` - Tailwind import + CSS vars for palette (accent-yellow, primary-blue, secondary-purple, navy-dark, gray-text)
- `src/lib/kanban.ts` - types `Card {id, title, details}`, `Column {id, title, cardIds}`, `BoardData {columns, cards}`; `initialData` with 5 columns (Backlog, Discovery, In Progress, Review, Done) and 8 cards; pure helpers `moveCard(columns, activeId, overId)`, `createId(prefix)`
- `src/lib/api.ts` - typed `/api/*` client; backend int ids mapped to strings at the boundary; `sendChat` returns `{reply, applied, meta?}` (`ChatMeta`: model, duration_ms, usage, trace, prompt {instructions, board_json, input})
- `src/components/KanbanBoard.tsx` - loads board from API (`useEffect` on `refreshSignal`), loading/error+retry states, mutations refetch (rename debounced 400ms), drag-drop persists via move endpoint
- `src/components/KanbanColumn.tsx` - droppable section, rename via input, SortableContext list, empty-state "Drop a card here", embeds `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable article with title, details, Remove button
- `src/components/KanbanCardPreview.tsx` - drag overlay preview (no delete)
- `src/components/NewCardForm.tsx` - collapsed "Add a card" button, expands to title + details form

## State

Board and auth live in React state, persisted via the backend API (`AuthGate.authed` stays local). Chat history lives in `AiSidebar` state; board edits via AI go through `POST /api/ai/chat` + refetch.

## Auth (fake, frontend-only)

- `src/lib/auth.ts` - `DEMO_USERNAME`/`DEMO_PASSWORD` (`user`/`password`), `checkCredentials`
- `src/components/LoginForm.tsx` - username/password form, inline error on failure

## Tests

- Unit: `vitest run` (jsdom + RTL), files `src/lib/kanban.test.ts`, `src/lib/auth.test.ts`, `src/lib/api.test.ts`, `src/components/KanbanBoard.test.tsx`, `src/components/AuthGate.test.tsx`, `src/components/AiSidebar.test.tsx`, `src/components/AiPanel.test.tsx`, `src/components/AiTraceTerminal.test.tsx`, config `vitest.config.ts`, setup `src/test/setup.ts`
- E2E: `playwright test` (chromium only), `tests/kanban.spec.ts` (drag test first on seed geometry + 1920 viewport) and `tests/ai-chat.spec.ts` (real LLM via local backend) against dev server + local backend (dev `/api` rewrites to `127.0.0.1:8001`), covers auth, load, add, persist-across-reload, drag between columns, AI chat create
- `data-testid`: `column-<id>`, `card-<id>`, `ai-sidebar`, `ai-input`, `ai-send`, `ai-loading`, `ai-error`, `ai-trace`, `ai-trace-block`, `ai-trace-running`, `ai-trace-clear`

## Local notes

- E2E needs the backend running locally on `127.0.0.1:8001` (dev `/api` rewrites there); the suite shares that dev database, so reseed by deleting `backend/app.db` for a clean run
- If the repo path contains `&`, `npm run` breaks on Windows (cmd splits the command); invoke binaries directly instead, e.g. `node node_modules/vitest/vitest.mjs run`
