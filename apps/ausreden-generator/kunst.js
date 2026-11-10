/* Kunstwerk: Partikel in einem Strömungsfeld; Farben und Tempo kommen aus der Ausrede.
 * erzeugeSzene ist deterministisch; zeichneKunst zeichnet einen Frame und bewegt die Partikel. */
(function (root) {
  'use strict';

  const B = 800, H = 960;
  const BILD_H = 820;           // Malfläche, darunter das Titelschild
  const ANZAHL = 600;

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function titel(ausrede) {
    const t = ausrede.bausteine.taeter.text.replace(/^(ein|eine|einer|der|die|das|mein|meine)\s+/i, '');
    return '„Ohne Titel (' + t.charAt(0).toUpperCase() + t.slice(1) + ')“ – Öl auf Ausrede, 2026';
  }

  function erzeugeSzene(ausrede) {
    const zufall = root.Ausreden.rng(ausrede.seed * 104729 + 3);
    const b = ausrede.bausteine;
    const farbtoene = [b.taeter, b.tat, b.grund, b.ort].map((x) => hash(x.text) % 360);
    const partikel = [];
    for (let i = 0; i < ANZAHL; i++) {
      partikel.push({ x: zufall() * B, y: zufall() * BILD_H, farbe: i % 4, tempo: 1.2 + zufall() * 2.2 });
    }
    return {
      farbtoene,
      hintergrund: 'hsl(' + farbtoene[0] + ', 35%, 9%)',
      f: 0.004 + zufall() * 0.008,
      v: 0.0002 + (hash(b.grund.text) % 1000) / 1000 * 0.0012,
      partikel,
      titel: titel(ausrede),
      zufall,
      begonnen: false,
    };
  }

  function zeichneKunst(ctx, szene, t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!szene.begonnen) {
      ctx.fillStyle = szene.hintergrund;
      ctx.fillRect(0, 0, B, H);
      szene.begonnen = true;
    }
    // Spuren verblassen lassen
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = szene.hintergrund;
    ctx.fillRect(0, 0, B, BILD_H);
    ctx.globalAlpha = 1;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (const p of szene.partikel) {
      const winkel = (Math.sin(p.x * szene.f + t * szene.v) + Math.cos(p.y * szene.f)) * Math.PI;
      const nx = p.x + Math.cos(winkel) * p.tempo;
      const ny = p.y + Math.sin(winkel) * p.tempo;
      ctx.strokeStyle = 'hsla(' + szene.farbtoene[p.farbe] + ', 85%, 62%, 0.55)';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = (nx + B) % B;
      p.y = (ny + BILD_H) % BILD_H;
      // ab und zu neu aussäen, damit sich nicht alles auf wenigen Bahnen sammelt
      if (szene.zufall() < 0.012) { p.x = szene.zufall() * B; p.y = szene.zufall() * BILD_H; }
    }

    // Titelschild
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, BILD_H, B, H - BILD_H);
    ctx.fillStyle = '#2a2522';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 30px Georgia, "Times New Roman", serif';
    let groesse = 30;
    while (ctx.measureText(szene.titel).width > B - 60 && groesse > 16) {
      groesse -= 2;
      ctx.font = 'italic ' + groesse + 'px Georgia, "Times New Roman", serif';
    }
    ctx.fillText(szene.titel, B / 2, BILD_H + (H - BILD_H) / 2);
    ctx.restore();
  }

  root.Kunst = { erzeugeSzene, zeichneKunst };
})(this);
