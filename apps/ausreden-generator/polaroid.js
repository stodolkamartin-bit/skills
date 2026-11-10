/* Polaroid: zeichnet den „Beweis“ im Überwachungskamera-Look auf ein 800×960-Canvas.
 * Deterministisch: hängt nur von der Ausrede und opts ab. */
(function (root) {
  'use strict';

  const B = 800, H = 960;              // Canvas
  const KARTE_B = 620, KARTE_H = 760;  // Polaroid-Karte
  const RAND = 34;                     // Rand oben/seitlich
  const FOTO = KARTE_B - 2 * RAND;     // quadratisches Bildfeld (552)
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const HAND_FONT = '"Segoe Print","Bradley Hand","Comic Sans MS",cursive';
  const MONO_FONT = 'ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace';

  function leinwand(b, h, vorlage) {
    const doc = vorlage && vorlage.canvas && vorlage.canvas.ownerDocument;
    if (doc) { const c = doc.createElement('canvas'); c.width = b; c.height = h; return c; }
    return new OffscreenCanvas(b, h);
  }

  function zeichneFoto(ctx, ausrede, recAn, zufall) {
    const foto = leinwand(FOTO, FOTO, ctx);
    const f = foto.getContext('2d');

    // dunkler, grünstichiger Hintergrund
    const g = f.createLinearGradient(0, 0, 0, FOTO);
    g.addColorStop(0, '#24362b');
    g.addColorStop(1, '#0d1611');
    f.fillStyle = g;
    f.fillRect(0, 0, FOTO, FOTO);

    // Emojis: 2×2-Raster mit Versatz, damit sie sich kaum überdecken
    f.textAlign = 'center';
    f.textBaseline = 'middle';
    const zelle = FOTO / 2;
    ausrede.emojis.forEach((emoji, i) => {
      if (!emoji) return;
      const groesse = 140 + Math.floor(zufall() * 61);
      const x = (i % 2) * zelle + zelle / 2 + (zufall() - 0.5) * 70;
      const y = Math.floor(i / 2) * zelle + zelle / 2 + 20 + (zufall() - 0.5) * 60;
      f.save();
      f.translate(x, y);
      f.rotate((zufall() - 0.5) * 0.5);
      f.font = groesse + 'px ' + EMOJI_FONT;
      f.fillText(emoji, 0, 0);
      f.restore();
    });

    // grüner Kamerastich
    f.fillStyle = 'rgba(60, 255, 140, 0.10)';
    f.fillRect(0, 0, FOTO, FOTO);

    // Rauschen (deterministisch)
    const bild = f.getImageData(0, 0, FOTO, FOTO);
    const d = bild.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (zufall() - 0.5) * 46;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    f.putImageData(bild, 0, 0);

    // Scanlines
    f.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < FOTO; y += 4) f.fillRect(0, y, FOTO, 2);

    // Vignette
    const v = f.createRadialGradient(FOTO / 2, FOTO / 2, FOTO * 0.3, FOTO / 2, FOTO / 2, FOTO * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.65)');
    f.fillStyle = v;
    f.fillRect(0, 0, FOTO, FOTO);

    // Einblendungen
    f.font = 'bold 26px ' + MONO_FONT;
    f.textBaseline = 'top';
    f.textAlign = 'left';
    if (recAn) {
      f.fillStyle = '#ff2b2b';
      f.beginPath(); f.arc(34, 37, 10, 0, Math.PI * 2); f.fill();
    }
    f.fillStyle = 'rgba(255,255,255,0.9)';
    f.fillText('REC', 52, 24);
    f.textAlign = 'right';
    f.fillText('CAM-03 · ' + ausrede.uhrzeit, FOTO - 22, 24);
    f.textAlign = 'left';
    f.textBaseline = 'bottom';
    f.font = '20px ' + MONO_FONT;
    f.fillStyle = 'rgba(255,255,255,0.7)';
    f.fillText('BEWEISMITTEL', 22, FOTO - 20);

    return foto;
  }

  function zeichnePolaroid(ctx, ausrede, opts) {
    const recAn = !opts || opts.recAn !== false;
    const zufall = root.Ausreden.rng(ausrede.seed * 7919 + 17);
    const winkel = (zufall() - 0.5) * 2 * (4 * Math.PI / 180);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, B, H);

    // Tischplatte
    const tisch = ctx.createLinearGradient(0, 0, B, H);
    tisch.addColorStop(0, '#e9dcc4');
    tisch.addColorStop(1, '#d6c3a2');
    ctx.fillStyle = tisch;
    ctx.fillRect(0, 0, B, H);

    ctx.translate(B / 2, H / 2 + 10);
    ctx.rotate(winkel);
    const x0 = -KARTE_B / 2, y0 = -KARTE_H / 2;

    // Karte mit Schatten
    ctx.shadowColor = 'rgba(40, 25, 10, 0.35)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#fbfaf5';
    ctx.fillRect(x0, y0, KARTE_B, KARTE_H);
    ctx.shadowColor = 'transparent';

    ctx.drawImage(zeichneFoto(ctx, ausrede, recAn, zufall), x0 + RAND, y0 + RAND);

    // Handschrift auf dem breiten Rand
    const randOben = y0 + RAND + FOTO;
    ctx.save();
    ctx.translate(0, randOben + (KARTE_H - RAND - FOTO) / 2);
    ctx.rotate(-0.025);
    ctx.fillStyle = '#23358f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '44px ' + HAND_FONT;
    ctx.fillText('Beweis #' + ausrede.seed + ' – ich schwör’s!', 0, 0);
    ctx.restore();

    // Klebestreifen
    ctx.save();
    ctx.translate(0, y0 + 2);
    ctx.rotate(-0.06 + zufall() * 0.12);
    ctx.fillStyle = 'rgba(245, 235, 190, 0.75)';
    ctx.fillRect(-90, -24, 180, 48);
    ctx.restore();

    ctx.restore();
  }

  root.Polaroid = { zeichnePolaroid };
})(this);
