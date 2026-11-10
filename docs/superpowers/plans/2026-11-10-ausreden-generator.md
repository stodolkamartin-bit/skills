# Ausreden-Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Web-App ohne Abhängigkeiten, die absurde Ausreden fürs Zuspätkommen erfindet und als Fake-Polaroid oder generatives Kunstwerk „beweist“, mit PNG-Download und einer teilbaren Single-File-Version.

**Architecture:** Drei reine Module (`ausreden.js` für die Logik, `polaroid.js` und `kunst.js` fürs Canvas-Zeichnen) werden als klassische Skripte geladen und von `index.html` verdrahtet. Jedes Modul hängt seine API an `window` und exportiert sie für Node zusätzlich per `module.exports`. `build.mjs` setzt alles zu einer einzigen HTML-Datei zusammen.

**Tech Stack:** HTML, CSS und Vanilla-JS (ES2020) mit Canvas 2D; Node 22 (`node --test`) für Unit-Tests; das vorinstallierte Playwright (`require('playwright')`) für den Browser-Test.

**Spec:** `docs/superpowers/specs/2026-11-10-ausreden-generator-design.md`

## Global Constraints

- Alles liegt unter `apps/ausreden-generator/`. Es gibt keine npm-Abhängigkeiten und kein `package.json`.
- Keine externen Requests: keine Webfonts, kein CDN. Die Handschrift nutzt einen System-Font-Stack mit `cursive` am Ende.
- Die App muss per Doppelklick über `file://` laufen, deshalb keine ES-Module in den App-Dateien.
- Oberfläche und Texte sind komplett auf Deutsch.
- Das Canvas ist intern 800 × 960 px groß und wird per CSS auf `width: 100%; max-width: 480px` skaliert.
- Ab 360 px Breite darf es kein horizontales Scrollen geben.
- Nutzereingaben werden nur per `textContent` bzw. `fillText` ausgegeben, nie per `innerHTML`.
- Seeds sind ganze Zahlen von 1000 bis 9999. Gleicher Seed und gleicher Anlass ergeben dieselbe Ausrede und dasselbe Polaroid.
- Die Dateinamen beim Download lauten `beweis-{seed}.png` und `kunstwerk-{seed}.png`.
- Emojis stammen aus Unicode 13 oder älter.
- `dist/` wird nicht committet und kommt deshalb in `apps/ausreden-generator/.gitignore`.

## Review Focus

1. **Eigener Anlass mit HTML oder Anführungszeichen**, z. B. `<img src=x onerror=alert(1)>` oder `"Yoga"`: Der Text erscheint wörtlich in der Ausrede, und nichts wird ausgeführt. Das wird in Task 2 getestet.
2. **Nur Leerzeichen als eigener Anlass**: Die Eingabe fällt auf „Arbeit“ zurück und ergibt nicht „zum Termin ‚ ‘“. Das wird in Task 1 getestet.
3. **Schnelles Hin- und Herklicken zwischen Kunstwerk, Noch eine und Zurück**: Es darf immer nur eine Animationsschleife laufen, und das Polaroid wird nicht von einem alten Kunst-Frame übermalt. Das wird in Task 4 getestet.
4. **Emojis auf dem Canvas bleiben unsichtbar**, wenn der Font-Stack falsch ist: Das Bildfeld darf nicht nur aus Hintergrundfarbe bestehen. Das wird in Task 3 getestet.
5. **Die gebaute `dist`-Datei lädt etwas nach oder hängt an fehlenden Dateien**: Die Datei muss allein über `file://` funktionieren und darf keine Requests außer sich selbst auslösen. Das wird in Task 6 getestet.

---

### Task 1: Ausreden-Baukasten

**Files:**
- Create: `apps/ausreden-generator/ausreden.js`
- Test: `apps/ausreden-generator/tests/ausreden.test.mjs`

