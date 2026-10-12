// Pantallas a pantalla completa (#overlay) y diálogo de reglas (#rules). Todas devuelven promesas.
import { CONFIG } from '../config.js';
import { maxBet, payout } from '../rules.js';
import { formatYen, gameLabel } from '../format.js';
import { PROLOGUE, DISCOVERY, ENDINGS, RULES, SIDE_NAMES } from '../lines.js';
import { createCard } from './table.js';
import { zawa } from './fx.js';

const $ = (id) => document.getElementById(id);

/** Constructor de DOM mínimo. Texto siempre como nodo de texto (nunca HTML). */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function open(content, { whiteout = false } = {}) {
  const o = $('overlay');
  o.classList.toggle('is-whiteout', whiteout);
  o.replaceChildren(content);
  o.hidden = false;
  o.scrollTop = 0;
  requestAnimationFrame(() => content.querySelector('[data-autofocus]')?.focus());
}

export function close() {
  const o = $('overlay');
  o.hidden = true;
  o.classList.remove('is-whiteout');
  o.replaceChildren();
}

const DEVICE_SVG = `<svg viewBox="0 0 200 200" role="img" aria-label="Aparato del oído">
  <rect width="200" height="200" fill="#efe9dc"/>
  <path d="M62 42c40-34 108-8 98 52-6 34-44 34-44 66 0 22-30 30-42 10" fill="none" stroke="#0b0b0d" stroke-width="9" stroke-linecap="round"/>
  <path d="M88 74c22-14 44 6 32 28" fill="none" stroke="#0b0b0d" stroke-width="6" stroke-linecap="round"/>
  <rect x="120" y="92" width="72" height="28" rx="4" fill="#23232c" stroke="#0b0b0d" stroke-width="4"/>
  <path d="M120 106H82" stroke="#8a96a3" stroke-width="5"/>
  <path d="M82 102l-12 4 12 4z" fill="#b3121b"/>
  <text x="156" y="146" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="700" fill="#b3121b">30mm</text>
</svg>`;

function artFor(p) {
  if (p.device) {
    const svg = new DOMParser().parseFromString(DEVICE_SVG, 'image/svg+xml').documentElement;
    return h('div', { class: 'panel__art panel__art--color' }, document.importNode(svg, true));
  }
  if (!p.art) return null;
  return h('div', { class: `panel__art${p.color ? ' panel__art--color' : ''}` }, h('img', { src: p.art, alt: '' }));
}

/** Viñeta de manga con botón de avance. Resuelve 'next' o 'skip'. */
export function showPanel(p, { index = 0, total = 0, skippable = false, next = '次へ', nextEs = 'Seguir' } = {}) {
  return new Promise((resolve) => {
    const art = artFor(p);
    const body = h('div', {},
      h('span', { class: 'panel__who', text: p.who }),
      h('p', { class: 'panel__jp', text: p.jp }),
      p.es ? h('p', { class: 'panel__es', text: p.es }) : null,
      p.items ? h('ul', { class: 'panel__es' }, p.items.map((i) => h('li', { text: i }))) : null);
    const panel = h('div', {
      class: `panel${p.narrator ? ' panel--narrator' : ''}${art ? '' : ' panel--solo'}`,
      style: `--tilt:${index % 2 ? 0.6 : -0.6}deg`,
    }, art, body);
    const actions = h('div', { class: 'screen__actions' },
      h('button', { class: 'btn', type: 'button', 'data-autofocus': true, onclick: () => resolve('next') }, next, h('small', { text: nextEs })),
      skippable ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => resolve('skip') }, 'Saltar') : null);
    open(h('div', { class: 'screen' }, panel, actions, total ? h('p', { class: 'screen__note', text: `${index + 1} / ${total}` }) : null));
  });
}

