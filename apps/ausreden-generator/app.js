/* Verdrahtung: Eingaben → Ausrede → Text + Canvas. */
(function () {
  'use strict';
  const A = window.Ausreden;
  const $ = (sel) => document.querySelector(sel);
  const ruhig = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const zustand = { ausrede: null, modus: 'polaroid', anlass: 'arbeit' };
  window.__app = { zustand, pauseRec: false };

  const chips = $('#anlass-chips');
  const frei = $('#anlass-frei');
  const textEl = $('#ausrede-text');
  const canvas = $('#beweis');
  const aktionen = $('#aktionen');
  const meldung = $('#meldung');

  // Anlass-Chips
  for (const a of A.ANLAESSE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.anlass = a.id;
    btn.textContent = a.emoji + ' ' + a.label;
    btn.setAttribute('aria-pressed', String(a.id === zustand.anlass));
    btn.addEventListener('click', () => {
      zustand.anlass = a.id;
      frei.value = '';
      for (const c of chips.children) c.setAttribute('aria-pressed', String(c === btn));
    });
    chips.appendChild(btn);
  }

  function aktuellerAnlass() {
    return frei.value.trim() ? frei.value : zustand.anlass;
  }

  let tippTimer = null;
  function tippe(text) {
    clearInterval(tippTimer);
    if (ruhig()) { textEl.textContent = text; return; }
    let i = 0;
    textEl.textContent = '';
    tippTimer = setInterval(() => {
      i += 2;
      textEl.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(tippTimer);
    }, 15);
  }

  function zeige(ausrede) {
    zustand.ausrede = ausrede;
    meldung.textContent = '';
    tippe(ausrede.text);
    aktionen.hidden = false;
    if (zeichneAktuell()) {
      canvas.hidden = false;
      canvas.classList.remove('neu');
      void canvas.offsetWidth; // Animation neu starten
      canvas.classList.add('neu');
    }
  }

  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  let recAn = true;

  /** Zeichnet den aktuellen Modus; false, wenn es nichts zu zeichnen gibt. */
  function zeichneAktuell() {
    if (!ctx || !zustand.ausrede) return false;
    if (zustand.modus === 'polaroid' && window.Polaroid) {
      window.Polaroid.zeichnePolaroid(ctx, zustand.ausrede, { recAn });
      return true;
    }
    return false;
  }

  // „● REC“ blinkt, solange das Polaroid zu sehen ist
  setInterval(() => {
    if (zustand.modus !== 'polaroid' || !zustand.ausrede || window.__app.pauseRec || ruhig()) return;
    recAn = !recAn;
    zeichneAktuell();
  }, 600);
  window.__app.zeige = zeige;

  function generiere() {
    zeige(A.erzeugeAusrede(A.neuerSeed(), aktuellerAnlass()));
  }

  $('#generieren').addEventListener('click', generiere);
  $('#noch-eine').addEventListener('click', generiere);
  frei.addEventListener('keydown', (e) => { if (e.key === 'Enter') generiere(); });
})();
