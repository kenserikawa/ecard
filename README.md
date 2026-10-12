# Eカード · E-Card

> 賭博黙示録カイジ — *apuesta tu oído contra Tonegawa.*

**Jugar:** https://kenserikawa.github.io/ecard/

La Eカード del arco de Tonegawa de *Kaiji*, con las reglas del manga, las cartas del anime y
una aguja atornillada a tu oído.

## Reglas

- **Emperador** vence a **Ciudadano** · **Ciudadano** vence a **Esclavo** · **Esclavo** vence a **Emperador**.
- Bando Emperador: 1 Emperador + 4 Ciudadanos. Bando Esclavo: 1 Esclavo + 4 Ciudadanos.
- Turnos 1 y 3: pone carta primero el bando Emperador. Turnos 2 y 4: el bando Esclavo.
- 12 partidas, con cambio de bando cada 3.
- Apuestas milímetros de aguja:
  - Si ganas: 100.000 ¥/mm como Emperador y 500.000 ¥/mm como Esclavo.
  - Si pierdes: la aguja avanza. A los 30 mm, el tímpano.
- Tonegawa juega con ventaja… igual que en el manga. Descubre cuál es.

## Desarrollo

Sitio estático sin build: HTML, CSS y JavaScript con ES modules.

```bash
npm test                          # tests de reglas, IA, pulso y balance (Node ≥ 20)
python3 -m http.server 8000       # y abre http://localhost:8000/?debug
```

`?debug` expone el estado de la sesión en `globalThis.__ecard`.

## Créditos

Proyecto fan sin ánimo de lucro. *Kaiji* © Nobuyuki Fukumoto / Kodansha / VAP / Madhouse / NTV.
Las ilustraciones de las cartas y los retratos pertenecen a sus autores.
