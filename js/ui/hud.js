// Cabecera, medidor de aguja, contador de yenes y monitor ECG.
import { CONFIG } from '../config.js';
import { formatYen, gameLabel, turnLabel, mmLabel } from '../format.js';
import { SIDE_NAMES } from '../lines.js';
import { prefersReducedMotion } from './fx.js';

const $ = (id) => document.getElementById(id);
const pct = (mm) => `${(Math.max(0, Math.min(mm, CONFIG.NEEDLE_MAX)) / CONFIG.NEEDLE_MAX) * 100}%`;

export function renderHud(state) {
  $('hud-game').textContent = gameLabel(state.game);
  const side = $('hud-side');
  side.dataset.side = state.kaijiSide;
  side.textContent = SIDE_NAMES[state.kaijiSide].jp;
  side.title = SIDE_NAMES[state.kaijiSide].es;
  $('hud-bet').textContent = state.bet ? mmLabel(state.bet) : '—';
  $('hud-turn').textContent = turnLabel(state.turn);
}

export function setOrder(first) {
  const el = $('order');
  if (first === 'kaiji') el.textContent = '先 · Pones tú primero';
  else if (first === 'tonegawa') el.textContent = '後 · Tonegawa pone primero';
  else el.textContent = '最終 · Quinto turno';
}

/** Coloca la aguja en `mm`. Con `delta > 0` salta un «+N mm» junto al aparato. */
export function setNeedle(mm, { delta = 0 } = {}) {
  const d = $('device');
  d.style.setProperty('--needle-pct', pct(mm));
  d.dataset.danger = String(mm >= 20);
  d.setAttribute('aria-label', `Aparato del oído: aguja a ${mm} milímetros`);
  $('device-value').textContent = mmLabel(mm);
  if (delta > 0) {
    const pop = document.createElement('span');
    pop.className = 'needle-pop';
    pop.setAttribute('aria-hidden', 'true');
    pop.textContent = `+${mmLabel(delta)}`;
    d.append(pop);
    setTimeout(() => pop.remove(), 1900);
  }
}

/** Aguja fantasma: dónde quedaría la aguja si pierdes `bet` mm. */
export function setGhost(needle, bet) {
  const d = $('device');
  d.style.setProperty('--ghost-start', pct(needle));
  d.style.setProperty('--ghost-pct', bet ? pct(Math.min(bet, CONFIG.NEEDLE_MAX - needle)) : '0%');
}

export function setYen(yen, { animate = false } = {}) {
  const el = $('hud-yen');
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(yen);
  if (!animate || from === yen || prefersReducedMotion()) {
    el.textContent = formatYen(yen);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const dur = 1000;
    const frame = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = formatYen(Math.round((from + (yen - from) * eased) / 10_000) * 10_000);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = formatYen(yen);
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

/**
 * Monitor ECG con barrido. `onBeat(bpm, spike)` se llama en cada latido.
 * @returns {{start(): void, stop(): void, setBpm(n: number): void, setSpike(b: boolean): void}}
 */
export function createEcg(canvas, { onBeat } = {}) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const base = H * 0.62;
  let bpmValue = 72;
  let spike = false;
  let running = false;
  let raf = 0;
  let last = 0;
  let sinceBeat = 0;
  let x = 0;
  let prevY = base;

  const wave = (s) => {
    const amp = spike ? 1 : 0.6;
    if (s < 0.08) return 0;
    if (s < 0.16) return 0.1 * Math.sin(((s - 0.08) / 0.08) * Math.PI);
    if (s < 0.19) return 0;
    if (s < 0.21) return -0.12 * ((s - 0.19) / 0.02);
    if (s < 0.24) return -0.12 + (amp + 0.12) * ((s - 0.21) / 0.03);
    if (s < 0.27) return amp - (amp + 0.28) * ((s - 0.24) / 0.03);
    if (s < 0.3) return -0.28 + 0.28 * ((s - 0.27) / 0.03);
    if (s < 0.42) return 0;
    if (s < 0.58) return 0.2 * Math.sin(((s - 0.42) / 0.16) * Math.PI);
    return 0;
  };

  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const steps = Math.max(1, Math.round(dt * 140));
    g.strokeStyle = '#5cff8a';
    g.lineWidth = 2;
    g.shadowColor = '#5cff8a';
    g.shadowBlur = 6;
    for (let i = 0; i < steps; i++) {
      sinceBeat += dt / steps;
      if (sinceBeat >= 60 / bpmValue) {
        sinceBeat = 0;
        onBeat?.(bpmValue, spike);
      }
      const y = base - wave(sinceBeat) * H * 0.55 + (Math.random() - 0.5) * 1.2;
      g.clearRect(x + 1, 0, 16, H);
      g.beginPath();
      g.moveTo(x, prevY);
      g.lineTo(x + 1, y);
      g.stroke();
      prevY = y;
      x = x + 1 >= W ? 0 : x + 1;
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    setBpm(n) {
      bpmValue = Math.max(40, Math.min(200, n));
    },
    setSpike(b) {
      spike = b;
    },
  };
}
