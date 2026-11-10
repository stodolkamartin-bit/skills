# Ausreden-Generator 🦝📸

Zu spät? Die App erfindet eine absurde Ausrede und liefert den Beweis gleich mit:
ein Polaroid aus der Überwachungskamera oder, auf Knopfdruck, ein generatives
Kunstwerk. Beides kann man als PNG herunterladen.

Sie läuft komplett im Browser, ohne KI, Server oder Abhängigkeiten.

## Benutzen

`index.html` per Doppelklick im Browser öffnen. Das war's.

## Entwickeln

```bash
node --test tests/*.test.mjs     # Unit-Tests für den Ausreden-Baukasten
node tests/e2e.mjs               # Browser-Test (Playwright), Screenshots in tests/out/
node build.mjs                   # baut dist/ausreden-generator.html (eine Datei zum Teilen)
node tests/e2e.mjs dist/ausreden-generator.html   # Browser-Test gegen die gebaute Datei
```

## Aufbau

| Datei | Aufgabe |
|---|---|
| `ausreden.js` | Baukasten: Seed + Anlass → Ausrede (reine Logik) |
| `polaroid.js` | zeichnet das Beweis-Polaroid aufs Canvas |
| `kunst.js` | zeichnet das animierte Kunstwerk aufs Canvas |
| `app.js` | verbindet Oberfläche, Zeichnen und Download |
| `index.html` | Oberfläche und Styles |
| `build.mjs` | fügt alles zu einer einzigen HTML-Datei zusammen |

Neue Ausreden? Einfach Bausteine in `ausreden.js` ergänzen. Jeder Baustein braucht
einen Text und genau ein Emoji, die Tests prüfen das.

Konzept und Bauplan: `docs/superpowers/specs/2026-11-10-ausreden-generator-design.md`
und `docs/superpowers/plans/2026-11-10-ausreden-generator.md`.
