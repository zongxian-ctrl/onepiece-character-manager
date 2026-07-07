const express = require("express");
const charactersRouter = require("./routes/characters");

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use("/api/characters", charactersRouter(db));
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // JSON error handler — keeps all error responses as JSON, never HTML stack traces
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = status === 400 ? "invalid request body" : "internal server error";
    res.status(status).json({ error: message });
  });

  return app;
}

module.exports = createApp;