**Interfaces:**
- Produces (als `window.Ausreden` bzw. `module.exports`):
  - `ANLAESSE: Array<{ id: string, label: string, emoji: string, form: string }>` mit genau den Einträgen
    `arbeit` 💼 „zur Arbeit“, `date` ❤️ „zum Date“, `zahnarzt` 🦷 „zum Zahnarzt“, `schule` 🎓 „zur Schule“, `oma` 👵 „zum Oma-Besuch“
  - `BAUSTEINE: { taeter, tat, grund, ort }`. Jede Liste ist ein `Array<{ text: string, emoji: string }>` mit mindestens 20 Einträgen.
  - `VORLAGEN: string[]` mit mindestens 6 Vorlagen und den Platzhaltern `{anlass} {taeter} {tat} {grund} {ort}`
  - `neuerSeed(): number` liefert eine ganze Zahl von 1000 bis 9999 (`Math.random`).
  - `anlassForm(anlass: string): string` macht aus einer Anlass-`id` die `form`. Bei freiem Text entsteht `zum Termin ‚{text}‘`, getrimmt und auf 40 Zeichen gekürzt. Ist der Text leer oder besteht nur aus Leerzeichen, kommt `zur Arbeit` heraus.
  - `erzeugeAusrede(seed: number, anlass: string): { seed, text, emojis: string[4], bausteine: { taeter, tat, grund, ort }, uhrzeit: "HH:MM:SS" }`
  - `rng(seed: number): () => number` ist mulberry32 und wird auch von `polaroid.js` und `kunst.js` genutzt.

- [ ] **Step 1: Failing Tests schreiben.** Das Modul wird per `createRequire(import.meta.url)('../ausreden.js')` geladen.

```js
test('gleicher Seed + Anlass → identisch', () =>
  assert.deepEqual(erzeugeAusrede(4711, 'arbeit'), erzeugeAusrede(4711, 'arbeit')));
test('keine Platzhalter übrig (500 Seeds)', () => {
  for (let s = 1000; s < 1500; s++) assert.doesNotMatch(erzeugeAusrede(s, 'date').text, /[{}]/);
});
test('Bausteine: ≥20 je Liste, je genau ein nicht-leeres Emoji', () => {
  for (const liste of Object.values(BAUSTEINE)) {
    assert.ok(liste.length >= 20);
    for (const b of liste) assert.equal([...new Intl.Segmenter().segment(b.emoji)].length, 1);
  }
});
test('Anlass-Formen', () => {
  assert.equal(anlassForm('zahnarzt'), 'zum Zahnarzt');
  assert.equal(anlassForm('Yoga'), 'zum Termin ‚Yoga‘');
  assert.equal(anlassForm(''), 'zur Arbeit');
  assert.equal(anlassForm('   '), 'zur Arbeit');
  assert.ok(anlassForm('x'.repeat(100)).length <= 'zum Termin ‚‘'.length + 40);
});
test('Text beginnt mit Großbuchstaben, endet mit Punkt, enthält Anlass', () => {
  const a = erzeugeAusrede(1234, 'Steuerberater');
  assert.match(a.text, /^[A-ZÄÖÜ].*[.!]$/); assert.ok(a.text.includes('Steuerberater'));
});
test('Abwechslung: 200 Seeds → ≥150 verschiedene Texte', () => {
  const set = new Set(); for (let s = 2000; s < 2200; s++) set.add(erzeugeAusrede(s, 'arbeit').text);
  assert.ok(set.size >= 150);
});
test('neuerSeed im Bereich, uhrzeit-Format, 4 Emojis', () => {
  const s = neuerSeed(); assert.ok(Number.isInteger(s) && s >= 1000 && s <= 9999);
  const a = erzeugeAusrede(s, 'oma');
  assert.match(a.uhrzeit, /^\d\d:\d\d:\d\d$/); assert.equal(a.emojis.length, 4);
});
```

