// Orquestador: une reglas, IA, pulso y descubrimiento con la interfaz. Único módulo con estado global.
import { CONFIG } from '../config.js';
import { createRng } from '../rng.js';
import { isSpecial } from '../rules.js';
import {
  PHASE, createMatch, placeBet, whoPlacesFirst, isForcedTurn, forcedCards, playTurn, nextGame,
} from '../match.js';
import { PULSE_MODE, readSignal, displaysSpike, bpm } from '../pulse.js';
import { createMemory, decide, startGame, observeTurn, signalAccuracy } from '../tonegawa.js';
import {
  DISCOVERY_EVENT, createDiscovery, onGlance, onSuspiciousWin, clickWatch, clickDevice, checkForcedReveal,
} from '../discovery.js';
import { line, betLineKey } from '../lines.js';
import { load, save, mergeRecord } from '../storage.js';
import { initAudio, setMuted, isMuted, sfx, startZawa, stopZawa } from '../audio.js';
import * as fx from './fx.js';
import { narrate, say, hush, clearNarration } from './narrator.js';
import * as hud from './hud.js';
import * as table from './table.js';
import * as screens from './screens.js';

const $ = (id) => document.getElementById(id);
const rng = createRng((Date.now() ^ Math.floor(Math.random() * 2 ** 32)) >>> 0);

const session = {
  state: null,
  memory: null,
  disc: null,
  suspicion: 0,
  hand: null,
  ecg: null,
  onSelect: null,
  discovering: false,
};

const shuffled = (list) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const discovered = () => session.disc?.discovered === true;

function currentMode() {
  if (!discovered()) return PULSE_MODE.NATURAL;
  return document.querySelector('input[name="pulse"]:checked')?.value ?? PULSE_MODE.NATURAL;
}

function resetPulseMode() {
  const natural = document.querySelector('input[name="pulse"][value="natural"]');
  if (natural) natural.checked = true;
}

function updatePulse(card, mode) {
  if (!discovered() || !session.state) return;
  const spike = displaysSpike(card, mode);
  session.ecg.setSpike(spike);
  session.ecg.setBpm(bpm({ needle: session.state.needle, bet: session.state.bet ?? 0, spike }, rng));
}

function setDiscoveredUI(on) {
  $('monitor').hidden = !on;
  $('pulse').hidden = !on;
  if (on) session.ecg.start();
  else session.ecg.stop();
}

async function discover(forced) {
  session.discovering = true;
  clearNarration();
  await screens.showDiscovery({ forced });
  setDiscoveredUI(true);
  updatePulse(session.hand.selected(), currentMode());
  session.discovering = false;
}

async function handleDiscoveryClick(fn) {
  if (!session.disc || session.discovering) return;
  const r = fn(session.disc);
  session.disc = r.state;
  if (r.event === DISCOVERY_EVENT.DISCOVER) {
    await discover(false);
    return;
  }
  narrate(line(r.event), { kind: 'kaiji', ms: 2400 });
}

/** Espera la carta de Kaiji (con reloj). Resuelve { card, mode }. */
function kaijiChoose() {
  return new Promise((resolve) => {
    const play = $('play');
    let stopTimer = () => {};
    const finish = (card, mode) => {
      stopTimer();
      session.hand.setEnabled(false);
      play.disabled = true;
      play.onclick = null;
      session.onSelect = null;
      updatePulse(null, PULSE_MODE.NATURAL);
      resolve({ card, mode });
    };
    session.hand.setEnabled(true);
    play.disabled = true;
    session.onSelect = () => {
      play.disabled = false;
    };
    play.onclick = () => {
      const mode = currentMode();
      const card = session.hand.take();
      if (card) finish(card, mode);
    };
    stopTimer = table.startTimer(CONFIG.TURN_SECONDS, {
      onTick: (left) => {
        if (left <= 10) sfx.tick();
      },
      onTimeout: () => {
        const card = session.hand.takeRandom(rng);
        narrate(line('timeout'), { ms: 2000 });
        finish(card, PULSE_MODE.NATURAL);
      },
    });
  });
}

async function tonegawaGlance() {
  const watch = $('watch');
  watch.classList.remove('is-glance');
  void watch.offsetWidth;
  watch.classList.add('is-glance');
  $('portrait').classList.add('is-menace');
  sfx.tick();
  const r = onGlance(session.disc);
  session.disc = r.state;
  if (r.event) narrate(line(r.event), { ms: 2400 });
  await fx.wait(900);
  watch.classList.remove('is-glance');
  $('portrait').classList.remove('is-menace');
}

