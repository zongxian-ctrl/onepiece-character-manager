// ESM mirror of server/game.js for the static (GitHub Pages) build, where all
// battle/shop logic runs in the browser against localStorage. If you change
// balance numbers or formulas here, change them there too.

export const PLAYER_DEFAULTS = {
  id: 1,
  hp: 1000,
  max_hp: 1000,
  attack: 60,
  defense: 40,
  wallet: 50_000_000,
  weapon_level: 0,
  armor_level: 0,
  atk_training: 0,
  def_training: 0,
};

const POTION_HEAL = 400;
const POTION_PRICE = 15_000_000;
const TRAINING_ATK_BONUS = 8;
const TRAINING_DEF_BONUS = 8;
const TRAINING_ATK_BASE_PRICE = 30_000_000;
const TRAINING_DEF_BASE_PRICE = 25_000_000;
const TRAINING_PRICE_GROWTH = 1.6;
const DEFEAT_FEE_RATE = 0.1;

export const WEAPONS = [
  { name: "Cutlass", bonus: 25, price: 60_000_000 },
  { name: "Seastone Saber", bonus: 25, price: 180_000_000 },
  { name: "Meito Blade", bonus: 25, price: 500_000_000 },
  { name: "Legendary Meito", bonus: 25, price: 1_500_000_000 },
];

export const ARMORS = [
  { name: "Leather Longcoat", bonus: 20, price: 50_000_000 },
  { name: "Marine Captain's Coat", bonus: 20, price: 150_000_000 },
  { name: "Armament Haki Training", bonus: 20, price: 400_000_000 },
  { name: "Awakened Armament", bonus: 20, price: 1_200_000_000 },
];

export function rollStats(bounty, rng = Math.random) {
  const power = bounty > 0 ? Math.min(1, Math.log10(bounty) / 9.6) : 0.05;
  const max_hp = Math.round(180 + 520 * power + rng() * 120);
  return {
    max_hp,
    hp: max_hp,
    attack: Math.round(25 + 75 * power + rng() * 18),
    defense: Math.round(12 + 48 * power + rng() * 12),
  };
}

export function computeDamage(attack, defense, rng = Math.random) {
  const raw = attack * (0.85 + 0.3 * rng()) - defense * 0.65;
  return Math.max(4, Math.round(raw));
}

export function resolveAttack(playerIn, characterIn, rng = Math.random) {
  if (characterIn.hp <= 0) {
    return { error: "target is already captured" };
  }
  const player = { ...playerIn };
  const character = { ...characterIn };
  const events = {
    characterDamage: computeDamage(player.attack, character.defense, rng),
    playerDamage: 0,
    captured: false,
    bountyAwarded: 0,
    playerDefeated: false,
    medicalFees: 0,
  };

  character.hp = Math.max(0, character.hp - events.characterDamage);
  if (character.hp === 0) {
    events.captured = true;
    events.bountyAwarded = character.bounty || 0;
    player.wallet += events.bountyAwarded;
  } else {
    events.playerDamage = computeDamage(character.attack, player.defense, rng);
    player.hp -= events.playerDamage;
    if (player.hp <= 0) {
      events.playerDefeated = true;
      events.medicalFees = Math.floor(player.wallet * DEFEAT_FEE_RATE);
      player.wallet -= events.medicalFees;
      player.hp = player.max_hp;
    }
  }
  return { player, character, events };
}

function trainingPrice(base, purchases) {
  return Math.round(base * Math.pow(TRAINING_PRICE_GROWTH, purchases));
}

export function shopCatalog(player) {
  const nextWeapon = WEAPONS[player.weapon_level];
  const nextArmor = ARMORS[player.armor_level];
  return [
    {
      id: "potion",
      name: "Rumble Tonic",
      effect: `Restores ${POTION_HEAL} HP`,
      price: POTION_PRICE,
      available: true,
    },
    {
      id: "attack",
      name: "Attack training",
      effect: `Attack +${TRAINING_ATK_BONUS}`,
      price: trainingPrice(TRAINING_ATK_BASE_PRICE, player.atk_training),
      available: true,
    },
    {
      id: "defense",
      name: "Defense training",
      effect: `Defense +${TRAINING_DEF_BONUS}`,
      price: trainingPrice(TRAINING_DEF_BASE_PRICE, player.def_training),
      available: true,
    },
    {
      id: "weapon",
      name: nextWeapon ? `Weapon: ${nextWeapon.name}` : "Weapon: fully armed",
      effect: nextWeapon ? `Attack +${nextWeapon.bonus}` : "No stronger weapon exists",
      price: nextWeapon ? nextWeapon.price : null,
      available: Boolean(nextWeapon),
    },
    {
      id: "armor",
      name: nextArmor ? `Armor: ${nextArmor.name}` : "Armor: fully equipped",
      effect: nextArmor ? `Defense +${nextArmor.bonus}` : "No stronger armor exists",
      price: nextArmor ? nextArmor.price : null,
      available: Boolean(nextArmor),
    },
  ];
}

export function applyPurchase(playerIn, itemId) {
  const catalog = shopCatalog(playerIn);
  const item = catalog.find((i) => i.id === itemId);
  if (!item) return { error: "unknown item" };
  if (!item.available) return { error: "item is sold out" };
  if (playerIn.wallet < item.price) return { error: "insufficient funds" };
  if (itemId === "potion" && playerIn.hp >= playerIn.max_hp) {
    return { error: "already at full health" };
  }

  const player = { ...playerIn, wallet: playerIn.wallet - item.price };
  switch (itemId) {
    case "potion":
      player.hp = Math.min(player.max_hp, player.hp + POTION_HEAL);
      break;
    case "attack":
      player.attack += TRAINING_ATK_BONUS;
      player.atk_training += 1;
      break;
    case "defense":
      player.defense += TRAINING_DEF_BONUS;
      player.def_training += 1;
      break;
    case "weapon":
      player.attack += WEAPONS[player.weapon_level].bonus;
      player.weapon_level += 1;
      break;
    case "armor":
      player.defense += ARMORS[player.armor_level].bonus;
      player.armor_level += 1;
      break;
  }
  return { player, purchased: item };
}
