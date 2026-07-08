const express = require("express");
const { resolveAttack, shopCatalog, applyPurchase } = require("../game");

const CHAR_COLUMNS =
  "id, name, epithet, crew, devil_fruit, bounty, role, image_url, description, created_at, max_hp, hp, attack, defense";

// Battle, shop, and player-state endpoints, mounted at /api:
//   GET  /api/player        -> current player
//   GET  /api/shop          -> catalog priced for the current player
//   POST /api/shop/:item    -> buy; 400 with { error } when it can't be done
//   POST /api/battle/reset  -> restore every character to full health
//   POST /api/battle/:id    -> one attack round against character :id
module.exports = function gameRouter(db) {
  const router = express.Router();

  const getPlayer = db.prepare("SELECT * FROM player WHERE id = 1");
  const getCharacter = db.prepare(`SELECT ${CHAR_COLUMNS} FROM characters WHERE id = ?`);
  const savePlayer = db.prepare(`
    UPDATE player SET hp = @hp, max_hp = @max_hp, attack = @attack, defense = @defense,
      wallet = @wallet, weapon_level = @weapon_level, armor_level = @armor_level,
      atk_training = @atk_training, def_training = @def_training
    WHERE id = 1
  `);
  const saveCharacterHp = db.prepare("UPDATE characters SET hp = @hp WHERE id = @id");

  router.get("/player", (req, res) => {
    res.json(getPlayer.get());
  });

  router.get("/shop", (req, res) => {
    res.json(shopCatalog(getPlayer.get()));
  });

  router.post("/shop/:item", (req, res) => {
    const result = applyPurchase(getPlayer.get(), req.params.item);
    if (result.error) return res.status(400).json({ error: result.error });
    savePlayer.run(result.player);
    res.json({ player: result.player, purchased: result.purchased });
  });

  router.post("/battle/reset", (req, res) => {
    db.prepare("UPDATE characters SET hp = max_hp").run();
    res.json({ ok: true });
  });

  router.post("/battle/:id", (req, res) => {
    const character = getCharacter.get(req.params.id);
    if (!character) return res.status(404).json({ error: "not found" });
    const result = resolveAttack(getPlayer.get(), character, Math.random);
    if (result.error) return res.status(400).json({ error: result.error });
    const commit = db.transaction(() => {
      savePlayer.run(result.player);
      saveCharacterHp.run({ hp: result.character.hp, id: result.character.id });
    });
    commit();
    res.json({ player: result.player, character: result.character, events: result.events });
  });

  return router;
};
