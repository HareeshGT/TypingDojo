// Typing Dojo controller: wires the engine to the DOM, canvas scene, sound and storage.
import {
  TRIALS, PLAYER_MAX_HP, createFight, typeChar, tick, summarize,
  dailyKey, dailyTrial, emptyProgress, sanitizeProgress, recordResult, recordDaily,
} from './engine.js';
import { WORDS } from './words.js';
import { Scene } from './scene.js';
import { Sound } from './sound.js';

const STORAGE_KEY = 'typing-dojo:v1';
const MUTE_KEY = 'typing-dojo:muted';
const RESULT_DELAY_MS = 1000;

const $ = (id) => document.getElementById(id);

const el = {
  menu: $('screen-menu'), fight: $('screen-fight'),
  dailyCard: $('daily-card'), trialList: $('trial-list'), reset: $('btn-reset'),
  retreat: $('btn-retreat'), fightTitle: $('fight-title'), rival: $('rival-name'),
  hpPlayer: $('hp-player'), hpEnemy: $('hp-enemy'),
  hpPlayerText: $('hp-player-text'), hpEnemyText: $('hp-enemy-text'),
  barPlayer: $('bar-player'), barEnemy: $('bar-enemy'),
  stage: $('stage'), meter: $('meter'),
  word: $('word'), wordDone: $('word-done'), wordCur: $('word-cur'), wordRest: $('word-rest'),
  combo: $('stat-combo'), wpm: $('stat-wpm'), time: $('stat-time'), kbd: $('kbd'),
  modal: $('modal'), modalTitle: $('modal-title'), modalSub: $('modal-sub'),
  modalStars: $('modal-stars'), modalStats: $('modal-stats'),
  next: $('modal-next'), retry: $('modal-retry'), toMenu: $('modal-menu'),
};

// ---------- storage (always guarded: it can be blocked or full) ----------

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