- [ ] **Step 2:** Mit `node --test apps/ausreden-generator/tests/` prüfen, dass die Tests FEHLSCHLAGEN, weil das Modul fehlt.
- [ ] **Step 3: `ausreden.js` implementieren.** Das Modul wird in eine UMD-artige IIFE gepackt: `(function (root) { …; if (typeof module === 'object' && module.exports) module.exports = api; else root.Ausreden = api; })(this);`. Die Bausteine werden so formuliert, dass der Satz grammatisch stimmt: Täter im Nominativ, Tat als Partizip-Phrase mit Objekt, Ort als Präpositionalphrase und Grund als Nebensatz ohne „weil“. Als Vorlage dient z. B. „Auf dem Weg {anlass} hat {taeter} {ort} {tat}, weil {grund}.“ Alle Vorlagen beginnen mit fester Großschreibung. Die Uhrzeit liegt zwischen 06:00:00 und 09:59:59 und wird aus `rng(seed)` abgeleitet. Für die Auswahl wird `rng(seed)` aufgerufen, nicht `Math.random`.
- [ ] **Step 4:** `node --test apps/ausreden-generator/tests/` muss ERFOLGREICH durchlaufen (7 Tests).
- [ ] **Step 5:** Commit mit der Nachricht `feat(ausreden): add excuse generator core with tests`

### Task 2: Oberfläche und Text-Ausgabe

**Files:**
- Create: `apps/ausreden-generator/index.html` (enthält das CSS inline im `<style>`)
- Create: `apps/ausreden-generator/app.js` für die Verdrahtung, damit `index.html` schlank bleibt
- Test: `apps/ausreden-generator/tests/e2e.mjs`

**Interfaces:**
- Consumes: `Ausreden.ANLAESSE`, `Ausreden.neuerSeed`, `Ausreden.erzeugeAusrede` aus Task 1
- Produces: diese DOM-IDs, auf die sich die späteren Tasks und der E2E-Test verlassen:
  - `#anlass-chips` mit Buttons `[data-anlass="<id>"]`; der aktive Chip trägt `aria-pressed="true"`
  - `#anlass-frei` (Texteingabe; gefüllt hat sie Vorrang vor dem Chip)
  - `#generieren`, `#ausrede-text`, `#beweis` (`<canvas width="800" height="960">`), `#aktionen` (bis zum ersten Generieren `hidden`)
  - `#noch-eine`, `#modus` (Text „🎨 Als Kunstwerk“ / „📸 Zurück zum Beweis“), `#download`, `#meldung`
- Produces in `app.js`: einen modulweiten Zustand `{ ausrede, modus: 'polaroid' | 'kunst' }` und eine Funktion `zeige(ausrede)`. Die späteren Tasks erweitern `zeige` um das Zeichnen. `window.__app = { zustand }` dient als Test-Hook.

- [ ] **Step 1: Failing E2E-Test schreiben.** `tests/e2e.mjs` nutzt `createRequire` → `playwright`, startet `chromium.launch()` und öffnet `file://…/index.html` (bzw. `process.argv[2]`, falls angegeben; das braucht Task 6). Läuft alles durch, gibt das Skript `E2E OK` aus, sonst `process.exit(1)`. Erste Prüfungen:
  - Nach dem Klick auf `[data-anlass="date"]` und `#generieren` enthält `#ausrede-text` „zum Date“, und `#aktionen` ist sichtbar.
  - Nach dem Klick auf `#noch-eine` ändert sich der Text (bei gleichem Seed ist ein Neuversuch erlaubt).
  - Nach `fill('#anlass-frei', '<img src=x onerror=alert(1)>')` und `#generieren` enthält `textContent` den Rohtext. Außerdem gibt es weder `#ausrede-text img` noch einen `dialog`-Event.
  - Es dürfen keine `console`-Fehler und keine `pageerror` auftreten.
