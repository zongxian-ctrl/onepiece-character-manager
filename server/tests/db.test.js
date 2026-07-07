const path = require("path");
const os = require("os");
const fs = require("fs");
const createDb = require("../db");

describe("createDb", () => {
  test("creates schema and seeds when empty", () => {
    const db = createDb(":memory:");
    const rows = db.prepare("SELECT * FROM characters").all();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("name");
    db.close();
  });

  test("does not re-seed when reopening an existing database", () => {
    const file = path.join(os.tmpdir(), `optest-${process.pid}-${Date.now()}.db`);
    try {
      const db1 = createDb(file);
      const first = db1.prepare("SELECT COUNT(*) AS c FROM characters").get().c;
      db1.close();

      const db2 = createDb(file); // reopen same file — must NOT seed again
      const second = db2.prepare("SELECT COUNT(*) AS c FROM characters").get().c;
      db2.close();

      expect(first).toBeGreaterThan(0);
      expect(second).toBe(first);
    } finally {
      for (const suffix of ["", "-wal", "-shm"]) {
        try { fs.unlinkSync(file + suffix); } catch {}
      }
    }
  });
});
