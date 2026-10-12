// Idioma actual y textos traducidos. Inglés por defecto; la elección se guarda en `ecard:lang`.
import { load, save } from './storage.js';
import en from './i18n/en.js';
import ja from './i18n/ja.js';
import es from './i18n/es.js';

export const LANGS = Object.freeze(['en', 'ja', 'es']);
export const DEFAULT_LANG = 'en';
export const LANG_LABELS = Object.freeze({ en: 'EN', ja: '日本語', es: 'ES' });
const DICTS = Object.freeze({ en, ja, es });

export function normalizeLang(lang) {
  return LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

let current = normalizeLang(load('lang', DEFAULT_LANG));
const listeners = new Set();

export const getLang = () => current;

/** Cambia el idioma, lo guarda y avisa a los suscriptores si cambió. */
export function setLang(lang) {
  const next = normalizeLang(lang);
  save('lang', next);
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn(current);
}

/** Suscribe `fn(lang)` a los cambios de idioma. Devuelve la función para darse de baja. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function dict(lang = current) {
  return DICTS[normalizeLang(lang)];
}

const lookup = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Texto por ruta ('ui.bet.ifWin') con variables `{nombre}`.
 * Si falta en el idioma actual usa el inglés; si tampoco existe, devuelve la ruta. Nunca lanza.
 */
export function t(path, vars = {}, lang = current) {
  let s = lookup(dict(lang), path);
  if (typeof s !== 'string') s = lookup(DICTS.en, path);
  if (typeof s !== 'string') return path;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
