// Textos del juego. Aquí vive solo lo que no depende del idioma: rótulos japoneses decorativos,
// arte y quién habla. Los subtítulos salen del diccionario del idioma actual (js/i18n/*.js).
import { dict, getLang, t } from './i18n.js';

export const CARD_JP = { emperor: '皇帝', citizen: '市民', slave: '奴隷' };
export const SIDE_JP = { emperor: '皇帝側', slave: '奴隷側' };

export const PROLOGUE = [
  { who: 'ナレーション', art: 'assets/cards/back.svg', narrator: true, jp: 'Eカード' },
  { who: '兵藤', art: 'assets/cards/emperor.webp', color: true, jp: '皇帝は…金で全てを支配する' },
  { who: '兵藤', art: 'assets/cards/slave.webp', color: true, jp: '奴隷には…失うものが何もない' },
  { who: '利根川', art: 'assets/portraits/tonegawa.webp', jp: '金は命より重い…！' },
  { who: 'ナレーション', art: null, narrator: true, device: true, jp: '耳に…悪魔の装置' },
  { who: 'カイジ', art: 'assets/portraits/kaiji.webp', color: true, jp: 'やるしかない…！' },
];

/** Rótulo japonés de cada línea. Las listas eligen una variante; el subtítulo usa el mismo índice. */
export const LINES = {
  betSmall: ['臆病者め…', 'ククク…'],
  betMid: ['ほう…', 'いいだろう'],
  betBig: ['正気か…？', '面白い…！'],
  betDeadly: ['その覚悟…本物か？'],
  tonegawaFirst: ['さあ…', '…', '見抜けるか？'],
  tonegawaSecond: ['ふむ…', '…'],
  tonegawaWins: ['甘い…！', '無駄だ', 'これが現実だ'],
  tonegawaLoses: ['ぐっ…！', 'なに…！？'],
  suspicion1: ['…'],
  suspicion2: ['貴様…まさか…'],
  sideSwap: '攻守交代',
  draw: 'あいこ',
  win: '勝',
  lose: '負',
  kaijiWinsGame: '勝った…！',
  kaijiLosesGame: 'ぐにゃあ…',
  drill: 'ギュイイイン',
  timeout: '時間切れ',
  glance: '利根川は…時計を見た',
  hintRead: '読まれている…？ なぜだ…',
  hintWatch: 'なぜ…いつも時計を…',
  justAWatch: '…ただの時計だ',
  watchSuspect: '時計…？',
  deviceOnly: 'この装置…',
  already: '脈拍…',
};

export const DISCOVERY_JP = 'そうか…！ この装置…脈拍を…！';

export const ENDING_JP = {
  canals: '三半規管',
  eardrum: '鼓膜破壊',
  broke: '生還…無一文',
  survivor: '勝者…？',
  triumph: '圧倒的勝利',
};

/** En japonés el subtítulo se omite si repetiría el rótulo. */
function subFor(jp, text) {
  return getLang() === 'ja' && text === jp ? '' : text;
}

/** Línea `{ jp, sub }` en el idioma actual. Con `rng`, elige variante; sin él, la primera. */
export function line(key, rng) {
  const jp = LINES[key];
  const subs = dict().lines[key];
  if (Array.isArray(jp)) {
    const i = rng ? rng.int(0, jp.length - 1) : 0;
    return { jp: jp[i], sub: subFor(jp[i], subs[i]) };
  }
  return { jp, sub: subFor(jp, subs) };
}

export const cardName = (card) => dict().cards[card];
export const sideName = (side) => dict().sides[side];

/** Viñetas del prólogo con su subtítulo. */
export function prologuePanels() {
  const texts = dict().prologue;
  return PROLOGUE.map((p, i) => ({ ...p, sub: subFor(p.jp, texts[i]) }));
}

export function discoveryText() {
  const d = dict().discovery;
  return { jp: DISCOVERY_JP, sub: d.text, forcedLead: d.forcedLead, tutorial: d.tutorial };
}

/** Final `{ jp, title, text }`; `yenText` es la cifra ya formateada. */
export function endingText(ending, yenText) {
  return {
    jp: ENDING_JP[ending],
    title: t(`endings.${ending}.title`),
    text: t(`endings.${ending}.text`, { yen: yenText }),
  };
}

export const rulesText = () => dict().rules;

/** Clave de comentario de Tonegawa según la apuesta y la aguja. */
export function betLineKey(mm, needle) {
  if (needle + mm >= 30) return 'betDeadly';
  if (mm <= 2) return 'betSmall';
  if (mm >= 12) return 'betBig';
  return 'betMid';
}