- [ ] **Step 2:** `node apps/ausreden-generator/tests/e2e.mjs` muss FEHLSCHLAGEN.
- [ ] **Step 3: Implementieren.** Die Skripte werden in dieser Reihenfolge geladen: `ausreden.js`, `polaroid.js`, `kunst.js`, `app.js`. Ein fehlendes `polaroid.js` oder `kunst.js` darf `app.js` nicht abbrechen lassen, deshalb wird mit `typeof Polaroid !== 'undefined'` geprüft. Die Tipp-Animation läuft per Intervall mit ca. 15 ms pro Zeichen. Bei `prefers-reduced-motion` wird der Text sofort gesetzt. Das CSS nutzt Variablen auf `:root` mit Dunkelmodus über `prefers-color-scheme`, der `body` bekommt einen expliziten Hintergrund, und es gibt 16 px seitlichen Abstand.
- [ ] **Step 4:** `node apps/ausreden-generator/tests/e2e.mjs` muss `E2E OK` ausgeben.
- [ ] **Step 5:** Commit mit der Nachricht `feat(ausreden): add UI with excuse text output and e2e test`

### Task 3: Polaroid

**Files:**
- Create: `apps/ausreden-generator/polaroid.js`
- Modify: `apps/ausreden-generator/app.js`, damit `zeige()` das Polaroid zeichnet und der REC-Punkt blinkt
- Modify: `apps/ausreden-generator/tests/e2e.mjs`

**Interfaces:**
- Consumes: `Ausreden.rng`, das Ausrede-Objekt aus Task 1
- Produces: `window.Polaroid.zeichnePolaroid(ctx: CanvasRenderingContext2D, ausrede, opts?: { recAn?: boolean = true }): void`. Die Funktion setzt den Canvas vollständig neu und hängt nur von `ausrede` und `opts` ab.
- Produces in `app.js`: `window.__app.pauseRec: boolean`. Ist es `true`, schaltet das Blink-Intervall nicht um; das braucht der Test in Task 4.

- [ ] **Step 1: E2E-Prüfungen ergänzen.**
  - Nach dem Generieren hat das Canvas im Bildfeld (Mitte ±150 px) mindestens 500 verschiedene Pixelfarben. Das beweist, dass die Emojis gezeichnet wurden, und lässt sich per `page.evaluate` mit `getImageData` prüfen.
  - Determinismus: `page.evaluate` zeichnet `erzeugeAusrede(4711,'arbeit')` zweimal auf frische Off-DOM-Canvases (`recAn: true`), und `toDataURL()` muss beide Male gleich sein.
- [ ] **Step 2:** Den E2E-Test laufen lassen; er muss FEHLSCHLAGEN.
- [ ] **Step 3: Implementieren.** Die Werte stehen in der Spec, Abschnitt „Polaroid“: Drehung ±4° aus dem Seed, dunkles grünstichiges Bildfeld, 4 Emojis mit 140–200 px und Positionen aus `rng`. Der Font-Stack für Emojis ist `"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`. Das Rauschen wird mit `rng` erzeugt, nicht mit `Math.random`, damit das Bild deterministisch bleibt. Dazu kommen Scanlines, Vignette, „● REC“ und `CAM-03 · {uhrzeit}`. Unten steht in Handschrift „Beweis #{seed} – ich schwör's!“ mit dem Font-Stack `"Segoe Print","Bradley Hand","Comic Sans MS",cursive`. In `app.js` schaltet ein Intervall von 600 ms `recAn` um, solange `modus === 'polaroid'` gilt. Dieses Intervall wird gestoppt, sobald in den Kunst-Modus gewechselt wird.
- [ ] **Step 4:** Den E2E-Test laufen lassen, er muss `E2E OK` ausgeben. Zusätzlich den Screenshot `tests/out/polaroid.png` (deviceScaleFactor 1) selbst ansehen: Emojis sichtbar, Text lesbar, Rahmen gedreht.
- [ ] **Step 5:** Commit mit der Nachricht `feat(ausreden): draw surveillance polaroid proof`. `tests/out/` kommt in die `.gitignore`.

### Task 4: Kunstwerk und Moduswechsel

**Files:**
- Create: `apps/ausreden-generator/kunst.js`
- Modify: `apps/ausreden-generator/app.js`
- Modify: `apps/ausreden-generator/tests/e2e.mjs`

