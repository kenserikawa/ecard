// Descubrimiento de la trampa del pulso: pistas, deducción (reloj → aparato) y revelación forzada.
// Cada función devuelve { state, event } donde `event` es una clave de lines.js o null.
import { CONFIG } from './config.js';

export const DISCOVERY_EVENT = Object.freeze({
  GLANCE: 'glance',
  HINT_READ: 'hintRead',
  HINT_WATCH: 'hintWatch',
  JUST_A_WATCH: 'justAWatch',
  WATCH_SUSPECT: 'watchSuspect',
  DEVICE_ONLY: 'deviceOnly',
  DISCOVER: 'discover',
  DISCOVER_FORCED: 'discoverForced',
  ALREADY: 'already',
});

export function createDiscovery() {
  return { glances: 0, suspiciousWins: 0, suspectWatch: false, discovered: false, forced: false };
}

/** Tonegawa mira el reloj (siempre que pone segundo). Se narra las primeras veces. */
export function onGlance(state) {
  const next = { ...state, glances: state.glances + 1 };
  const narrate = !state.discovered && next.glances <= CONFIG.NARRATED_GLANCES;
  return { state: next, event: narrate ? DISCOVERY_EVENT.GLANCE : null };
}

/** Tonegawa ganó una partida poniendo segundo en el turno decisivo. */
export function onSuspiciousWin(state) {
  const next = { ...state, suspiciousWins: state.suspiciousWins + 1 };
  if (state.discovered) return { state: next, event: null };
  if (next.suspiciousWins === CONFIG.HINT_READ_AT) return { state: next, event: DISCOVERY_EVENT.HINT_READ };
  if (next.suspiciousWins === CONFIG.HINT_WATCH_AT) return { state: next, event: DISCOVERY_EVENT.HINT_WATCH };
  return { state: next, event: null };
}

export function clickWatch(state) {
  if (state.discovered) return { state, event: DISCOVERY_EVENT.ALREADY };
  if (state.glances === 0) return { state, event: DISCOVERY_EVENT.JUST_A_WATCH };
  return { state: { ...state, suspectWatch: true }, event: DISCOVERY_EVENT.WATCH_SUSPECT };
}

export function clickDevice(state) {
  if (state.discovered) return { state, event: DISCOVERY_EVENT.ALREADY };
  if (!state.suspectWatch) return { state, event: DISCOVERY_EVENT.DEVICE_ONLY };
  return { state: { ...state, discovered: true }, event: DISCOVERY_EVENT.DISCOVER };
}

/** Al empezar la partida `game`: si aún no se ha descubierto y es la 10 o posterior, Kaiji se da cuenta. */
export function checkForcedReveal(state, game) {
  if (state.discovered || game < CONFIG.FORCED_REVEAL_GAME) return { state, event: null };
  return { state: { ...state, discovered: true, forced: true }, event: DISCOVERY_EVENT.DISCOVER_FORCED };
}
