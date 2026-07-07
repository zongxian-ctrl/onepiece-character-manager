# CLAUDE.md

Guidance for Claude Code (and future sessions) working in this repository.

## What this is

A CRUD web app for managing One Piece characters, persisted in SQLite. The UI
is themed as a Marine "Bounty Registry" — character cards are rendered as
weathered WANTED posters. Built as a learning project.

## Architecture

Two independent packages:

- **`server/`** — Express REST API over SQLite (`better-sqlite3`).
- **`client/`** — React + Vite single-page app. In dev, Vite proxies `/api` to
  the backend (see `client/vite.config.js`), so there is no CORS setup.

Ports: backend **3001**, Vite dev server **5173**.

### Backend design (dependency injection)

The database is injected, not imported as a singleton. This is what makes the
API testable against an in-memory DB:

- `db.js` exports `createDb(path)` — opens the connection, creates the schema,
  and seeds the Straw Hats **only if the table is empty**. Pass a file path in
  production (`index.js`) or `':memory:'` in tests.
- `app.js` exports `createApp(db)` — builds the Express app from an injected
  `db`. It does **not** call `listen`.
- `routes/characters.js` exports `charactersRouter(db)` — the CRUD handlers.
- `index.js` is the only file that opens the real DB file and calls
  `app.listen`. Keep `listen` out of `app.js`.
- `validate.js` exports `validateCharacter(body) -> { valid, errors, value }` —
  pure, no DB or HTTP. Reused by POST and PUT.

### Conventions

- **PUT is a full replace**, not a partial update — the client form always
  submits the complete field set. Do not switch to COALESCE/partial semantics.
- **`bounty`** must be a non-negative *safe* integer (`Number.isSafeInteger`);
  One Piece bounties reach the billions, which is well within safe-integer range.
- **Errors are always JSON.** `app.js` has a trailing error-handling middleware
  so malformed JSON bodies and unexpected throws return JSON, never an HTML
  stack trace. Preserve this if you add routes.
- Frontend class names in components must match `client/src/styles.css`. The
  poster styling (WANTED banner, DEAD OR ALIVE, tape) is done with CSS
  pseudo-elements on `.card` / `.card-bounty`, so the JSX stays minimal — don't
  add those as text nodes.
- The visual design follows the `frontend-design` skill installed at
  `.claude/skills/frontend-design/`. If you reshape the UI, use it.

## Commands

```bash
# Backend
cd server && npm install      # install (fetches better-sqlite3 prebuilt binary)
cd server && npm start        # run API on :3001 (creates/seeds characters.db)
cd server && npm test         # jest + supertest, in-memory DB

# Frontend
cd client && npm install
cd client && npm run dev      # Vite dev server on :5173 (proxies /api)
cd client && npm run build    # production build (catches import/syntax errors)
```

## Testing approach

- Backend is test-driven: `server/tests/` uses jest + supertest against
  `createDb(':memory:')`, so each test gets a fresh seeded DB with no shared
  state. Add tests here when you touch routes or validation.
- There are no frontend unit tests; verify UI changes by running both servers
  and exercising the app in a browser.

## Gotchas

- **`better-sqlite3` is a native module.** On common platforms `npm install`
  downloads a prebuilt binary. If none exists for the platform/Node version, it
  compiles from source and needs C/C++ build tools.
- **WAL sidecars.** The DB uses WAL mode, so running the server produces
  `characters.db`, `characters.db-wal`, and `characters.db-shm`. All are
  gitignored (`server/*.db` and `server/*.db-*`). Don't commit them.
- **Search debounce.** The search box reloads 250ms after the last keystroke
  (`App.jsx`). This is expected; automated tools that set the input value
  directly may not trigger React's onChange — type character-by-character.

## Seed data & character images

- `server/seed.js` holds ~36 notable characters and is **generated** by
  `scripts/build-seed.mjs` — edit the curated list in that script, not the seed
  file. The script fetches each character's portrait from the Jikan
  (MyAnimeList) API and downloads it into `client/public/characters/<slug>.jpg`;
  `image_url` in the seed points at that local path (served by the client, so
  the app works offline). Character metadata (bounty, crew, Devil Fruit, etc.)
  is curated in the script for accuracy, not fetched.
- Regenerate: `node scripts/build-seed.mjs`. To re-seed the running app after
  regenerating, stop the backend, delete `server/characters.db*`, and restart
  (seeding only runs on an empty table).
- The downloaded images under `client/public/characters/` are committed as app
  assets (not gitignored).

## Docs

- Design spec: `docs/superpowers/specs/2026-07-07-onepiece-crud-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-07-onepiece-crud.md`
