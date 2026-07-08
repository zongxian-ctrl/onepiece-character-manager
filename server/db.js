const Database = require("better-sqlite3");
const seed = require("./seed");
const { rollStats, PLAYER_DEFAULTS } = require("./game");

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
  created_at TEXT NOT NULL,
  max_hp INTEGER,
  hp INTEGER,
  attack INTEGER,
  defense INTEGER
);

CREATE TABLE IF NOT EXISTS player (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  wallet INTEGER NOT NULL,
  weapon_level INTEGER NOT NULL DEFAULT 0,
  armor_level INTEGER NOT NULL DEFAULT 0,
  atk_training INTEGER NOT NULL DEFAULT 0,
  def_training INTEGER NOT NULL DEFAULT 0
);
`;

// Pre-battle databases lack the battle columns; add them in place so an
// existing characters.db keeps working without a delete/reseed.
function migrate(db) {
  const cols = db.prepare("PRAGMA table_info(characters)").all().map((c) => c.name);
  for (const col of ["max_hp", "hp", "attack", "defense"]) {
    if (!cols.includes(col)) db.exec(`ALTER TABLE characters ADD COLUMN ${col} INTEGER`);
  }
  const unrolled = db.prepare("SELECT id, bounty FROM characters WHERE max_hp IS NULL").all();
  const update = db.prepare(
    "UPDATE characters SET max_hp = @max_hp, hp = @hp, attack = @attack, defense = @defense WHERE id = @id"
  );
  for (const row of unrolled) update.run({ ...rollStats(row.bounty), id: row.id });
}

function seedIfEmpty(db) {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM characters").get();
  if (c > 0) return;
  const insert = db.prepare(`
    INSERT INTO characters
      (name, epithet, crew, devil_fruit, bounty, role, image_url, description, created_at,
       max_hp, hp, attack, defense)
    VALUES
      (@name, @epithet, @crew, @devil_fruit, @bounty, @role, @image_url, @description, @created_at,
       @max_hp, @hp, @attack, @defense)
  `);
  const now = new Date().toISOString();
  const tx = db.transaction((rows) => {
    for (const r of rows) insert.run({ ...r, ...rollStats(r.bounty), created_at: now });
  });
  tx(seed);
}

function ensurePlayer(db) {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM player").get();
  if (c > 0) return;
  db.prepare(`
    INSERT INTO player (id, hp, max_hp, attack, defense, wallet,
                        weapon_level, armor_level, atk_training, def_training)
    VALUES (@id, @hp, @max_hp, @attack, @defense, @wallet,
            @weapon_level, @armor_level, @atk_training, @def_training)
  `).run(PLAYER_DEFAULTS);
}

function createDb(path) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  migrate(db);
  seedIfEmpty(db);
  ensurePlayer(db);
  return db;
}

module.exports = createDb;
