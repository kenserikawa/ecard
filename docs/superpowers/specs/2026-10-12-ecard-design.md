# E-Card (賭博黙示録カイジ) — Diseño

Fecha: 2026-10-12 · Estado: aprobado en conversación, pendiente de revisión escrita

## 1. Objetivo

Juego web de un jugador que recrea la Eカード del arco de Tonegawa de *Kaiji*: el jugador
es Kaiji, se juega la audición con una aguja en el oído contra Tonegawa (CPU) y puede
descubrir y explotar la trampa del pulso, igual que en el manga. Se publica en GitHub Pages
(`https://kenserikawa.github.io/ecard/`) desde `git@github.com:kenserikawa/ecard.git`.

**Criterios de éxito**

- Reglas idénticas a las del manga (sección 3), verificadas por tests.
- Usa las ilustraciones de carta del anime (Emperador, Ciudadano, Esclavo).
- La estética se reconoce como Kaiji al primer vistazo: tinta, tramas, ざわ…ざわ…, ぐにゃあ, narrador.
- Tonegawa se siente sobrenatural antes de descubrir la trampa, y vencible con ingenio después.
- Funciona en móvil y escritorio, sin build, sin errores de consola, servido bajo `/ecard/`.

**Fuera de alcance:** multijugador online/local, cuentas, backend, i18n más allá de español
con decoración japonesa.

## 2. Arquitectura

Sitio estático: HTML + CSS + JavaScript con ES modules nativos. Sin bundler ni dependencias
de runtime. Sonido sintetizado con Web Audio (cero ficheros de audio). Tests con `node --test`
(Node 22) sobre los módulos puros.

```
index.html
.nojekyll
README.md
package.json            # solo "type":"module" y script "test"; sin dependencias
css/main.css
assets/
  cards/emperor.webp citizen.webp slave.webp back.svg
  portraits/tonegawa.webp kaiji.webp
js/
  config.js             # constantes ajustables (probabilidades, tiempos, umbrales)
  rng.js                # PRNG con semilla (mulberry32) — puro
  rules.js              # reglas puras: comparar cartas, orden de turno, calendario, pagos, aguja
  match.js              # estado puro de la sesión de 12 partidas (reducer)
  pulse.js              # modelo puro de pulso y señal que lee Tonegawa
  tonegawa.js           # IA pura: memoria, creencias, decisión
  discovery.js          # pistas y deducción de la trampa (puro)
  format.js             # 万円, etiquetas 第N戦 / Nターン目 (puro)
  storage.js            # localStorage con red + fusión del récord
  lines.js              # textos (ES + JP decorativo)
  audio.js              # sintetizador Web Audio
  ui/
    app.js              # arranque, router de pantallas, bucle de juego (orquestador)
    table.js            # mesa, manos, ranuras, animaciones de colocar/revelar
    hud.js              # medidor de aguja, monitor ECG, contador de yenes, cabecera
    fx.js               # ざわ…ざわ…, ぐにゃあ, líneas cinéticas, sacudida, destellos
    narrator.js         # cajas de narrador, bocadillos de Tonegawa, viñetas
    screens.js          # título, prólogo, apuesta, descubrimiento, finales, reglas
tests/
  rules.test.js match.test.js pulse.test.js tonegawa.test.js discovery.test.js
  format.test.js lines.test.js balance.test.js
docs/superpowers/specs/ (este documento) y docs/superpowers/plans/
```

Regla de dependencias: los módulos puros (`config`, `rng`, `rules`, `match`, `pulse`,
`tonegawa`, `lines`) no tocan el DOM ni `Math.random`. El azar entra siempre por un `rng`
inyectado. La UI importa los puros y nunca al revés.

## 3. Reglas (canon del manga)

- Cartas: 皇帝 Emperador (E), 市民 Ciudadano (C), 奴隷 Esclavo (S).
- E vence a C · C vence a S · S vence a E · C contra C es empate (あいこ).
- Mano del bando Emperador: E + 4C. Mano del bando Esclavo: S + 4C.
- **Partida (戦):** turnos de 1 en 1. En cada turno cada bando pone una carta boca abajo,
  luego se revelan a la vez. Empate: se retiran ambas y se pasa al siguiente turno. En cuanto
  aparece E o S, la partida termina con ganador. Nunca hay partida empatada.
- **Orden de colocación:** en los turnos 1 y 3 pone primero (先) el bando Emperador; en los
  turnos 2 y 4, el bando Esclavo. El que pone segundo (後) ve que el otro ya ha puesto, pero
  no qué carta.
- **Turno 5:** solo se alcanza tras cuatro empates; quedan E contra S y gana el Esclavo. Se
  resuelve automáticamente con una revelación dramática, sin pedir carta.
