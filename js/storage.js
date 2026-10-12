// localStorage con red: en modo privado, sin permisos o en Node devuelve el valor por defecto.
const PREFIX = 'ecard:';

function store() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function load(key, fallback) {
  try {
    const raw = store()?.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    store()?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: el juego sigue igual */
  }
}

const ENDING_RANK = { canals: 0, eardrum: 1, broke: 2, survivor: 3, triumph: 4 };

/** Normaliza un récord leído de localStorage (puede venir corrupto o de otra versión). Pura. */
export function sanitizeRecord(record) {
  const bestYen = Number.isFinite(record?.bestYen) && record.bestYen >= 0 ? record.bestYen : 0;
  const bestEnding = Object.hasOwn(ENDING_RANK, record?.bestEnding) ? record.bestEnding : null;
  return { bestYen, bestEnding };
}

/** Fusiona el resultado de una sesión con el récord guardado. Pura. */
export function mergeRecord(record, { yen, ending }) {
  const prev = sanitizeRecord(record);
  const better = prev.bestEnding == null || ENDING_RANK[ending] > ENDING_RANK[prev.bestEnding];
  return {
    bestYen: Math.max(prev.bestYen, yen),
    bestEnding: better ? ending : prev.bestEnding,
  };
}
