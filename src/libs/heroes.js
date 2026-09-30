
const HEROES = [
  // Human
  { key: "archmage", name: "Archmage", race: "Human", aliases: ["am"] },
  { key: "mountainking", name: "Mountain King", race: "Human", aliases: ["mk"] },
  { key: "paladin", name: "Paladin", race: "Human", aliases: ["pala", "pa", "pn", "pd"] },
  { key: "sorceror", name: "Blood Mage", race: "Human", aliases: ["blm", "bloodmage"] },

  // Orc
  { key: "blademaster", name: "Blademaster", race: "Orc", aliases: ["bm"] },
  { key: "farseer", name: "Far Seer", race: "Orc", aliases: ["fs"] },
  { key: "taurenchieftain", name: "Tauren Chieftain", race: "Orc", aliases: ["tc"] },
  { key: "shadowhunter", name: "Shadow Hunter", race: "Orc", aliases: ["sh"] },

  // Undead
  { key: "deathknight", name: "Death Knight", race: "Undead", aliases: ["dk"] },
  { key: "lich", name: "Lich", race: "Undead", aliases: [] },
  { key: "dreadlord", name: "Dread Lord", race: "Undead", aliases: ["dl"] },
  { key: "cryptlord", name: "Crypt Lord", race: "Undead", aliases: ["cl"] },

  // Night Elf
  { key: "demonhunter", name: "Demon Hunter", race: "Night Elf", aliases: ["dh"] },
  { key: "keeperofthegrove", name: "Keeper of the Grove", race: "Night Elf", aliases: ["kotg"] },
  { key: "priestessofthemoon", name: "Priestess of the Moon", race: "Night Elf", aliases: ["potm"] },
  { key: "warden", name: "Warden", race: "Night Elf", aliases: [] },

  // Neutral (Tavern)
  { key: "alchemist", name: "Goblin Alchemist", race: "Neutral", aliases: ["alch"] },
  { key: "beastmaster", name: "Beastmaster", race: "Neutral", aliases: ["bem"] },
  { key: "avatarofflame", name: "Firelord", race: "Neutral", aliases: ["fl", "firelord"] },
  { key: "bansheeranger", name: "Dark Ranger", race: "Neutral", aliases: ["dr", "darkranger"] },
  { key: "seawitch", name: "Naga Sea Witch", race: "Neutral", aliases: ["nsw", "naga"] },
  { key: "pandarenbrewmaster", name: "Pandaren Brewmaster", race: "Neutral", aliases: ["pb", "panda"] },
  { key: "pitlord", name: "Pit Lord", race: "Neutral", aliases: ["pl"] },
  { key: "tinker", name: "Goblin Tinker", race: "Neutral", aliases: [] },
  {
    key: "forsakenpaladin",
    name: "Forsaken Paladin",
    race: "Neutral",
    aliases: ["fp", "forsaken"],
    apiId: "forsakenpaladin",
  },
];

const ANY_HERO = { key: "all", name: "Any hero (?)", race: "Any", aliases: ["all", "any"] };
const NO_HERO = { key: "none", name: "No hero (✕)", race: "None", aliases: ["none", "no", "x"] };

const normalize = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

const termsOf = (hero) => [hero.key, hero.name, ...hero.aliases].map(normalize);

const LOOKUP = new Map();
for (const hero of [...HEROES, ANY_HERO, NO_HERO]) {
  for (const term of termsOf(hero)) {
    LOOKUP.set(term, hero);
  }
}

function resolveHero(input) {
  return LOOKUP.get(normalize(input)) ?? null;
}


function searchHeroes(query, { limit = 25, exclude = [], allowNone = false } = {}) {
  const q = normalize(query);
  const excluded = new Set(exclude);
  const pool = HEROES.filter((hero) => !excluded.has(hero.key));

  if (!q) {
    return (allowNone ? [NO_HERO, ...pool] : pool).slice(0, limit);
  }

  const candidates = [...pool, ANY_HERO, ...(allowNone ? [NO_HERO] : [])];
  const scored = [];
  for (const hero of candidates) {
    const terms = termsOf(hero);
    let score = 0;
    if (terms.includes(q)) score = 3;
    else if (terms.some((t) => t.startsWith(q))) score = 2;
    else if (terms.some((t) => t.includes(q))) score = 1;
    if (score > 0) scored.push({ hero, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.hero);
}

const toApiId = (hero) => hero.apiId ?? hero.key;

module.exports = { HEROES, ANY_HERO, NO_HERO, resolveHero, searchHeroes, toApiId };