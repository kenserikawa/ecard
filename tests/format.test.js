import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatYen, formatYenEs, gameLabel, turnLabel, mmLabel } from '../js/format.js';
import { load, save, mergeRecord } from '../js/storage.js';

test('formatYen usa 万 para múltiplos de 10.000', () => {
  assert.equal(formatYen(0), '0円');
  assert.equal(formatYen(100_000), '10万円');
  assert.equal(formatYen(20_000_000), '2,000万円');
  assert.equal(formatYen(123_450_000), '12,345万円');
  assert.equal(formatYen(1_234), '1,234円');
});

test('formatYenEs usa puntos de millar', () => {
  assert.equal(formatYenEs(20_000_000), '20.000.000 ¥');
  assert.equal(formatYenEs(0), '0 ¥');
});

test('etiquetas', () => {
  assert.equal(gameLabel(3), '第3戦');
  assert.equal(turnLabel(2), '2ターン目');
  assert.equal(mmLabel(12), '12mm');
});

test('storage sin localStorage devuelve el valor por defecto y no lanza', () => {
  assert.deepEqual(load('nada', { a: 1 }), { a: 1 });
  assert.doesNotThrow(() => save('x', 1));
});

test('mergeRecord guarda el máximo de yenes y el mejor final', () => {
  let r = mergeRecord(null, { yen: 0, ending: 'eardrum' });
  assert.deepEqual(r, { bestYen: 0, bestEnding: 'eardrum' });
  r = mergeRecord(r, { yen: 5_000_000, ending: 'survivor' });
  assert.deepEqual(r, { bestYen: 5_000_000, bestEnding: 'survivor' });
  r = mergeRecord(r, { yen: 9_000_000, ending: 'canals' });
  assert.deepEqual(r, { bestYen: 9_000_000, bestEnding: 'survivor' });
});
