// Textos del juego: español con decoración japonesa. Cada entrada es { jp, es } o una lista de ellas.
import { formatYen, formatYenEs } from './format.js';

export const CARD_NAMES = {
  emperor: { jp: '皇帝', es: 'Emperador' },
  citizen: { jp: '市民', es: 'Ciudadano' },
  slave: { jp: '奴隷', es: 'Esclavo' },
};

export const SIDE_NAMES = {
  emperor: { jp: '皇帝側', es: 'bando Emperador' },
  slave: { jp: '奴隷側', es: 'bando Esclavo' },
};

export const PROLOGUE = [
  {
    who: 'ナレーション', art: 'assets/cards/back.svg', narrator: true,
    jp: 'Eカード',
    es: 'Un juego de cartas creado para divertir a un solo hombre: Kazutaka Hyōdō, presidente del Grupo Teiai. Esta noche, el que juega eres tú.',
  },
  {
    who: '兵藤', art: 'assets/cards/emperor.webp', color: true,
    jp: '皇帝は…金で全てを支配する',
    es: 'El Emperador lo puede todo: tiene el dinero. El Ciudadano no puede desobedecerle, porque quiere ese dinero.',
  },
  {
    who: '兵藤', art: 'assets/cards/slave.webp', color: true,
    jp: '奴隷には…失うものが何もない',
    es: 'Pero el Esclavo no tiene nada que perder. El dinero no le sirve de nada… y por eso es el único que puede matar al Emperador.',
  },
  {
    who: '利根川', art: 'assets/portraits/tonegawa.webp',
    jp: '金は命より重い…！',
    es: 'El dinero pesa más que la vida, Kaiji. Tú no tienes dinero. Así que apostarás otra cosa: tu oído.',
  },
  {
    who: 'ナレーション', art: null, narrator: true, device: true,
    jp: '耳に…悪魔の装置',
    es: 'Un aparato atornillado al oído. Por cada milímetro que pierdas, la aguja avanza. A los 30 mm… el tímpano.',
  },
  {
    who: 'カイジ', art: 'assets/portraits/kaiji.webp', color: true,
    jp: 'やるしかない…！',
    es: 'No hay otra salida. ¡Hay que jugar!',
  },
];

export const LINES = {
  betSmall: [
    { jp: '臆病者め…', es: '¿Tan poco? La prudencia no te sacará del agujero.' },
    { jp: 'ククク…', es: 'Milímetro a milímetro… Qué tierno.' },
  ],
  betMid: [
    { jp: 'ほう…', es: 'Vaya. Empiezas a entender el juego.' },
    { jp: 'いいだろう', es: 'Bien. Que hable la carta.' },
  ],
  betBig: [
    { jp: '正気か…？', es: '¿Has perdido el juicio? …Me gusta.' },
    { jp: '面白い…！', es: 'Interesante. Muy interesante.' },
  ],
  betDeadly: [
    { jp: 'その覚悟…本物か？', es: 'Si pierdes, no volverás a oír nada. ¿Lo sabes, verdad?' },
  ],
  tonegawaFirst: [
    { jp: 'さあ…', es: 'Mi carta ya está. Te toca, Kaiji.' },
    { jp: '…', es: 'Piensa. Tienes tiempo.' },
    { jp: '見抜けるか？', es: '¿Sabrás leerme?' },
  ],
  tonegawaSecond: [
    { jp: 'ふむ…', es: 'Veamos…' },
    { jp: '…', es: '…' },
  ],
  tonegawaWins: [
    { jp: '甘い…！', es: 'Ingenuo. Te lo leo en la cara.' },
    { jp: '無駄だ', es: 'Es inútil, Kaiji.' },
    { jp: 'これが現実だ', es: 'Esto es la realidad.' },
  ],
  tonegawaLoses: [
    { jp: 'ぐっ…！', es: '¡Grr…! Suerte de principiante.' },
    { jp: 'なに…！？', es: '¿Qué…?' },
  ],
  suspicion1: [{ jp: '…', es: '(Tonegawa frunce el ceño y vuelve a mirar el reloj.)' }],
  suspicion2: [{ jp: '貴様…まさか…', es: 'Tú… No será que…' }],
  sideSwap: { jp: '攻守交代', es: 'Cambio de bando' },
  draw: { jp: 'あいこ', es: 'Empate' },
  win: { jp: '勝', es: '¡Victoria!' },
  lose: { jp: '負', es: 'Derrota' },
  kaijiWinsGame: { jp: '勝った…！', es: '¡He ganado…!' },
  kaijiLosesGame: { jp: 'ぐにゃあ…', es: 'No… no puede ser…' },
  drill: { jp: 'ギュイイイン', es: 'La aguja avanza.' },
  timeout: { jp: '時間切れ', es: 'Se acabó el tiempo. La carta sale sola.' },
  dokun: 'ドクン',
  glance: { jp: '利根川は…時計を見た', es: 'Tonegawa… miró su reloj.' },
  hintRead: { jp: '読まれている…？ なぜだ…', es: '¿Me está leyendo…? ¿Cómo lo hace…?' },
  hintWatch: { jp: 'なぜ…いつも時計を…', es: '¿Por qué… siempre mira el reloj antes de jugar?' },
  justAWatch: { jp: '…ただの時計だ', es: '…Solo es un reloj.' },
  watchSuspect: { jp: '時計…？', es: 'El reloj… ¿Qué demonios mira en el reloj?' },
  deviceOnly: { jp: 'この装置…', es: 'Este maldito aparato…' },
  already: { jp: '脈拍…', es: 'Mi pulso. Lo sé. Ahora juego yo con él.' },
};