- **Calendario:** 12 partidas. Kaiji juega de Emperador en 1–3 y 7–9, y de Esclavo en
  4–6 y 10–12. El cambio de bando se anuncia con una viñeta.
- **Tiempo por turno:** `TURN_SECONDS = 60` (el manga da 5 min). El reloj se ve en pantalla.
  Si se agota, se juega una carta legal al azar con pulso natural (時間切れ).
- **Apuesta (mm de aguja):** antes de cada partida, entero de `1` a `45 − aguja`.
  - Gana Kaiji: `mm × 100.000 ¥` como Emperador; `mm × 500.000 ¥` como Esclavo.
  - Pierde Kaiji: `aguja += mm`. No se pierde dinero.
  - `aguja ≥ 30` → tímpano perforado → fin inmediato de la sesión (game over).
    `aguja ≥ 45` → variante peor del game over (三半規管).
- La sesión termina tras la partida 12 o con el game over.

## 4. Pulso y trampa (`pulse.js`)

- **BPM visible** (cosmético): `72 + 1.2·aguja + 0.6·apuesta`, más `+28` mientras la carta
  seleccionada es la especial (E/S) y ruido de ±3. En modo fingido, el pico sigue al modo
  elegido en vez de a la carta. Se dibuja en el ECG solo tras descubrir la trampa.
- **Señal que lee Tonegawa** al confirmar Kaiji su carta, solo cuando Kaiji pone primero:
  `readSignal(cartaReal, modo, rng) → 'special' | 'citizen'`.
  - `natural`: correcta con `P_NATURAL = 0.85`.
  - `fakeCalm`: devuelve `'citizen'` con `P_FAKE = 0.90`; si no, lectura natural.
  - `fakePanic`: devuelve `'special'` con `P_FAKE = 0.90`; si no, lectura natural.
  - Los modos fingidos solo están disponibles tras el descubrimiento.

## 5. Tonegawa (`tonegawa.js`)

Mejor respuesta bayesiana con ruido softmax. Toda la memoria es un objeto plano que las
funciones puras devuelven actualizado.

**Memoria**

- *Hábitos de Kaiji*, por bando de Kaiji (E/S), modelo de supervivencia por turno
  `k ∈ 1..4`: en riesgo `n_k` y jugadas `d_k`. Al acabar cada turno, si Kaiji aún tenía la
  especial al empezarlo, `n_k += 1`; si la jugó en ese turno, `d_k += 1`. El hazard estimado
  es `h_k = (d_k + α·h0_k) / (n_k + α)` con `h0_k = 1/(6−k)` y `α = 2`. `h_5 = 1`. Al
  empezar cada partida se aplica decaimiento `HABIT_DECAY = 0.85` a `n` y `d` de la tabla
  del bando que juega Kaiji en esa partida (la del otro bando se conserva intacta).
- *Fiabilidad de la señal*: `a = (corr + 8.5) / (tot + 10)`, con prior en 0,85. Tras cada
  turno con lectura, al revelarse las cartas: `tot += w`, y `corr += w` si la señal acertó.
  El peso es `w = 4` si el error de lectura le costó la partida (le «quema») y `w = 1` en el
  resto. Decaimiento `TRUST_DECAY = 0.8` en `corr` y `tot` antes de cada actualización.
  Si `a < 0.5`, la inferencia invierte la señal de forma natural (ver abajo).

**Decisión en el turno `j`** (bando de Tonegawa `T`, `h = h_j`):

- Si Tonegawa pone segundo hay señal `s`:
  `P(s=special) = h·a + (1−h)(1−a)`, `b = P(especial | s)` por Bayes.
  Si pone primero, `b = h` (a ciegas).
- `T = Emperador`: `Q_E = 1 − b`; `Q_C = b + (1 − b)·V(j+1)`.
- `T = Esclavo`: `Q_S = b`; `Q_C = (1 − b)·V(j+1)`.
- `V(j)` es su probabilidad de ganar al inicio del turno `j`, calculada hacia atrás, con
  `V(5) = 0` si `T = E` y `V(5) = 1` si `T = S`. En los turnos con lectura,
  `V(j) = Σ_s P(s)·max(Q)`; en los turnos a ciegas, `V(j) = max(Q)`.
- La acción se elige por softmax: `P(acción) ∝ exp(Q/τ)` con `τ = 0.07`.
- Restricción: si ya no le quedan ciudadanos, juega la especial (solo pasa en el turno 5,
  que es automático).
- Expone `explain()` (Q, b, a, h) para depuración y tests, nunca visible al jugador.

