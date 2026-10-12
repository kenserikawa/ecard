# E-Card — Internacionalización (EN · 日本語 · ES)

Fecha: 2026-10-12 · Estado: diseño aprobado en conversación («si dale y súbelo»)
Amplía: `docs/superpowers/specs/2026-10-12-ecard-design.md`

## Objetivo

Todo el juego disponible en inglés (por defecto), japonés y español. Se puede cambiar de
idioma en el título y en mitad de la partida sin reiniciarla, y la elección se recuerda.

**Criterios de éxito**

- Primera visita en inglés, sin detección del navegador.
- Ningún texto visible ni `aria-label` queda fijo en un idioma, salvo dos excepciones:
  - los rótulos decorativos japoneses (ver abajo);
  - los nombres propios (利根川, カイジ, 兵藤…).
- Un test falla si a cualquier clave le falta traducción en alguno de los tres idiomas, o si
  una traducción está vacía.
- Cambiar de idioma a mitad de partida actualiza al instante la cabecera, la mesa, el medidor,
  los botones y los `aria-label`. No reinicia la partida ni pierde estado.
- Sin desbordes con los textos más largos (EN/JA) a 1280×800, 1024×640, 390×844 y 360×740.

## Decisiones

- **Rótulos decorativos japoneses:** el rótulo grande del narrador, los bocadillos y las viñetas
  (勝った…！, ざわ…, 皇帝…) se mantienen en los tres idiomas. Debajo va el subtítulo en el
  idioma elegido. En japonés, el subtítulo se omite cuando repetiría el rótulo.
- **Cifras según idioma:**
  - EN `¥20,000,000`
  - JA `2,000万円`
  - ES `20.000.000 ¥`
  - Afecta a la cabecera, la apuesta, los finales y el récord.
- **README:** en inglés, con un párrafo en español y otro en japonés.

## Arquitectura

```
js/i18n.js           # puro: LANGS, DEFAULT_LANG, getLang/setLang/onLangChange, t(path, vars), dict()
js/i18n/en.js        # diccionario inglés
js/i18n/ja.js        # diccionario japonés
js/i18n/es.js        # diccionario español (los textos actuales)
```

- **Diccionarios:** los tres tienen exactamente la misma forma.
  - `ui`: textos de interfaz por clave.
  - `lines`: subtítulos de las líneas.
  - `prologue[]`, `discovery`, `endings`, `rules`, `cards` y `sides`.
- **`lines.js`:** conserva solo lo independiente del idioma: rótulos `jp`, rutas de arte y
  `who`.
- **`line(key, rng)`:** devuelve `{ jp, sub }`.
  - En listas, la variante elegida es la misma en todos los idiomas (mismo índice).
  - Las funciones de UI que hoy reciben `{jp, es}` pasan a recibir `{jp, sub}`.
- **`t(path, vars)`:** interpola `{nombre}`. Si falta la clave en el idioma actual usa el
  inglés, y si tampoco existe, la propia ruta (`t` nunca lanza).
- **Idioma guardado:** `setLang` lo persiste en `ecard:lang` (vía `storage.js`). Un valor
  guardado desconocido se trata como inglés.
- **`<html lang>`:** se actualiza a `en`, `ja` o `es`.
- **Textos fijos de `index.html`:** llevan `data-i18n` y `data-i18n-attr`.
  `applyStaticI18n(root)` los rellena al arrancar y en cada cambio de idioma.
- **Cambio en caliente:** la cabecera, el medidor, el orden 先/後 y las etiquetas de la mano se
  re-renderizan. Rótulos y pantallas ya abiertos terminan en el idioma anterior; la siguiente
  pantalla sale en el nuevo.

## Selector

- **Título:** tres botones `EN · 日本語 · ES` con `aria-pressed`.
- **En partida:** botón en la cabecera (grupo derecho) que despliega los tres. No es
  flotante para no tapar más la mano en móvil. Etiqueta accesible traducida («Language»,
  «言語», «Idioma»). Mientras haya una pantalla encima, la mesa está inerte, así que el
  idioma se cambia en la mesa o en el título.

## Tono

- **Inglés:** subtítulos de anime de Kaiji, secos y dramáticos.
- **Japonés:** natural, voz del narrador del manga, tuteo de Tonegawa (貴様/お前).
- **Español:** el texto actual.

## Calidad

- **Tests (`node --test`):**
  - paridad de claves y textos no vacíos en los tres diccionarios (recorrido profundo);
  - `t()` con variables y su fallback;
  - inglés por defecto, persistencia, valor guardado desconocido;
  - `formatYen(lang, yen)` en los tres formatos;
  - `line()` devuelve `{jp, sub}` coherente en los tres idiomas.
- **QA en navegador:**
  - una partida en cada idioma;
  - cambio de idioma a mitad de turno (estado intacto);
  - medidas de desborde en los cuatro tamaños;
  - consola sin errores.
