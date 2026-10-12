# Eカード · E-Card

> 賭博黙示録カイジ — *bet your ear against Tonegawa.*

**Play:** https://kenserikawa.github.io/ecard/ · English · 日本語 · Español

The E-Card gamble from the Tonegawa arc of *Kaiji*: manga rules, the anime card art, and a
needle screwed into your ear.

## Rules

- The **Emperor** beats the **Citizen** · the **Citizen** beats the **Slave** · the **Slave** beats the **Emperor**.
- Emperor side: 1 Emperor + 4 Citizens. Slave side: 1 Slave + 4 Citizens.
- Turns 1 and 3: the Emperor side places first. Turns 2 and 4: the Slave side.
- If four turns end in a draw, only the Emperor and the Slave remain: the Slave wins.
- 12 games, switching sides every 3.
- You bet millimeters of needle, from 1 up to 45 minus what you already have.
  - Win: ¥100,000/mm as the Emperor, ¥500,000/mm as the Slave.
  - Lose: the needle advances. At 30 mm, the eardrum.
- Tonegawa plays with an edge… just like in the manga. Find out what it is.

## Development

A static site with no build step: HTML, CSS and JavaScript ES modules.

```bash
npm test                          # rules, AI, pulse, i18n and balance tests (Node ≥ 20)
python3 -m http.server 8000       # then open http://localhost:8000/?debug
```

`?debug` exposes the session state as `globalThis.__ecard`. The game texts live in
`js/i18n/{en,ja,es}.js`, which all share the same shape; a test fails if a translation is missing.

## Español

La Eカード de *Kaiji* con las reglas del manga: apuesta milímetros de aguja contra Tonegawa y
descubre su trampa. Puedes jugar en español: elige «ES» en la pantalla de título o en la cabecera.

## 日本語

『賭博黙示録カイジ』のEカードを、原作のルールで遊べるファンメイドのブラウザゲーム。耳に付けられた
針の長さを賭けて利根川と勝負し、彼のイカサマを見破れ。タイトル画面またはヘッダーで「日本語」を選択。

## Credits

Non-commercial fan project. *Kaiji* © Nobuyuki Fukumoto / Kodansha / VAP / Madhouse / NTV.
The card illustrations (anime screenshots) and the character portraits (Kaiji Wiki, Fandom)
belong to their respective owners.
