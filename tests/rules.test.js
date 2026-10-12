import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import {
  CARD, SIDE, compareCards, isSpecial, specialOf, opposite, startingHand, kaijiSideForGame,
  firstPlacerSide, maxBet, isValidBet, payout, needleStatus,
} from '../js/rules.js';

const { EMPEROR: E, CITIZEN: C, SLAVE: S } = CARD;

test('compareCards: E>C, C>S, S>E, C=C', () => {
  assert.equal(compareCards(E, C), 1);
  assert.equal(compareCards(C, E), -1);
  assert.equal(compareCards(C, S), 1);
  assert.equal(compareCards(S, C), -1);
  assert.equal(compareCards(S, E), 1);
  assert.equal(compareCards(E, S), -1);
  assert.equal(compareCards(C, C), 0);
});

test('isSpecial / specialOf / opposite', () => {
  assert.equal(isSpecial(C), false);
  assert.equal(isSpecial(E), true);
  assert.equal(isSpecial(S), true);
  assert.equal(specialOf(SIDE.EMPEROR), E);
  assert.equal(specialOf(SIDE.SLAVE), S);
  assert.equal(opposite(SIDE.EMPEROR), SIDE.SLAVE);
  assert.equal(opposite(SIDE.SLAVE), SIDE.EMPEROR);
});

test('startingHand: especial + 4 ciudadanos', () => {
  assert.deepEqual(startingHand(SIDE.EMPEROR), [E, C, C, C, C]);
  assert.deepEqual(startingHand(SIDE.SLAVE), [S, C, C, C, C]);
});

test('kaijiSideForGame: E E E S S S E E E S S S', () => {
  const sides = Array.from({ length: 12 }, (_, i) => kaijiSideForGame(i + 1)[0]);
  assert.equal(sides.join(''), 'eeessseeesss');
});

test('firstPlacerSide: turnos 1 y 3 Emperador, 2 y 4 Esclavo', () => {
  assert.equal(firstPlacerSide(1), SIDE.EMPEROR);
  assert.equal(firstPlacerSide(2), SIDE.SLAVE);
  assert.equal(firstPlacerSide(3), SIDE.EMPEROR);
  assert.equal(firstPlacerSide(4), SIDE.SLAVE);
});

test('apuesta: de 1 a 45 − aguja, solo enteros', () => {
  assert.equal(maxBet(0), 45);
  assert.equal(maxBet(27), 18);
  assert.equal(isValidBet(1, 0), true);
  assert.equal(isValidBet(45, 0), true);
  assert.equal(isValidBet(46, 0), false);
  assert.equal(isValidBet(0, 0), false);
  assert.equal(isValidBet(2.5, 0), false);
  assert.equal(isValidBet(18, 27), true);
  assert.equal(isValidBet(19, 27), false);
  assert.equal(isValidBet(NaN, 0), false);
});

test('payout: 100.000 ¥/mm Emperador, 500.000 ¥/mm Esclavo', () => {
  assert.equal(payout(SIDE.EMPEROR, 10), 1_000_000);
  assert.equal(payout(SIDE.SLAVE, 18), 9_000_000);
});

test('needleStatus: 30 tímpano, 45 canales', () => {
  assert.equal(needleStatus(0), 'ok');
  assert.equal(needleStatus(29), 'ok');
  assert.equal(needleStatus(30), 'eardrum');
  assert.equal(needleStatus(44), 'eardrum');
  assert.equal(needleStatus(45), 'canals');
});

test('rng: determinista con semilla y en [0,1)', () => {
  const a = createRng(42);
  const b = createRng(42);
  const xs = Array.from({ length: 50 }, () => a.next());
  const ys = Array.from({ length: 50 }, () => b.next());
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const r = createRng(7);
  for (let i = 0; i < 200; i++) {
    const n = r.int(1, 5);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 5);
  }
});
