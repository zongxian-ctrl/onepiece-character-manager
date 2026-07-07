// Regenerates server/seed.js for the notable One Piece cast and downloads each
// character's portrait into client/public/characters/.
//
// Character metadata (name, epithet, crew, devil fruit, bounty, role) is curated
// here for accuracy. Only the images are fetched — from the Jikan (MyAnimeList)
// API's One Piece character list (anime id 21) — matched by name and saved
// locally so the app works offline.
//
// Run: node scripts/build-seed.mjs   (requires Node 18+ for global fetch)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMG_DIR = path.join(ROOT, "client", "public", "characters");
const SEED_PATH = path.join(ROOT, "server", "seed.js");
const JIKAN_URL = "https://api.jikan.moe/v4/anime/21/characters";

// `jikan` is an optional match hint (a distinctive token) used when the Jikan
// spelling differs from the display name. bounty is in berries, null if none.
const CURATED = [
  { name: "Monkey D. Luffy", epithet: "Straw Hat", crew: "Straw Hat Pirates", devil_fruit: "Gomu Gomu no Mi (Hito Hito no Mi, Model: Nika)", bounty: 3000000000, role: "Captain", description: "Rubber-bodied captain who dreams of becoming King of the Pirates." },
  { name: "Roronoa Zoro", epithet: "Pirate Hunter", crew: "Straw Hat Pirates", devil_fruit: "", bounty: 1111000000, role: "Swordsman", description: "Three-sword-style swordsman aiming to be the world's greatest." },
  { name: "Nami", epithet: "Cat Burglar", crew: "Straw Hat Pirates", devil_fruit: "", bounty: 366000000, role: "Navigator", description: "Master navigator with a talent for weather and treasure." },
  { name: "Usopp", epithet: "God Usopp", crew: "Straw Hat Pirates", devil_fruit: "", bounty: 500000000, role: "Sniper", description: "Long-nosed sharpshooter and teller of tall tales." },
  { name: "Vinsmoke Sanji", epithet: "Black Leg", crew: "Straw Hat Pirates", devil_fruit: "", bounty: 1032000000, role: "Cook", jikan: "Sanji", description: "Chivalrous cook who fights only with his legs." },
  { name: "Tony Tony Chopper", epithet: "Cotton Candy Lover", crew: "Straw Hat Pirates", devil_fruit: "Hito Hito no Mi", bounty: 1000, role: "Doctor", jikan: "Chopper", description: "Reindeer doctor who ate a Human-Human Fruit." },
  { name: "Nico Robin", epithet: "Devil Child", crew: "Straw Hat Pirates", devil_fruit: "Hana Hana no Mi", bounty: 930000000, role: "Archaeologist", jikan: "Robin", description: "Archaeologist who can read the lost Poneglyphs." },
  { name: "Franky", epithet: "Iron Man", crew: "Straw Hat Pirates", devil_fruit: "", bounty: 394000000, role: "Shipwright", description: "Cyborg shipwright who built the Thousand Sunny." },
  { name: "Brook", epithet: "Soul King", crew: "Straw Hat Pirates", devil_fruit: "Yomi Yomi no Mi", bounty: 383000000, role: "Musician", description: "Living skeleton musician revived by the Revive-Revive Fruit." },
  { name: "Jinbe", epithet: "Knight of the Sea", crew: "Straw Hat Pirates", devil_fruit: "", bounty: 1100000000, role: "Helmsman", jikan: "Jinbe", description: "Fish-man helmsman and master of Fish-Man Karate." },
  { name: "Portgas D. Ace", epithet: "Fire Fist", crew: "Whitebeard Pirates", devil_fruit: "Mera Mera no Mi", bounty: 550000000, role: "2nd Division Commander", jikan: "Ace", description: "Luffy's sworn brother and wielder of the Flame-Flame Fruit." },
  { name: "Sabo", epithet: "Flame Emperor", crew: "Revolutionary Army", devil_fruit: "Mera Mera no Mi", bounty: 602000000, role: "Chief of Staff", description: "Revolutionary and Luffy's other sworn brother." },
  { name: "Trafalgar Law", epithet: "Surgeon of Death", crew: "Heart Pirates", devil_fruit: "Ope Ope no Mi", bounty: 3000000000, role: "Captain", description: "Doctor-pirate wielding the reality-warping Op-Op Fruit." },
  { name: "Eustass Kid", epithet: "Captain", crew: "Kid Pirates", devil_fruit: "", bounty: 3000000000, role: "Captain", jikan: "Kid", description: "Supernova captain who commands magnetic force." },
  { name: "Shanks", epithet: "Red-Haired", crew: "Red Hair Pirates", devil_fruit: "", bounty: 4048900000, role: "Emperor", description: "Yonko who inspired Luffy and gave him the straw hat." },
  { name: "Marshall D. Teach", epithet: "Blackbeard", crew: "Blackbeard Pirates", devil_fruit: "Yami Yami no Mi & Gura Gura no Mi", bounty: 3996000000, role: "Emperor", jikan: "Teach", description: "Yonko who wields two Devil Fruit powers." },
  { name: "Charlotte Linlin", epithet: "Big Mom", crew: "Big Mom Pirates", devil_fruit: "Soru Soru no Mi", bounty: 4388000000, role: "Emperor", jikan: "Linlin", description: "Yonko who rules Totto Land with the Soul-Soul Fruit." },
  { name: "Kaido", epithet: "of the Beasts", crew: "Beasts Pirates", devil_fruit: "Uo Uo no Mi, Model: Seiryu", bounty: 4611100000, role: "Emperor", jikan: "Kaidou", description: "Yonko said to be the strongest creature alive." },
  { name: "Edward Newgate", epithet: "Whitebeard", crew: "Whitebeard Pirates", devil_fruit: "Gura Gura no Mi", bounty: 5046000000, role: "Captain", jikan: "Newgate", description: "The Strongest Man in the World, wielder of the Tremor-Tremor Fruit." },
  { name: "Marco", epithet: "the Phoenix", crew: "Whitebeard Pirates", devil_fruit: "Tori Tori no Mi, Model: Phoenix", bounty: 1374000000, role: "1st Division Commander", description: "Whitebeard's right hand, a phoenix Zoan user." },
  { name: "Charlotte Katakuri", epithet: "", crew: "Big Mom Pirates", devil_fruit: "Mochi Mochi no Mi", bounty: 1057000000, role: "Sweet Commander", jikan: "Katakuri", description: "Big Mom's strongest son with future-sight Observation Haki." },
  { name: "Dracule Mihawk", epithet: "Hawk-Eyes", crew: "Cross Guild", devil_fruit: "", bounty: 3590000000, role: "Swordsman", jikan: "Mihawk", description: "The world's greatest swordsman and Zoro's goal." },
  { name: "Crocodile", epithet: "Sir Crocodile", crew: "Cross Guild", devil_fruit: "Suna Suna no Mi", bounty: 1965000000, role: "Executive", description: "Former Warlord who commands sand." },
  { name: "Donquixote Doflamingo", epithet: "Heavenly Yaksha", crew: "Donquixote Pirates", devil_fruit: "Ito Ito no Mi", bounty: 340000000, role: "Captain", jikan: "Doflamingo", description: "Former Warlord and Shichibukai who controls people like strings." },
  { name: "Boa Hancock", epithet: "Pirate Empress", crew: "Kuja Pirates", devil_fruit: "Mero Mero no Mi", bounty: 1659000000, role: "Captain", jikan: "Hancock", description: "The most beautiful woman in the world, ruler of Amazon Lily." },
  { name: "Buggy", epithet: "the Clown", crew: "Cross Guild", devil_fruit: "Bara Bara no Mi", bounty: 3189000000, role: "Emperor", jikan: "Buggy", description: "Chop-Chop Fruit user swept up into the ranks of the Yonko." },
  { name: "Monkey D. Dragon", epithet: "the Revolutionary", crew: "Revolutionary Army", devil_fruit: "", bounty: null, role: "Supreme Commander", jikan: "Dragon", description: "The world's most wanted man and Luffy's father." },
  { name: "Monkey D. Garp", epithet: "Garp the Fist", crew: "Marines", devil_fruit: "", bounty: null, role: "Vice Admiral", jikan: "Garp", description: "Legendary Marine hero and Luffy's grandfather." },
  { name: "Sengoku", epithet: "the Buddha", crew: "Marines", devil_fruit: "Hito Hito no Mi, Model: Daibutsu", bounty: null, role: "Fleet Admiral", description: "Former Fleet Admiral who transforms into a great Buddha." },
  { name: "Sakazuki", epithet: "Akainu", crew: "Marines", devil_fruit: "Magu Magu no Mi", bounty: null, role: "Fleet Admiral", jikan: "Sakazuki", description: "Ruthless Fleet Admiral wielding magma." },
  { name: "Borsalino", epithet: "Kizaru", crew: "Marines", devil_fruit: "Pika Pika no Mi", bounty: null, role: "Admiral", jikan: "Borsalino", description: "Admiral who moves at the speed of light." },
  { name: "Kuzan", epithet: "Aokiji", crew: "Blackbeard Pirates", devil_fruit: "Hie Hie no Mi", bounty: null, role: "Former Admiral", jikan: "Kuzan", description: "Former Marine admiral who commands ice." },
  { name: "Smoker", epithet: "White Hunter", crew: "Marines", devil_fruit: "Moku Moku no Mi", bounty: null, role: "Vice Admiral", jikan: "Smoker", description: "Cigar-chewing Marine who turns into smoke." },
  { name: "Koby", epithet: "", crew: "Marines", devil_fruit: "", bounty: null, role: "Captain", jikan: "Koby", description: "Marine prodigy who started out alongside Luffy." },
  { name: "Rob Lucci", epithet: "", crew: "CP0", devil_fruit: "Neko Neko no Mi, Model: Leopard", bounty: null, role: "Agent", jikan: "Lucci", description: "Elite government assassin and leopard Zoan user." },
  { name: "Nefertari Vivi", epithet: "", crew: "Alabasta Kingdom", devil_fruit: "", bounty: null, role: "Princess", jikan: "Vivi", description: "Princess of Alabasta and honorary Straw Hat." },
];

