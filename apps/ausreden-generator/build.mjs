// Baut index.html + Skripte zu einer einzigen, eigenständigen HTML-Datei zusammen.
// Aufruf: node build.mjs   →   dist/ausreden-generator.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(hier, 'index.html'), 'utf8');

const ergebnis = html.replace(/<script src="([^"]+)"><\/script>/g, (_, datei) => {
  const inhalt = fs.readFileSync(path.join(hier, datei), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + inhalt + '\n</script>';
});

if (/<script src=/.test(ergebnis)) throw new Error('Nicht alle Skripte wurden eingebettet.');

const ziel = path.join(hier, 'dist', 'ausreden-generator.html');
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, ergebnis);
console.log('geschrieben: ' + path.relative(process.cwd(), ziel) + ` (${(ergebnis.length / 1024).toFixed(1)} KB)`);