function reactToTrust() {
  const a = signalAccuracy(session.memory);
  if (a < 0.55 && session.suspicion < 2) {
    session.suspicion = 2;
    say(line('suspicion2', rng), 3400);
  } else if (a < 0.7 && session.suspicion < 1) {
    session.suspicion = 1;
    say(line('suspicion1', rng), 3200);
  } else if (a > 0.78) {
    session.suspicion = 0;
  }
}

async function gameEffects(prev, next) {
  const portrait = $('portrait');
  if (next.lastGame.winner === 'kaiji') {
    table.setVerdict('win', '勝');
    sfx.win();
    fx.flash('var(--gold-hi)', 450);
    portrait.classList.add('is-hurt');
    say(line('tonegawaLoses', rng));
    await hud.setYen(next.yen, { animate: true });
    await narrate(line('kaijiWinsGame'), { kind: 'kaiji', ms: 1800 });
    portrait.classList.remove('is-hurt');
    return;
  }
  table.setVerdict('lose', '負');
  sfx.sting();
  portrait.classList.add('is-menace');
  say(line('tonegawaWins', rng));
  await fx.wait(700);
  narrate(line('drill'), { ms: 1600 });
  sfx.drill(0.6 + prev.bet * 0.06);
  fx.flash('var(--blood)', 700);
  fx.shake();
  hud.setNeedle(next.needle, { delta: next.lastGame.needleDelta });
  await fx.gunya(Math.min(1.8, 0.6 + prev.bet / 12), 1600 + prev.bet * 30);
  sfx.lose();
  await narrate(line('kaijiLosesGame'), { kind: 'kaiji', ms: 1800 });
  portrait.classList.remove('is-menace');
  if (next.lastTurn.first === 'kaiji') {
    const r = onSuspiciousWin(session.disc);
    session.disc = r.state;
    if (r.event) await narrate(line(r.event), { kind: 'kaiji', ms: 3200 });
  }
}

async function resolveTurn(prev, kaijiCard, tonegawaCard, signal) {
  await fx.wait(450);
  sfx.flip();
  fx.speedLines();
  await table.reveal(kaijiCard, tonegawaCard);
  const next = playTurn(prev, kaijiCard, tonegawaCard);
  session.memory = observeTurn(session.memory, {
    kaijiSide: prev.kaijiSide, turn: prev.turn, kaijiCard, signal, result: next.lastTurn.result,
  });
  session.state = next;
  if (next.lastTurn.result === 'draw') {
    table.setVerdict('draw', 'あいこ');
    await fx.wait(1100);
    table.clearSlots();
    return;
  }
  await gameEffects(prev, next);
  reactToTrust();
}

async function betPhase() {
  const s = session.state;
  const forced = checkForcedReveal(session.disc, s.game);
  session.disc = forced.state;
  if (forced.event) await discover(true);
  if (s.game > 1 && (s.game - 1) % 3 === 0) await screens.showSideSwap(s.kaijiSide);
  session.memory = startGame(session.memory, s.kaijiSide);
  hud.renderHud(s);
  hud.setOrder(whoPlacesFirst(s));
  table.clearSlots();
  table.renderOpponent(s.tonegawaHand.length);
  session.hand.render(shuffled(s.kaijiHand));
  session.hand.setEnabled(false);
  startZawa();
  const mm = await screens.askBet({
    needle: s.needle, side: s.kaijiSide, game: s.game, onPreview: (v) => hud.setGhost(s.needle, v),
  });
  stopZawa();
  hud.setGhost(s.needle, 0);
  session.state = placeBet(s, mm);
  hud.renderHud(session.state);
  say(line(betLineKey(mm, s.needle), rng));
}