function saveMuted(m) {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

// ---------- state ----------

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new Scene(el.stage, reducedMotion);
const sound = new Sound();
sound.muted = loadMuted();

let progress = loadProgress();
let run = null; // { state, trial, daily, dailyKey, index, ended }
let raf = 0;
let lastTs = 0;
let hud = {};

// ---------- helpers ----------

const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showScreen(name) {
  el.menu.hidden = name !== 'menu';
  el.fight.hidden = name !== 'fight';
}

function renderMute() {
  document.querySelectorAll('.js-mute').forEach((b) => {
    b.textContent = sound.muted ? 'Sound: off' : 'Sound: on';
  });
}

// ---------- menu ----------

function renderMenu() {
  el.trialList.replaceChildren();
  TRIALS.forEach((trial, i) => {
    const locked = i >= progress.unlocked;
    const stars = progress.stars[trial.id] || 0;
    const li = make('li');
    const btn = make('button', 'trial-card');
    btn.type = 'button';
    btn.disabled = locked;
    btn.append(make('span', 'trial-num', String(i + 1)));

    const body = make('span', 'trial-body');
    body.append(make('span', 'trial-name', trial.name));
    body.append(make('span', 'trial-blurb', locked ? 'Locked: win the previous trial.' : trial.blurb));
    btn.append(body);

    const s = make('span', 'trial-stars', locked ? 'Locked' : starText(stars));
    if (!locked) s.setAttribute('aria-label', `${stars} of 3 stars`);
    btn.append(s);

    btn.addEventListener('click', () => startFight(trial, { index: i }));
    li.append(btn);
    el.trialList.append(li);
  });

  const key = dailyKey();
  const today = progress.daily && progress.daily.date === key ? progress.daily : null;
  el.dailyCard.replaceChildren(
    make('span', 'daily-title', 'Daily Challenge'),
    make('span', 'daily-sub', today
      ? `Best today: ${starText(today.stars)} · ${today.wpm} WPM`
      : 'Same words for everyone today. Beat your best.'),
  );
}

// ---------- fight ----------

function startFight(trial, { daily = false, index = -1 } = {}) {
  sound.unlock();
  cancelAnimationFrame(raf);
  const key = dailyKey();
  const fightTrial = daily ? dailyTrial(key) : trial;
  run = {
    state: createFight(fightTrial, WORDS, daily ? fightTrial.seed : undefined),
    trial: fightTrial, daily, dailyKey: key, index, ended: false,
  };
  hud = {};
  scene.setEnemy(daily ? -1 : index);
  el.modal.hidden = true;
  showScreen('fight');
  el.fightTitle.textContent = fightTrial.name;
  el.rival.textContent = fightTrial.rival;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  el.kbd.focus({ preventScroll: true });
  lastTs = performance.now();
  raf = requestAnimationFrame(frame);
}

function leaveFight() {
  cancelAnimationFrame(raf);
  run = null;
  el.modal.hidden = true;
  showScreen('menu');
  renderMenu();
}

function frame(ts) {
  if (!run) return;
  const dt = Math.max(0, Math.min(0.1, (ts - lastTs) / 1000));
  lastTs = ts;
  const s = run.state;
  if (s.status === 'fighting') handle(tick(s, dt));
  scene.update(dt, s);
  scene.draw(s);
  renderHud(s);

  if (s.status !== 'fighting' && !run.ended) {
    run.ended = true;
    const r = run;
    setTimeout(() => { if (run === r) showResult(r); }, RESULT_DELAY_MS);
  }
  raf = requestAnimationFrame(frame);
}

function handle(events) {
  for (const e of events) {
    switch (e.type) {
      case 'key': sound.key(); scene.keyTap(); break;
      case 'miss': sound.miss(); scene.miss(); shakeWord(); break;
      case 'strike': sound.strike(); scene.playerStrike(e.damage, e.combo); break;
      case 'hurt': sound.hurt(); scene.enemyStrike(e.damage); break;
      case 'win': sound.win(); break;
      case 'lose': sound.lose(); break;
      default: break;
    }
  }
}

function shakeWord() {
  if (reducedMotion) return;
  el.word.classList.remove('shake');
  void el.word.offsetWidth; // restart the animation
  el.word.classList.add('shake');
}

function press(ch) {
  if (!run || run.state.status !== 'fighting') return;
  handle(typeChar(run.state, ch));
}

function setText(key, node, value) {
  if (hud[key] !== value) {
    hud[key] = value;
    node.textContent = value;
  }
}

function setBar(key, fill, bar, pct) {
  const rounded = Math.round(pct);
  if (hud[key] !== rounded) {
    hud[key] = rounded;
    fill.style.width = `${rounded}%`;
    fill.classList.toggle('low', rounded < 30);
    bar.setAttribute('aria-valuenow', String(rounded));
  }
}

function renderHud(s) {
  setBar('php', el.hpPlayer, el.barPlayer, (s.playerHp / PLAYER_MAX_HP) * 100);
  setBar('ehp', el.hpEnemy, el.barEnemy, (s.enemyHp / s.trial.hp) * 100);
  setText('phpt', el.hpPlayerText, String(Math.ceil(s.playerHp)));
  setText('ehpt', el.hpEnemyText, `${Math.ceil(s.enemyHp)} / ${s.trial.hp}`);

  const wordKey = `${s.word}|${s.typed}`;
  if (hud.word !== wordKey) {
    hud.word = wordKey;
    el.wordDone.textContent = s.word.slice(0, s.typed);
    el.wordCur.textContent = s.word.charAt(s.typed);
    el.wordRest.textContent = s.word.slice(s.typed + 1);
    el.word.setAttribute('aria-label', `Type the word ${s.word}`);
  }

  setText('combo', el.combo, String(s.combo));
  setText('wpm', el.wpm, s.elapsed > 2 ? String(Math.round((s.correctChars / 5) / (s.elapsed / 60))) : '–');
  setText('time', el.time, fmtTime(s.elapsed));

  const meter = Math.round(Math.max(0, Math.min(1, s.attackTimer / s.trial.attackEvery)) * 100);
  if (hud.meter !== meter) {
    hud.meter = meter;
    el.meter.style.width = `${meter}%`;
  }
}

// ---------- result ----------

function showResult(r) {
  const s = summarize(r.state);
  const won = s.status === 'won';
  if (won) {
    progress = r.daily ? recordDaily(progress, r.dailyKey, s) : recordResult(progress, r.trial.id, s.stars);
    saveProgress(progress);
  }

  el.modalTitle.textContent = won ? 'Victory!' : 'Defeated';
  if (won) {
    el.modalSub.textContent = r.daily
      ? 'Daily challenge cleared.'
      : r.index === TRIALS.length - 1 ? 'You have mastered the dojo.' : `${r.trial.rival} yields.`;
  } else {
    el.modalSub.textContent = `${r.trial.rival} was too quick. Try again.`;
  }
  el.modalStars.textContent = starText(s.stars);
  el.modalStars.setAttribute('aria-label', `${s.stars} of 3 stars`);

  el.modalStats.replaceChildren();
  [
    ['Speed', `${s.wpm} WPM`],
    ['Accuracy', `${Math.round(s.accuracy * 100)}%`],
    ['Best combo', String(s.maxCombo)],
    ['Time', fmtTime(s.elapsed)],
  ].forEach(([label, value]) => {
    const row = make('div', 'stat-row');
    row.append(make('dt', '', label), make('dd', '', value));
    el.modalStats.append(row);
  });

  const hasNext = won && !r.daily && r.index < TRIALS.length - 1;
  el.next.hidden = !hasNext;
  el.modal.hidden = false;
  (hasNext ? el.next : el.retry).focus();
}

// ---------- input ----------

document.addEventListener('keydown', (e) => {
  if (!run) return;
  if (e.key === 'Escape') {
    leaveFight();
    return;
  }
  if (run.state.status !== 'fighting') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1) {
    e.preventDefault();
    press(e.key);
  }
});

// Mobile keyboards often report key "Unidentified"; fall back to the input event.
el.kbd.addEventListener('input', () => {
  const v = el.kbd.value;
  el.kbd.value = '';
  for (const ch of v) press(ch);
});

el.fight.addEventListener('pointerdown', () => {
  if (run && run.state.status === 'fighting') el.kbd.focus({ preventScroll: true });
});

// ---------- buttons ----------

el.dailyCard.addEventListener('click', () => startFight(null, { daily: true }));
el.retreat.addEventListener('click', leaveFight);
el.toMenu.addEventListener('click', leaveFight);
el.retry.addEventListener('click', () => {
  if (run) startFight(run.trial, { daily: run.daily, index: run.index });
});
el.next.addEventListener('click', () => {
  if (run) startFight(TRIALS[run.index + 1], { index: run.index + 1 });
});
el.reset.addEventListener('click', () => {
  if (window.confirm('Erase all stars and progress?')) {
    progress = emptyProgress();
    saveProgress(progress);
    renderMenu();
  }
});
document.querySelectorAll('.js-mute').forEach((b) => {
  b.addEventListener('click', () => {
    sound.muted = !sound.muted;
    saveMuted(sound.muted);
    renderMute();
  });
});

// ---------- boot ----------

renderMute();
renderMenu();
showScreen('menu');
