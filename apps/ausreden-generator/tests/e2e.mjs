// Browser-Durchlauf mit dem vorinstallierten Playwright.
// Aufruf: node tests/e2e.mjs [pfad/zur/seite.html]   (Standard: index.html)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = path.resolve(process.argv[2] || path.join(hier, '..', 'index.html'));
const url = pathToFileURL(ziel).href;
const outDir = path.join(hier, 'out');
fs.mkdirSync(outDir, { recursive: true });

let fehler = 0;
function pruefe(bedingung, text) {
  if (bedingung) console.log('  ✓ ' + text);
  else { console.log('  ✗ ' + text); fehler++; }
}

async function neueSeite(browser, opts = {}) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const probleme = [];
  page.on('console', (m) => { if (m.type() === 'error') probleme.push(m.text()); });
  page.on('pageerror', (e) => probleme.push(String(e)));
  page.on('dialog', (d) => { probleme.push('dialog: ' + d.message()); d.dismiss(); });
  await page.goto(url);
  return { context, page, probleme };
}

const browser = await chromium.launch();
try {
  console.log('Ziel: ' + ziel);

  // ---------- Task 2: Oberfläche + Text ----------
  {
    console.log('Oberfläche');
    const { context, page, probleme } = await neueSeite(browser);
    pruefe(await page.locator('#aktionen').isHidden(), 'Aktionen vor dem ersten Generieren versteckt');
    await page.click('[data-anlass="date"]');
    pruefe((await page.getAttribute('[data-anlass="date"]', 'aria-pressed')) === 'true', 'Chip „Date“ aktiv');
    await page.click('#generieren');
    await page.waitForFunction(() => document.querySelector('#ausrede-text').textContent.includes('zum Date'));
    pruefe(true, 'Ausrede enthält „zum Date“');
    pruefe(await page.locator('#aktionen').isVisible(), 'Aktionen sichtbar');

    const vorher = await page.evaluate(() => window.__app.zustand.ausrede.text);
    let anders = false;
    for (let i = 0; i < 5 && !anders; i++) {
      await page.click('#noch-eine');
      anders = (await page.evaluate(() => window.__app.zustand.ausrede.text)) !== vorher;
    }
    pruefe(anders, '„Noch eine“ liefert eine neue Ausrede');

    const boese = '<img src=x onerror=alert(1)>';
    await page.fill('#anlass-frei', boese);
    await page.click('#generieren');
    await page.waitForFunction((b) => document.querySelector('#ausrede-text').textContent.includes(b), boese);
    pruefe(true, 'HTML-Eingabe erscheint wörtlich');
    pruefe((await page.locator('#ausrede-text img').count()) === 0, 'kein <img> eingeschleust');
    await page.waitForTimeout(200);
    pruefe(probleme.length === 0, 'keine Konsolenfehler / Dialoge' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await context.close();
  }

  // ---------- Task 3: Polaroid ----------
  {
    console.log('Polaroid');
    const { context, page, probleme } = await neueSeite(browser, { viewport: { width: 600, height: 1100 } });
    await page.click('#generieren');
    pruefe(await page.locator('#beweis').isVisible(), 'Canvas sichtbar');
    // Emojis müssen sichtbar gezeichnet werden: Vergleich mit derselben Ausrede ohne Emojis.
    const anteil = await page.evaluate(() => {
      const a = window.__app.zustand.ausrede;
      const bild = (aus) => {
        const c = document.createElement('canvas'); c.width = 800; c.height = 960;
        Polaroid.zeichnePolaroid(c.getContext('2d'), aus, { recAn: true });
        return c.getContext('2d').getImageData(0, 0, 800, 960).data;
      };
      const mit = bild(a), ohne = bild({ ...a, emojis: ['', '', '', ''] });
      let diff = 0;
      for (let i = 0; i < mit.length; i += 4) {
        if (Math.abs(mit[i] - ohne[i]) + Math.abs(mit[i + 1] - ohne[i + 1]) + Math.abs(mit[i + 2] - ohne[i + 2]) > 60) diff++;
      }
      return diff / (800 * 960);
    });
    pruefe(anteil > 0.04, `Emojis sichtbar (${(anteil * 100).toFixed(1)} % der Pixel)`);
    const gleich = await page.evaluate(() => {
      const a = Ausreden.erzeugeAusrede(4711, 'arbeit');
      const bild = () => {
        const c = document.createElement('canvas'); c.width = 800; c.height = 960;
        Polaroid.zeichnePolaroid(c.getContext('2d'), a, { recAn: true });
        return c.toDataURL();
      };
      return bild() === bild();
    });
    pruefe(gleich, 'gleicher Seed → gleiches Polaroid');
    await page.waitForTimeout(700);
    await page.locator('#beweis').screenshot({ path: path.join(outDir, 'polaroid.png') });
    pruefe(probleme.length === 0, 'keine Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await context.close();
  }

  // ---------- Task 4: Kunstwerk + Moduswechsel ----------
  {
    console.log('Kunstwerk');
    const { context, page, probleme } = await neueSeite(browser, { viewport: { width: 600, height: 1100 } });
    const bild = () => page.evaluate(() => document.querySelector('#beweis').toDataURL());
    await page.click('#generieren');
    await page.click('#modus');
    pruefe((await page.textContent('#modus')).includes('Zurück zum Beweis'), 'Button heißt „Zurück zum Beweis“');
    pruefe((await page.evaluate(() => window.__app.zustand.modus)) === 'kunst', 'Modus = kunst');
    const a = await bild();
    await page.waitForTimeout(300);
    pruefe((await bild()) !== a, 'Kunstwerk animiert');
    await page.waitForTimeout(1200);
    await page.locator('#beweis').screenshot({ path: path.join(outDir, 'kunst.png') });

    await page.click('#noch-eine');
    pruefe((await page.evaluate(() => window.__app.zustand.modus)) === 'kunst', '„Noch eine“ bleibt im Kunst-Modus');

    // hektisches Klicken
    await page.evaluate(() => { window.__app.pauseRec = true; });
    await page.click('#modus'); await page.click('#noch-eine'); await page.click('#modus'); await page.click('#modus');
    // jetzt: kunst → polaroid → (noch eine) → kunst → polaroid
    const z = await page.evaluate(() => ({ modus: window.__app.zustand.modus, raf: window.__app.zustand.rafId }));
    pruefe(z.modus === 'polaroid' && z.raf == null, `nach Klick-Chaos: Polaroid, keine Animation (${JSON.stringify(z)})`);
    const p1 = await bild();
    await page.waitForTimeout(300);
    pruefe((await bild()) === p1, 'Polaroid bleibt stehen (kein alter Kunst-Frame)');
    pruefe(probleme.length === 0, 'keine Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await context.close();
  }
  {
    console.log('Kunstwerk, reduzierte Bewegung');
    const { context, page } = await neueSeite(browser, { reducedMotion: 'reduce' });
    await page.click('#generieren');
    await page.click('#modus');
    const bild = () => page.evaluate(() => document.querySelector('#beweis').toDataURL());
    const a = await bild();
    await page.waitForTimeout(300);
    pruefe((await bild()) === a, 'Standbild bei prefers-reduced-motion');
    await context.close();
  }

  // ---------- Task 5: Download ----------
  {
    console.log('Download');
    const { context, page, probleme } = await neueSeite(browser, { acceptDownloads: true });
    await page.click('#generieren');
    const pngOk = async (dl) => {
      const datei = await dl.path();
      const kopf = fs.readFileSync(datei).subarray(0, 4).toString('hex');
      return kopf === '89504e47';
    };
    let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
    pruefe(/^beweis-\d{4}\.png$/.test(dl.suggestedFilename()), 'Dateiname ' + dl.suggestedFilename());
    pruefe(await pngOk(dl), 'gültiges PNG (Polaroid)');
    await page.click('#modus');
    [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
    pruefe(/^kunstwerk-\d{4}\.png$/.test(dl.suggestedFilename()), 'Dateiname ' + dl.suggestedFilename());
    pruefe(await pngOk(dl), 'gültiges PNG (Kunstwerk)');
    pruefe(probleme.length === 0, 'keine Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await context.close();
  }
  {
    console.log('Download kaputt');
    const context = await browser.newContext();
    await context.addInitScript(() => {
      HTMLCanvasElement.prototype.toBlob = function (cb) { setTimeout(() => cb(null), 0); };
    });
    const page = await context.newPage();
    await page.goto(url);
    await page.click('#generieren');
    await page.click('#download');
    await page.waitForTimeout(200);
    pruefe((await page.textContent('#meldung')) === 'Download nicht möglich – mach einfach einen Screenshot 😉', 'Fehlermeldung bei toBlob → null');
    await context.close();
  }

  // ---------- Final-Review-Fixes ----------
  {
    console.log('Screenreader');
    const { context, page } = await neueSeite(browser);
    await page.evaluate(() => {
      window.__liveAenderungen = 0;
      const live = document.querySelector('[aria-live]');
      new MutationObserver(() => window.__liveAenderungen++).observe(live, { childList: true, characterData: true, subtree: true });
    });
    await page.click('#generieren');
    await page.waitForTimeout(1500);
    const sr = await page.evaluate(() => ({
      aenderungen: window.__liveAenderungen,
      voll: document.querySelector('[aria-live]').textContent === window.__app.zustand.ausrede.text,
      versteckt: document.querySelector('#ausrede-text').getAttribute('aria-hidden'),
    }));
    pruefe(sr.aenderungen <= 2, `Live-Region ändert sich höchstens 2× pro Ausrede (${sr.aenderungen})`);
    pruefe(sr.voll, 'Live-Region enthält den ganzen Satz');
    pruefe(sr.versteckt === 'true', 'animierter Text ist für Screenreader versteckt');
    await context.close();
  }
  {
    console.log('Speichern ohne Download (geteilter Link)');
    const { context, page, probleme } = await neueSeite(browser, { acceptDownloads: true });
    await page.click('#generieren');
    await page.click('#download');
    await page.waitForSelector('#speichern-bild', { state: 'visible', timeout: 3000 }).catch(() => {});
    const src = await page.getAttribute('#speichern-bild', 'src').catch(() => null);
    pruefe(!!src && src.startsWith('data:image/png'), 'Bild zum Speichern wird angezeigt');
    pruefe(await page.locator('#speichern-hinweis').isVisible().catch(() => false), 'Hinweis „lange drücken / Rechtsklick“ sichtbar');
    await page.click('#speichern-schliessen').catch(() => {});
    pruefe(await page.locator('#speichern').isHidden().catch(() => false), 'Speichern-Ansicht lässt sich schließen');
    pruefe(probleme.length === 0, 'keine Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await context.close();
  }

  {
    console.log('Speichern über claude.ai (downloads-Capability)');
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__saves = [];
      window.claude = {
        use: (name) => Promise.resolve(name === 'downloads'
          ? { save: (req) => { window.__saves.push({ filename: req.filename, blob: req.data instanceof Blob, size: req.data.size }); return Promise.resolve({ status: 'saved' }); } }
          : null),
      };
    });
    const page = await context.newPage();
    await page.goto(url);
    await page.click('#generieren');
    await page.waitForTimeout(100);
    await page.click('#download');
    await page.waitForFunction(() => window.__saves.length > 0, null, { timeout: 3000 }).catch(() => {});
    const saves = await page.evaluate(() => window.__saves);
    pruefe(saves.length === 1 && /^beweis-\d{4}\.png$/.test(saves[0].filename) && saves[0].blob && saves[0].size > 1000,
      'Download läuft über claude.use("downloads").save ' + JSON.stringify(saves));
    pruefe(await page.locator('#speichern').isHidden(), 'keine Ersatz-Ansicht, wenn das Speichern klappt');
    await context.close();
  }

  // ---------- Task 6: keine Fremd-Requests, Layout, Screenshots ----------
  {
    console.log('Requests');
    const context = await browser.newContext();
    const page = await context.newPage();
    const fremd = [];
    page.on('request', (r) => { if (r.url() !== url && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) fremd.push(r.url()); });
    await page.goto(url);
    await page.click('#generieren');
    await page.waitForTimeout(300);
    const erwartet = process.argv[2] ? 0 : 4; // index.html lädt seine 4 Skripte
    pruefe(fremd.length === erwartet, `Requests außer der Seite: ${fremd.length} (erwartet ${erwartet})`);
    await context.close();
  }
  const name = process.argv[2] ? 'dist-' : '';
  for (const [breite, hoehe, datei] of [[1280, 900, 'desktop'], [360, 800, 'schmal'], [390, 844, 'handy']]) {
    for (const schema of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: schema, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.goto(url);
      await page.click('#generieren');
      await page.waitForTimeout(1500);
      const ueber = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      pruefe(ueber <= 0, `${breite}px ${schema}: kein horizontales Scrollen (${ueber})`);
      if (datei !== 'schmal') await page.screenshot({ path: path.join(outDir, `${name}${datei}-${schema}.png`), fullPage: true });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (fehler) { console.log(`E2E FEHLER (${fehler})`); process.exit(1); }
console.log('E2E OK');
