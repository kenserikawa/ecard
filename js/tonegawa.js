// IA de Tonegawa: mejor respuesta bayesiana con ruido softmax.
// Memoria = hábitos de Kaiji por bando (modelo de supervivencia por turno) + fiabilidad de la señal del pulso.
import { CONFIG } from './config.js';
import { CARD, SIDE, opposite, specialOf, firstPlacerSide } from './rules.js';
import { SIGNAL, truthOf } from './pulse.js';

const emptyHabits = () => ({ n: [0, 0, 0, 0], d: [0, 0, 0, 0] });

export function createMemory() {
  return {
    habits: { [SIDE.EMPEROR]: emptyHabits(), [SIDE.SLAVE]: emptyHabits() },
    trust: { corr: 0, tot: 0 },
  };
}

/** P(Kaiji juega su especial en `turn` | aún la tiene). Turno 5 = 1. */
export function hazard(memory, kaijiSide, turn) {
  if (turn >= 5) return 1;
  const { n, d } = memory.habits[kaijiSide];
  const i = turn - 1;
  const prior = 1 / (6 - turn);
  return (d[i] + CONFIG.HABIT_ALPHA * prior) / (n[i] + CONFIG.HABIT_ALPHA);
}

/** Lo que Tonegawa cree que acierta la señal del pulso (prior 0,85). */
export function signalAccuracy(memory) {
  const { corr, tot } = memory.trust;
  return (corr + CONFIG.TRUST_PRIOR_CORRECT) / (tot + CONFIG.TRUST_PRIOR_TOTAL);
}

export function tonegawaPlacesSecond(kaijiSide, turn) {
  return firstPlacerSide(turn) === kaijiSide;
}

/** P(la carta de Kaiji es especial | señal). Sin señal devuelve el prior `h`. */
export function posterior(h, a, signal) {
  if (signal == null) return h;
  const likeSpecial = signal === SIGNAL.SPECIAL ? a : 1 - a;
  const likeCitizen = signal === SIGNAL.SPECIAL ? 1 - a : a;
  const den = h * likeSpecial + (1 - h) * likeCitizen;
  return den === 0 ? h : (h * likeSpecial) / den;
}

/** Probabilidad de victoria de Tonegawa por acción, dada la creencia `b` y el valor de continuar. */
export function actionValues(tonegawaSide, b, vNext) {
  if (tonegawaSide === SIDE.EMPEROR) {
    return { special: 1 - b, citizen: b + (1 - b) * vNext };
  }
  return { special: b, citizen: (1 - b) * vNext };
}

/** V(turn): probabilidad de victoria de Tonegawa al empezar `turn`, jugando óptimo según su modelo. */
export function winValue(memory, kaijiSide, turn) {
  const tSide = opposite(kaijiSide);
  if (turn >= 5) return tSide === SIDE.EMPEROR ? 0 : 1;
  const vNext = winValue(memory, kaijiSide, turn + 1);
  const h = hazard(memory, kaijiSide, turn);
  const best = (b) => {
    const q = actionValues(tSide, b, vNext);
    return Math.max(q.special, q.citizen);
  };
  if (!tonegawaPlacesSecond(kaijiSide, turn)) return best(h);
  const a = signalAccuracy(memory);
  const pSpecialSignal = h * a + (1 - h) * (1 - a);
  return pSpecialSignal * best(posterior(h, a, SIGNAL.SPECIAL))
    + (1 - pSpecialSignal) * best(posterior(h, a, SIGNAL.CITIZEN));
}

/**
 * Elige la carta de Tonegawa.
 * @param {object} ctx { kaijiSide, turn, signal: 'special'|'citizen'|null, tonegawaHand }
 * @returns {{ card: string, explain: object }}
 */
export function decide(memory, { kaijiSide, turn, signal = null, tonegawaHand }, rng) {
  const tSide = opposite(kaijiSide);
  const special = specialOf(tSide);
  if (!tonegawaHand.includes(CARD.CITIZEN)) return { card: special, explain: { forced: true } };
  if (!tonegawaHand.includes(special)) return { card: CARD.CITIZEN, explain: { forced: true } };
  const h = hazard(memory, kaijiSide, turn);
  const a = signalAccuracy(memory);
  const b = posterior(h, a, signal);
  const vNext = winValue(memory, kaijiSide, turn + 1);
  const q = actionValues(tSide, b, vNext);
  const pSpecial = 1 / (1 + Math.exp((q.citizen - q.special) / CONFIG.SOFTMAX_TAU));
  const card = rng.chance(pSpecial) ? special : CARD.CITIZEN;
  return { card, explain: { h, a, b, vNext, q, pSpecial } };
}

/** Al empezar una partida: los hábitos del bando que va a jugar Kaiji se desvanecen un poco. */
export function startGame(memory, kaijiSide) {
  const { n, d } = memory.habits[kaijiSide];
  const k = CONFIG.HABIT_DECAY;
  return {
    ...memory,
    habits: { ...memory.habits, [kaijiSide]: { n: n.map((x) => x * k), d: d.map((x) => x * k) } },
  };
}

/**
 * Tras revelar un turno, Tonegawa aprende.
 * @param {object} obs { kaijiSide, turn, kaijiCard, signal|null, result: 'draw'|'kaiji'|'tonegawa' }
 */
export function observeTurn(memory, { kaijiSide, turn, kaijiCard, signal = null, result }) {
  let { habits, trust } = memory;
  if (turn <= 4) {
    const i = turn - 1;
    const { n, d } = habits[kaijiSide];
    const playedSpecial = kaijiCard !== CARD.CITIZEN;
    habits = {
      ...habits,
      [kaijiSide]: {
        n: n.map((x, j) => (j === i ? x + 1 : x)),
        d: d.map((x, j) => (j === i && playedSpecial ? x + 1 : x)),
      },
    };
  }
  if (signal != null) {
    const correct = signal === truthOf(kaijiCard);
    const burned = !correct && result === 'kaiji';
    const w = burned ? CONFIG.TRUST_BURN_WEIGHT : 1;
    trust = {
      corr: trust.corr * CONFIG.TRUST_DECAY + (correct ? w : 0),
      tot: trust.tot * CONFIG.TRUST_DECAY + w,
    };
  }
  return { habits, trust };
}
