# One Piece Character Manager — Design

Date: 2026-07-07

## Overview

A CRUD web application for managing One Piece characters, with a persistent
backend. Users can create, read, update, and delete characters, search/filter
them, and see character avatars.

## Stack

- **Backend:** Node.js + Express (REST API)
- **Frontend:** React + Vite
- **Persistence:** SQLite (single-file database, survives restarts)

## Architecture

```
crud-project/
├── server/               # Express API + SQLite
│   ├── index.js          # app entry, middleware, mounts routes
│   ├── db.js             # SQLite connection + schema init + seed
│   ├── routes/characters.js
│   └── characters.db     # SQLite file (gitignored)
├── client/               # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js        # fetch wrappers
│   │   └── components/   # CharacterList, CharacterForm, SearchBar, CharacterCard
│   └── ...
├── CLAUDE.md
└── README.md
```

The frontend talks to the backend over a REST API rooted at `/api/characters`.
In development, the Vite dev server proxies `/api` to Express to avoid CORS.

## Data Model

Table `characters`:

| column      | type                     | notes                       |
|-------------|--------------------------|-----------------------------|
| id          | INTEGER PK autoincrement |                             |
| name        | TEXT NOT NULL            | required                    |
| epithet     | TEXT                     | e.g. "Straw Hat"            |
| crew        | TEXT                     | affiliation                 |
| devil_fruit | TEXT                     | nullable                    |
| bounty      | INTEGER                  | in berries, numeric         |
| role        | TEXT                     | e.g. Captain, Navigator     |
| image_url   | TEXT                     | shown as avatar             |
| description | TEXT                     | free text                   |
| created_at  | TEXT                     | ISO timestamp               |

## API

| Method | Route                      | Purpose                          |
|--------|----------------------------|----------------------------------|
| GET    | `/api/characters?search=`  | list, optional name/crew filter  |
| GET    | `/api/characters/:id`      | fetch one                        |
| POST   | `/api/characters`          | create (validated)               |
| PUT    | `/api/characters/:id`      | update (validated)               |
| DELETE | `/api/characters/:id`      | delete                           |

Backend validation: `name` required (non-empty); `bounty`, if present, must be
a non-negative integer. Validation failures return `400` with a JSON error
message. Missing resources return `404`.

## Frontend Flow

Single-page UI: a search bar above a responsive grid of character cards. Each
card shows avatar, name, epithet, and bounty, with Edit and Delete actions. An
"Add Character" button opens a form. The same form component handles both
create and edit. Client-side validation mirrors the backend rules. Application
state lives in `App.jsx`; the character list is re-fetched after each mutation.

## Extras

- **Seed data:** Straw Hat crew members inserted on first run if the table is
  empty.
- **Search/filter:** `?search=` matches name or crew via SQL `LIKE`.
- **Validation:** enforced on both client and server.
- **Images:** `image_url` rendered as an avatar, with a placeholder fallback
  when empty or on load error.

## Testing

- **Backend:** API route tests (supertest) run against an in-memory SQLite
  database, covering CRUD success paths and validation/not-found errors.
- **Frontend:** kept simple; manual verification via the running app.

## Out of Scope (YAGNI)

- Authentication / user accounts
- Pagination (dataset is small)
- Image file uploads (URLs only)
- Deployment configuration
