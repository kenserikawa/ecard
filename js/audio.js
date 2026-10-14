// Sintetizador Web Audio: todos los sonidos se generan salvo el ざわ…ざわ… del anime,
// que se carga de un fichero; si falta, se sustituye por un murmullo sintetizado.
// Ninguna función lanza si no hay AudioContext o si está en silencio.

let ctx = null;
let master = null;
let muted = false;
let noise = null;
let zawaClip = null;
let zawaLoad = Promise.resolve();
let zawaNodes = null;

const VOLUME = 0.7;
const ZAWA_URL = 'assets/audio/zawa.mp3';
const ZAWA_GAP = 2.5; // segundos de silencio entre repeticiones del clip
const ZAWA_GAIN = 0.5;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  zawaLoad = loadZawaClip();
}

/** El AudioContext ya existe: se creó con un gesto del jugador, así que el navegador deja sonar. */
export const audioStarted = () => ctx !== null;

/** Promesa que se cumple cuando el clip ha cargado o ha fallado (nunca se rechaza). */
export const zawaLoaded = () => zawaLoad;

/** Carga el clip y le añade una cola de silencio para que el bucle respire. */
async function loadZawaClip() {
  try {
    const res = await fetch(ZAWA_URL);
    if (!res.ok) return;
    const clip = await ctx.decodeAudioData(await res.arrayBuffer());
    const gap = Math.round(ZAWA_GAP * clip.sampleRate);
    const padded = ctx.createBuffer(clip.numberOfChannels, clip.length + gap, clip.sampleRate);
    for (let c = 0; c < clip.numberOfChannels; c++) padded.copyToChannel(clip.getChannelData(c), c);
    zawaClip = padded;
  } catch {
    // sin fichero o sin poder decodificarlo: startZawa usa el murmullo sintetizado
  }
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.03);
}

export const isMuted = () => muted;
const ready = () => ctx && !muted;

function noiseBuffer() {
  if (noise) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.04 * white) / 1.04; // ruido marrón suave
    data[i] = white * 0.6 + last * 3;
  }
  return noise;
}

function envGain(t, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(master);
  return g;
}

function osc(type, freq, t, dur, dest) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noiseBurst(t, dur, filterType, freq, q, peak) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  const g = envGain(t, 0.005, dur * 0.3, dur * 0.7, peak);
  src.connect(f).connect(g);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
  return { src, f };
}

export const sfx = {
  place() {
    if (!ready()) return;
    noiseBurst(ctx.currentTime, 0.09, 'lowpass', 1400, 0.7, 0.5);
  },
  flip() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const { f } = noiseBurst(t, 0.22, 'bandpass', 500, 1.2, 0.45);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
  },
  tick() {
    if (!ready()) return;
    const t = ctx.currentTime;
    osc('square', 2400, t, 0.02, envGain(t, 0.001, 0.005, 0.02, 0.08));
  },
  thump() {
    if (!ready()) return;
    const t = ctx.currentTime;
    for (const [delay, freq, peak] of [[0, 62, 0.9], [0.17, 52, 0.6]]) {
      const g = envGain(t + delay, 0.01, 0.03, 0.18, peak);
      const o = osc('sine', freq, t + delay, 0.25, g);
      o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + delay + 0.2);
    }
  },
  sting() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 1.4);
    lp.connect(envGain(t, 0.01, 0.15, 1.3, 0.35));
    for (const f of [110, 116.5, 155.6, 220, 233]) osc('sawtooth', f, t, 1.5, lp);
  },
  drill(seconds = 1.2) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const dur = Math.max(0.4, seconds);
    const g = envGain(t, 0.05, dur - 0.2, 0.2, 0.32);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 34;
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
    const a = osc('sawtooth', 85, t, dur, g);
    a.frequency.linearRampToValueAtTime(160, t + dur);
    const b = osc('square', 170, t, dur, g);
    b.frequency.linearRampToValueAtTime(320, t + dur);
    noiseBurst(t, dur, 'highpass', 2500, 0.5, 0.12);
  },
  win() {
    if (!ready()) return;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      osc('triangle', f, t + i * 0.09, 0.5, envGain(t + i * 0.09, 0.01, 0.1, 0.4, 0.3));
    });
  },
  lose() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const g = envGain(t, 0.02, 0.4, 1.2, 0.4);
    const o = osc('sine', 220, t, 1.6, g);
    o.frequency.exponentialRampToValueAtTime(38, t + 1.5);
  },
  tinnitus(seconds = 5) {
    if (!ready()) return;
    const t = ctx.currentTime;
    osc('sine', 8000, t, seconds, envGain(t, 0.05, seconds * 0.4, seconds * 0.6, 0.12));
  },
  /** Un ざわ…ざわ… suelto: el clip una sola vez (sin clip, nada). */
  zawa() {
    if (!ready() || !zawaClip) return;
    const [src] = playZawaClip();
    src.loop = false;
  },
};

/** ざわ…ざわ… continuo: el clip del anime en bucle o, si no cargó, el murmullo sintetizado. */
export function startZawa() {
  if (!ctx || zawaNodes) return;
  zawaNodes = zawaClip ? playZawaClip() : playMurmur();
}

function playZawaClip() {
  const out = ctx.createGain();
  out.gain.value = ZAWA_GAIN;
  out.connect(master);
  const src = ctx.createBufferSource();
  src.buffer = zawaClip;
  src.loop = true;
  src.connect(out);
  src.start(ctx.currentTime);
  return [src, out];
}

/** Murmullo de reserva: ruido filtrado en tres bandas que respiran. */
function playMurmur() {
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.22, t + 0.8);
  out.connect(master);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  src.loop = true;
  const nodes = [src, out];
  for (const [freq, rate] of [[320, 0.7], [760, 1.1], [1500, 1.6]]) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = rate;
    depth.gain.value = 0.35;
    lfo.connect(depth).connect(g.gain);
    lfo.start(t);
    src.connect(f).connect(g).connect(out);
    nodes.push(lfo);
  }
  src.start(t);
  return nodes;
}

export function stopZawa() {
  if (!zawaNodes || !ctx) return;
  const [src, out, ...lfos] = zawaNodes;
  if (src.buffer === zawaClip) {
    src.loop = false; // la pasada en curso termina sola: no se corta un ざわ a medias
    zawaNodes = null;
    return;
  }
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
  out.gain.setTargetAtTime(0.0001, t, 0.25);
  src.stop(t + 1.2);
  lfos.forEach((l) => l.stop(t + 1.2));
  zawaNodes = null;
}
