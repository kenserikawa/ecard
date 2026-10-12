// Modelo del pulso de Kaiji: lo que el aparato del oído chiva al reloj de Tonegawa.
import { CONFIG } from './config.js';
import { isSpecial } from './rules.js';

export const PULSE_MODE = Object.freeze({
  NATURAL: 'natural',
  FAKE_CALM: 'fakeCalm',
  FAKE_PANIC: 'fakePanic',
});

export const SIGNAL = Object.freeze({ SPECIAL: 'special', CITIZEN: 'citizen' });

export function truthOf(card) {
  return isSpecial(card) ? SIGNAL.SPECIAL : SIGNAL.CITIZEN;
}

function flip(signal) {
  return signal === SIGNAL.SPECIAL ? SIGNAL.CITIZEN : SIGNAL.SPECIAL;
}

/** Señal que recibe Tonegawa cuando Kaiji confirma `card` con el modo de pulso `mode`. */
export function readSignal(card, mode, rng) {
  const truth = truthOf(card);
  const natural = () => (rng.chance(CONFIG.P_NATURAL) ? truth : flip(truth));
  if (mode === PULSE_MODE.FAKE_CALM) return rng.chance(CONFIG.P_FAKE) ? SIGNAL.CITIZEN : natural();
  if (mode === PULSE_MODE.FAKE_PANIC) return rng.chance(CONFIG.P_FAKE) ? SIGNAL.SPECIAL : natural();
  return natural();
}

/** Si el monitor debe mostrar el pico de nervios para esta carta y modo. */
export function displaysSpike(card, mode) {
  if (mode === PULSE_MODE.FAKE_CALM) return false;
  if (mode === PULSE_MODE.FAKE_PANIC) return true;
  return card != null && isSpecial(card);
}

/** Pulsaciones por minuto que se dibujan en el ECG (cosmético). */
export function bpm({ needle = 0, bet = 0, spike = false }, rng) {
  const noise = (rng.next() * 2 - 1) * CONFIG.BPM_NOISE;
  return Math.round(
    CONFIG.BPM_BASE
      + CONFIG.BPM_PER_MM_NEEDLE * needle
      + CONFIG.BPM_PER_MM_BET * bet
      + (spike ? CONFIG.BPM_SPIKE : 0)
      + noise,
  );
}
