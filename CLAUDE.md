# CLAUDE.md

Guidance for Claude Code (and future sessions) working in this repository.

## What this is

A CRUD web app for managing One Piece characters, persisted in SQLite. The UI
is themed as a Marine "Bounty Registry" — character cards are rendered as
weathered WANTED posters. On top of the CRUD registry sits a **battle game**:
the user is a bounty hunter with a health bar, attack/defense stats, and a
berry wallet; they attack characters (who hit back), collect bounties on
capture, and spend them in a Trading Post shop (potions, stat training,
weapon/armor tiers). Built as a learning project.

## Architecture

Two independent packages:

- **`server/`** — Express REST API over SQLite (`better-sqlite3`).
- **`client/`** — React + Vite single-page app. In dev, Vite proxies `/api` to
  the backend (see `client/vite.config.js`), so there is no CORS setup.

Ports: backend **3001**, Vite dev server **5173**.

### Static (GitHub Pages) mode

The live demo (https://zongxian-ctrl.github.io/onepiece-character-manager/) is
a **backend-less build** deployed by `.github/workflows/deploy-pages.yml` on
every push to `main`. How it works:

- `client/src/api.js` holds two implementations behind one interface: `remote`
  (fetch against `/api`) and `local` (a `localStorage` store seeded from the
  bundled `client/src/seed-data.json`). Building with `VITE_STATIC=1` selects
  `local`; otherwise `remote`. **Any new API operation must be added to both**,
  and `App.jsx` must stay unaware of which one is active.
- The workflow also sets `VITE_BASE=/<repo>/` because Pages serves from a
  subpath (`vite.config.js` uses it as `base`, defaulting to `/` locally).
  Root-relative asset paths stored in data (e.g. `image_url: "/characters/…"`)
  don't get rewritten by Vite, so they are prefixed with
  `import.meta.env.BASE_URL` at render time (`CharacterCard.jsx`). Do the same
  for any new root-relative asset reference, or it will 404 on Pages.

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
- `game.js` exports the battle/shop logic (`rollStats`, `resolveAttack`,
  `shopCatalog`, `applyPurchase`, `PLAYER_DEFAULTS`) — pure functions; anything
  that rolls dice takes an injectable `rng` so tests are deterministic.
- `routes/game.js` exports `gameRouter(db)`, mounted at `/api`:
  `GET /api/player`, `GET /api/shop`, `POST /api/shop/:item`,
  `POST /api/battle/:id` (one attack round), `POST /api/battle/reset`.

### Battle system

- Characters carry `max_hp, hp, attack, defense` columns. Stats are rolled at
  creation/seed time by `rollStats(bounty)` — random, but log-scaled by bounty
  so big names are stronger. `db.js` migrates older DBs in place (ALTER TABLE +
  backfill), so an existing `characters.db` keeps working.
- The singleton `player` table (id = 1) holds hp, stats, wallet, and upgrade
  levels; `db.js` inserts the default row when missing.
- One attack round: player strikes; if the target survives, it counterattacks.
  Capture (hp 0) pays the character's bounty into the wallet, once — captured
  targets return 400 on further attacks. Player death revives at full HP and
  costs 10% of the wallet in "medical fees". `POST /api/battle/reset` restores
  every character to full HP so bounties can be farmed again.
- **`client/src/game.js` is an ESM mirror of `server/game.js`** so the static
  (Pages) build can run the whole game in localStorage. If you change balance
  numbers or formulas in one, change the other.
- CRUD is unaffected: PUT still replaces only the form fields, so battle state
  (current hp, rolled stats) survives edits.

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
cd server && npx jest tests/characters.test.js        # one test file
cd server && npx jest -t "rejects missing name"      # one test by name

# Frontend
cd client && npm install
cd client && npm run dev      # Vite dev server on :5173 (proxies /api)
cd client && npm run build    # production build (catches import/syntax errors)
# Static (Pages) build, as CI does it: VITE_STATIC=1 npm run build
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

- `scripts/build-seed.mjs` **generates two files** from its curated list of
  ~36 characters: `server/seed.js` (backend seed) and
  `client/src/seed-data.json` (seed for the static/Pages build). Edit the
  curated list in the script, never the generated files, and keep both in sync
  by regenerating. The script fetches each character's portrait from the Jikan
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
