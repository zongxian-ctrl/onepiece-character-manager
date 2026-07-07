const request = require("supertest");
const createDb = require("../db");
const createApp = require("../app");
const { PLAYER_DEFAULTS } = require("../game");

let app, db;

beforeEach(() => {
  db = createDb(":memory:");
  app = createApp(db);
});

afterEach(() => db.close());

describe("player & battle endpoints", () => {
  test("GET /api/player returns the seeded default player", async () => {
    const res = await request(app).get("/api/player");
    expect(res.status).toBe(200);
    expect(res.body.hp).toBe(PLAYER_DEFAULTS.hp);
    expect(res.body.wallet).toBe(PLAYER_DEFAULTS.wallet);
  });

  test("seeded characters carry full battle stats", async () => {
    const res = await request(app).get("/api/characters");
    for (const c of res.body) {
      expect(c.max_hp).toBeGreaterThan(0);
      expect(c.hp).toBe(c.max_hp);
      expect(c.attack).toBeGreaterThan(0);
      expect(c.defense).toBeGreaterThan(0);
    }
  });

  test("POST /api/battle/:id damages the character and returns events", async () => {
    const { body: chars } = await request(app).get("/api/characters");
    const target = chars[0];
    const res = await request(app).post(`/api/battle/${target.id}`);
    expect(res.status).toBe(200);
    expect(res.body.events.characterDamage).toBeGreaterThan(0);
    expect(res.body.character.hp).toBe(target.hp - res.body.events.characterDamage);
    // persisted
    const { body: after } = await request(app).get(`/api/characters/${target.id}`);
    expect(after.hp).toBe(res.body.character.hp);
  });

  test("capturing a character pays out its bounty exactly once", async () => {
    const { body: created } = await request(app)
      .post("/api/characters")
      .send({ name: "Training Dummy", bounty: 777 });
    // Weaken it so the next hit captures.
    db.prepare("UPDATE characters SET hp = 1, defense = 0 WHERE id = ?").run(created.id);

    const first = await request(app).post(`/api/battle/${created.id}`);
    expect(first.body.events.captured).toBe(true);
    expect(first.body.events.bountyAwarded).toBe(777);
    expect(first.body.player.wallet).toBe(PLAYER_DEFAULTS.wallet + 777);

    const second = await request(app).post(`/api/battle/${created.id}`);
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/captured/);
  });

  test("POST /api/battle/:id returns 404 for a missing character", async () => {
    const res = await request(app).post("/api/battle/99999");
    expect(res.status).toBe(404);
  });

  test("POST /api/battle/reset restores every character to full health", async () => {
    db.prepare("UPDATE characters SET hp = 0").run();
    const res = await request(app).post("/api/battle/reset");
    expect(res.status).toBe(200);
    const { body: chars } = await request(app).get("/api/characters");
    for (const c of chars) expect(c.hp).toBe(c.max_hp);
  });

  test("new characters get battle stats; editing preserves current hp", async () => {
    const { body: created } = await request(app)
      .post("/api/characters")
      .send({ name: "Newcomer", bounty: 1_000_000 });
    expect(created.hp).toBe(created.max_hp);

    db.prepare("UPDATE characters SET hp = 5 WHERE id = ?").run(created.id);
    const { body: edited } = await request(app)
      .put(`/api/characters/${created.id}`)
      .send({ name: "Newcomer II", bounty: 2_000_000 });
    expect(edited.hp).toBe(5);
    expect(edited.max_hp).toBe(created.max_hp);
  });
});

describe("shop endpoints", () => {
  test("GET /api/shop lists the catalog", async () => {
    const res = await request(app).get("/api/shop");
    expect(res.status).toBe(200);
    expect(res.body.map((i) => i.id)).toEqual(
      expect.arrayContaining(["potion", "attack", "defense", "weapon", "armor"])
    );
  });

  test("buying attack training deducts the wallet and raises attack", async () => {
    const res = await request(app).post("/api/shop/attack");
    expect(res.status).toBe(200);
    expect(res.body.player.attack).toBeGreaterThan(PLAYER_DEFAULTS.attack);
    expect(res.body.player.wallet).toBeLessThan(PLAYER_DEFAULTS.wallet);
    // persisted
    const { body: player } = await request(app).get("/api/player");
    expect(player.attack).toBe(res.body.player.attack);
  });

  test("purchase failures return 400 with a JSON error", async () => {
    db.prepare("UPDATE player SET wallet = 0").run();
    const res = await request(app).post("/api/shop/weapon");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/);

    const unknown = await request(app).post("/api/shop/banana");
    expect(unknown.status).toBe(400);
  });
});
