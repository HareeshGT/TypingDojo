// Canvas renderer for the dojo: background, fighters, slashes and floating numbers.
// Pure drawing; it never changes game state.

const W = 800;
const H = 360;
const FLOOR_Y = 292;
const PLAYER_X = 210;
const ENEMY_X = 590;

const PLAYER = {
  robe: '#2f5d8f', pants: '#1d2f4d', belt: '#e9c46a', skin: '#f1ca9d',
  hood: '#1b2233', band: '#e04646', blade: '#e6edf5', accessory: 'none', scale: 1,
};

const FLASH = {
  robe: '#ffffff', pants: '#ffd6d6', belt: '#ffffff', skin: '#ffffff',
  hood: '#ffe0e0', band: '#ffffff', blade: '#ffffff',
};

const ENEMIES = [
  { robe: '#7a7f87', pants: '#4d5159', belt: '#d9d9d9', skin: '#e8bf93', hood: '#3a3d44', band: '#9aa0a8', blade: '#cfd6de', accessory: 'none',    scale: 0.92 },
  { robe: '#3f7a4a', pants: '#2a5233', belt: '#e8d28a', skin: '#e8bf93', hood: '#22402a', band: '#a6d96a', blade: '#dfe8dc', accessory: 'hat',     scale: 0.95 },
  { robe: '#2f7a8a', pants: '#1f4f5a', belt: '#f0e6b0', skin: '#e8bf93', hood: '#1b3f48', band: '#7fd6e0', blade: '#e0f0f4', accessory: 'topknot', scale: 0.98 },
  { robe: '#8a5a2f', pants: '#5a3a1f', belt: '#e8c070', skin: '#e0b48a', hood: '#4a2f18', band: '#f0a050', blade: '#eadfce', accessory: 'beard',   scale: 1.0 },
  { robe: '#5a4a8a', pants: '#3a2f5a', belt: '#d8c8f0', skin: '#e8bf93', hood: '#2a2145', band: '#b08aff', blade: '#e8e0ff', accessory: 'topknot', scale: 1.03 },
  { robe: '#23232d', pants: '#14141b', belt: '#8a2a2a', skin: '#e0b48a', hood: '#0e0e14', band: '#c0392b', blade: '#b8c0cc', accessory: 'none',    scale: 1.06 },
  { robe: '#a83a2a', pants: '#6b2219', belt: '#f2c14e', skin: '#e0b48a', hood: '#4a140e', band: '#f2c14e', blade: '#ffe9c0', accessory: 'horns',   scale: 1.1 },
  { robe: '#e8e0c8', pants: '#b8ae90', belt: '#2a2a2a', skin: '#e8bf93', hood: '#cfc6a8', band: '#2a2a2a', blade: '#ffffff', accessory: 'beard',   scale: 1.15 },
];

