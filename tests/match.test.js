import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARD, SIDE } from '../js/rules.js';
import {
  PHASE, ENDING, createMatch, placeBet, whoPlacesFirst, isForcedTurn, forcedCards,
  computeEnding, playTurn, nextGame, legalCards,
} from '../js/match.js';

const { EMPEROR: E, CITIZEN: C, SLAVE: S } = CARD;

test('createMatch: partida 1, Kaiji Emperador, fase de apuesta', () => {
  const m = createMatch();
  assert.equal(m.phase, PHASE.BET);
  assert.equal(m.game, 1);
  assert.equal(m.turn, 1);
  assert.equal(m.kaijiSide, SIDE.EMPEROR);
  assert.deepEqual(m.kaijiHand, [E, C, C, C, C]);
  assert.deepEqual(m.tonegawaHand, [S, C, C, C, C]);
  assert.equal(m.needle, 0);
  assert.equal(m.yen, 0);
});

test('placeBet: valida y pasa a turno; no muta', () => {
  const m = createMatch();
  assert.throws(() => placeBet(m, 0), RangeError);
  assert.throws(() => placeBet(m, 46), RangeError);
  const t = placeBet(m, 10);
  assert.equal(t.phase, PHASE.TURN);
  assert.equal(t.bet, 10);
  assert.equal(m.phase, PHASE.BET);
  assert.throws(() => placeBet(t, 5), /fase/);
});

test('whoPlacesFirst sigue el bando de Kaiji y el turno', () => {
  const m = placeBet(createMatch(), 1); // Kaiji Emperador
  assert.equal(whoPlacesFirst(m), 'kaiji');
  assert.equal(whoPlacesFirst({ ...m, turn: 2 }), 'tonegawa');
  const slave = { ...m, kaijiSide: SIDE.SLAVE };
  assert.equal(whoPlacesFirst(slave), 'tonegawa');
  assert.equal(whoPlacesFirst({ ...slave, turn: 2 }), 'kaiji');
});

test('empate retira cartas y avanza turno', () => {
  const m = playTurn(placeBet(createMatch(), 1), C, C);
  assert.equal(m.phase, PHASE.TURN);
  assert.equal(m.turn, 2);
  assert.equal(m.kaijiHand.length, 4);
  assert.equal(m.tonegawaHand.length, 4);
  assert.equal(m.lastTurn.result, 'draw');
});

test('rechaza cartas que no están en la mano', () => {
  const m = placeBet(createMatch(), 1);
  assert.throws(() => playTurn(m, S, C), /no está/);
});

test('victoria de Kaiji como Emperador: cobra 100.000 ¥/mm', () => {
  const m = playTurn(placeBet(createMatch(), 10), E, C);
  assert.equal(m.phase, PHASE.GAME_END);
  assert.equal(m.lastGame.winner, 'kaiji');
  assert.equal(m.yen, 1_000_000);
  assert.equal(m.needle, 0);
});

test('derrota: la aguja avanza los mm apostados', () => {
  const m = playTurn(placeBet(createMatch(), 7), E, S);
  assert.equal(m.lastGame.winner, 'tonegawa');
  assert.equal(m.needle, 7);
  assert.equal(m.yen, 0);
  assert.equal(m.phase, PHASE.GAME_END);
});

test('turno 5 forzado tras cuatro empates: gana el Esclavo', () => {
  let m = placeBet(createMatch(), 3);
  for (let i = 0; i < 4; i++) m = playTurn(m, C, C);
  assert.equal(isForcedTurn(m), true);
  const { kaijiCard, tonegawaCard } = forcedCards(m);
  assert.equal(kaijiCard, E);
  assert.equal(tonegawaCard, S);
  m = playTurn(m, kaijiCard, tonegawaCard);
  assert.equal(m.lastGame.winner, 'tonegawa');
  assert.equal(m.needle, 3);
});

test('aguja ≥ 30 termina la sesión con tímpano perforado', () => {
  const m = playTurn(placeBet(createMatch(), 30), E, S);
  assert.equal(m.phase, PHASE.SESSION_END);
  assert.equal(m.ending, ENDING.EARDRUM);
});

test('aguja = 45 es el peor final', () => {
  const m = playTurn(placeBet({ ...createMatch(), needle: 27 }, 18), E, S);
  assert.equal(m.needle, 45);
  assert.equal(m.ending, ENDING.CANALS);
});

test('nextGame recorre las 12 partidas cambiando de bando cada 3', () => {
  let m = createMatch();
  const sides = [];
  while (m.phase !== PHASE.SESSION_END) {
    sides.push(m.kaijiSide[0]);
    m = placeBet(m, 1);
    const special = m.kaijiHand[0];
    // Kaiji gana siempre: como Emperador juega E contra C; como Esclavo, S contra E.
    m = special === E ? playTurn(m, E, C) : playTurn(m, S, E);
    m = nextGame(m);
  }
  assert.equal(sides.join(''), 'eeessseeesss');
  assert.equal(m.history.length, 12);
  assert.equal(m.yen, 6 * 100_000 + 6 * 500_000);
  assert.equal(m.ending, ENDING.SURVIVOR);
});

test('computeEnding', () => {
  assert.equal(computeEnding(45, 99e6), ENDING.CANALS);
  assert.equal(computeEnding(30, 99e6), ENDING.EARDRUM);
  assert.equal(computeEnding(29, 0), ENDING.BROKE);
  assert.equal(computeEnding(0, 19_999_999), ENDING.SURVIVOR);
  assert.equal(computeEnding(0, 20_000_000), ENDING.TRIUMPH);
});

test('legalCards devuelve tipos distintos', () => {
  assert.deepEqual(legalCards(createMatch()).sort(), [C, E].sort());
});
