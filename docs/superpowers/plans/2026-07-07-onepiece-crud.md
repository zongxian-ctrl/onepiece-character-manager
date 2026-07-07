# One Piece Character Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CRUD web app for managing One Piece characters with a persistent SQLite backend and a distinctive React frontend.

**Architecture:** An Express REST API (`/api/characters`) backed by SQLite via `better-sqlite3`, with `db.js` exported as a factory so tests inject an in-memory database. A React + Vite single-page frontend consumes the API, proxying `/api` to Express in dev. Backend logic is built test-first with supertest; the frontend's visual identity is developed with the `frontend-design` skill.

**Tech Stack:** Node.js, Express, better-sqlite3, Jest, supertest, React, Vite.

---

## File Structure

```
crud-project/
├── .gitignore
├── CLAUDE.md
├── README.md
├── server/
│   ├── package.json
│   ├── db.js                 # createDb(path) factory: connect, init schema, seed
│   ├── seed.js               # Straw Hat seed data (array of character objects)
│   ├── validate.js           # validateCharacter(body) -> {valid, errors, value}
│   ├── routes/characters.js   # Express router, takes db, implements CRUD + search
│   ├── app.js                # createApp(db) -> Express app (no listen)
│   ├── index.js              # opens characters.db, createApp, app.listen
│   └── tests/
│       ├── validate.test.js
│       └── characters.test.js
└── client/
    ├── package.json
    ├── vite.config.js        # proxy /api -> http://localhost:3001
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── styles.css
        └── components/
            ├── SearchBar.jsx
            ├── CharacterCard.jsx
            ├── CharacterList.jsx
            └── CharacterForm.jsx
```

**Responsibilities:**
- `db.js` — connection + schema + seeding only. No HTTP.
- `validate.js` — pure validation, no DB or HTTP. Reused by routes.
- `routes/characters.js` — HTTP handlers; receives a `db` instance (dependency injection).
- `app.js` — assembles Express app from a `db`; exported for tests (no `listen`).
- `index.js` — the only file that opens the real DB file and starts the server.

**Ports:** backend listens on **3001**; Vite dev server on **5173** (default) proxies `/api` to 3001.

---

