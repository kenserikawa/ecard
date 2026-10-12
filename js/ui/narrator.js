// Narrador (cajas negras de manga) y bocadillo de Tonegawa. Solo textContent: nunca HTML.
const $ = (id) => document.getElementById(id);
let queue = Promise.resolve();
let bubbleTimer = 0;

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

function show({ jp, es }, ms, kind) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `caption caption--${kind}`;
    if (jp) el.append(span('jp', jp));
    if (es) el.append(span('es', es));
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
 * @param {{jp?: string, es?: string}} line
 * @param {{ms?: number, kind?: 'narrator'|'kaiji'}} opts
 */
export function narrate(line, { ms = 2600, kind = 'narrator' } = {}) {
  queue = queue.then(() => show(line, ms, kind));
  return queue;
}

export function clearNarration() {
  $('narration').replaceChildren();
}

/** Bocadillo de Tonegawa junto a su retrato. */
export function say({ jp, es }, ms = 2600) {
  const b = $('bubble');
  b.replaceChildren(span('jp', jp), span('es', es));
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
