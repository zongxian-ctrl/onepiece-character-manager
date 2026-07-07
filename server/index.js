const path = require("path");
const createDb = require("./db");
const createApp = require("./app");

const PORT = process.env.PORT || 3001;
const db = createDb(path.join(__dirname, "characters.db"));
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`One Piece API listening on http://localhost:${PORT}`);
});
