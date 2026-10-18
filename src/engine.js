// Typing Dojo game engine: pure logic, no DOM, no timers, no globals.
// The controller feeds it keystrokes (typeChar) and elapsed time (tick).

export const PLAYER_MAX_HP = 100;
export const COMBO_CAP = 10;
export const BASE_DAMAGE = 3;
export const STUMBLE_SECONDS = 0.25;
export const INTRO_GRACE_SECONDS = 1;
export const STAR_ACCURACY = 0.92;
export const STAR_HP = 50;

export const TRIALS = Object.freeze([
  { id: 'gate',    name: 'Novice Gate',     rival: 'Gate Keeper',      blurb: 'Short words, slow strikes.',       hp: 60,  attackEvery: 3.0, attackDamage: 6,  minLen: 3, maxLen: 4 },
  { id: 'bamboo',  name: 'Bamboo Grove',    rival: 'Grove Warden',     blurb: 'Warm up your fingers.',            hp: 90,  attackEvery: 2.8, attackDamage: 7,  minLen: 3, maxLen: 5 },
  { id: 'river',   name: 'River Crossing',  rival: 'Ferry Duelist',    blurb: 'Steady rhythm wins the day.',      hp: 130, attackEvery: 2.6, attackDamage: 8,  minLen: 4, maxLen: 5 },
  { id: 'temple',  name: 'Temple Steps',    rival: 'Temple Monk',      blurb: 'Longer words start to appear.',    hp: 170, attackEvery: 2.4, attackDamage: 8,  minLen: 4, maxLen: 6 },
  { id: 'storm',   name: 'Storm Ridge',     rival: 'Storm Caller',     blurb: 'The wind will not wait.',          hp: 220, attackEvery: 2.2, attackDamage: 9,  minLen: 5, maxLen: 6 },
  { id: 'shadow',  name: 'Shadow Hall',     rival: 'Shadow Stalker',   blurb: 'Keep your combo alive.',           hp: 280, attackEvery: 2.2, attackDamage: 8,  minLen: 5, maxLen: 7 },
  { id: 'dragon',  name: "Dragon's Court",  rival: 'Dragon Guard',     blurb: 'Precision under pressure.',        hp: 330, attackEvery: 2.1, attackDamage: 9, minLen: 6, maxLen: 8 },
  { id: 'master',  name: 'The Grandmaster', rival: 'Grandmaster',      blurb: 'The final trial.',                 hp: 400, attackEvery: 2.0, attackDamage: 9, minLen: 6, maxLen: 10 },
].map((t) => Object.freeze(t)));

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

export function pickWord(words, minLen, maxLen, rng, avoid = '') {
  const pool = words.filter((w) => w.length >= minLen && w.length <= maxLen && w !== avoid);
  if (pool.length === 0) {
    throw new Error(`No words with length ${minLen}-${maxLen}`);
  }
  return pool[Math.floor(rng() * pool.length)];
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