**Interfaces:**
- Consumes: `Ausreden.rng`, das Ausrede-Objekt
- Produces: `window.Kunst.erzeugeSzene(ausrede): Szene` (Partikel und Palette, deterministisch) und `window.Kunst.zeichneKunst(ctx, szene, t: number /* ms */): void`. Die Partikel stehen in der Szene, damit `zeichneKunst` ohne Zustand auskommt; mutiert wird nur `szene`.
- Produces in `app.js`: `starteKunst()` und `stoppeKunst()`. Es gibt höchstens eine `requestAnimationFrame`-ID, die in `zustand.rafId` steht.

- [ ] **Step 1: E2E-Prüfungen ergänzen.**
  - Ein Klick auf `#modus` setzt den Text auf „📸 Zurück zum Beweis“ und `__app.zustand.modus` auf `'kunst'`. Nach 300 ms unterscheidet sich der Canvas-Inhalt vom Stand direkt nach dem Klick, die Animation läuft also.
  - Schnelles Klicken: Die Folge `#modus` → `#noch-eine` → `#modus` → `#modus` wird ohne Wartezeit ausgeführt. Danach ist `modus === 'polaroid'` und `zustand.rafId == null`, und zwei `toDataURL()` im Abstand von 300 ms sind gleich, abgesehen vom REC-Punkt. Deshalb wird während dieser Prüfung das Blink-Intervall über `__app.pauseRec = true` angehalten.
  - `#noch-eine` im Kunst-Modus zeigt die neue Ausrede als Kunstwerk, und der Modus bleibt `'kunst'`.
  - Mit `emulateMedia({ reducedMotion: 'reduce' })` und Kunst-Modus ergeben zwei `toDataURL()` im Abstand von 300 ms dasselbe Bild.
- [ ] **Step 2:** Den E2E-Test laufen lassen; er muss FEHLSCHLAGEN.
- [ ] **Step 3: Implementieren.** Es gibt 600 Partikel. Das Strömungsfeld ist `winkel = sin(x*f + t*v) + cos(y*f)` mit `f` und `v` aus dem Seed, wobei `v` vom Text des Grundes abhängt. Jeder der 4 Bausteine liefert einen Farbton über einen String-Hash modulo 360. Damit Spuren entstehen, wird jeder Frame mit einem halbtransparenten Hintergrund (Alpha 0.08) übermalt. Unten steht der Titel „Ohne Titel ({Täter ohne Artikel}) – Öl auf Ausrede, 2026“; den Artikel `ein/eine/mein/meine` per Regex vorne entfernen. Bei `reducedMotion` werden 200 Schritte vorgerechnet und dann wird ein einzelnes Standbild gezeichnet.
- [ ] **Step 4:** Den E2E-Test laufen lassen, er muss `E2E OK` ausgeben. Den Screenshot `tests/out/kunst.png` selbst ansehen.
- [ ] **Step 5:** Commit mit der Nachricht `feat(ausreden): add generative art mode`

### Task 5: Download

**Files:**
- Modify: `apps/ausreden-generator/app.js`
- Modify: `apps/ausreden-generator/tests/e2e.mjs`

**Interfaces:**
- Consumes: `zustand` und `#beweis` aus Task 2
- Produces: `ladeHerunter(): void`. Die Funktion schreibt bei Fehlern in `#meldung`.

- [ ] **Step 1: E2E-Prüfungen ergänzen.**
  - `page.waitForEvent('download')` plus Klick auf `#download` im Polaroid-Modus ergibt `suggestedFilename()` passend zu `/^beweis-\d{4}\.png$/`. Die gespeicherte Datei beginnt mit den PNG-Magic-Bytes `89 50 4E 47`.
  - Im Kunst-Modus gilt dasselbe mit `/^kunstwerk-\d{4}\.png$/`.
  - Wird `HTMLCanvasElement.prototype.toBlob` per `addInitScript` in einem separaten Kontext so überschrieben, dass der Callback `null` bekommt, enthält `#meldung` nach dem Klick „Download nicht möglich – mach einfach einen Screenshot 😉“.
