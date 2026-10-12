// Reglas canónicas de la Eカード (manga). Funciones puras sin estado.
import { CONFIG } from './config.js';

export const CARD = Object.freeze({ EMPEROR: 'emperor', CITIZEN: 'citizen', SLAVE: 'slave' });
export const SIDE = Object.freeze({ EMPEROR: 'emperor', SLAVE: 'slave' });

const BEATS = Object.freeze({
  [CARD.EMPEROR]: CARD.CITIZEN,
  [CARD.CITIZEN]: CARD.SLAVE,
  [CARD.SLAVE]: CARD.EMPEROR,
});

/** 1 si gana `a`, -1 si gana `b`, 0 si empatan (ciudadano contra ciudadano). */
export function compareCards(a, b) {
  if (a === b) return 0;
  if (BEATS[a] === b) return 1;
  if (BEATS[b] === a) return -1;
  return 0;
}

export function isSpecial(card) {
  return card !== CARD.CITIZEN;
}

export function specialOf(side) {
  return side === SIDE.EMPEROR ? CARD.EMPEROR : CARD.SLAVE;
}

export function opposite(side) {
  return side === SIDE.EMPEROR ? SIDE.SLAVE : SIDE.EMPEROR;
}

export function startingHand(side) {
  return [specialOf(side), CARD.CITIZEN, CARD.CITIZEN, CARD.CITIZEN, CARD.CITIZEN];
}

/** Partidas 1–3 y 7–9: Kaiji es Emperador. 4–6 y 10–12: Esclavo. */
export function kaijiSideForGame(game) {
  return Math.floor((game - 1) / 3) % 2 === 0 ? SIDE.EMPEROR : SIDE.SLAVE;
}

/** Turnos impares: pone primero el bando Emperador. Pares: el bando Esclavo. */
export function firstPlacerSide(turn) {
  return turn % 2 === 1 ? SIDE.EMPEROR : SIDE.SLAVE;
}

export function maxBet(needle) {
  return CONFIG.NEEDLE_MAX - needle;
}

export function isValidBet(mm, needle) {
  return Number.isInteger(mm) && mm >= 1 && mm <= maxBet(needle);
}

export function payout(side, mm) {
  return mm * (side === SIDE.EMPEROR ? CONFIG.RATE_EMPEROR : CONFIG.RATE_SLAVE);
}

/** 'ok' | 'eardrum' (≥30 mm, tímpano) | 'canals' (≥45 mm, 三半規管). */
export function needleStatus(needle) {
  if (needle >= CONFIG.NEEDLE_MAX) return 'canals';
  if (needle >= CONFIG.NEEDLE_EARDRUM) return 'eardrum';
  return 'ok';
}