const norm = (s) =>
  s.toLowerCase().replace(/[.,'’\-]/g, "").split(/\s+/).filter(Boolean).sort().join(" ");

async function main() {
  console.log("Fetching Jikan character list…");
  const res = await fetch(JIKAN_URL);
  if (!res.ok) throw new Error(`Jikan request failed: ${res.status}`);
  const { data } = await res.json();
  console.log(`Jikan returned ${data.length} characters.`);

  const index = data
    .map((e) => ({
      name: e.character?.name || "",
      img: e.character?.images?.jpg?.image_url || "",
      key: norm(e.character?.name || ""),
    }))
    .filter((j) => j.img);
  const byKey = new Map(index.map((j) => [j.key, j]));

  const findImage = (char) => {
    const key = norm(char.jikan || char.name);
    if (byKey.has(key)) return byKey.get(key);
    const wanted = new Set(key.split(" "));
    for (const j of index) {
      const jtok = new Set(j.key.split(" "));
      const inter = [...wanted].filter((t) => jtok.has(t)).length;
      if (inter === wanted.size || inter === jtok.size) return j;
    }
    return null;
  };

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  fs.mkdirSync(IMG_DIR, { recursive: true });
  const seed = [];
  const missed = [];

  for (const c of CURATED) {
    const match = findImage(c);
    let image_url = "";
    if (match) {
      const file = `${slug(c.name)}.jpg`;
      const imgRes = await fetch(match.img);
      if (imgRes.ok) {
        fs.writeFileSync(path.join(IMG_DIR, file), Buffer.from(await imgRes.arrayBuffer()));
        image_url = `/characters/${file}`;
        console.log(`  ✓ ${c.name}  ←  "${match.name}"`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!image_url) {
      missed.push(c.name);
      console.log(`  ✗ ${c.name}  (no image match)`);
    }
    seed.push({
      name: c.name,
      epithet: c.epithet,
      crew: c.crew,
      devil_fruit: c.devil_fruit,
      bounty: c.bounty,
      role: c.role,
      image_url,
      description: c.description,
    });
  }

  const header =
    "// One Piece notable characters. Bounties in berries.\n" +
    "// Portraits downloaded to client/public/characters/ (matched from the Jikan API).\n" +
    "// Generated by scripts/build-seed.mjs — regenerate rather than editing by hand.\n";
  fs.writeFileSync(SEED_PATH, header + "module.exports = " + JSON.stringify(seed, null, 2) + ";\n");

  // Also emit a bundled copy for the static (GitHub Pages) build, which has no
  // backend and seeds localStorage from this JSON.
  const SEED_JSON = path.join(ROOT, "client", "src", "seed-data.json");
  fs.writeFileSync(SEED_JSON, JSON.stringify(seed, null, 2) + "\n");

  console.log(`\nDone. ${seed.length - missed.length}/${seed.length} matched images.`);
  if (missed.length) console.log("Missed:", missed.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
