import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCOVERY_EVENT as EV, createDiscovery, onGlance, onSuspiciousWin, clickWatch, clickDevice,
  checkForcedReveal,
} from '../js/discovery.js';

test('los dos primeros vistazos al reloj se narran; el tercero no', () => {
  let d = createDiscovery();
  let r = onGlance(d); assert.equal(r.event, EV.GLANCE); d = r.state;
  r = onGlance(d); assert.equal(r.event, EV.GLANCE); d = r.state;
  r = onGlance(d); assert.equal(r.event, null);
  assert.equal(r.state.glances, 3);
});

test('pistas por lecturas sospechosas en 2 y 4', () => {
  let d = createDiscovery();
  const events = [];
  for (let i = 0; i < 5; i++) { const r = onSuspiciousWin(d); events.push(r.event); d = r.state; }
  assert.deepEqual(events, [null, EV.HINT_READ, null, EV.HINT_WATCH, null]);
});

test('reloj sin vistazos: solo un reloj', () => {
  const r = clickWatch(createDiscovery());
  assert.equal(r.event, EV.JUST_A_WATCH);
  assert.equal(r.state.suspectWatch, false);
});

test('aparato sin sospechar del reloj: nada', () => {
  const r = clickDevice(createDiscovery());
  assert.equal(r.event, EV.DEVICE_ONLY);
  assert.equal(r.state.discovered, false);
});

test('reloj tras un vistazo y luego aparato → descubrimiento', () => {
  let d = onGlance(createDiscovery()).state;
  let r = clickWatch(d); assert.equal(r.event, EV.WATCH_SUSPECT); d = r.state;
  r = clickDevice(d); assert.equal(r.event, EV.DISCOVER);
  assert.equal(r.state.discovered, true);
  assert.equal(clickWatch(r.state).event, EV.ALREADY);
  assert.equal(clickDevice(r.state).event, EV.ALREADY);
});

test('revelación forzada a partir de la partida 10', () => {
  const d = createDiscovery();
  assert.equal(checkForcedReveal(d, 9).event, null);
  const r = checkForcedReveal(d, 10);
  assert.equal(r.event, EV.DISCOVER_FORCED);
  assert.equal(r.state.discovered, true);
  assert.equal(r.state.forced, true);
  assert.equal(checkForcedReveal(r.state, 11).event, null);
});

test('tras descubrir, los vistazos y lecturas ya no se narran', () => {
  const d = { ...createDiscovery(), discovered: true };
  assert.equal(onGlance(d).event, null);
  assert.equal(onSuspiciousWin({ ...d, suspiciousWins: 1 }).event, null);
});