export const DISCOVERY = {
  jp: 'そうか…！ この装置…脈拍を…！',
  es: 'Cada vez que pongo carta primero, mira el reloj… ¡El aparato del oído le chiva mi pulso!',
  forcedLead: 'Partida 10. Algo encaja por fin en la cabeza de Kaiji…',
  tutorial: [
    'Ahora el monitor te muestra lo mismo que ve Tonegawa en su reloj.',
    'Antes de soltar tu carta elige tu pulso: 平静 finge calma, 動揺 finge pánico, 自然 es tu corazón de verdad.',
    'Fingir no es perfecto: una de cada diez veces el corazón te traiciona.',
    'Tonegawa no sabe que lo sabes… todavía. Si le engañas demasiado, empezará a desconfiar del reloj.',
  ],
};

export const ENDINGS = {
  canals: {
    jp: '三半規管',
    title: 'La aguja atravesó el tímpano… y siguió.',
    es: () => '45 mm. Más allá del tímpano están los canales semicirculares. El mundo gira, luego silencio. Kaiji ha perdido algo más que el oído.',
  },
  eardrum: {
    jp: '鼓膜破壊',
    title: 'Tímpano perforado',
    es: () => 'Un pitido agudo, y después nada. Tonegawa se ajusta la corbata: «Los perdedores no tienen derecho a escuchar».',
  },
  broke: {
    jp: '生還…無一文',
    title: 'Sobrevives. Sin un yen.',
    es: () => 'El oído sigue en su sitio. Los bolsillos, vacíos. ¿Eso es ganar? Para un perdedor, quizá sí.',
  },
  survivor: {
    jp: '勝者…？',
    title: '¿Ganador?',
    es: (yen) => `Sales con ${formatYen(yen)} (${formatYenEs(yen)}). Pero Tonegawa sigue en su sillón. Esto no es una victoria: es una tregua.`,
  },
  triumph: {
    jp: '圧倒的勝利',
    title: 'Victoria aplastante',
    es: (yen) => `${formatYen(yen)} (${formatYenEs(yen)}). Hyōdō no perdona a quien le hace perder dinero. Tonegawa se arrodilla sobre la plancha al rojo vivo: el 焼き土下座.`,
  },
};

export const RULES = {
  triad: 'El Emperador vence al Ciudadano · el Ciudadano vence al Esclavo · el Esclavo vence al Emperador',
  sections: [
    {
      title: '皇帝側 · 奴隷側',
      items: [
        'Bando Emperador: 1 Emperador + 4 Ciudadanos. Bando Esclavo: 1 Esclavo + 4 Ciudadanos.',
        'Ciudadano contra Ciudadano es empate (あいこ): se retiran y se juega otro turno.',
        'En cuanto aparece el Emperador o el Esclavo, la partida se decide.',
        'Si se llega al quinto turno, solo quedan Emperador y Esclavo: gana el Esclavo.',
      ],
    },
    {
      title: '先 · 後',
      items: [
        'Turnos 1 y 3: pone carta primero el bando Emperador. Turnos 2 y 4: el bando Esclavo.',
        'Las cartas van boca abajo y se revelan a la vez.',
        'Tienes 60 segundos por turno. Si se acaba, la carta sale sola.',
      ],
    },
    {
      title: '12戦',
      items: [
        '12 partidas. Kaiji es Emperador en la 1–3 y la 7–9, y Esclavo en la 4–6 y la 10–12.',
      ],
    },
    {
      title: '賭け · La aguja',
      items: [
        'Antes de cada partida apuestas milímetros de aguja (de 1 a 45 − los que ya llevas).',
        'Si ganas, cobras 100.000 ¥/mm como Emperador y 500.000 ¥/mm como Esclavo.',
        'Si pierdes, la aguja avanza lo apostado. A los 30 mm se perfora el tímpano y se acaba todo.',
        'Con 20.000.000 ¥ (2,000万円) o más al final… Tonegawa pagará caro su derrota.',
      ],
    },
  ],
};

/** Elige una línea de una lista (o devuelve la entrada si es única). */
export function line(key, rng) {
  const entry = LINES[key];
  if (Array.isArray(entry)) return rng ? rng.pick(entry) : entry[0];
  return entry;
}

/** Clave de comentario de Tonegawa según la apuesta y la aguja. */
export function betLineKey(mm, needle) {
  if (needle + mm >= 30) return 'betDeadly';
  if (mm <= 2) return 'betSmall';
  if (mm >= 12) return 'betBig';
  return 'betMid';
}
