# Ausreden-Generator mit Beweisfoto – Konzept

Stand: 2026-11-10 · Status: Entwurf zur Freigabe

## Ziel

Ein Spaßprojekt zum Herzeigen: Eine kleine Web-App erfindet absurde Ausreden fürs
Zuspätkommen und liefert gleich ein „Beweisfoto“ dazu. Erfolg heißt: Jemand drückt
den Knopf, lacht und will sofort die nächste Ausrede.

### Vereinbart

- Die Ausreden kommen aus einem Zufallsbaukasten, ohne KI, ohne API-Key und ohne Server.
- Der Hauptbeweis ist ein Fake-Polaroid mit einer Emoji-Szene im Überwachungskamera-Look.
- Ein zweiter Modus zeigt dieselbe Ausrede als animiertes, generatives Kunstwerk.
- Der aktuelle Beweis (Polaroid oder Kunstwerk) lässt sich als PNG herunterladen.
- Der Code liegt im Repo, zusätzlich gibt es die App als teilbaren Link (eine einzelne HTML-Datei).

### Annahmen

- Die Oberfläche ist komplett auf Deutsch.
- Die App ist mobil-tauglich und funktioniert ab 360 px Breite ohne horizontales Scrollen.
- Es gibt keine Speicherung, kein Konto und kein Tracking.

### Nicht enthalten (YAGNI)

KI-Modus, Teilen-per-Link mit Seed in der URL, Mehrsprachigkeit, Sound. Diese Punkte
können später nachgerüstet werden.

## Technischer Ansatz

Die App besteht aus reinem HTML, CSS und JavaScript, ohne Framework, ohne Build-Schritt
und ohne externe Abhängigkeiten. Polaroid und Kunstwerk werden auf ein `<canvas>`
gezeichnet, und der Download nutzt `canvas.toBlob()`.

## Aufbau

```
apps/ausreden-generator/
├── index.html        # Oberfläche, Styles, Verdrahtung der Module
├── ausreden.js       # Baukasten: Seed → Ausrede-Objekt (reine Logik, kein DOM)
├── polaroid.js       # zeichnet das Polaroid auf ein Canvas
├── kunst.js          # zeichnet bzw. animiert das Kunstwerk auf ein Canvas
├── build.mjs         # baut alles zu dist/ausreden-generator.html zusammen
├── tests/
│   ├── ausreden.test.mjs  # Unit-Tests (node --test)
│   └── e2e.mjs            # Playwright-Durchlauf + Screenshots
└── README.md
```

Jedes Modul hat genau eine Aufgabe und lässt sich einzeln verstehen:

| Modul | Eingabe | Ausgabe | Hängt ab von |
|---|---|---|---|
| `ausreden.js` | `seed` (Zahl), `anlass` (Text) | Ausrede-Objekt | nichts |
| `polaroid.js` | Canvas-Kontext, Ausrede-Objekt | Zeichnung | nichts |
| `kunst.js` | Canvas-Kontext, Ausrede-Objekt, Zeit | Zeichnung (Frame) | nichts |
| `index.html` | Nutzereingaben | Oberfläche | den drei Modulen |

Die Module werden als klassische Skripte eingebunden, die ihre Funktionen an `window`
hängen, und zusätzlich per `module.exports` für Node exportiert. Dadurch läuft die App
auch per Doppelklick über `file://`, wo ES-Module blockiert würden.

## Ausreden-Baukasten (`ausreden.js`)

### Zufall

Ein kleiner, deterministischer Pseudozufallsgenerator (mulberry32) wird aus dem Seed
initialisiert. Gleicher Seed und gleicher Anlass ergeben immer dieselbe Ausrede. Neue
Seeds sind Zufallszahlen von 1000 bis 9999 und werden als „Beweis #4711“ angezeigt.

### Bausteine

Es gibt vier Listen mit jeweils mindestens 20 Einträgen. Jeder Eintrag hat einen Text
und genau ein Emoji:

- **Täter**, z. B. `{ text: "ein Waschbär", emoji: "🦝" }`
- **Tat**, z. B. `{ text: "meinen Schlüssel in einen Brunnen geworfen", emoji: "⛲" }`
- **Grund**, z. B. `{ text: "Vollmond war", emoji: "🌕" }`
- **Ort**, z. B. `{ text: "an der Bushaltestelle", emoji: "🚏" }`

### Satzvorlagen

Es gibt mindestens 6 Vorlagen mit den Platzhaltern `{anlass}`, `{taeter}`, `{tat}`,
`{grund}` und `{ort}`, zum Beispiel:

> „Auf dem Weg {anlass} hat {taeter} {ort} {tat}, weil {grund}.“
>
> → „Auf dem Weg zur Arbeit hat ein Waschbär an der Bushaltestelle meinen Schlüssel
> in einen Brunnen geworfen, weil Vollmond war.“

Die Bausteine sind grammatisch so formuliert, dass sie in jede Vorlage passen: Täter
im Nominativ, Tat als Partizip-Phrase.

### Anlässe

Als Vorauswahl gibt es die Chips 💼 Arbeit, ❤️ Date, 🦷 Zahnarzt, 🎓 Schule und
👵 Oma-Besuch. Jeder Anlass hat eine fertige Form für die Vorlagen, zum Beispiel
„zur Arbeit“ oder „zum Date“. Ein frei eingetippter Anlass wird in der Form „zum Termin
‚X‘“ eingesetzt, damit die Grammatik immer stimmt. Leere Eingaben fallen auf „Arbeit“
zurück, und die Eingabe wird auf 40 Zeichen gekürzt.

### Rückgabe