**Comportamiento esperado.** Antes del descubrimiento gana casi siempre cuando pone segundo.
Como Emperador apenas arriesga (juega E solo cuando pone segundo y lee «ciudadano»), y como
Esclavo castiga la E de Kaiji en los turnos 1 y 3. Cuando pone primero se adapta a los
hábitos de Kaiji. Tras el primer engaño, `a` cae a ≈ 0,61; tras el segundo, por debajo de
0,5, y empieza a invertir lecturas. Medido en simulación: el Emperador ingenuo gana el
≈61 % y el Esclavo ingenuo el ≈9 %. Explotar siempre el pulso como Esclavo sube al ≈25 %:
Tonegawa se adapta rápido. La jugada fuerte es el doble farol (fingir pánico con un
ciudadano y fingir calma con el Esclavo en el turno 4).

## 6. Descubrimiento de la trampa

- **Pista visual:** cada vez que Tonegawa pone segundo, mira su reloj (animación チラッ con
  tic-tac). Las 2 primeras veces el narrador lo remarca: «利根川は…時計を見た».
- **Pistas narrativas:** cuando Tonegawa gana una partida poniendo segundo, se incrementa un
  contador de lecturas sospechosas. Con 2: monólogo de Kaiji «読まれている…？ なぜだ…». Con 4:
  «なぜ…いつも時計を…».
- **Deducción:** el reloj de Tonegawa y el aparato del oído (el medidor) son clicables y
  accesibles por teclado.
  - Reloj tras al menos 1 vistazo → Kaiji: «時計…？» (sospecha A).
  - Aparato con la sospecha A → descubrimiento.
  - Reloj sin vistazos → «…ただの時計だ», sin efecto.
- **Revelación forzada:** si al empezar la partida 10 no se ha descubierto, Kaiji se da
  cuenta solo.
- **Escena de descubrimiento:** viñeta con el retrato de Kaiji distorsionado y sudor,
  «そうか…！ この装置…脈拍を…！» con traducción. Después aparecen el monitor ECG y el selector
  de pulso (`Natural · Fingir calma · Fingir pánico`), con una explicación breve.
- **Reacciones de Tonegawa** según `a`: `a < 0.7` → «…»; `a < 0.55` → «貴様…まさか».

## 7. Flujo y pantallas

1. **Título:** 賭博黙示録 / E-CARD, ざわ…ざわ… a la deriva, botones 勝負 (Jugar), ルール
   (Reglas) y sonido. Muestra el récord guardado.
2. **Prólogo** (saltable y recordado): 4–5 viñetas. Hyōdō explica la sociedad (el Emperador
   lo puede todo con el dinero, el Ciudadano no puede desobedecer, el Esclavo no tiene nada
   que perder y por eso mata al Emperador). Tonegawa: «金は命より重い». Se coloca el aparato.
3. **Apuesta:** superposición «賭けろ». Selector de mm (botones −/+, deslizador y atajos
   1/5/10/máx), aguja fantasma en el medidor, ganancia potencial en ¥ y aviso rojo si la
   apuesta cruza 30 mm o 45 mm. Tonegawa comenta según el tamaño. Botón 勝負.
4. **Turno:**
   - Indicador 先/後. Si Tonegawa pone primero: animación de su carta boca abajo y luego
     juega Kaiji.
   - Kaiji selecciona una carta (se levanta y se ve: «mirar la carta») y confirma con 出す.
     Tras el descubrimiento, elige además el modo de pulso.
   - Si Kaiji puso primero: vistazo de Tonegawa al reloj, pausa tensa con ざわ…ざわ… y su
     carta.
   - **Revelación:** volteo simultáneo con líneas cinéticas. Empate (あいこ) → siguiente turno.
     Victoria/derrota → fin de partida.
5. **Fin de partida:**
   - Victoria: «勝った…！» y rodillo de yenes.
   - Derrota: taladro, la aguja avanza, sacudida, destello rojo y ぐにゃあ (más intenso cuanto
     mayor la apuesta).
6. **Cambio de bando** cada 3 partidas: viñeta 「攻守交代」.
7. **Finales:**
   - `aguja ≥ 45` → 三半規管 (el peor).
   - `aguja ≥ 30` → 鼓膜破壊 (game over): pantalla blanca, acúfeno.
   - Sobrevive con 0 ¥ → «生還…無一文».
   - Sobrevive con < 20.000.000 ¥ → «勝者…?».
   - Sobrevive con ≥ 20.000.000 ¥ → 圧倒的勝利: Tonegawa hace el 焼き土下座.
   - Todos muestran el resumen (partidas, ¥, mm) y el botón «もう一度».
8. **Reglas:** `<dialog>` nativo, independiente de las pantallas. Se abre desde el título y
   con el botón fijo «?» durante el juego. El reloj de turno se pausa mientras haya una
   pantalla o el diálogo abiertos.
