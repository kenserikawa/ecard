// Estado puro de una sesión de 12 partidas. Cada función devuelve un estado nuevo (no muta).
import { CONFIG } from './config.js';
import {
  compareCards, startingHand, kaijiSideForGame, opposite, firstPlacerSide,
  isValidBet, payout, needleStatus,
} from './rules.js';

export const PHASE = Object.freeze({
  BET: 'bet',
  TURN: 'turn',
  GAME_END: 'gameEnd',
  SESSION_END: 'sessionEnd',
});

export const ENDING = Object.freeze({
  CANALS: 'canals',
  EARDRUM: 'eardrum',
  BROKE: 'broke',
  SURVIVOR: 'survivor',
  TRIUMPH: 'triumph',
});

function dealGame(game) {
  const kaijiSide = kaijiSideForGame(game);
  return {
    game,
    turn: 1,
    kaijiSide,
    bet: null,
    kaijiHand: startingHand(kaijiSide),
    tonegawaHand: startingHand(opposite(kaijiSide)),
    turns: [],
  };
}

export function createMatch() {
  return {
    phase: PHASE.BET,
    needle: 0,
    yen: 0,
    ending: null,
    history: [],
    lastTurn: null,
    lastGame: null,
    ...dealGame(1),
  };
}

export function placeBet(state, mm) {
  if (state.phase !== PHASE.BET) throw new Error(`placeBet en fase ${state.phase}`);
  if (!isValidBet(mm, state.needle)) {
    throw new RangeError(`apuesta inválida ${mm} con aguja ${state.needle}`);
  }
  return { ...state, bet: mm, phase: PHASE.TURN };
}

/** 'kaiji' | 'tonegawa': quién pone carta primero (先) en el turno actual. */
export function whoPlacesFirst(state) {
  return firstPlacerSide(state.turn) === state.kaijiSide ? 'kaiji' : 'tonegawa';
}

/** Turno 5: solo quedan las especiales; se resuelve sin elección. */
export function isForcedTurn(state) {
  return state.phase === PHASE.TURN && state.turn === 5;
}

export function forcedCards(state) {
  return { kaijiCard: state.kaijiHand[0], tonegawaCard: state.tonegawaHand[0] };
}

export function computeEnding(needle, yen) {
  const status = needleStatus(needle);
  if (status === 'canals') return ENDING.CANALS;
  if (status === 'eardrum') return ENDING.EARDRUM;
  if (yen <= 0) return ENDING.BROKE;
  if (yen >= CONFIG.TRUE_ENDING_YEN) return ENDING.TRIUMPH;
  return ENDING.SURVIVOR;
}

function removeOne(hand, card) {
  const i = hand.indexOf(card);
  if (i < 0) throw new Error(`la carta ${card} no está en la mano`);
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}

export function playTurn(state, kaijiCard, tonegawaCard) {
  if (state.phase !== PHASE.TURN) throw new Error(`playTurn en fase ${state.phase}`);
  const kaijiHand = removeOne(state.kaijiHand, kaijiCard);
  const tonegawaHand = removeOne(state.tonegawaHand, tonegawaCard);
  const cmp = compareCards(kaijiCard, tonegawaCard);
  const result = cmp === 0 ? 'draw' : cmp > 0 ? 'kaiji' : 'tonegawa';
  const lastTurn = {
    game: state.game,
    turn: state.turn,
    first: whoPlacesFirst(state),
    kaijiCard,
    tonegawaCard,
    result,
  };
  const turns = [...state.turns, lastTurn];

  if (result === 'draw') {
    return { ...state, kaijiHand, tonegawaHand, turns, lastTurn, turn: state.turn + 1 };
  }

  const yenDelta = result === 'kaiji' ? payout(state.kaijiSide, state.bet) : 0;
  const needleDelta = result === 'tonegawa' ? state.bet : 0;
  const yen = state.yen + yenDelta;
  const needle = Math.min(state.needle + needleDelta, CONFIG.NEEDLE_MAX);
  const lastGame = {
    game: state.game,
    kaijiSide: state.kaijiSide,
    bet: state.bet,
    winner: result,
    yenDelta,
    needleDelta,
    turns,
  };
  const perforated = needleStatus(needle) !== 'ok';
  return {
    ...state,
    kaijiHand,
    tonegawaHand,
    turns,
    lastTurn,
    lastGame,
    history: [...state.history, lastGame],
    yen,
    needle,
    phase: perforated ? PHASE.SESSION_END : PHASE.GAME_END,
    ending: perforated ? computeEnding(needle, yen) : null,
  };
}

export function nextGame(state) {
  if (state.phase !== PHASE.GAME_END) throw new Error(`nextGame en fase ${state.phase}`);
  if (state.game >= CONFIG.GAMES) {
    return { ...state, phase: PHASE.SESSION_END, ending: computeEnding(state.needle, state.yen) };
  }
  return { ...state, ...dealGame(state.game + 1), phase: PHASE.BET, lastTurn: null };
}

/** Cartas distintas que Kaiji puede jugar ahora (para la UI y el tiempo agotado). */
export function legalCards(state) {
  return [...new Set(state.kaijiHand)];
}
