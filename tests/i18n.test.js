import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGS, DEFAULT_LANG, getLang, setLang, onLangChange, normalizeLang, dict, t } from '../js/i18n.js';
import { LINES } from '../js/lines.js';

/** Recorre dos árboles y devuelve las diferencias de forma (claves, longitudes, tipos, vacíos). */
function shapeDiff(a, b, path = '') {
  const out = [];
  if (typeof a === 'string' || typeof b === 'string') {
    if (typeof a !== 'string' || typeof b !== 'string') out.push(`${path}: tipo distinto`);
    else if (!a.trim() || !b.trim()) out.push(`${path}: texto vacío`);
    return out;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return [`${path}: lista vs objeto`];
  if (Array.isArray(a) && a.length !== b.length) out.push(`${path}: longitudes ${a.length} ≠ ${b.length}`);
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    if (!(k in a)) out.push(`${path}.${k}: falta en el primero`);
    else if (!(k in b)) out.push(`${path}.${k}: falta en el segundo`);
    else out.push(...shapeDiff(a[k], b[k], `${path}.${k}`));
  }
  return out;
}

test('inglés por defecto', () => {
  assert.equal(DEFAULT_LANG, 'en');
  assert.equal(getLang(), 'en');
  assert.deepEqual([...LANGS], ['en', 'ja', 'es']);
});

test('los tres diccionarios tienen la misma forma y ningún texto vacío', () => {
  for (const lang of ['ja', 'es']) {
    assert.deepEqual(shapeDiff(dict('en'), dict(lang)), [], `en ↔ ${lang}`);
  }
});

test('cada línea con variantes tiene tantas traducciones como rótulos', () => {
  for (const lang of LANGS) {
    for (const [key, jp] of Object.entries(LINES)) {
      const sub = dict(lang).lines[key];
      if (Array.isArray(jp)) assert.equal(sub.length, jp.length, `${lang}: ${key}`);
      else assert.equal(typeof sub, 'string', `${lang}: ${key}`);
    }
  }
});

test('t() interpola variables, cae al inglés y nunca lanza', () => {
  assert.equal(t('ui.bet.needleTo', { mm: 7 }), 'the needle reaches 7 mm');
  assert.equal(t('ui.bet.needleTo', { mm: 7 }, 'es'), 'la aguja llega a 7 mm');
  assert.equal(t('ui.bet.needleTo', { mm: 7 }, 'ja'), '針は7mmまで進む');
  assert.equal(t('ui.bet.needleTo'), 'the needle reaches {mm} mm');
  assert.equal(t('no.existe'), 'no.existe');
  assert.equal(t('ui.bet'), 'ui.bet');
});

test('setLang normaliza, avisa solo si cambia y getLang lo refleja', () => {
  const seen = [];
  const off = onLangChange((l) => seen.push(l));
  try {
    setLang('ja');
    assert.equal(getLang(), 'ja');
    setLang('ja');
    setLang('klingon');
    assert.equal(getLang(), 'en');
    assert.deepEqual(seen, ['ja', 'en']);
    assert.equal(t('ui.close'), 'Close');
  } finally {
    off();
    setLang('en');
  }
  assert.equal(normalizeLang('es'), 'es');
  assert.equal(normalizeLang(undefined), 'en');
});