```js
erzeugeAusrede(seed, anlass) → {
  seed: 4711,
  text: "Auf dem Weg zur Arbeit hat ein Waschbär …",
  emojis: ["🦝", "⛲", "🌕", "🚏"],
  bausteine: { taeter, tat, grund, ort },
  uhrzeit: "07:42:13"   // aus dem Seed abgeleitet
}
```

## Polaroid (`polaroid.js`)

`zeichnePolaroid(ctx, ausrede)` zeichnet auf ein Canvas mit fester Größe 800 × 960 px:

- Ein weißer Rahmen mit breitem unterem Rand, um wenige Grad gedreht. Der Winkel
  ergibt sich aus dem Seed. Dazu kommen ein Schatten und ein halbtransparenter
  Klebestreifen oben.
- Das Bildfeld hat einen dunklen, leicht grünstichigen Hintergrund. Die Emojis werden
  groß und versetzt verteilt, mit Positionen aus dem Seed.
- Darüber liegt der Überwachungskamera-Look: Rauschen, Scanlines, Vignette,
  „● REC“ oben links und `CAM-03 · {uhrzeit}` oben rechts.
- Auf dem unteren Rand steht in Handschrift-Optik „Beweis #{seed} – ich schwör's!“,
  in einer System-Schrift im Stil `cursive` mit Fallback, ohne Webfont.

Das Ergebnis ist deterministisch: Gleicher Seed ergibt das gleiche Bild. Der
„REC“-Punkt blinkt nur in der Oberfläche, das gespeicherte PNG zeigt ihn eingeschaltet.

## Kunstwerk (`kunst.js`)

`zeichneKunst(ctx, ausrede, t)` zeichnet einen Frame zum Zeitpunkt `t`. Die Oberfläche
ruft die Funktion per `requestAnimationFrame` auf.

- Das Bild ist ein Partikelfeld aus rund 600 Partikeln, die einem Strömungsfeld folgen.
- Die Farbpalette ergibt sich aus den Bausteinen: Jeder Baustein bringt einen Farbton
  mit, der über einen Hash seines Textes bestimmt wird. Die Geschwindigkeit hängt
  vom Grund ab.
- Unten steht ein Titel wie *„Ohne Titel (Waschbär) – Öl auf Ausrede, 2026“*.
- Bei `prefers-reduced-motion` wird ein einzelnes Standbild gezeichnet.
- Der Button „📸 Zurück zum Beweis“ wechselt wieder zum Polaroid und stoppt die
  Animation.

## Oberfläche (`index.html`)

1. Titel „Ausreden-Generator“ und darunter die Anlass-Chips sowie ein Textfeld
   „…oder eigener Anlass“.
2. Der große Knopf **„Ausrede generieren!“**.
3. Die Ausrede erscheint mit einer kurzen Tipp-Animation. Das Canvas mit dem Polaroid
   blendet mit einer kleinen Dreh-Animation ein.
4. Darunter liegen die Buttons **🔄 Noch eine**, **🎨 Als Kunstwerk** bzw.
   **📸 Zurück zum Beweis** und **⬇️ Beweis herunterladen**.

Das Canvas wird per CSS auf die verfügbare Breite skaliert, intern bleibt die Auflösung
800 × 960. Hell- und Dunkelmodus funktionieren über CSS-Variablen und
`prefers-color-scheme`.

## Download

`canvas.toBlob()` erzeugt die Datei. Sie heißt `beweis-{seed}.png` beziehungsweise
`kunstwerk-{seed}.png` und wird über einen temporären `<a download>`-Link gespeichert.
Schlägt `toBlob` fehl, was in sehr alten Browsern vorkommen kann, erscheint eine kurze
Meldung „Download nicht möglich – mach einfach einen Screenshot 😉“.

## Teilen

`node build.mjs` fügt `index.html`, die drei Module und das CSS zu
`dist/ausreden-generator.html` zusammen, wobei die Skripte inline eingesetzt werden.
Diese Datei wird als private Artifact-Seite auf claude.ai veröffentlicht. `dist/` wird
nicht committet.

## Fehlerbehandlung

- Eingaben werden gekürzt und nur als Text eingesetzt (`textContent`, nie `innerHTML`).
- Fehlt einem Gerät ein Emoji, zeigt der Browser seinen Platzhalter. Das wird bewusst
  hingenommen, denn alle gewählten Emojis stammen aus Unicode 13 oder älter.
- Wenn kein Canvas verfügbar ist, wird nur der Ausrede-Text angezeigt.

## Tests

**Unit-Tests** (`node --test tests/ausreden.test.mjs`):
- Gleicher Seed und gleicher Anlass ergeben eine identische Ausrede.
- Über 500 Seeds bleibt kein `{…}`-Platzhalter im Text übrig.
- Jeder Baustein in jeder Liste hat genau ein nicht-leeres Emoji, und jede Liste hat
  mindestens 20 Einträge.
- Ein eigener Anlass erscheint im Text, ein leerer Anlass führt zu „Arbeit“, und
  überlange Eingaben werden gekürzt.
- Unterschiedliche Seeds liefern genügend Abwechslung: Bei 200 Seeds entstehen
  mindestens 150 verschiedene Texte.

**Browser-Test** (`node tests/e2e.mjs` mit dem vorinstallierten Playwright):
- Die Seite wird geöffnet, ein Chip gewählt und „Ausrede generieren!“ geklickt.
  Danach sind Text und Canvas sichtbar.
- „Als Kunstwerk“ und „Zurück zum Beweis“ wechseln den Modus.
- „Beweis herunterladen“ löst einen Download mit dem Namen `beweis-*.png` aus, und
  die Datei ist ein gültiges PNG.
- Es werden Screenshots in 1280 px und 390 px Breite gemacht und visuell geprüft. Dabei
  darf es kein horizontales Scrollen geben, und die Konsole muss ohne Fehler bleiben.
