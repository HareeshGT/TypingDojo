// Tiny WebAudio sound effects. No audio files; everything is synthesized.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Must be called from a user gesture (click / key press).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, { type = 'square', vol = 0.05, to = null, delay = 0 } = {}) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  key() { this.tone(520, 0.04, { type: 'triangle', vol: 0.03 }); }
  miss() { this.tone(110, 0.08, { type: 'square', vol: 0.04 }); }
  strike() {
    this.tone(320, 0.14, { type: 'sawtooth', vol: 0.05, to: 110 });
    this.tone(880, 0.06, { type: 'triangle', vol: 0.03 });
  }
  hurt() { this.tone(170, 0.22, { type: 'square', vol: 0.05, to: 60 }); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.05, delay: i * 0.12 })); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, { type: 'sawtooth', vol: 0.04, delay: i * 0.16 })); }
}
