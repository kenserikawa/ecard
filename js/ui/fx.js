// Efectos de manga: ざわ…ざわ…, ぐにゃあ, líneas cinéticas, destellos, sacudidas, ドクン.
const $ = (id) => document.getElementById(id);

export const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function restartClass(el, cls, ms) {
  el.classList.remove(cls);
  void el.offsetWidth; // fuerza reflow para reiniciar la animación
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/** Lanza `count` ざわ que derivan por la pantalla. */
export function zawa({ count = 6, duration = 2400 } = {}) {
  const layer = $('zawa');
  if (!layer) return;
  const base = Math.min(innerWidth, innerHeight);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'zawa';
    el.textContent = Math.random() < 0.5 ? 'ざわ…' : 'ざわ';
    el.style.left = `${2 + Math.random() * 78}%`;
    el.style.top = `${6 + Math.random() * 78}%`;
    el.style.fontSize = `${Math.round(base * (0.05 + Math.random() * 0.06))}px`;
    el.style.setProperty('--rot', `${Math.round(-18 + Math.random() * 36)}deg`);
    el.style.setProperty('--dx', `${Math.round(-40 + Math.random() * 80)}px`);
    el.style.setProperty('--dy', `${Math.round(-30 - Math.random() * 50)}px`);
    el.style.setProperty('--dur', `${duration}ms`);
    el.style.animationDelay = `${i * 150}ms`;
    layer.append(el);
    setTimeout(() => el.remove(), duration + i * 150 + 200);
  }
}

export function flash(color = 'var(--blood)', ms = 500) {
  const fx = $('fx');
  fx.style.setProperty('--fx-color', color);
  fx.style.setProperty('--fx-ms', `${ms}ms`);
  restartClass(fx, 'is-flash', ms);
}

export function speedLines() {
  if (prefersReducedMotion()) return;
  restartClass($('fx'), 'is-lines', 700);
}

export function shake(el = $('stage')) {
  if (prefersReducedMotion()) return;
  restartClass(el, 'is-shaking', 500);
}

/** ぐにゃあ: la escena se deforma con un filtro SVG de turbulencia. */
export function gunya(strength = 1, ms = 1800) {
  if (prefersReducedMotion()) {
    flash('#000', 600);
    return wait(600);
  }
  const stage = $('stage');
  const map = $('gunya-map');
  const noise = $('gunya-noise');
  stage.classList.add('is-gunya');
  const peak = 40 * strength;
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / ms, 1);
      map.setAttribute('scale', (Math.sin(p * Math.PI) * peak).toFixed(1));
      noise.setAttribute('baseFrequency', `${(0.008 + p * 0.006).toFixed(4)} ${(0.03 - p * 0.012).toFixed(4)}`);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        map.setAttribute('scale', '0');
        stage.classList.remove('is-gunya');
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

/** ドクン junto a la carta seleccionada: el corazón de Kaiji. */
export function dokun(anchor, text = 'ドクン') {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'dokun';
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = `${Math.round(r.left + r.width * 0.55)}px`;
  el.style.top = `${Math.round(r.top - 18)}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 950);
}