export function showTitle({ record }) {
  return new Promise((resolve) => {
    const cards = h('div', { class: 'title__cards', 'aria-hidden': 'true' },
      ['emperor', 'citizen', 'slave'].map((c, i) => {
        const el = createCard(c);
        el.style.setProperty('--rot', `${(i - 1) * 9}deg`);
        return el;
      }));
    const rec = record?.bestEnding
      ? h('p', { class: 'screen__note', text: `Récord: ${formatYen(record.bestYen)} · ${ENDINGS[record.bestEnding].jp}` })
      : null;
    open(h('div', { class: 'screen title' },
      h('p', { class: 'title__kicker', text: '賭博黙示録' }),
      h('h1', { class: 'title__logo', text: 'Eカード' }),
      cards,
      h('p', { class: 'title__tag', text: 'Emperador, Ciudadano, Esclavo. Tonegawa pone el dinero; tú pones el oído.' }),
      h('div', { class: 'screen__actions' },
        h('button', { class: 'btn btn--blood', type: 'button', 'data-autofocus': true, onclick: () => { close(); resolve(); } },
          '勝負', h('small', { text: 'Jugar' })),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => showRules() }, 'ルール', h('small', { text: 'Reglas' }))),
      rec));
    zawa({ count: 5 });
  });
}

export async function showPrologue() {
  for (const [i, p] of PROLOGUE.entries()) {
    const r = await showPanel(p, { index: i, total: PROLOGUE.length, skippable: true });
    if (r === 'skip') break;
  }
  close();
}

/**
 * Pantalla de apuesta. Resuelve con los mm elegidos.
 * @param {{needle: number, side: string, game: number, onPreview?: (mm: number) => void}} opts
 */
export function askBet({ needle, side, game, onPreview }) {
  return new Promise((resolve) => {
    const max = maxBet(needle);
    let value = 1;
    const valueEl = h('span', { class: 'bet__value', 'aria-live': 'polite' });
    const range = h('input', { class: 'bet__range', type: 'range', min: 1, max, step: 1, 'aria-label': 'Milímetros a apostar' });
    const winEl = h('strong');
    const loseEl = h('span');
    const warn = h('p', { class: 'bet__warn', role: 'alert' });
    const set = (v) => {
      value = Math.max(1, Math.min(max, Math.round(v) || 1));
      valueEl.replaceChildren(String(value), h('small', { text: 'mm' }));
      range.value = String(value);
      winEl.textContent = formatYen(payout(side, value));
      const after = needle + value;
      loseEl.textContent = `la aguja llega a ${after} mm`;
      warn.textContent = after >= CONFIG.NEEDLE_MAX
        ? '三半規管 · Si pierdes, la aguja atraviesa el oído entero.'
        : after >= CONFIG.NEEDLE_EARDRUM ? '鼓膜 · Si pierdes, se perfora el tímpano. Fin.' : '';
      warn.classList.toggle('is-canals', after >= CONFIG.NEEDLE_MAX);
      onPreview?.(value);
    };
    range.addEventListener('input', () => set(Number(range.value)));
    const chips = [...new Set([1, 5, 10, max])].filter((v) => v <= max).map((v) =>
      h('button', { class: 'chip', type: 'button', onclick: () => set(v) }, v === max ? 'MAX' : String(v)));
    open(h('div', { class: 'screen bet' },
      h('p', { class: 'screen__note', text: `${gameLabel(game)} / 12` }),
      h('h2', { class: 'bet__kanji', text: '賭けろ' }),
      h('p', { class: 'bet__side', text: `${SIDE_NAMES[side].jp} · ${SIDE_NAMES[side].es} · ${formatYen(payout(side, 1))}/mm` }),
      h('div', { class: 'bet__dial' },
        h('button', { class: 'btn bet__step', type: 'button', 'aria-label': 'Un milímetro menos', onclick: () => set(value - 1) }, '−'),
        valueEl,
        h('button', { class: 'btn bet__step', type: 'button', 'aria-label': 'Un milímetro más', onclick: () => set(value + 1) }, '+')),
      range,
      h('div', { class: 'bet__chips' }, chips),
      h('div', { class: 'bet__preview' }, h('span', {}, 'Si ganas: ', winEl), h('span', {}, 'Si pierdes: ', loseEl)),
      warn,
      h('div', { class: 'screen__actions' },
        h('button', { class: 'btn btn--blood', type: 'button', 'data-autofocus': true, onclick: () => { close(); resolve(value); } },
          '勝負', h('small', { text: 'Apostar' }))),
      h('p', { class: 'screen__note', text: `Aguja actual: ${needle} mm · Máximo: ${max} mm` })));
    set(value);
  });
}

