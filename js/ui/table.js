// Mesa: cartas (DOM), mano de Kaiji, mano de Tonegawa, ranuras, revelación y reloj de turno.
import { CARD_JP, cardName } from '../lines.js';
import { t } from '../i18n.js';
import { wait } from './fx.js';

const $ = (id) => document.getElementById(id);

export const CARD_SRC = {
  emperor: 'assets/cards/emperor.webp',
  citizen: 'assets/cards/citizen.webp',
  slave: 'assets/cards/slave.webp',
};
export const BACK_SRC = 'assets/cards/back.svg';

const cardLabel = (i, card) => t('ui.handCard', { n: i + 1, name: cardName(card), jp: CARD_JP[card] });

function img(cls, src) {
  const i = new Image();
  i.className = cls;
  i.src = src;
  i.alt = '';
  i.draggable = false;
  i.decoding = 'async';
  return i;
}

/** Crea una carta. `card` null = desconocida (se ve el reverso por ambos lados hasta revelarla). */
export function createCard(card, { faceDown = false, tag = 'div' } = {}) {
  const el = document.createElement(tag);
  el.className = `card${faceDown ? ' is-down' : ''}`;
  if (tag === 'button') el.type = 'button';
  if (card) el.dataset.card = card;
  const inner = document.createElement('span');
  inner.className = 'card__inner';
  inner.append(img('card__face card__face--front', card ? CARD_SRC[card] : BACK_SRC), img('card__face card__face--back', BACK_SRC));
  el.append(inner);
  return el;
}

export function setCardFace(el, card) {
  el.dataset.card = card;
  el.querySelector('.card__face--front').src = CARD_SRC[card];
}

export function preloadCards() {
  for (const src of [...Object.values(CARD_SRC), BACK_SRC]) {
    const i = new Image();
    i.src = src;
  }
}

/**
 * Mano de Kaiji (boca arriba, en abanico).
 * @param {{onSelect?: (card: string, el: HTMLElement) => void}} opts
 */
export function createHand({ onSelect } = {}) {
  const root = $('hand');
  let cards = [];
  let selected = -1;
  let enabled = false;

  function setEnabled(value) {
    enabled = value;
    root.classList.toggle('is-locked', !value);
    for (const el of root.children) el.disabled = !value;
  }

  function render(list) {
    cards = list.slice();
    selected = -1;
    const mid = (cards.length - 1) / 2;
    root.replaceChildren(...cards.map((c, i) => {
      const el = createCard(c, { tag: 'button' });
      el.style.setProperty('--rot', `${(i - mid) * 7}deg`);
      el.style.setProperty('--drop', `${Math.abs(i - mid) * 7}px`);
      el.setAttribute('aria-label', cardLabel(i, c));
      el.setAttribute('aria-pressed', 'false');
      el.addEventListener('click', () => select(i));
      return el;
    }));
    setEnabled(enabled);
  }

  function relabel() {
    [...root.children].forEach((el, i) => el.setAttribute('aria-label', cardLabel(i, cards[i])));
  }

  function select(i) {
    if (!enabled || i < 0 || i >= cards.length) return;
    selected = i;
    [...root.children].forEach((el, j) => {
      el.classList.toggle('is-selected', j === i);
      el.setAttribute('aria-pressed', String(j === i));
    });
    onSelect?.(cards[i], root.children[i]);
  }

  function take() {
    if (selected < 0) return null;
    const [card] = cards.splice(selected, 1);
    render(cards);
    return card;
  }

  function takeRandom(rng) {
    if (!cards.length) return null;
    selected = rng.int(0, cards.length - 1);
    return take();
  }

  return {
    render,
    relabel,
    select,
    setEnabled,
    take,
    takeRandom,
    selected: () => (selected >= 0 ? cards[selected] : null),
    count: () => cards.length,
  };
}

export function renderOpponent(n) {
  const mid = (n - 1) / 2;
  $('opp-hand').replaceChildren(...Array.from({ length: n }, (_, i) => {
    const c = createCard(null, { faceDown: true });
    c.style.setProperty('--rot', `${(i - mid) * 5}deg`);
    return c;
  }));
}

/** Pone una carta boca abajo en la ranura de `who` ('kaiji' | 'tonegawa'). */
export function placeInSlot(who, card = null) {
  $(who === 'kaiji' ? 'slot-kaiji' : 'slot-tonegawa').replaceChildren(createCard(card, { faceDown: true }));
}

/** Voltea ambas cartas a la vez. */
export async function reveal(kaijiCard, tonegawaCard) {
  const k = $('slot-kaiji').querySelector('.card');
  const t = $('slot-tonegawa').querySelector('.card');
  setCardFace(k, kaijiCard);
  setCardFace(t, tonegawaCard);
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  k.classList.remove('is-down');
  t.classList.remove('is-down');
  await wait(700);
}

export function setVerdict(kind, text = '') {
  const el = $('verdict');
  el.className = `verdict${kind ? ` is-${kind}` : ''}`;
  el.textContent = text;
}

export function clearSlots() {
  $('slot-kaiji').replaceChildren();
  $('slot-tonegawa').replaceChildren();
  setVerdict(null);
}

/**
 * Reloj de turno. Se pausa mientras haya una superposición o el diálogo de reglas abierto.
 * @returns {() => void} función para pararlo
 */
export function startTimer(seconds, { onTick, onTimeout } = {}) {
  const el = $('timer');
  const bar = el.querySelector('.timer__bar');
  const text = el.querySelector('.timer__text');
  let left = seconds;
  let lastWhole = Math.ceil(left);
  let stopped = false;
  const paint = () => {
    bar.style.transform = `scaleX(${left / seconds})`;
    text.textContent = `${Math.ceil(left)}s`;
    el.classList.toggle('is-urgent', left <= 10);
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(id);
    el.hidden = true;
  };
  el.hidden = false;
  paint();
  const id = setInterval(() => {
    if (!$('overlay').hidden || $('rules').open) return;
    left = Math.max(0, left - 0.25);
    paint();
    const whole = Math.ceil(left);
    if (whole !== lastWhole) {
      lastWhole = whole;
      onTick?.(whole);
    }
    if (left <= 0) {
      stop();
      onTimeout?.();
    }
  }, 250);
  return stop;
}
