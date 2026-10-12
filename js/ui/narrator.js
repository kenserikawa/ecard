// Narrador (cajas negras de manga) y bocadillo de Tonegawa. Solo textContent: nunca HTML.
const $ = (id) => document.getElementById(id);
let queue = Promise.resolve();
let generation = 0; // clearNarration() la incrementa: los rótulos encolados antes se descartan
let bubbleTimer = 0;

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

function show({ jp, sub }, ms, kind) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `caption caption--${kind}`;
    if (jp) el.append(span('jp', jp));
    if (sub) el.append(span('es', sub));
    $('narration').append(el);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add('is-out');
      setTimeout(() => {
        el.remove();
        resolve();
      }, 250);
    };
    el.addEventListener('click', finish);
    setTimeout(finish, ms);
  });
}

/**
 * Muestra un rótulo. Los rótulos se encolan; la promesa se resuelve al ocultarse este.
 * @param {{jp?: string, sub?: string}} line
 * @param {{ms?: number, kind?: 'narrator'|'kaiji'}} opts
 */
export function narrate(line, { ms = 2600, kind = 'narrator' } = {}) {
  const gen = generation;
  queue = queue.then(() => (gen === generation ? show(line, ms, kind) : undefined));
  return queue;
}

/** Quita el rótulo visible y descarta los que estaban en cola. */
export function clearNarration() {
  generation += 1;
  $('narration').replaceChildren();
}

/** Bocadillo de Tonegawa junto a su retrato. */
export function say({ jp, sub }, ms = 2600) {
  const b = $('bubble');
  b.replaceChildren(span('jp', jp), ...(sub ? [span('es', sub)] : []));
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    b.hidden = true;
  }, ms);
}

export function hush() {
  clearTimeout(bubbleTimer);
  $('bubble').hidden = true;
}