9. **Narrador:** las cajas aparecen en la parte baja de la mesa para no tapar el retrato
   ni el bocadillo de Tonegawa. Al seleccionar la carta especial aparece «ドクン» con un
   latido (también antes del descubrimiento: es otra pista).
10. **Depuración:** con `?debug` en la URL se expone `globalThis.__ecard` (estado de la
    sesión) para QA. Sin ese parámetro no se expone nada.

**Persistencia** (`localStorage`, todo en try/catch, el juego funciona sin él): récord
(¥ máximo y mejor final), sonido on/off, prólogo visto.

## 8. Dirección de arte

- **Paleta** (tokens CSS): tinta `#0b0b0d`, papel `#efe9dc`, sangre `#b3121b`, oro Teiai
  `#c9a227`, acero `#8a96a3`, fósforo ECG `#5cff8a`.
- **Texturas:** tramas de puntos (halftone) con gradientes CSS, viñeteado, mesa oscura con
  foco cenital.
- **Tipografía (Google Fonts):** Dela Gothic One (rótulos japoneses), Shippori Mincho B1
  (narrador y diálogos), Zen Kaku Gothic New (interfaz).
- **Cartas:** ilustraciones del anime, 328×500, en WebP. Reverso SVG propio: añil profundo
  con monograma «E» dorado y orla.
- **Tonegawa:** retrato del anime recortado al rostro, en duotono de alto contraste con
  trama. Las «expresiones» se hacen con CSS: sombra en los ojos (影), temblor y tinte rojo
  al perder.
- **ざわ…ざわ…:** kana grandes a la deriva con trazo blanco y sombra dura, en apuestas,
  esperas y revelaciones.
- **ぐにゃあ:** filtro SVG `feTurbulence` + `feDisplacementMap` sobre la escena, animado.
- **Accesibilidad:** con `prefers-reduced-motion` se desactivan sacudidas, ぐにゃあ y
  derivas. Foco visible. Teclas 1–5 seleccionan carta y Enter confirma. Los mensajes del
  narrador van en una región `aria-live`. Contraste AA en los textos de interfaz.
- **Responsive:**
  - Escritorio ≥ 900 px: medidor a la izquierda, ECG/reloj a la derecha, mesa al centro.
  - Móvil: medidor horizontal arriba, ECG en una franja y mano compacta.
  - Sin scroll horizontal; margen de 16 px.

## 9. Sonido (`audio.js`)

Web Audio, iniciado tras el primer gesto del usuario, con silencio persistente:

- latido (lub-dub según BPM, audible tras el descubrimiento)
- colocar carta (ruido filtrado corto)
- volteo
- tic-tac del reloj
- ambiente ざわ (ruido rosa con filtros paso banda modulados, «murmullo»)
- golpe de tensión (cluster disonante)
- taladro (diente de sierra + ruido con LFO, duración proporcional a los mm)
- victoria (arpegio ascendente)
- acúfeno (seno de 8 kHz que se desvanece)

## 10. Calidad y verificación

- **Tests unitarios** (`npm test` → `node --test tests/`):
  - matriz de comparación
  - orden 先/後 por turno y bando
  - calendario de bandos
  - pagos, máximo de apuesta, umbrales 30/45
  - turno 5 forzado
  - fin de sesión
  - estadística de la señal (10.000 muestras con semilla, tolerancia ±2 %)
  - DP de Tonegawa en casos calculables a mano
  - aprendizaje de hábitos y caída de `a` tras engaños, con inversión por debajo de 0,5
  - determinismo con semilla
- **Test de balance** (Monte Carlo, semilla fija). El Esclavo ingenuo, que juega su especial
  en un turno uniforme sin trampa, gana entre el 5 % y el 25 % de las veces contra Tonegawa;
  el Emperador ingenuo, entre el 35 % y el 75 %. Un jugador que explota el pulso una vez por
  partida como Esclavo mejora claramente sus victorias respecto al ingenuo.
- **QA visual** con Chrome DevTools: partida completa en 1280×800 y 390×844, capturas de
  cada pantalla, consola sin errores y sin peticiones 404.

## 11. Assets y créditos

- Cartas: capturas del anime (328×500) del primer commit de este repo (2021).
- Retratos: wiki de Kaiji (Fandom).
- © Nobuyuki Fukumoto / Kodansha / VAP / Madhouse / NTV. Proyecto fan sin ánimo de lucro;
  el README lo indica.

## 12. Git y despliegue

- Rama `feat/ecard` sobre `origin/main`, sin reescribir historia ni force-push. El primer
  commit elimina el submódulo `client` heredado.
- Al terminar, merge a `main` y push. GitHub Pages: Deploy from branch → `main` / root.
- Todas las rutas son relativas (el sitio vive bajo `/ecard/`).
