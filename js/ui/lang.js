// Idioma en la interfaz: textos fijos de index.html (data-i18n) y selector EN · 日本語 · ES.
import { LANGS, LANG_LABELS, getLang, setLang, t } from '../i18n.js';

const $ = (id) => document.getElementById(id);

/**
 * Rellena los textos fijos: `data-i18n="ruta"` → textContent;
 * `data-i18n-attr="aria-label=ruta;title=ruta"` → atributos. Actualiza <html lang>.
 */
export function applyStaticI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, path] = pair.split('=').map((s) => s.trim());
      if (attr && path) el.setAttribute(attr, t(path));
    }
  }
  document.documentElement.lang = getLang();
  const btn = $('lang');
  if (btn) btn.textContent = LANG_LABELS[getLang()];
}

/** Botonera de idiomas. `onPick(lang)` se llama tras cambiarlo. */
export function langButtons(onPick) {
  const group = document.createElement('div');
  group.className = 'lang-switch';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t('ui.lang'));
  for (const lang of LANGS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lang-btn';
    b.lang = lang;
    b.textContent = LANG_LABELS[lang];
    b.setAttribute('aria-pressed', String(lang === getLang()));
    b.addEventListener('click', () => {
      setLang(lang);
      onPick?.(lang);
    });
    group.append(b);
  }
  return group;
}

/** Menú de idioma de la cabecera (#lang + #lang-menu). */
export function mountLangMenu() {
  const btn = $('lang');
  const menu = $('lang-menu');
  const closeMenu = ({ focus = false } = {}) => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (focus) btn.focus();
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menu.hidden) {
      closeMenu();
      return;
    }
    menu.replaceChildren(langButtons(() => closeMenu({ focus: true })));
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('[aria-pressed="true"]')?.focus();
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu({ focus: true });
  });
}