- [ ] **Step 2:** Den E2E-Test laufen lassen; er muss FEHLSCHLAGEN.
- [ ] **Step 3: Implementieren.** Im Polaroid-Modus wird vor dem Export mit `recAn: true` neu gezeichnet, damit das PNG immer den REC-Punkt zeigt. Der Export läuft über `toBlob` → `URL.createObjectURL` → ein temporäres `<a download>`, danach `revokeObjectURL`. Ein fehlender Blob und Exceptions werden abgefangen und landen in `#meldung`.
- [ ] **Step 4:** Den E2E-Test laufen lassen, er muss `E2E OK` ausgeben.
- [ ] **Step 5:** Commit mit der Nachricht `feat(ausreden): download proof as PNG`

### Task 6: Single-File-Build, README und Abschlussprüfung

**Files:**
- Create: `apps/ausreden-generator/build.mjs`
- Create: `apps/ausreden-generator/README.md`
- Create: `apps/ausreden-generator/.gitignore` mit den Einträgen `dist/` und `tests/out/`, sofern sie noch fehlen
- Modify: `apps/ausreden-generator/tests/e2e.mjs`

**Interfaces:**
- Consumes: alle App-Dateien
- Produces: `node apps/ausreden-generator/build.mjs` schreibt `apps/ausreden-generator/dist/ausreden-generator.html`.

- [ ] **Step 1: E2E-Prüfungen ergänzen.**
  - Der gesamte Test läuft mit dem Pfad zur `dist`-Datei als `argv[2]` ein zweites Mal durch.
  - `page.on('request')` zählt alle Requests mit einem anderen Ziel als der geöffneten Datei, und es müssen 0 sein.
  - In den Viewport-Breiten 1280 und 360 gilt `document.documentElement.scrollWidth <= innerWidth`.
  - Screenshots `tests/out/desktop.png` (1280 × 900) und `tests/out/handy.png` (390 × 844) entstehen jeweils nach dem Generieren, einmal im hellen und einmal im dunklen Modus (`emulateMedia({ colorScheme })`).
- [ ] **Step 2:** Den Test gegen die noch fehlende `dist`-Datei laufen lassen; er muss FEHLSCHLAGEN.
- [ ] **Step 3: `build.mjs` implementieren.** Das Skript liest `index.html` und ersetzt jedes `<script src="X"></script>` durch `<script>` + Inhalt von X + `</script>`. Dabei wird `</script` im Inhalt zu `<\/script` escaped. Das Verzeichnis `dist/` wird bei Bedarf angelegt. Das README enthält die Befehle zum Öffnen, Testen und Bauen sowie die Projektstruktur, insgesamt höchstens 40 Zeilen.
- [ ] **Step 4: Alles prüfen.** `node --test apps/ausreden-generator/tests/`, danach `node apps/ausreden-generator/build.mjs` und `node apps/ausreden-generator/tests/e2e.mjs` sowie `… e2e.mjs apps/ausreden-generator/dist/ausreden-generator.html` müssen jeweils durchlaufen und `E2E OK` ausgeben. Alle Screenshots in `tests/out/` selbst ansehen: kein Überlauf, lesbar in hell und dunkel, die Emojis sichtbar.
- [ ] **Step 5:** Commit mit der Nachricht `feat(ausreden): single-file build and README`, danach `git push -u origin claude/crazy-test-ideas-i2iu6y`.
- [ ] **Step 6: Veröffentlichen.** Vorher den Skill `artifact-design` laden und die Seite gegen dessen Vorgaben prüfen (Titel, Farb-Tokens, Dunkelmodus). Dann wird `dist/ausreden-generator.html` wird per Artifact-Tool als private Seite mit `icon: "camera"` veröffentlicht, und der Link geht an den Nutzer.
