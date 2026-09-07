# Frontend - Kanban Studio

Next.js 16 + React 19 + Tailwind CSS 4. Kanban board persisted via the backend API, frontend-only auth gate, no AI yet.

## Structure

- `src/app/page.tsx` - renders `<AuthGate />`
- `src/components/AuthGate.tsx` - `authed` state; login form or (logout button + board)
- `src/app/layout.tsx` - fonts (Space_Grotesk display, Manrope body), metadata "Kanban Studio"
- `src/app/globals.css` - Tailwind import + CSS vars for palette (accent-yellow, primary-blue, secondary-purple, navy-dark, gray-text)
- `src/lib/kanban.ts` - types `Card {id, title, details}`, `Column {id, title, cardIds}`, `BoardData {columns, cards}`; `initialData` with 5 columns (Backlog, Discovery, In Progress, Review, Done) and 8 cards; pure helpers `moveCard(columns, activeId, overId)`, `createId(prefix)`
- `src/lib/api.ts` - typed `/api/*` client; backend int ids mapped to strings at the boundary
- `src/components/KanbanBoard.tsx` - loads board from API (`useEffect`), loading/error+retry states, mutations refetch (rename debounced 400ms), drag-drop persists via move endpoint
- `src/components/KanbanColumn.tsx` - droppable section, rename via input, SortableContext list, empty-state "Drop a card here", embeds `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable article with title, details, Remove button
- `src/components/KanbanCardPreview.tsx` - drag overlay preview (no delete)
- `src/components/NewCardForm.tsx` - collapsed "Add a card" button, expands to title + details form

## State

Board and auth live in React state, persisted via the backend API (`AuthGate.authed` stays local). No card editing UI yet (only add/delete, rename columns, drag-drop).

## Auth (fake, frontend-only)

- `src/lib/auth.ts` - `DEMO_USERNAME`/`DEMO_PASSWORD` (`user`/`password`), `checkCredentials`
- `src/components/LoginForm.tsx` - username/password form, inline error on failure

## Tests

- Unit: `vitest run` (jsdom + RTL), files `src/lib/kanban.test.ts`, `src/lib/auth.test.ts`, `src/lib/api.test.ts`, `src/components/KanbanBoard.test.tsx`, `src/components/AuthGate.test.tsx`, config `vitest.config.ts`, setup `src/test/setup.ts`
- E2E: `playwright test` (chromium only), `tests/kanban.spec.ts` against dev server + local backend (dev `/api` rewrites to `127.0.0.1:8001`), covers auth, load, add, persist-across-reload, drag between columns
- `data-testid`: `column-<id>`, `card-<id>`
