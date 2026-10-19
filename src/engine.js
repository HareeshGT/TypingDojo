// Typing Dojo game engine: pure logic, no DOM, no timers, no globals.
// The controller feeds it keystrokes (typeChar) and elapsed time (tick).

export const PLAYER_MAX_HP = 100;
export const COMBO_CAP = 10;
export const BASE_DAMAGE = 3;
export const STUMBLE_SECONDS = 0.25;
export const INTRO_GRACE_SECONDS = 1;
export const STAR_ACCURACY = 0.92;
export const STAR_HP = 50;

const CHAPTERS = Object.freeze([
  { name: 'Novice Valley', rival: 'Gate Keeper', places: ['Novice Gate','Bamboo Grove','River Crossing','Temple Steps','Storm Ridge','Shadow Hall','Dragon Court','Moon Bridge','Ember Shrine','Grandmaster Gate'] },
  { name: 'Forgotten Kingdom', rival: 'Wandering Knight', places: ['Mossy Ruins','Crystal Pass','Sunken Library','Ironwood Forest','Frostfall Keep','Thunder Road','Obsidian Tower','Phantom Harbor','Starfall Arena','Kingdom Champion'] },
  { name: 'Skybound Isles', rival: 'Sky Duelist', places: ['Cloud Pier','Wind Temple','Falcon Cliffs','Aurora Fields','Storm Citadel','Comet Garden','Celestial Steps','Nimbus Hall','Solar Spire','Sky Sovereign'] },
  { name: 'Spirit Wilds', rival: 'Spirit Guardian', places: ['Whispering Marsh','Foxfire Trail','Moonlit Lake','Ancient Oak','Dreaming Vale','Echo Cavern','Wisp Meadow','Spirit Falls','Elder Sanctuary','Wilds Guardian'] },
  { name: 'Crimson Frontier', rival: 'Crimson Ronin', places: ['Red Sand Pass','Ashen Outpost','Cinder Village','Scorching Bridge','Blood Moon Road','Blazing Canyon','Inferno Gate','Magma Fortress','Phoenix Summit','Crimson Warlord'] },
  { name: 'Frozen Expanse', rival: 'Frost Samurai', places: ['Snowblind Trail','Icebound Camp','Glacier Run','Frozen Orchard','Whiteout Ridge','Crystal Glacier','Winter Palace','Frostfire Hall','Everfrost Citadel','Ice Emperor'] },
  { name: 'Clockwork City', rival: 'Steel Automaton', places: ['Copper Alley','Gearworks Yard','Brass Market','Steamworks Lane','Pendulum Plaza','Clocktower Steps','Foundry District','Mech Arena','Timekeeper Vault','Grand Inventor'] },
  { name: 'Abyssal Depths', rival: 'Abyss Watcher', places: ['Drowned Dock','Coral Maze','Pearl Grotto','Kelp Forest','Trench Crossing','Blackwater Hall','Leviathan Nest','Sunken Throne','Abyssal Gate','Deep Sea Tyrant'] },
  { name: 'Mythic Summit', rival: 'Mythic Champion', places: ['Hero Road','Oracle Garden','Titan Steps','Phoenix Roost','Golem Quarry','Serpent Pass','Godswood Shrine','Eclipse Bridge','Mythic Arena','Legendary Champion'] },
  { name: 'Eternal Dojo', rival: 'Eternal Master', places: ['First Light','Silent Courtyard','Hundred Blades Hall','Perfect Rhythm Path','Mastery Garden','Unbroken Focus','Endless Stairway','Eclipse Sanctuary','Beyond the Veil','The Eternal Grandmaster'] },
]);
export const CHAPTER_OPTIONS = Object.freeze(CHAPTERS.map((chapter) => chapter.name));
export const TRIALS = Object.freeze(Array.from({ length: 100 }, (_, index) => {
  const level = index + 1, chapterIndex = Math.floor(index / 10), withinChapter = index % 10;
  const chapter = CHAPTERS[chapterIndex], boss = withinChapter === 9;
  const minLen = Math.min(9, 3 + Math.floor(index / 12));
  const maxLen = Math.min(10, minLen + (index < 12 ? 1 : 2));
  return Object.freeze({
    id: `level-${level}`, level, chapter: chapter.name, chapterIndex, boss,
    name: chapter.places[withinChapter], rival: boss ? chapter.places[9] : chapter.rival,
    blurb: boss ? `CHAPTER BOSS · ${chapter.name}` : `Level ${level} · ${minLen}–${maxLen} letter words`,
    hp: Math.round(58 + index * 9 + Math.pow(index, 1.35) * 1.25),
    attackEvery: Math.max(1.15, 3.15 - index * 0.018 - chapterIndex * 0.055),
    attackDamage: Math.min(16, 5 + Math.floor(index / 12) + (boss ? 2 : 0)),
    minLen, maxLen,
  });
}));

// ---------- seeded randomness ----------

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSeed() {
  return (Math.random() * 4294967296) >>> 0;
}

// ---------- daily challenge ----------

export function dailyKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailyTrial(key) {
  return Object.freeze({
    id: 'daily',
    level: 0,
    name: 'Daily Challenge',
    rival: 'Wandering Ronin',
    blurb: 'Same words for everyone today.',
    hp: 260,
    attackEvery: 2.0,
    attackDamage: 9,
    minLen: 4,
    maxLen: 8,
    seed: hashString(`typing-dojo:${key}`),
  });
}

// ---------- fights ----------

// Cache length-filtered pools: with a 248k-word corpus, filtering the whole bank
// for every completed word would create avoidable work and garbage collection.
const wordPoolCache = new WeakMap();

