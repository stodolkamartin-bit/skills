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
} finally {
  await browser.close();
}

if (fehler) { console.log(`E2E FEHLER (${fehler})`); process.exit(1); }
console.log('E2E OK');