async function turnPhase() {
  const s = session.state;
  hud.renderHud(s);
  table.clearSlots();
  resetPulseMode();

  if (isForcedTurn(s)) {
    hud.setOrder(null);
    const { kaijiCard, tonegawaCard } = forcedCards(s);
    await narrate({ jp: '五枚目', es: 'Cuatro empates. Solo quedan el Emperador y el Esclavo.' }, { ms: 2200 });
    session.hand.render([]);
    table.renderOpponent(0);
    table.placeInSlot('tonegawa');
    table.placeInSlot('kaiji', kaijiCard);
    sfx.place();
    startZawa();
    fx.zawa({ count: 8 });
    await fx.wait(1400);
    stopZawa();
    await resolveTurn(s, kaijiCard, tonegawaCard, null);
    return;
  }

  const first = whoPlacesFirst(s);
  hud.setOrder(first);
  const ctx = { kaijiSide: s.kaijiSide, turn: s.turn, tonegawaHand: s.tonegawaHand };
  let choice;
  let signal = null;
  let decision;

  if (first === 'tonegawa') {
    await fx.wait(700);
    decision = decide(session.memory, { ...ctx, signal: null }, rng);
    table.placeInSlot('tonegawa');
    table.renderOpponent(s.tonegawaHand.length - 1);
    sfx.place();
    say(line('tonegawaFirst', rng));
    choice = await kaijiChoose();
    table.placeInSlot('kaiji', choice.card);
    sfx.place();
  } else {
    choice = await kaijiChoose();
    table.placeInSlot('kaiji', choice.card);
    sfx.place();
    signal = readSignal(choice.card, choice.mode, rng);
    await tonegawaGlance();
    startZawa();
    fx.zawa({ count: 5 });
    await fx.wait(1000 + rng.int(0, 900));
    stopZawa();
    decision = decide(session.memory, { ...ctx, signal }, rng);
    table.placeInSlot('tonegawa');
    table.renderOpponent(s.tonegawaHand.length - 1);
    sfx.place();
    say(line('tonegawaSecond', rng), 1400);
  }
  hush();
  await resolveTurn(s, choice.card, decision.card, signal);
}

async function runSession() {
  session.state = createMatch();
  session.memory = createMemory();
  session.disc = createDiscovery();
  session.suspicion = 0;
  setDiscoveredUI(false);
  hud.setNeedle(0);
  hud.setGhost(0, 0);
  await hud.setYen(0);
  $('stage').hidden = false;

  while (session.state.phase !== PHASE.SESSION_END) {
    const { phase } = session.state;
    if (phase === PHASE.BET) await betPhase();
    else if (phase === PHASE.TURN) await turnPhase();
    else if (phase === PHASE.GAME_END) {
      await fx.wait(400);
      table.clearSlots();
      session.state = nextGame(session.state);
    }
  }

  const s = session.state;
  const record = mergeRecord(load('record', null), { yen: s.yen, ending: s.ending });
  save('record', record);
  session.ecg.stop();
  stopZawa();
  hush();
  if (s.ending === 'eardrum' || s.ending === 'canals') sfx.tinnitus(6);
  await fx.wait(600);
  return screens.showEnding({ ending: s.ending, yen: s.yen, needle: s.needle, history: s.history, record });
}

function updateSoundButton() {
  $('sound').setAttribute('aria-pressed', String(!isMuted()));
}

function wireEvents() {
  $('sound').addEventListener('click', () => {
    initAudio();
    setMuted(!isMuted());
    save('muted', isMuted());
    updateSoundButton();
  });
  $('help').addEventListener('click', () => screens.showRules());
  $('watch').addEventListener('click', () => handleDiscoveryClick(clickWatch));
  $('device').addEventListener('click', () => handleDiscoveryClick(clickDevice));
  $('pulse').addEventListener('change', () => updatePulse(session.hand.selected(), currentMode()));
  const unlock = () => initAudio();
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('keydown', (e) => {
    if (!$('overlay').hidden || $('rules').open || $('stage').hidden) return;
    if (/^[1-5]$/.test(e.key)) {
      session.hand.select(Number(e.key) - 1);
    } else if (e.key === 'Enter' && !e.target.closest?.('button, input') && !$('play').disabled) {
      $('play').click();
    }
  });
}

async function boot() {
  setMuted(load('muted', false));
  updateSoundButton();
  table.preloadCards();
  session.hand = table.createHand({
    onSelect: (card, el) => {
      session.onSelect?.();
      updatePulse(card, currentMode());
      if (isSpecial(card)) {
        fx.dokun(el);
        sfx.thump();
      }
    },
  });
  session.ecg = hud.createEcg($('ecg'), {
    onBeat: (_, spike) => {
      const s = session.state;
      const b = bpm({ needle: s?.needle ?? 0, bet: s?.bet ?? 0, spike }, rng);
      session.ecg.setBpm(b);
      $('bpm').textContent = String(b);
      if (spike) sfx.thump();
    },
  });
  wireEvents();

  let next = 'title';
  for (;;) {
    if (next === 'title') {
      $('stage').hidden = true;
      await screens.showTitle({ record: load('record', null) });
      initAudio();
      if (!load('prologueSeen', false)) {
        await screens.showPrologue();
        save('prologueSeen', true);
      }
    }
    next = await runSession();
  }
}

if (new URLSearchParams(location.search).has('debug')) globalThis.__ecard = session;

boot();