export function pickWord(words, minLen, maxLen, rng, avoid = '') {
  let pools = wordPoolCache.get(words);
  if (!pools) {
    pools = new Map();
    wordPoolCache.set(words, pools);
  }
  const key = `${minLen}:${maxLen}`;
  let pool = pools.get(key);
  if (!pool) {
    pool = words.filter((w) => w.length >= minLen && w.length <= maxLen);
    pools.set(key, pool);
  }
  if (pool.length === 0) {
    throw new Error(`No words with length ${minLen}-${maxLen}`);
  }
  let word = pool[Math.floor(rng() * pool.length)];
  if (pool.length > 1 && word === avoid) {
    word = pool[(pool.indexOf(word) + 1 + Math.floor(rng() * (pool.length - 1))) % pool.length];
  }
  return word;
}

export function strikeDamage(wordLength, combo) {
  return Math.round(wordLength * BASE_DAMAGE * (1 + Math.min(combo, COMBO_CAP) * 0.1));
}

export function createFight(trial, words, seed = randomSeed()) {
  const rng = mulberry32(seed);
  return {
    trial,
    words,
    rng,
    status: 'fighting', // 'fighting' | 'won' | 'lost'
    playerHp: PLAYER_MAX_HP,
    enemyHp: trial.hp,
    word: pickWord(words, trial.minLen, trial.maxLen, rng),
    typed: 0,
    attackTimer: -INTRO_GRACE_SECONDS,
    elapsed: 0,
    combo: 0,
    maxCombo: 0,
    keystrokes: 0,
    mistakes: 0,
    correctChars: 0,
    wordsDone: 0,
  };
}

// Handle one typed character. Returns a list of events for the UI.
export function typeChar(state, raw) {
  const events = [];
  if (state.status !== 'fighting') return events;
  const ch = String(raw).toLowerCase();
  if (ch.length !== 1) return events;

  state.keystrokes++;

  if (ch !== state.word[state.typed]) {
    state.mistakes++;
    state.combo = 0;
    state.attackTimer += STUMBLE_SECONDS;
    events.push({ type: 'miss' });
    return events;
  }

  state.typed++;
  state.correctChars++;
  events.push({ type: 'key' });

  if (state.typed === state.word.length) {
    const damage = strikeDamage(state.word.length, state.combo);
    state.enemyHp = Math.max(0, state.enemyHp - damage);
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.wordsDone++;
    events.push({ type: 'strike', damage, combo: state.combo });

    if (state.enemyHp === 0) {
      state.status = 'won';
      events.push({ type: 'win' });
    } else {
      state.word = pickWord(state.words, state.trial.minLen, state.trial.maxLen, state.rng, state.word);
      state.typed = 0;
    }
  }
  return events;
}

// Advance time. Returns a list of events for the UI.
export function tick(state, dt) {
  const events = [];
  if (state.status !== 'fighting' || !(dt > 0)) return events;

  state.elapsed += dt;
  state.attackTimer += dt;

  while (state.attackTimer >= state.trial.attackEvery) {
    state.attackTimer -= state.trial.attackEvery;
    state.playerHp = Math.max(0, state.playerHp - state.trial.attackDamage);
    events.push({ type: 'hurt', damage: state.trial.attackDamage });
    if (state.playerHp === 0) {
      state.status = 'lost';
      events.push({ type: 'lose' });
      break;
    }
  }
  return events;
}

export function summarize(state) {
  const accuracy = state.keystrokes ? (state.keystrokes - state.mistakes) / state.keystrokes : 1;
  const wpm = state.elapsed > 0 ? (state.correctChars / 5) / (state.elapsed / 60) : 0;
  let stars = 0;
  if (state.status === 'won') {
    stars = 1;
    if (accuracy >= STAR_ACCURACY) stars++;
    if (state.playerHp >= STAR_HP) stars++;
  }
  return {
    status: state.status,
    stars,
    accuracy,
    wpm: Math.round(wpm),
    maxCombo: state.maxCombo,
    wordsDone: state.wordsDone,
    elapsed: state.elapsed,
    playerHp: state.playerHp,
  };
}

// ---------- progress ----------

export function emptyProgress() {
  return { unlocked: 1, stars: {}, daily: null };
}

export function sanitizeProgress(raw) {
  const out = emptyProgress();
  if (!raw || typeof raw !== 'object') return out;

  if (Number.isInteger(raw.unlocked)) {
    out.unlocked = Math.min(TRIALS.length, Math.max(1, raw.unlocked));
  }
  if (raw.stars && typeof raw.stars === 'object') {
    for (const t of TRIALS) {
      const s = raw.stars[t.id];
      if (Number.isInteger(s) && s >= 0 && s <= 3) out.stars[t.id] = s;
    }
  }
  const d = raw.daily;
  if (
    d && typeof d === 'object' &&
    typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
    Number.isInteger(d.stars) && d.stars >= 1 && d.stars <= 3 &&
    Number.isFinite(d.wpm) && d.wpm >= 0
  ) {
    out.daily = { date: d.date, stars: d.stars, wpm: Math.round(d.wpm) };
  }
  return out;
}

export function recordResult(progress, trialId, stars) {
  const index = TRIALS.findIndex((t) => t.id === trialId);
  if (index < 0) return progress;
  const next = { ...progress, stars: { ...progress.stars } };
  next.stars[trialId] = Math.max(next.stars[trialId] || 0, stars);
  if (stars > 0) {
    next.unlocked = Math.min(TRIALS.length, Math.max(next.unlocked, index + 2));
  }
  return next;
}

export function recordDaily(progress, key, { stars, wpm }) {
  if (stars < 1) return progress;
  const prev = progress.daily;
  if (prev && prev.date === key && (prev.stars > stars || (prev.stars === stars && prev.wpm >= wpm))) {
    return progress;
  }
  return { ...progress, daily: { date: key, stars, wpm } };
}
