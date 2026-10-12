// Monte Carlo de balance: Kaiji ingenuo / explotador contra Tonegawa, sesiones completas con memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { CARD, SIDE, compareCards, opposite, specialOf, startingHand, kaijiSideForGame } from '../js/rules.js';
import { PULSE_MODE, readSignal } from '../js/pulse.js';
import { createMemory, decide, startGame, observeTurn, tonegawaPlacesSecond } from '../js/tonegawa.js';

const SESSIONS = 1500;

// Política ingenua: elige al azar el turno (1–5) en el que jugará su especial; pulso natural.
const naive = (kaijiSide, rng) => {
  const specialTurn = rng.int(1, 5);
  return { specialTurn, mode: () => PULSE_MODE.NATURAL };
};

// Explotador (solo como Esclavo): juega el Esclavo en un turno en el que pone primero (2 o 4) fingiendo calma.
const exploiter = (kaijiSide, rng) => {
  if (kaijiSide === SIDE.EMPEROR) return naive(kaijiSide, rng);
  const specialTurn = rng.chance(0.5) ? 2 : 4;
  return { specialTurn, mode: (card) => (card === CARD.CITIZEN ? PULSE_MODE.NATURAL : PULSE_MODE.FAKE_CALM) };
};

function simGame(memory, kaijiSide, policy, rng) {
  let mem = startGame(memory, kaijiSide);
  const plan = policy(kaijiSide, rng);
  let tHand = startingHand(opposite(kaijiSide));
  for (let turn = 1; turn <= 5; turn++) {
    if (turn === 5) return { mem, kaijiWon: kaijiSide === SIDE.SLAVE };
    const kaijiCard = turn === plan.specialTurn ? specialOf(kaijiSide) : CARD.CITIZEN;
    const signal = tonegawaPlacesSecond(kaijiSide, turn) ? readSignal(kaijiCard, plan.mode(kaijiCard), rng) : null;
    const { card } = decide(mem, { kaijiSide, turn, signal, tonegawaHand: tHand }, rng);
    tHand.splice(tHand.indexOf(card), 1);
    const cmp = compareCards(kaijiCard, card);
    const result = cmp === 0 ? 'draw' : cmp > 0 ? 'kaiji' : 'tonegawa';
    mem = observeTurn(mem, { kaijiSide, turn, kaijiCard, signal, result });
    if (result !== 'draw') return { mem, kaijiWon: result === 'kaiji' };
  }
  throw new Error('inalcanzable');
}

function winRates(policy, seed) {
  const rng = createRng(seed);
  const wins = { [SIDE.EMPEROR]: 0, [SIDE.SLAVE]: 0 };
  const games = { [SIDE.EMPEROR]: 0, [SIDE.SLAVE]: 0 };
  for (let s = 0; s < SESSIONS; s++) {
    let mem = createMemory();
    for (let g = 1; g <= 12; g++) {
      const side = kaijiSideForGame(g);
      const r = simGame(mem, side, policy, rng);
      mem = r.mem;
      games[side]++;
      if (r.kaijiWon) wins[side]++;
    }
  }
  return { emperor: wins.emperor / games.emperor, slave: wins.slave / games.slave };
}

test('balance: Kaiji ingenuo', () => {
  const r = winRates(naive, 2026);
  console.log('ingenuo', r);
  assert.ok(r.slave >= 0.05 && r.slave <= 0.25, `esclavo ingenuo ${r.slave}`);
  assert.ok(r.emperor >= 0.35 && r.emperor <= 0.75, `emperador ingenuo ${r.emperor}`);
});

test('balance: explotar el pulso como Esclavo mejora claramente', () => {
  const naiveRate = winRates(naive, 77).slave;
  const exploitRate = winRates(exploiter, 77).slave;
  console.log('esclavo ingenuo', naiveRate, 'explotador', exploitRate);
  assert.ok(exploitRate >= naiveRate + 0.1, `explotador ${exploitRate} vs ingenuo ${naiveRate}`);
});
