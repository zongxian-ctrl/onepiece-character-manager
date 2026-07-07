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
