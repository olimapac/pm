# Database approach

SQLite file at `backend/app.db`, via stdlib `sqlite3` (no ORM).

- Created with full schema + seed on backend startup when the file does not exist
- `PRAGMA foreign_keys=ON`; rows read as dicts
- Seed: user `user`, 1 board, 5 fixed columns, 8 sample cards (mirrors frontend `initialData`)
- Ordering by integer `position` per column; API reindexes on move
- `UNIQUE(boards.user_id)` enforces 1 board per user (MVP); `users` table already supports multiple users for post-MVP
- Auth stays frontend-only in the MVP; `password_hash` is reserved, unused
