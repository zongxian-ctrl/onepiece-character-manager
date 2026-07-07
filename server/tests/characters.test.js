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
