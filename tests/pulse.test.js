import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { CARD } from '../js/rules.js';
import { PULSE_MODE, SIGNAL, readSignal, displaysSpike, bpm, truthOf } from '../js/pulse.js';

const N = 10_000;
function rate(card, mode, expected, seed = 1) {
  const rng = createRng(seed);
  let hits = 0;
  for (let i = 0; i < N; i++) if (readSignal(card, mode, rng) === expected) hits++;
  return hits / N;
}
const near = (actual, target, tol = 0.02) =>
  assert.ok(Math.abs(actual - target) <= tol, `esperado ≈${target}, obtenido ${actual}`);

test('truthOf', () => {
  assert.equal(truthOf(CARD.CITIZEN), SIGNAL.CITIZEN);
  assert.equal(truthOf(CARD.SLAVE), SIGNAL.SPECIAL);
  assert.equal(truthOf(CARD.EMPEROR), SIGNAL.SPECIAL);
});

test('natural: acierta el 85 %', () => {
  near(rate(CARD.SLAVE, PULSE_MODE.NATURAL, SIGNAL.SPECIAL), 0.85);
  near(rate(CARD.CITIZEN, PULSE_MODE.NATURAL, SIGNAL.CITIZEN, 2), 0.85);
});

test('fingir calma: dice «ciudadano» ≈ 91,5 % con la especial', () => {
  near(rate(CARD.SLAVE, PULSE_MODE.FAKE_CALM, SIGNAL.CITIZEN), 0.9 + 0.1 * 0.15);
  near(rate(CARD.CITIZEN, PULSE_MODE.FAKE_CALM, SIGNAL.CITIZEN, 3), 0.9 + 0.1 * 0.85);
});

test('fingir pánico: dice «especial» ≈ 91,5 % con ciudadano', () => {
  near(rate(CARD.CITIZEN, PULSE_MODE.FAKE_PANIC, SIGNAL.SPECIAL), 0.9 + 0.1 * 0.15);
});

test('displaysSpike', () => {
  assert.equal(displaysSpike(CARD.EMPEROR, PULSE_MODE.NATURAL), true);
  assert.equal(displaysSpike(CARD.CITIZEN, PULSE_MODE.NATURAL), false);
  assert.equal(displaysSpike(null, PULSE_MODE.NATURAL), false);
  assert.equal(displaysSpike(CARD.SLAVE, PULSE_MODE.FAKE_CALM), false);
  assert.equal(displaysSpike(CARD.CITIZEN, PULSE_MODE.FAKE_PANIC), true);
});

test('bpm: base, aguja, apuesta y pico dentro del ruido', () => {
  const rng = createRng(9);
  for (let i = 0; i < 100; i++) {
    const calm = bpm({ needle: 0, bet: 0, spike: false }, rng);
    assert.ok(calm >= 69 && calm <= 75, `calma ${calm}`);
    const tense = bpm({ needle: 20, bet: 10, spike: true }, rng);
    assert.ok(tense >= 72 + 24 + 6 + 28 - 3 && tense <= 72 + 24 + 6 + 28 + 3, `tenso ${tense}`);
  }
});
