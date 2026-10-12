// Formato de cifras al estilo del manga: 20.000.000 → «2,000万円».
const group = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function formatYen(yen) {
  if (yen !== 0 && yen % 10_000 === 0) return `${group(yen / 10_000)}万円`;
  return `${group(yen)}円`;
}

/** Cifra larga en español para subtítulos: 20.000.000 ¥ */
export function formatYenEs(yen) {
  return `${Math.round(yen).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ¥`;
}

export const gameLabel = (game) => `第${game}戦`;
export const turnLabel = (turn) => `${turn}ターン目`;
export const mmLabel = (mm) => `${mm}mm`;
