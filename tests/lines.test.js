import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { LANGS, setLang, dict } from '../js/i18n.js';
import {
  LINES, PROLOGUE, ENDING_JP, line, prologuePanels, discoveryText, endingText, rulesText, betLineKey,
} from '../js/lines.js';
import { DISCOVERY_EVENT } from '../js/discovery.js';
import { ENDING } from '../js/match.js';

function eachLang(fn) {
  try {
    for (const lang of LANGS) {
      setLang(lang);
      fn(lang);
    }
  } finally {
    setLang('en');
  }
}

const isLine = (l, lang) => l && typeof l.jp === 'string' && l.jp.length > 0
  && typeof l.sub === 'string' && (lang === 'ja' || l.sub.length > 0);

test('toda línea tiene rótulo y subtítulo en los tres idiomas', () => {
  eachLang((lang) => {
    const rng = createRng(1);
    for (const key of Object.keys(LINES)) assert.ok(isLine(line(key, rng), lang), `${lang}: línea ${key}`);
  });
});

test('las variantes de una lista usan el mismo índice en rótulo y subtítulo', () => {
  eachLang((lang) => {
    for (let seed = 0; seed < 20; seed++) {
      const l = line('tonegawaWins', createRng(seed));
      const i = LINES.tonegawaWins.indexOf(l.jp);
      assert.ok(i >= 0);
      const expected = dict(lang).lines.tonegawaWins[i];
      assert.equal(l.sub, lang === 'ja' && expected === l.jp ? '' : expected);
    }
  });
});

test('en japonés el subtítulo idéntico al rótulo se omite', () => {
  setLang('ja');
  try {
    assert.equal(line('glance').sub, '');
    assert.notEqual(line('watchSuspect').sub, '');
  } finally {
    setLang('en');
  }
});

test('lista cerrada de omisiones del subtítulo en japonés', () => {
  setLang('ja');
  try {
    const whole = ['glance', 'hintRead', 'hintWatch', 'justAWatch', 'suspicion2', 'sideSwap', 'draw', 'win', 'lose', 'kaijiWinsGame'];
    const variants = new Set(['tonegawaFirst:2', 'tonegawaSecond:1', 'tonegawaWins:2', 'tonegawaLoses:1']);
    for (const key of Object.keys(LINES)) {
      if (Array.isArray(LINES[key])) {
        for (let i = 0; i < LINES[key].length; i++) {
          const l = line(key, { int: () => i });
          assert.equal(l.jp, LINES[key][i]);
          assert.equal(l.sub === '', whole.includes(key) || variants.has(`${key}:${i}`), `ja ${key}[${i}] sub=${JSON.stringify(l.sub)}`);
        }
      } else {
        assert.equal(line(key).sub === '', whole.includes(key), `ja ${key} sub=${JSON.stringify(line(key).sub)}`);
      }
    }
  } finally {
    setLang('en');
  }
});

test('cada evento de descubrimiento tiene su línea', () => {
  for (const ev of Object.values(DISCOVERY_EVENT)) {
    if (ev === 'discover' || ev === 'discoverForced') continue;
    assert.ok(isLine(line(ev), 'en'), `evento ${ev}`);
  }
  const d = discoveryText();
  assert.ok(d.jp && d.sub && d.forcedLead && d.tutorial.length >= 3);
});

test('cada final tiene rótulo, título y texto con la cifra', () => {
  eachLang((lang) => {
    for (const e of Object.values(ENDING)) {
      assert.ok(ENDING_JP[e], `final ${e}`);
      const txt = endingText(e, 'CIFRA');
      assert.ok(txt.title && txt.text, `${lang}: ${e}`);
      if (e === 'survivor' || e === 'triumph') assert.ok(txt.text.includes('CIFRA'), `${lang}: ${e} sin cifra`);
    }
  });
});

test('prólogo y reglas', () => {
  eachLang((lang) => {
    const panels = prologuePanels();
    assert.equal(panels.length, PROLOGUE.length);
    for (const p of panels) assert.ok(p.jp && p.who && typeof p.sub === 'string', `${lang}: viñeta`);
    assert.ok(rulesText().sections.length >= 4);
  });
});

test('betLineKey', () => {
  assert.equal(betLineKey(1, 0), 'betSmall');
  assert.equal(betLineKey(5, 0), 'betMid');
  assert.equal(betLineKey(15, 0), 'betBig');
  assert.equal(betLineKey(3, 27), 'betDeadly');
});
