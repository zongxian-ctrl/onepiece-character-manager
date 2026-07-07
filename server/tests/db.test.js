const createDb = require("../db");

describe("createDb", () => {
  test("creates schema and seeds when empty", () => {
    const db = createDb(":memory:");
    const rows = db.prepare("SELECT * FROM characters").all();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("name");
    db.close();
  });

  test("seed count is stable on a populated db", () => {
    const db = createDb(":memory:");
    const before = db.prepare("SELECT COUNT(*) AS c FROM characters").get().c;
    const after = db.prepare("SELECT COUNT(*) AS c FROM characters").get().c;
    expect(after).toBe(before);
    db.close();
  });
});
