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
