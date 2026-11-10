import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { erzeugeAusrede, anlassForm, neuerSeed, BAUSTEINE, ANLAESSE, VORLAGEN } = require('../ausreden.js');

test('gleicher Seed + Anlass → identisch', () =>
  assert.deepEqual(erzeugeAusrede(4711, 'arbeit'), erzeugeAusrede(4711, 'arbeit')));

test('keine Platzhalter übrig (500 Seeds)', () => {
  for (let s = 1000; s < 1500; s++) assert.doesNotMatch(erzeugeAusrede(s, 'date').text, /[{}]/);
});

test('Bausteine: ≥20 je Liste, je genau ein nicht-leeres Emoji', () => {
  for (const liste of Object.values(BAUSTEINE)) {
    assert.ok(liste.length >= 20);
    for (const b of liste) {
      assert.ok(b.text.trim().length > 0);
      assert.equal([...new Intl.Segmenter().segment(b.emoji)].length, 1, `Emoji von "${b.text}"`);
    }
  }
});

test('Anlass-Formen', () => {
  assert.equal(ANLAESSE.length, 5);
  assert.equal(anlassForm('zahnarzt'), 'zum Zahnarzt');
  assert.equal(anlassForm('Yoga'), 'zum Termin ‚Yoga‘');
  assert.equal(anlassForm(''), 'zur Arbeit');
  assert.equal(anlassForm('   '), 'zur Arbeit');
  assert.ok(anlassForm('x'.repeat(100)).length <= 'zum Termin ‚‘'.length + 40);
});

test('Text beginnt mit Großbuchstaben, endet mit Punkt, enthält Anlass', () => {
  assert.ok(VORLAGEN.length >= 6);
  for (let s = 1000; s < 1100; s++) {
    const a = erzeugeAusrede(s, 'Steuerberater');
    assert.match(a.text, /^[A-ZÄÖÜ].*[.!]$/);
    assert.ok(a.text.includes('Steuerberater'));
  }
});

test('Abwechslung: 200 Seeds → ≥150 verschiedene Texte', () => {
  const set = new Set();
  for (let s = 2000; s < 2200; s++) set.add(erzeugeAusrede(s, 'arbeit').text);
  assert.ok(set.size >= 150, `nur ${set.size}`);
});

test('neuerSeed im Bereich, uhrzeit-Format, 4 Emojis', () => {
  for (let i = 0; i < 200; i++) {
    const s = neuerSeed();
    assert.ok(Number.isInteger(s) && s >= 1000 && s <= 9999);
  }
  const a = erzeugeAusrede(neuerSeed(), 'oma');
  assert.match(a.uhrzeit, /^0[6-9]:[0-5]\d:[0-5]\d$/);
  assert.equal(a.emojis.length, 4);
});
