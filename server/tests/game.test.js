const {
  PLAYER_DEFAULTS,
  WEAPONS,
  rollStats,
  computeDamage,
  resolveAttack,
  shopCatalog,
  applyPurchase,
} = require("../game");

// rng stub: returns 0.5 forever — makes every roll deterministic.
const mid = () => 0.5;

describe("rollStats", () => {
  test("returns full health and stats within range", () => {
    const s = rollStats(3_000_000_000, mid);
    expect(s.hp).toBe(s.max_hp);
    expect(s.max_hp).toBeGreaterThan(0);
    expect(s.attack).toBeGreaterThan(0);
    expect(s.defense).toBeGreaterThan(0);
  });

  test("higher bounty yields stronger stats", () => {
    const rookie = rollStats(1_000, mid);
    const emperor = rollStats(3_000_000_000, mid);
    expect(emperor.max_hp).toBeGreaterThan(rookie.max_hp);
    expect(emperor.attack).toBeGreaterThan(rookie.attack);
    expect(emperor.defense).toBeGreaterThan(rookie.defense);
  });

  test("handles null/zero bounty", () => {
    const s = rollStats(null, mid);
    expect(s.max_hp).toBeGreaterThan(0);
    expect(s.hp).toBe(s.max_hp);
  });
});

describe("computeDamage", () => {
  test("never drops below the floor", () => {
    expect(computeDamage(10, 500, mid)).toBe(4);
  });

  test("attack beats defense proportionally", () => {
    // 100 * (0.85 + 0.15) - 30 * 0.65 = 100 - 19.5 = 80.5 -> 81
    expect(computeDamage(100, 30, mid)).toBe(81);
  });
});

describe("resolveAttack", () => {
  const player = { ...PLAYER_DEFAULTS };

  test("damages both sides when the target survives", () => {
    const char = { id: 5, bounty: 1000, max_hp: 300, hp: 300, attack: 50, defense: 20 };
    const { player: p, character: c, events } = resolveAttack(player, char, mid);
    expect(events.characterDamage).toBeGreaterThan(0);
    expect(events.playerDamage).toBeGreaterThan(0);
    expect(c.hp).toBe(300 - events.characterDamage);
    expect(p.hp).toBe(player.hp - events.playerDamage);
    expect(events.captured).toBe(false);
  });

  test("awards bounty on capture with no counterattack", () => {
    const char = { id: 5, bounty: 500, max_hp: 300, hp: 10, attack: 50, defense: 20 };
    const { player: p, character: c, events } = resolveAttack(player, char, mid);
    expect(c.hp).toBe(0);
    expect(events.captured).toBe(true);
    expect(events.bountyAwarded).toBe(500);
    expect(events.playerDamage).toBe(0);
    expect(p.wallet).toBe(player.wallet + 500);
    expect(p.hp).toBe(player.hp);
  });

  test("rejects an already-captured target", () => {
    const char = { id: 5, bounty: 500, max_hp: 300, hp: 0, attack: 50, defense: 20 };
    expect(resolveAttack(player, char, mid).error).toMatch(/captured/);
  });

  test("player defeat revives at full health and charges medical fees", () => {
    const weak = { ...player, hp: 1, wallet: 1000 };
    const char = { id: 5, bounty: 0, max_hp: 900, hp: 900, attack: 200, defense: 20 };
    const { player: p, events } = resolveAttack(weak, char, mid);
    expect(events.playerDefeated).toBe(true);
    expect(events.medicalFees).toBe(100);
    expect(p.hp).toBe(weak.max_hp);
    expect(p.wallet).toBe(900);
  });

  test("does not mutate its inputs", () => {
    const char = { id: 5, bounty: 1000, max_hp: 300, hp: 300, attack: 50, defense: 20 };
    resolveAttack(player, char, mid);
    expect(char.hp).toBe(300);
    expect(player.hp).toBe(PLAYER_DEFAULTS.hp);
  });
});

describe("shop", () => {
  test("catalog prices trainings by purchase count", () => {
    const base = shopCatalog({ ...PLAYER_DEFAULTS });
    const trained = shopCatalog({ ...PLAYER_DEFAULTS, atk_training: 2 });
    const price = (cat) => cat.find((i) => i.id === "attack").price;
    expect(price(trained)).toBeGreaterThan(price(base));
  });

  test("potion heals but never past max", () => {
    const hurt = { ...PLAYER_DEFAULTS, hp: 900 };
    const { player } = applyPurchase(hurt, "potion");
    expect(player.hp).toBe(1000);
    expect(player.wallet).toBeLessThan(hurt.wallet);
  });

  test("potion at full health is rejected", () => {
    expect(applyPurchase({ ...PLAYER_DEFAULTS }, "potion").error).toMatch(/full health/);
  });

  test("insufficient funds is rejected", () => {
    const broke = { ...PLAYER_DEFAULTS, hp: 1, wallet: 0 };
    expect(applyPurchase(broke, "potion").error).toMatch(/insufficient/);
  });

  test("weapon purchase raises attack and advances the tier", () => {
    const rich = { ...PLAYER_DEFAULTS, wallet: 10_000_000_000 };
    const { player } = applyPurchase(rich, "weapon");
    expect(player.attack).toBe(PLAYER_DEFAULTS.attack + WEAPONS[0].bonus);
    expect(player.weapon_level).toBe(1);
  });

  test("weapon sells out at max tier", () => {
    const maxed = { ...PLAYER_DEFAULTS, wallet: 10_000_000_000, weapon_level: WEAPONS.length };
    expect(applyPurchase(maxed, "weapon").error).toMatch(/sold out/);
  });

  test("unknown item is rejected", () => {
    expect(applyPurchase({ ...PLAYER_DEFAULTS }, "banana").error).toMatch(/unknown/);
  });
});
