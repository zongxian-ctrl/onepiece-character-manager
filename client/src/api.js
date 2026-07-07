// The frontend talks to the real Express/SQLite backend by default. When built
// for GitHub Pages (VITE_STATIC=1) there is no backend, so it falls back to a
// localStorage-backed store seeded from the bundled character data. The public
// function names are identical either way, so App.jsx doesn't care which is used.

import seedData from "./seed-data.json";
import { PLAYER_DEFAULTS, rollStats, resolveAttack, shopCatalog, applyPurchase } from "./game.js";

const STATIC =
  import.meta.env.VITE_STATIC === "1" || import.meta.env.VITE_STATIC === "true";

/* ---------------------------------------------------------------- helpers */

function normalize(b) {
  return {
    name: (b.name || "").trim(),
    epithet: b.epithet || "",
    crew: b.crew || "",
    devil_fruit: b.devil_fruit || "",
    bounty: b.bounty === "" || b.bounty == null ? null : Number(b.bounty),
    role: b.role || "",
    image_url: b.image_url || "",
    description: b.description || "",
  };
}

/* --------------------------------------------------- real backend (fetch) */

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

const remote = {
  list(search = "") {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return fetch(`${BASE}${qs}`).then(handle);
  },
  create(body) {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle);
  },
  update(id, body) {
    return fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle);
  },
  remove(id) {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(handle);
  },
  player() {
    return fetch("/api/player").then(handle);
  },
  shop() {
    return fetch("/api/shop").then(handle);
  },
  buy(itemId) {
    return fetch(`/api/shop/${itemId}`, { method: "POST" }).then(handle);
  },
  attack(id) {
    return fetch(`/api/battle/${id}`, { method: "POST" }).then(handle);
  },
  resetBattle() {
    return fetch("/api/battle/reset", { method: "POST" }).then(handle);
  },
};

/* --------------------------------------------- static store (localStorage) */

const KEY = "onepiece.characters";
const PLAYER_KEY = "onepiece.player";

// Rows from a fresh seed or a pre-battle store lack battle stats — roll them.
function withStats(rows) {
  let changed = false;
  const upgraded = rows.map((r) => {
    if (r.max_hp != null) return r;
    changed = true;
    return { ...r, ...rollStats(r.bounty) };
  });
  if (changed) saveRows(upgraded);
  return upgraded;
}

function loadRows() {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return withStats(JSON.parse(raw));
    } catch {
      /* corrupt store — reseed below */
    }
  }
  const seeded = seedData.map((c, i) => ({
    id: i + 1,
    created_at: new Date().toISOString(),
    ...c,
    ...rollStats(c.bounty),
  }));
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

function loadPlayer() {
  const raw = localStorage.getItem(PLAYER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* corrupt store — reset below */
    }
  }
  const player = { ...PLAYER_DEFAULTS };
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  return player;
}

function savePlayer(player) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

function saveRows(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

const local = {
  list(search = "") {
    let rows = loadRows();
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.crew || "").toLowerCase().includes(q)
      );
    }
    return Promise.resolve(rows.slice().sort((a, b) => a.id - b.id));
  },
  create(body) {
    const rows = loadRows();
    const value = normalize(body);
    const row = {
      id: nextId(rows),
      created_at: new Date().toISOString(),
      ...value,
      ...rollStats(value.bounty),
    };
    rows.push(row);
    saveRows(rows);
    return Promise.resolve(row);
  },
  update(id, body) {
    const rows = loadRows();
    const i = rows.findIndex((r) => r.id === Number(id));
    if (i < 0) return Promise.reject(new Error("not found"));
    rows[i] = { ...rows[i], ...normalize(body) };
    saveRows(rows);
    return Promise.resolve(rows[i]);
  },
  remove(id) {
    const rows = loadRows().filter((r) => r.id !== Number(id));
    saveRows(rows);
    return Promise.resolve(null);
  },
  player() {
    return Promise.resolve(loadPlayer());
  },
  shop() {
    return Promise.resolve(shopCatalog(loadPlayer()));
  },
  buy(itemId) {
    const result = applyPurchase(loadPlayer(), itemId);
    if (result.error) return Promise.reject(new Error(result.error));
    savePlayer(result.player);
    return Promise.resolve(result);
  },
  attack(id) {
    const rows = loadRows();
    const i = rows.findIndex((r) => r.id === Number(id));
    if (i < 0) return Promise.reject(new Error("not found"));
    const result = resolveAttack(loadPlayer(), rows[i]);
    if (result.error) return Promise.reject(new Error(result.error));
    rows[i] = result.character;
    saveRows(rows);
    savePlayer(result.player);
    return Promise.resolve(result);
  },
  resetBattle() {
    const rows = loadRows().map((r) => ({ ...r, hp: r.max_hp }));
    saveRows(rows);
    return Promise.resolve({ ok: true });
  },
};

/* ----------------------------------------------------------------- export */

const impl = STATIC ? local : remote;

export const listCharacters = (search) => impl.list(search);
export const createCharacter = (body) => impl.create(body);
export const updateCharacter = (id, body) => impl.update(id, body);
export const deleteCharacter = (id) => impl.remove(id);
export const getPlayer = () => impl.player();
export const getShop = () => impl.shop();
export const buyItem = (itemId) => impl.buy(itemId);
export const attackCharacter = (id) => impl.attack(id);
export const resetBattle = () => impl.resetBattle();
