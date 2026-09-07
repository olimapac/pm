# Frontend - Kanban Studio

Next.js 16 + React 19 + Tailwind CSS 4. Pure frontend demo, no backend, no auth, no AI yet.

## Structure

- `src/app/page.tsx` - renders `<AuthGate />`
- `src/components/AuthGate.tsx` - `authed` state; login form or (logout button + board)
- `src/app/layout.tsx` - fonts (Space_Grotesk display, Manrope body), metadata "Kanban Studio"
- `src/app/globals.css` - Tailwind import + CSS vars for palette (accent-yellow, primary-blue, secondary-purple, navy-dark, gray-text)
- `src/lib/kanban.ts` - types `Card {id, title, details}`, `Column {id, title, cardIds}`, `BoardData {columns, cards}`; `initialData` with 5 columns (Backlog, Discovery, In Progress, Review, Done) and 8 cards; pure helpers `moveCard(columns, activeId, overId)`, `createId(prefix)`
- `src/components/KanbanBoard.tsx` - `useState<BoardData>(initialData)`, DndContext with PointerSensor + closestCorners + DragOverlay, handlers `handleRenameColumn`, `handleAddCard`, `handleDeleteCard`
- `src/components/KanbanColumn.tsx` - droppable section, rename via input, SortableContext list, empty-state "Drop a card here", embeds `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable article with title, details, Remove button
- `src/components/KanbanCardPreview.tsx` - drag overlay preview (no delete)
- `src/components/NewCardForm.tsx` - collapsed "Add a card" button, expands to title + details form

## State

All state is in-memory `useState` (`AuthGate.authed`, board in `KanbanBoard`). No persistence, no fetch, no editing of existing cards (only add/delete, rename columns, drag-drop).

## Auth (fake, frontend-only)

- `src/lib/auth.ts` - `DEMO_USERNAME`/`DEMO_PASSWORD` (`user`/`password`), `checkCredentials`
- `src/components/LoginForm.tsx` - username/password form, inline error on failure

## Tests

- Unit: `vitest run` (jsdom + RTL), files `src/lib/kanban.test.ts`, `src/components/KanbanBoard.test.tsx`, config `vitest.config.ts`, setup `src/test/setup.ts`
- E2E: `playwright test` (chromium only), `tests/kanban.spec.ts` against `npm run dev` on port 3000, covers load (5 columns), add card, drag between columns
- `data-testid`: `column-<id>`, `card-<id>`
