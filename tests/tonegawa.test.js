import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { CARD, SIDE } from '../js/rules.js';
import { SIGNAL } from '../js/pulse.js';
import {
  createMemory, hazard, signalAccuracy, tonegawaPlacesSecond, posterior, actionValues,
  winValue, decide, startGame, observeTurn,
} from '../js/tonegawa.js';

const { EMPEROR: E, CITIZEN: C, SLAVE: S } = CARD;
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('memoria nueva: hazard uniforme sobre los turnos restantes y fiabilidad 0,85', () => {
  const m = createMemory();
  close(hazard(m, SIDE.SLAVE, 1), 1 / 5);
  close(hazard(m, SIDE.SLAVE, 2), 1 / 4);
  close(hazard(m, SIDE.SLAVE, 4), 1 / 2);
  assert.equal(hazard(m, SIDE.SLAVE, 5), 1);
  close(signalAccuracy(m), 0.85);
});

test('Tonegawa pone segundo cuando Kaiji pone primero', () => {
  assert.equal(tonegawaPlacesSecond(SIDE.EMPEROR, 1), true);
  assert.equal(tonegawaPlacesSecond(SIDE.EMPEROR, 2), false);
  assert.equal(tonegawaPlacesSecond(SIDE.SLAVE, 2), true);
  assert.equal(tonegawaPlacesSecond(SIDE.SLAVE, 3), false);
});

test('posterior: Bayes con la señal; sin señal = prior', () => {
  close(posterior(0.5, 0.85, SIGNAL.SPECIAL), 0.85);
  close(posterior(0.5, 0.85, SIGNAL.CITIZEN), 0.15);
  close(posterior(0.25, 0.85, null), 0.25);
  // Con a < 0,5 la señal se invierte sola.
  assert.ok(posterior(0.5, 0.3, SIGNAL.SPECIAL) < 0.5);
});

test('actionValues por bando', () => {
  assert.deepEqual(actionValues(SIDE.EMPEROR, 0.2, 0.5), { special: 0.8, citizen: 0.2 + 0.8 * 0.5 });
  assert.deepEqual(actionValues(SIDE.SLAVE, 0.2, 0.5), { special: 0.2, citizen: 0.8 * 0.5 });
});

test('winValue: casos calculables a mano', () => {
  const m = createMemory();
  // Kaiji Esclavo → Tonegawa Emperador. V(5)=0. Turno 4: lee la señal (pone segundo).
  assert.equal(winValue(m, SIDE.SLAVE, 5), 0);
  close(winValue(m, SIDE.SLAVE, 4), 0.85);
  // Kaiji Emperador → Tonegawa Esclavo. V(5)=1. Turno 4: a ciegas, h=0,5 → max(0,5; 0,5·1).
  assert.equal(winValue(m, SIDE.EMPEROR, 5), 1);
  close(winValue(m, SIDE.EMPEROR, 4), 0.5);
});

test('decide: con señal «especial» clara, Tonegawa Emperador juega Ciudadano', () => {
  const m = createMemory();
  const rng = createRng(1);
  let citizen = 0;
  for (let i = 0; i < 200; i++) {
    const { card } = decide(m, { kaijiSide: SIDE.SLAVE, turn: 4, signal: SIGNAL.SPECIAL, tonegawaHand: [E, C] }, rng);
    if (card === C) citizen++;
  }
  assert.ok(citizen >= 195, `ciudadano ${citizen}/200`);
});

test('decide: con señal «ciudadano» en turno 2, Tonegawa Emperador juega Emperador casi siempre', () => {
  const m = createMemory();
  const rng = createRng(2);
  let emperor = 0;
  for (let i = 0; i < 200; i++) {
    const { card } = decide(m, { kaijiSide: SIDE.SLAVE, turn: 2, signal: SIGNAL.CITIZEN, tonegawaHand: [E, C, C, C] }, rng);
    if (card === E) emperor++;
  }
  assert.ok(emperor >= 120, `emperador ${emperor}/200`);
});

test('decide: sin ciudadanos juega la especial (forzado)', () => {
  const r = decide(createMemory(), { kaijiSide: SIDE.EMPEROR, turn: 5, signal: null, tonegawaHand: [S] }, createRng(3));
  assert.equal(r.card, S);
});

test('decide es determinista con la misma semilla', () => {
  const ctx = { kaijiSide: SIDE.EMPEROR, turn: 2, signal: null, tonegawaHand: [S, C, C, C] };
  const a = Array.from({ length: 30 }, (_, i) => decide(createMemory(), ctx, createRng(i)).card);
  const b = Array.from({ length: 30 }, (_, i) => decide(createMemory(), ctx, createRng(i)).card);
  assert.deepEqual(a, b);
});

test('aprende hábitos: si Kaiji juega siempre el Emperador en el turno 2, Tonegawa pone el Esclavo ahí', () => {
  let m = createMemory();
  for (let g = 0; g < 6; g++) {
    m = startGame(m, SIDE.EMPEROR);
    m = observeTurn(m, { kaijiSide: SIDE.EMPEROR, turn: 1, kaijiCard: C, signal: SIGNAL.CITIZEN, result: 'draw' });
    m = observeTurn(m, { kaijiSide: SIDE.EMPEROR, turn: 2, kaijiCard: E, signal: null, result: 'kaiji' });
  }
  assert.ok(hazard(m, SIDE.EMPEROR, 2) > 0.7, `h2=${hazard(m, SIDE.EMPEROR, 2)}`);
  const rng = createRng(4);
  let slave = 0;
  for (let i = 0; i < 200; i++) {
    const { card } = decide(m, { kaijiSide: SIDE.EMPEROR, turn: 2, signal: null, tonegawaHand: [S, C, C, C] }, rng);
    if (card === S) slave++;
  }
  assert.ok(slave >= 150, `esclavo ${slave}/200`);
});

test('fiabilidad: un engaño que le cuesta la partida la baja a ≈0,61; dos, por debajo de 0,5', () => {
  let m = createMemory();
  const burn = (mem) => observeTurn(mem, {
    kaijiSide: SIDE.SLAVE, turn: 2, kaijiCard: S, signal: SIGNAL.CITIZEN, result: 'kaiji',
  });
  m = burn(m);
  close(signalAccuracy(m), 8.5 / 14, 1e-9);
  m = burn(m);
  assert.ok(signalAccuracy(m) < 0.5, `a=${signalAccuracy(m)}`);
});

test('fiabilidad: lecturas correctas la mantienen alta', () => {
  let m = createMemory();
  for (let i = 0; i < 10; i++) {
    m = observeTurn(m, { kaijiSide: SIDE.SLAVE, turn: 2, kaijiCard: C, signal: SIGNAL.CITIZEN, result: 'draw' });
  }
  assert.ok(signalAccuracy(m) > 0.88);
});

test('startGame desvanece solo los hábitos del bando que juega Kaiji', () => {
  let m = createMemory();
  m = observeTurn(m, { kaijiSide: SIDE.SLAVE, turn: 1, kaijiCard: S, signal: null, result: 'tonegawa' });
  m = observeTurn(m, { kaijiSide: SIDE.EMPEROR, turn: 1, kaijiCard: E, signal: null, result: 'kaiji' });
  const after = startGame(m, SIDE.SLAVE);
  close(after.habits[SIDE.SLAVE].n[0], 0.85);
  close(after.habits[SIDE.EMPEROR].n[0], 1);
});
