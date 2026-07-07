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