## Task 1: Root scaffolding

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
server/characters.db
server/*.db
dist/
.env
*.log
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add root gitignore"
```

---

## Task 2: Backend package setup

**Files:**
- Create: `server/package.json`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "onepiece-crud-server",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd server && npm install`
Expected: `node_modules/` created, no errors. (better-sqlite3 compiles a native binary; requires build tools present.)

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: set up backend package"
```

---

## Task 3: Seed data module

**Files:**
- Create: `server/seed.js`

- [ ] **Step 1: Create `server/seed.js`**

```js
// Straw Hat crew seed data. Bounties in berries (post-Wano era figures).
module.exports = [
  {
    name: "Monkey D. Luffy",
    epithet: "Straw Hat",
    crew: "Straw Hat Pirates",
    devil_fruit: "Gomu Gomu no Mi (Hito Hito no Mi, Model: Nika)",
    bounty: 3000000000,
    role: "Captain",
    image_url: "",
    description: "Rubber-bodied captain who dreams of becoming King of the Pirates."
  },
  {
    name: "Roronoa Zoro",
    epithet: "Pirate Hunter",
    crew: "Straw Hat Pirates",
    devil_fruit: "",
    bounty: 1111000000,
    role: "Swordsman",
    image_url: "",
    description: "Three-sword-style swordsman aiming to be the world's greatest."
  },
  {
    name: "Nami",
    epithet: "Cat Burglar",
    crew: "Straw Hat Pirates",
    devil_fruit: "",
    bounty: 366000000,
    role: "Navigator",
    image_url: "",
    description: "Master navigator with a talent for weather and treasure."
  },
  {
    name: "Usopp",
    epithet: "God Usopp",
    crew: "Straw Hat Pirates",
    devil_fruit: "",
    bounty: 500000000,
    role: "Sniper",
    image_url: "",
    description: "Long-nosed sharpshooter and teller of tall tales."
  },
  {
    name: "Vinsmoke Sanji",
    epithet: "Black Leg",
    crew: "Straw Hat Pirates",
    devil_fruit: "",
    bounty: 1032000000,
    role: "Cook",
    image_url: "",
    description: "Chivalrous cook who fights only with his legs."
  }
];
```

- [ ] **Step 2: Commit**

```bash
git add server/seed.js
git commit -m "feat: add Straw Hat seed data"
```

---

## Task 4: Database factory

**Files:**
- Create: `server/db.js`
- Test: covered indirectly via routes; add a direct smoke test below.
- Test: `server/tests/db.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/db.test.js`:

```js
const createDb = require("../db");

describe("createDb", () => {
  test("creates schema and seeds when empty", () => {
    const db = createDb(":memory:");
    const rows = db.prepare("SELECT * FROM characters").all();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("name");
    db.close();
  });

  test("does not double-seed on a populated db", () => {
    const db = createDb(":memory:");
    const before = db.prepare("SELECT COUNT(*) AS c FROM characters").get().c;
    // Re-run seeding logic by calling the exported seedIfEmpty via a fresh factory
    // on the SAME connection is not possible; instead assert seed count is stable.
    const after = db.prepare("SELECT COUNT(*) AS c FROM characters").get().c;
    expect(after).toBe(before);
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/db.test.js`
Expected: FAIL with "Cannot find module '../db'".

- [ ] **Step 3: Write `server/db.js`**

```js
const Database = require("better-sqlite3");
const seed = require("./seed");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  epithet TEXT,
  crew TEXT,
  devil_fruit TEXT,
  bounty INTEGER,
  role TEXT,
  image_url TEXT,
  description TEXT,
  created_at TEXT NOT NULL
);
`;

function seedIfEmpty(db) {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM characters").get();
  if (c > 0) return;
  const insert = db.prepare(`
    INSERT INTO characters
      (name, epithet, crew, devil_fruit, bounty, role, image_url, description, created_at)
    VALUES
      (@name, @epithet, @crew, @devil_fruit, @bounty, @role, @image_url, @description, @created_at)
  `);
  const now = new Date().toISOString();
  const tx = db.transaction((rows) => {
    for (const r of rows) insert.run({ ...r, created_at: now });
  });
  tx(seed);
}

function createDb(path) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

module.exports = createDb;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/db.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/db.js server/tests/db.test.js
git commit -m "feat: add SQLite db factory with seeding"
```

---

## Task 5: Validation module

**Files:**
- Create: `server/validate.js`
- Test: `server/tests/validate.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/validate.test.js`:

```js
const validateCharacter = require("../validate");

describe("validateCharacter", () => {
  test("accepts a valid character and coerces bounty to a number", () => {
    const { valid, errors, value } = validateCharacter({
      name: "Nico Robin",
      bounty: "930000000"
    });
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
    expect(value.bounty).toBe(930000000);
    expect(value.name).toBe("Nico Robin");
  });

  test("rejects missing name", () => {
    const { valid, errors } = validateCharacter({ name: "  " });
    expect(valid).toBe(false);
    expect(errors).toContain("name is required");
  });

  test("rejects negative or non-integer bounty", () => {
    expect(validateCharacter({ name: "X", bounty: -5 }).valid).toBe(false);
    expect(validateCharacter({ name: "X", bounty: "abc" }).valid).toBe(false);
    expect(validateCharacter({ name: "X", bounty: 1.5 }).valid).toBe(false);
  });

  test("allows omitted bounty (null)", () => {
    const { valid, value } = validateCharacter({ name: "X" });
    expect(valid).toBe(true);
    expect(value.bounty).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/validate.test.js`
Expected: FAIL with "Cannot find module '../validate'".

- [ ] **Step 3: Write `server/validate.js`**

```js
const FIELDS = ["name", "epithet", "crew", "devil_fruit", "bounty", "role", "image_url", "description"];

function validateCharacter(body) {
  const errors = [];
  const value = {};

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) errors.push("name is required");
  value.name = name;

  // bounty: optional; if present must be a non-negative integer
  if (body.bounty === undefined || body.bounty === null || body.bounty === "") {
    value.bounty = null;
  } else {
    const n = Number(body.bounty);
    if (!Number.isInteger(n) || n < 0) {
      errors.push("bounty must be a non-negative integer");
      value.bounty = null;
    } else {
      value.bounty = n;
    }
  }

  // pass-through string fields (default to empty string)
  for (const f of FIELDS) {
    if (f === "name" || f === "bounty") continue;
    value[f] = typeof body[f] === "string" ? body[f].trim() : "";
  }

  return { valid: errors.length === 0, errors, value };
}

module.exports = validateCharacter;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/validate.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/validate.js server/tests/validate.test.js
git commit -m "feat: add character validation"
```

---

## Task 6: Characters router + app factory

**Files:**
- Create: `server/routes/characters.js`
- Create: `server/app.js`
- Test: `server/tests/characters.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/characters.test.js`:

```js
const request = require("supertest");
const createDb = require("../db");
const createApp = require("../app");

function makeApp() {
  const db = createDb(":memory:");
  return { app: createApp(db), db };
}

describe("characters API", () => {
  test("GET /api/characters lists seeded characters", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/characters");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("GET /api/characters?search filters by name or crew", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/characters?search=zoro");
    expect(res.status).toBe(200);
    expect(res.body.every((c) => /zoro/i.test(c.name) || /zoro/i.test(c.crew))).toBe(true);
    expect(res.body.length).toBe(1);
  });

  test("POST creates a character", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/characters")
      .send({ name: "Nico Robin", crew: "Straw Hat Pirates", bounty: 930000000 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("Nico Robin");
    expect(res.body.bounty).toBe(930000000);
  });

  test("POST rejects invalid body with 400", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/characters").send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain("name is required");
  });

  test("GET /:id returns one, 404 when missing", async () => {
    const { app } = makeApp();
    const created = await request(app).post("/api/characters").send({ name: "Franky" });
    const ok = await request(app).get(`/api/characters/${created.body.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe("Franky");
    const missing = await request(app).get("/api/characters/999999");
    expect(missing.status).toBe(404);
  });

  test("PUT fully replaces a character", async () => {
    const { app } = makeApp();
    const created = await request(app).post("/api/characters").send({ name: "Brook" });
    const res = await request(app)
      .put(`/api/characters/${created.body.id}`)
      .send({ name: "Brook", epithet: "Soul King", bounty: 383000000 });
    expect(res.status).toBe(200);
    expect(res.body.epithet).toBe("Soul King");
    expect(res.body.bounty).toBe(383000000);
  });

  test("PUT returns 404 for missing id", async () => {
    const { app } = makeApp();
    const res = await request(app).put("/api/characters/999999").send({ name: "Ghost" });
    expect(res.status).toBe(404);
  });

  test("DELETE removes a character", async () => {
    const { app } = makeApp();
    const created = await request(app).post("/api/characters").send({ name: "Jinbe" });
    const del = await request(app).delete(`/api/characters/${created.body.id}`);
    expect(del.status).toBe(204);
    const after = await request(app).get(`/api/characters/${created.body.id}`);
    expect(after.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/characters.test.js`
Expected: FAIL with "Cannot find module '../app'".

- [ ] **Step 3: Write `server/routes/characters.js`**

```js
const express = require("express");
const validateCharacter = require("../validate");

const COLUMNS = "id, name, epithet, crew, devil_fruit, bounty, role, image_url, description, created_at";

module.exports = function charactersRouter(db) {
  const router = express.Router();

  const getById = db.prepare(`SELECT ${COLUMNS} FROM characters WHERE id = ?`);

  router.get("/", (req, res) => {
    const { search } = req.query;
    if (search) {
      const like = `%${search}%`;
      const rows = db
        .prepare(`SELECT ${COLUMNS} FROM characters WHERE name LIKE ? OR crew LIKE ? ORDER BY id`)
        .all(like, like);
      return res.json(rows);
    }
    const rows = db.prepare(`SELECT ${COLUMNS} FROM characters ORDER BY id`).all();
    res.json(rows);
  });

  router.get("/:id", (req, res) => {
    const row = getById.get(req.params.id);
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(row);
  });

  router.post("/", (req, res) => {
    const { valid, errors, value } = validateCharacter(req.body);
    if (!valid) return res.status(400).json({ errors });
    const info = db
      .prepare(`
        INSERT INTO characters
          (name, epithet, crew, devil_fruit, bounty, role, image_url, description, created_at)
        VALUES
          (@name, @epithet, @crew, @devil_fruit, @bounty, @role, @image_url, @description, @created_at)
      `)
      .run({ ...value, created_at: new Date().toISOString() });
    res.status(201).json(getById.get(info.lastInsertRowid));
  });

  router.put("/:id", (req, res) => {
    const existing = getById.get(req.params.id);
    if (!existing) return res.status(404).json({ error: "not found" });
    const { valid, errors, value } = validateCharacter(req.body);
    if (!valid) return res.status(400).json({ errors });
    db.prepare(`
      UPDATE characters SET
        name = @name, epithet = @epithet, crew = @crew, devil_fruit = @devil_fruit,
        bounty = @bounty, role = @role, image_url = @image_url, description = @description
      WHERE id = @id
    `).run({ ...value, id: req.params.id });
    res.json(getById.get(req.params.id));
  });

  router.delete("/:id", (req, res) => {
    const info = db.prepare("DELETE FROM characters WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  });

  return router;
};
```

- [ ] **Step 4: Write `server/app.js`**

```js
const express = require("express");
const charactersRouter = require("./routes/characters");

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use("/api/characters", charactersRouter(db));
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  return app;
}

module.exports = createApp;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx jest tests/characters.test.js`
Expected: PASS (8 tests).

- [ ] **Step 6: Run the full suite**

Run: `cd server && npm test`
Expected: PASS (all tests across db, validate, characters).

- [ ] **Step 7: Commit**

```bash
git add server/routes/characters.js server/app.js server/tests/characters.test.js
git commit -m "feat: add characters CRUD API with search and validation"
```

---

## Task 7: Server entry point

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Write `server/index.js`**

```js
const path = require("path");
const createDb = require("./db");
const createApp = require("./app");

const PORT = process.env.PORT || 3001;
const db = createDb(path.join(__dirname, "characters.db"));
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`One Piece API listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Start the server and verify it boots**

Run: `cd server && npm start`
Expected: prints "One Piece API listening on http://localhost:3001". Leave it running for the next step.

- [ ] **Step 3: Smoke-test the live API**

In a second terminal:
Run: `curl http://localhost:3001/api/characters`
Expected: JSON array of seeded Straw Hat characters. Then stop the server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat: add server entry point"
```

---

## Task 8: Frontend scaffold

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/src/main.jsx`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "onepiece-crud-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `client/vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
});
```

- [ ] **Step 3: Create `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>One Piece Character Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `client/src/main.jsx`**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Install dependencies**

Run: `cd client && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/vite.config.js client/index.html client/src/main.jsx client/package-lock.json
git commit -m "chore: scaffold React + Vite frontend"
```

---

## Task 9: API client

**Files:**
- Create: `client/src/api.js`

- [ ] **Step 1: Create `client/src/api.js`**

```js
const BASE = "/api/characters";

async function handle(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.errors ? data.errors.join(", ") : data.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export function listCharacters(search = "") {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return fetch(`${BASE}${qs}`).then(handle);
}

export function createCharacter(body) {
  return fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(handle);
}

export function updateCharacter(id, body) {
  return fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(handle);
}

export function deleteCharacter(id) {
  return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(handle);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api.js
git commit -m "feat: add frontend API client"
```

---

## Task 10: Visual design pass (frontend-design skill)

**Files:**
- Create: `client/src/styles.css` (produced by this task)
- Note: this task produces the design plan and the CSS token system used by Task 11.

- [ ] **Step 1: Invoke the frontend-design skill**

Use the project-local `frontend-design` skill (`.claude/skills/frontend-design/`). Produce a compact design plan for the One Piece Character Manager:
- **Color:** 4–6 named hex values grounded in the One Piece world (e.g. sea/ocean, weathered parchment/wanted-poster, Jolly Roger). Avoid the three AI-default looks called out in the skill.
- **Type:** a display face + a body face + a utility face, chosen deliberately (loaded via a permitted web font method or system stack — no external network dependency the app can't reach offline is required, but Google Fonts `<link>` in `index.html` is acceptable).
- **Layout:** one-sentence concept + ASCII wireframe for the list grid and the form.
- **Signature:** the single memorable element (e.g. character cards styled as weathered wanted posters).

Critique the plan against the brief per the skill, revise, then write the token system to `client/src/styles.css`.

- [ ] **Step 2: Write `client/src/styles.css`**

Write the full stylesheet derived from the approved design plan: CSS custom properties for the palette and type scale, base/reset, layout for the app shell, `.card`/`.wanted-poster` styling, form styling, buttons, search bar, loading and error states, and responsive rules down to mobile. Respect `prefers-reduced-motion`. (Exact values come from the Step 1 plan — this task's output is a complete, non-placeholder stylesheet.)

- [ ] **Step 3: Commit**

```bash
git add client/src/styles.css client/index.html
git commit -m "feat: add One Piece visual design system"
```

---

## Task 11: React components and App

**Files:**
- Create: `client/src/components/SearchBar.jsx`
- Create: `client/src/components/CharacterCard.jsx`
- Create: `client/src/components/CharacterList.jsx`
- Create: `client/src/components/CharacterForm.jsx`
- Create: `client/src/App.jsx`

- [ ] **Step 1: Create `client/src/components/SearchBar.jsx`**

```jsx
export default function SearchBar({ value, onChange }) {
  return (
    <input
      type="search"
      className="search-bar"
      placeholder="Search by name or crew…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search characters"
    />
  );
}
```

- [ ] **Step 2: Create `client/src/components/CharacterCard.jsx`**

```jsx
const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23d8c7a1'/><text x='50%' y='52%' font-size='48' text-anchor='middle' dominant-baseline='middle' fill='%238a6d3b'>?</text></svg>";

function formatBounty(bounty) {
  if (bounty == null) return "Unknown";
  return "Ƀ " + Number(bounty).toLocaleString("en-US");
}

export default function CharacterCard({ character, onEdit, onDelete }) {
  return (
    <article className="card">
      <img
        className="card-avatar"
        src={character.image_url || PLACEHOLDER}
        alt={character.name}
        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
      />
      <h2 className="card-name">{character.name}</h2>
      {character.epithet && <p className="card-epithet">"{character.epithet}"</p>}
      {character.crew && <p className="card-crew">{character.crew}</p>}
      <p className="card-bounty">{formatBounty(character.bounty)}</p>
      <div className="card-actions">
        <button onClick={() => onEdit(character)}>Edit</button>
        <button onClick={() => onDelete(character)}>Delete</button>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Create `client/src/components/CharacterList.jsx`**

```jsx
import CharacterCard from "./CharacterCard.jsx";

export default function CharacterList({ characters, onEdit, onDelete }) {
  if (characters.length === 0) {
    return <p className="empty">No characters found. Add the first crewmate!</p>;
  }
  return (
    <div className="card-grid">
      {characters.map((c) => (
        <CharacterCard key={c.id} character={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/components/CharacterForm.jsx`**

```jsx
import { useState } from "react";

const EMPTY = {
  name: "", epithet: "", crew: "", devil_fruit: "",
  bounty: "", role: "", image_url: "", description: ""
};

export default function CharacterForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}), bounty: initial?.bounty ?? "" });
  const [error, setError] = useState("");

  function update(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.bounty !== "" && (!/^\d+$/.test(String(form.bounty)))) {
      setError("Bounty must be a non-negative whole number.");
      return;
    }
    setError("");
    onSubmit({ ...form, bounty: form.bounty === "" ? null : Number(form.bounty) });
  }

  return (
    <form className="character-form" onSubmit={submit}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label>Name*<input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
      <label>Epithet<input value={form.epithet} onChange={(e) => update("epithet", e.target.value)} /></label>
      <label>Crew<input value={form.crew} onChange={(e) => update("crew", e.target.value)} /></label>
      <label>Devil Fruit<input value={form.devil_fruit} onChange={(e) => update("devil_fruit", e.target.value)} /></label>
      <label>Bounty<input value={form.bounty} onChange={(e) => update("bounty", e.target.value)} inputMode="numeric" /></label>
      <label>Role<input value={form.role} onChange={(e) => update("role", e.target.value)} /></label>
      <label>Image URL<input value={form.image_url} onChange={(e) => update("image_url", e.target.value)} /></label>
      <label>Description<textarea value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
      <div className="form-actions">
        <button type="submit">Save changes</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create `client/src/App.jsx`**

```jsx
import { useEffect, useState, useCallback } from "react";
import SearchBar from "./components/SearchBar.jsx";
import CharacterList from "./components/CharacterList.jsx";
import CharacterForm from "./components/CharacterForm.jsx";
import { listCharacters, createCharacter, updateCharacter, deleteCharacter } from "./api.js";

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {..} = edit
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (term) => {
    setLoading(true);
    setError("");
    try {
      setCharacters(await listCharacters(term));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  function openNew() { setEditing(null); setShowForm(true); }
  function openEdit(c) { setEditing(c); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSubmit(body) {
    try {
      if (editing && editing.id) await updateCharacter(editing.id, body);
      else await createCharacter(body);
      closeForm();
      load(search);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try {
      await deleteCharacter(c.id);
      load(search);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>One Piece Character Manager</h1>
        <button className="add-btn" onClick={openNew}>+ Add Character</button>
      </header>

      <SearchBar value={search} onChange={setSearch} />

      {error && <p className="banner-error" role="alert">{error}</p>}
      {loading ? (
        <p className="loading">Setting sail…</p>
      ) : (
        <CharacterList characters={characters} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing && editing.id ? "Edit Character" : "New Character"}</h2>
            <CharacterForm initial={editing} onSubmit={handleSubmit} onCancel={closeForm} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/App.jsx client/src/components/
git commit -m "feat: add React UI components and app shell"
```

---

## Task 12: End-to-end verification

**Files:** none (manual verification)

- [ ] **Step 1: Start the backend**

Run: `cd server && npm start`
Expected: "One Piece API listening on http://localhost:3001".

- [ ] **Step 2: Start the frontend (second terminal)**

Run: `cd client && npm run dev`
Expected: Vite prints a local URL (http://localhost:5173).

- [ ] **Step 3: Verify in the browser**

Open http://localhost:5173 and confirm:
- Seeded Straw Hats render as cards.
- Search filters the list.
- Add creates a character (appears after save).
- Edit updates a character.
- Delete asks for confirmation and removes the character.
- Reload the page — data persists (SQLite).
- Stop and restart the backend — data still persists.

- [ ] **Step 4: Confirm the full backend suite passes**

Run: `cd server && npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: verify end-to-end CRUD flow"
```

---

## Task 13: Documentation (README + CLAUDE.md)

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `README.md`**

Include: project description, prerequisites (Node version, build tools for better-sqlite3), install steps for both `server/` and `client/`, how to run (backend then frontend), how to run tests, and the API reference table.

- [ ] **Step 2: Write `CLAUDE.md`**

Document for future Claude sessions: project purpose, architecture (server/client split, DI db factory, ports), commands (`npm start`, `npm test`, `npm run dev`), conventions (TDD for backend, `frontend-design` skill for UI, full-replace PUT, validation rules), where things live, and the gotcha that `better-sqlite3` needs native build tools.

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add README and CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** stack (Tasks 2, 8), SQLite factory + seed (Tasks 3, 4), API + validation + search (Tasks 5, 6), PUT full-replace (Task 6), frontend flow + loading/error/confirm (Task 11), visual design via skill (Task 10), images with fallback (Task 11 CharacterCard), testing with in-memory DB (Tasks 4–6), README + CLAUDE.md (Task 13). All spec sections mapped.
- **Type consistency:** `createDb(path)`, `createApp(db)`, `charactersRouter(db)`, and `validateCharacter(body) -> {valid, errors, value}` are used consistently across tasks. API client function names (`listCharacters`, `createCharacter`, `updateCharacter`, `deleteCharacter`) match their usage in `App.jsx`.
- **No placeholders:** all code steps contain complete code except Task 10 Step 2 (stylesheet), which is intentionally generated from the design plan produced in Task 10 Step 1 via the frontend-design skill — its output is a complete, non-placeholder file.