const DAILY_STYLE = {
  robe: '#b8892a', pants: '#7a5a1a', belt: '#2a2a2a', skin: '#e8bf93', hood: '#4a3512',
  band: '#2a2a2a', blade: '#fff3c8', accessory: 'hat', scale: 1.05,
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pagoda(g, cx, baseY) {
  g.fillStyle = '#150e24';
  let y = baseY;
  for (let i = 0; i < 4; i++) {
    const w = 64 - i * 11;
    g.fillRect(cx - w / 2 + 6, y - 22, w - 12, 22);
    g.beginPath();
    g.moveTo(cx - w / 2 - 12, y - 20);
    g.quadraticCurveTo(cx, y - 32, cx + w / 2 + 12, y - 20);
    g.lineTo(cx + w / 2 + 4, y - 14);
    g.lineTo(cx - w / 2 - 4, y - 14);
    g.closePath();
    g.fill();
    y -= 24;
  }
  g.fillRect(cx - 1.5, y - 16, 3, 18);
}

function polygon(g, points, fill) {
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

function makeBackground(dpr) {
  const off = document.createElement('canvas');
  off.width = W * dpr;
  off.height = H * dpr;
  const g = off.getContext('2d');
  g.scale(dpr, dpr);

  // sky
  const sky = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  sky.addColorStop(0, '#120d2b');
  sky.addColorStop(0.55, '#3b2250');
  sky.addColorStop(0.85, '#a4506a');
  sky.addColorStop(1, '#e48a62');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // stars
  const rnd = mulberry(7);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`;
    const r = 0.6 + rnd() * 1.1;
    g.beginPath();
    g.arc(rnd() * W, rnd() * 130, r, 0, Math.PI * 2);
    g.fill();
  }

  // moon with glow
  const glow = g.createRadialGradient(600, 90, 20, 600, 90, 130);
  glow.addColorStop(0, 'rgba(255,238,200,0.35)');
  glow.addColorStop(1, 'rgba(255,238,200,0)');
  g.fillStyle = glow;
  g.fillRect(470, -40, 260, 260);
  g.fillStyle = '#fbeecb';
  g.beginPath();
  g.arc(600, 90, 38, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.06)';
  [[588, 80, 9], [612, 102, 7], [606, 72, 5]].forEach(([x, y, r]) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  });

  // mountains
  polygon(g, [[0, FLOOR_Y], [0, 190], [90, 150], [170, 200], [260, 120], [360, 205], [470, 140], [560, 210], [680, 130], [800, 185], [800, FLOOR_Y]], '#2b1d43');
  polygon(g, [[0, FLOOR_Y], [0, 235], [120, 200], [230, 240], [360, 205], [500, 245], [640, 210], [800, 240], [800, FLOOR_Y]], '#1f1535');
  pagoda(g, 130, 252);

  // floor
  const floor = g.createLinearGradient(0, FLOOR_Y, 0, H);
  floor.addColorStop(0, '#6b4a2e');
  floor.addColorStop(1, '#35221a');
  g.fillStyle = floor;
  g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  g.fillStyle = '#9a7048';
  g.fillRect(0, FLOOR_Y, W, 3);
  g.strokeStyle = 'rgba(0,0,0,0.28)';
  g.lineWidth = 1.5;
  for (let row = 0; row < 4; row++) {
    const y = FLOOR_Y + 3 + row * 18;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
    for (let x = (row % 2) * 45; x < W; x += 90) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + 18);
      g.stroke();
    }
  }
  return off;
}

function drawFighter(g, t, x, p, dir, pose) {
  const bob = Math.sin(t * 2.2 + (dir > 0 ? 0 : 1.3)) * 2;
  g.save();
  g.translate(x + dir * (pose.lunge * 64 + pose.tap * 6), FLOOR_Y + pose.fall * 10);
  g.scale(dir * p.scale, p.scale);

  // ground shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(0, 2, 34, 8, 0, 0, Math.PI * 2);
  g.fill();

  g.rotate(-pose.fall * Math.PI / 2.1);
  const c = pose.flash > 0 && Math.floor(t * 30) % 2 === 0 ? FLASH : p;

  g.lineCap = 'round';
  g.lineJoin = 'round';

  // legs
  g.strokeStyle = c.pants;
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(-9, -52); g.lineTo(-18, -2);
  g.moveTo(9, -52); g.lineTo(18 + pose.lunge * 18, -2);
  g.stroke();

  g.translate(0, bob);

  // back arm
  g.strokeStyle = c.robe;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(-12, -100); g.lineTo(-24, -72);
  g.stroke();

  // torso and belt
  g.fillStyle = c.robe;
  rr(g, -22, -112, 44, 62, 14);
  g.fill();
  g.fillStyle = c.belt;
  g.fillRect(-22, -74, 44, 9);
  g.fillRect(4, -72, 8, 16);

  // head
  g.fillStyle = c.hood;
  g.beginPath();
  g.arc(0, -132, 19, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = c.skin;
  rr(g, -6, -139, 24, 11, 5);
  g.fill();
  g.fillStyle = '#1a1a1a';
  g.beginPath();
  g.arc(5, -133, 2.2, 0, Math.PI * 2);
  g.arc(13, -133, 2.2, 0, Math.PI * 2);
  g.fill();

  // headband with fluttering tails
  g.fillStyle = c.band;
  rr(g, -19, -145, 38, 7, 2);
  g.fill();
  g.strokeStyle = c.band;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-19, -142);
  g.quadraticCurveTo(-34, -142 + Math.sin(t * 7) * 5, -46, -135 + Math.sin(t * 7 + 1) * 6);
  g.moveTo(-19, -140);
  g.quadraticCurveTo(-32, -134 + Math.sin(t * 7 + 2) * 5, -42, -124 + Math.sin(t * 7 + 3) * 6);
  g.stroke();

  // accessories
  g.fillStyle = c.hood;
  if (p.accessory === 'hat') {
    g.fillStyle = '#c9a15a';
    g.beginPath();
    g.moveTo(-34, -146); g.lineTo(34, -146); g.lineTo(0, -178);
    g.closePath(); g.fill();
  } else if (p.accessory === 'horns') {
    g.fillStyle = '#f2e8d0';
    g.beginPath();
    g.moveTo(-14, -148); g.lineTo(-20, -172); g.lineTo(-4, -150);
    g.moveTo(14, -148); g.lineTo(20, -172); g.lineTo(4, -150);
    g.fill();
  } else if (p.accessory === 'topknot') {
    g.beginPath();
    g.arc(0, -158, 7, 0, Math.PI * 2);
    g.fill();
  } else if (p.accessory === 'beard') {
    g.fillStyle = '#f4f4f4';
    g.beginPath();
    g.moveTo(-6, -124); g.lineTo(16, -124); g.lineTo(5, -98);
    g.closePath(); g.fill();
  }

  // front arm and blade
  const hx = 36 + pose.lunge * 34;
  const hy = -88 - pose.lunge * 8;
  g.strokeStyle = c.robe;
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(14, -102); g.lineTo(hx, hy);
  g.stroke();
  g.fillStyle = c.skin;
  g.beginPath();
  g.arc(hx, hy, 5, 0, Math.PI * 2);
  g.fill();
  const a = -0.9 + pose.lunge * 0.7;
  g.strokeStyle = c.blade;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(hx, hy);
  g.lineTo(hx + Math.cos(a) * 54, hy + Math.sin(a) * 54);
  g.stroke();
  g.strokeStyle = '#e9c46a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(hx + Math.cos(a + Math.PI / 2) * 7, hy + Math.sin(a + Math.PI / 2) * 7);
  g.lineTo(hx - Math.cos(a + Math.PI / 2) * 7, hy - Math.sin(a + Math.PI / 2) * 7);
  g.stroke();

  g.restore();
}

export class Scene {
  constructor(canvas, reducedMotion = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = reducedMotion;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * this.dpr;
    canvas.height = H * this.dpr;
    this.bg = makeBackground(this.dpr);
    this.enemyStyle = ENEMIES[0];
    this.reset();
  }

  reset() {
    this.t = 0;
    this.playerLunge = 0;
    this.enemyLunge = 0;
    this.tap = 0;
    this.playerFlash = 0;
    this.enemyFlash = 0;
    this.playerFall = 0;
    this.enemyFall = 0;
    this.shake = 0;
    this.missFlash = 0;
    this.slashes = [];
    this.floaters = [];
  }

  setEnemy(index) {
    this.enemyStyle = index < 0 ? DAILY_STYLE : ENEMIES[index % ENEMIES.length];
    this.reset();
  }

  keyTap() {
    this.tap = 1;
  }

  playerStrike(damage, combo) {
    this.playerLunge = 1;
    this.enemyFlash = 0.3;
    this.shake = Math.max(this.shake, 3 + Math.min(combo, 10) * 0.6);
    this.slashes.push({ x: ENEMY_X, y: FLOOR_Y - 90, age: 0, life: 0.28, color: '#fff8d6', glow: '#ffd36a', flip: 1 });
    this.floaters.push({
      x: ENEMY_X + (Math.random() - 0.5) * 40, y: FLOOR_Y - 170, text: `-${damage}`,
      age: 0, life: 0.9, color: '#ffe08a', size: 26 + Math.min(combo, 10) * 1.5,
    });
    if (combo >= 3) {
      this.floaters.push({ x: PLAYER_X, y: FLOOR_Y - 180, text: `x${combo}`, age: 0, life: 0.9, color: '#ff9a4a', size: 24 });
    }
  }

  enemyStrike(damage) {
    this.enemyLunge = 1;
    this.playerFlash = 0.3;
    this.shake = Math.max(this.shake, 7);
    this.slashes.push({ x: PLAYER_X, y: FLOOR_Y - 90, age: 0, life: 0.28, color: '#ffd0d0', glow: '#ff4a4a', flip: -1 });
    this.floaters.push({ x: PLAYER_X, y: FLOOR_Y - 170, text: `-${damage}`, age: 0, life: 0.9, color: '#ff6a6a', size: 28 });
  }

  miss() {
    this.shake = Math.max(this.shake, 2);
    this.missFlash = 0.15;
  }

  update(dt, state) {
    this.t += dt;
    const dec = (v, rate) => Math.max(0, v - dt * rate);
    this.playerLunge = dec(this.playerLunge, 5);
    this.enemyLunge = dec(this.enemyLunge, 5);
    this.tap = dec(this.tap, 12);
    this.playerFlash = dec(this.playerFlash, 1);
    this.enemyFlash = dec(this.enemyFlash, 1);
    this.shake = dec(this.shake, 20);
    this.missFlash = dec(this.missFlash, 1);
    this.slashes.forEach((s) => { s.age += dt; });
    this.slashes = this.slashes.filter((s) => s.age < s.life);
    this.floaters.forEach((f) => { f.age += dt; });
    this.floaters = this.floaters.filter((f) => f.age < f.life);
    if (state.status === 'won') this.enemyFall = Math.min(1, this.enemyFall + dt * 1.6);
    if (state.status === 'lost') this.playerFall = Math.min(1, this.playerFall + dt * 1.6);
  }

  draw(state) {
    const g = this.ctx;
    const t = this.t;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    if (!this.reduced && this.shake > 0) {
      g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    g.drawImage(this.bg, 0, 0, W, H);

    this.drawLanterns(g, t);
    this.drawPetals(g, t);

    const progress = clamp01(Math.max(0, state.attackTimer) / state.trial.attackEvery);
    const windup = state.status === 'fighting' ? clamp01((progress - 0.7) / 0.3) : 0;

    drawFighter(g, t, ENEMY_X, this.enemyStyle, -1, {
      lunge: this.enemyLunge - windup * 0.3,
      tap: 0,
      fall: this.enemyFall,
      flash: this.reduced ? 0 : this.enemyFlash,
    });
    drawFighter(g, t, PLAYER_X, PLAYER, 1, {
      lunge: this.playerLunge,
      tap: this.tap,
      fall: this.playerFall,
      flash: this.reduced ? 0 : this.playerFlash,
    });

    if (windup > 0.5 && Math.floor(t * 10) % 2 === 0) {
      g.fillStyle = '#ff5a5a';
      g.font = '800 44px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('!', ENEMY_X, FLOOR_Y - 215 * this.enemyStyle.scale);
    }

    this.drawSlashes(g);
    this.drawFloaters(g);

    if (this.missFlash > 0 && !this.reduced) {
      g.fillStyle = `rgba(255,60,60,${this.missFlash * 0.8})`;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  }

  drawLanterns(g, t) {
    [[56, 78], [744, 78]].forEach(([x, y], i) => {
      const flicker = 0.35 + Math.sin(t * 5 + i * 2) * 0.06 + Math.sin(t * 13 + i) * 0.03;
      g.strokeStyle = '#2a1a1a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, 0); g.lineTo(x, y - 20);
      g.stroke();
      const glow = g.createRadialGradient(x, y, 4, x, y, 70);
      glow.addColorStop(0, `rgba(255,170,80,${flicker})`);
      glow.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = glow;
      g.fillRect(x - 70, y - 70, 140, 140);
      g.fillStyle = '#c53a2e';
      rr(g, x - 14, y - 20, 28, 40, 10);
      g.fill();
      g.fillStyle = '#e9c46a';
      g.fillRect(x - 10, y - 23, 20, 4);
      g.fillRect(x - 10, y + 19, 20, 4);
    });
  }

  drawPetals(g, t) {
    g.fillStyle = 'rgba(244,166,192,0.8)';
    for (let i = 0; i < 16; i++) {
      const speed = 0.6 + (i % 3) * 0.2;
      const x = ((i * 53 + t * 18 * speed) % (W + 40)) - 20 + Math.sin(t * 1.5 + i) * 12;
      const y = (i * 37 + t * (24 + (i % 4) * 6)) % (H - 60);
      g.beginPath();
      g.ellipse(x, y, 4, 2.2, t + i, 0, Math.PI * 2);
      g.fill();
    }
  }

  drawSlashes(g) {
    g.lineCap = 'round';
    this.slashes.forEach((s) => {
      const k = s.age / s.life;
      g.save();
      g.globalAlpha = 1 - k;
      g.strokeStyle = s.color;
      g.shadowColor = s.glow;
      g.shadowBlur = 14;
      g.lineWidth = 7 * (1 - k) + 1;
      g.beginPath();
      g.moveTo(s.x - 50 * s.flip, s.y + 40);
      g.quadraticCurveTo(s.x, s.y - 30 - k * 20, s.x + 50 * s.flip, s.y - 40);
      g.stroke();
      g.restore();
    });
  }

  drawFloaters(g) {
    g.textAlign = 'center';
    g.lineJoin = 'round';
    this.floaters.forEach((f) => {
      const k = f.age / f.life;
      g.globalAlpha = 1 - k * k;
      g.font = `800 ${f.size}px system-ui, sans-serif`;
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(20,10,30,0.85)';
      g.strokeText(f.text, f.x, f.y - k * 50);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, f.y - k * 50);
    });
    g.globalAlpha = 1;
  }
}