export async function showSideSwap(side) {
  await showPanel({
    who: 'ナレーション',
    narrator: true,
    color: true,
    art: side === 'slave' ? 'assets/cards/slave.webp' : 'assets/cards/emperor.webp',
    jp: `攻守交代 — ${SIDE_NAMES[side].jp}`,
    es: side === 'slave'
      ? 'Ahora eres el Esclavo. Solo ganas si tu Esclavo cae justo sobre su Emperador… pero cobras cinco veces más.'
      : 'Ahora eres el Emperador. Cuatro Ciudadanos te cubren; cuidado con el Esclavo.',
  });
  close();
}

export async function showDiscovery({ forced }) {
  if (forced) await showPanel({ who: 'ナレーション', narrator: true, jp: 'ざわ…ざわ…', es: DISCOVERY.forcedLead });
  zawa({ count: 5 });
  await showPanel({ who: 'カイジ', art: 'assets/portraits/kaiji.webp', color: true, jp: DISCOVERY.jp, es: DISCOVERY.es }, { index: 1 });
  await showPanel({ who: '脈拍 · Pulso', narrator: true, jp: '心電図', items: DISCOVERY.tutorial }, { next: '分かった', nextEs: 'Entendido' });
  close();
}

const stat = (dt, dd) => h('div', {}, h('dt', { text: dt }), h('dd', { text: dd }));

/** Pantalla final. Resuelve 'again' o 'title'. */
export function showEnding({ ending, yen, needle, history, record }) {
  return new Promise((resolve) => {
    const e = ENDINGS[ending];
    const wins = history.filter((g) => g.winner === 'kaiji').length;
    const whiteout = ending === 'eardrum' || ending === 'canals';
    open(h('div', { class: `screen ending ending--${ending}` },
      h('h2', { class: 'ending__jp', text: e.jp }),
      ending === 'triumph' ? h('div', { class: 'dogeza', 'aria-hidden': 'true' }, h('span', { text: '焼き土下座' })) : null,
      h('p', { class: 'ending__title', text: e.title }),
      h('p', { class: 'ending__text', text: e.es(yen) }),
      h('dl', { class: 'ending__stats' },
        stat('Partidas', `${history.length} / 12`),
        stat('Ganadas', String(wins)),
        stat('Botín', formatYen(yen)),
        stat('Aguja', `${needle} mm`)),
      h('p', { class: 'screen__note', text: `Récord: ${formatYen(record.bestYen)} · ${ENDINGS[record.bestEnding].jp}` }),
      h('div', { class: 'screen__actions' },
        h('button', { class: 'btn btn--blood', type: 'button', 'data-autofocus': true, onclick: () => { close(); resolve('again'); } },
          'もう一度', h('small', { text: 'Otra vez' })),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { close(); resolve('title'); } },
          'タイトル', h('small', { text: 'Título' })))), { whiteout });
    if (ending === 'triumph') zawa({ count: 10 });
  });
}

/** Reglas en un <dialog> nativo, independiente de #overlay. */
export function showRules() {
  const d = $('rules');
  const triad = h('div', { class: 'rules__triad', 'aria-hidden': 'true' },
    createCard('emperor'), '>', createCard('citizen'), '>', createCard('slave'), '>', createCard('emperor'));
  d.replaceChildren(h('div', { class: 'screen rules' },
    h('h2', { text: 'ルール' }),
    triad,
    h('p', { class: 'screen__note', text: RULES.triad }),
    RULES.sections.map((s) => h('section', {}, h('h3', { text: s.title }), h('ul', {}, s.items.map((i) => h('li', { text: i }))))),
    h('form', { method: 'dialog', class: 'screen__actions' },
      h('button', { class: 'btn', 'data-autofocus': true }, '閉じる', h('small', { text: 'Cerrar' })))));
  d.showModal();
  d.querySelector('[data-autofocus]')?.focus({ preventScroll: true });
  d.scrollTop = 0;
  requestAnimationFrame(() => { d.scrollTop = 0; });
  return new Promise((resolve) => d.addEventListener('close', () => resolve(), { once: true }));
}
