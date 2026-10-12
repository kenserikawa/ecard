import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { LINES, PROLOGUE, ENDINGS, RULES, DISCOVERY, line, betLineKey } from '../js/lines.js';
import { DISCOVERY_EVENT } from '../js/discovery.js';
import { ENDING } from '../js/match.js';

const isLine = (l) => l && typeof l.jp === 'string' && typeof l.es === 'string' && l.es.length > 0;

test('toda línea tiene jp y es', () => {
  const rng = createRng(1);
  for (const key of Object.keys(LINES)) {
    if (key === 'dokun') continue;
    assert.ok(isLine(line(key, rng)), `línea ${key}`);
  }
});

test('cada evento de descubrimiento tiene su línea', () => {
  for (const ev of Object.values(DISCOVERY_EVENT)) {
    if (ev === 'discover' || ev === 'discoverForced') continue;
    assert.ok(isLine(line(ev)), `evento ${ev}`);
  }
  assert.ok(DISCOVERY.jp && DISCOVERY.es && DISCOVERY.tutorial.length >= 3);
});

test('cada final tiene texto', () => {
  for (const e of Object.values(ENDING)) {
    assert.ok(ENDINGS[e], `final ${e}`);
    assert.equal(typeof ENDINGS[e].es(1_000_000), 'string');
  }
});

test('prólogo y reglas', () => {
  assert.ok(PROLOGUE.length >= 5);
  for (const p of PROLOGUE) assert.ok(p.jp && p.es && p.who);
  assert.ok(RULES.sections.length >= 4);
});

test('betLineKey', () => {
  assert.equal(betLineKey(1, 0), 'betSmall');
  assert.equal(betLineKey(5, 0), 'betMid');
  assert.equal(betLineKey(15, 0), 'betBig');
  assert.equal(betLineKey(3, 27), 'betDeadly');
});
