/* Ausreden-Baukasten: Seed → Ausrede. Reine Logik, kein DOM.
 * Läuft als klassisches Skript (window.Ausreden) und in Node (module.exports). */
(function (root) {
  'use strict';

  /** mulberry32: kleiner, deterministischer Pseudozufall. Liefert Zahlen in [0, 1). */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const ANLAESSE = [
    { id: 'arbeit', label: 'Arbeit', emoji: '💼', form: 'zur Arbeit' },
    { id: 'date', label: 'Date', emoji: '❤️', form: 'zum Date' },
    { id: 'zahnarzt', label: 'Zahnarzt', emoji: '🦷', form: 'zum Zahnarzt' },
    { id: 'schule', label: 'Schule', emoji: '🎓', form: 'zur Schule' },
    { id: 'oma', label: 'Oma-Besuch', emoji: '👵', form: 'zum Oma-Besuch' },
  ];

  const b = (text, emoji) => ({ text, emoji });

  const BAUSTEINE = {
    // Nominativ, mit Artikel
    taeter: [
      b('ein Waschbär', '🦝'),
      b('meine Nachbarin im Bademantel', '👘'),
      b('ein verirrter Flamingo', '🦩'),
      b('ein Eichhörnchen mit Sonnenbrille', '🐿️'),
      b('ein pensionierter Zauberer', '🧙'),
      b('eine Gang aus Tauben', '🕊️'),
      b('ein rebellischer Roboterstaubsauger', '🤖'),
      b('der Weihnachtsmann persönlich', '🎅'),
      b('ein Pinguin auf Abwegen', '🐧'),
      b('ein sprechender Kaktus', '🌵'),
      b('ein beleidigtes Alpaka', '🦙'),
      b('ein Außerirdischer', '👽'),
      b('ein Oktopus', '🐙'),
      b('ein kleiner Dinosaurier', '🦖'),
      b('ein Pirat im Ruhestand', '🏴‍☠️'),
      b('ein Clown', '🤡'),
      b('ein Biber mit Bauhelm', '🦫'),
      b('ein Faultier', '🦥'),
      b('ein übermotivierter Postbote', '📮'),
      b('ein Einhorn', '🦄'),
      b('ein Rudel Dackel', '🐕'),
      b('ein Geist', '👻'),
    ],
    // Partizip-Phrase mit Objekt, Hilfsverb "haben"
    tat: [
      b('meinen Schlüssel in einen Brunnen geworfen', '⛲'),
      b('mich zu einem Tanzwettbewerb herausgefordert', '💃'),
      b('mein Fahrrad an 99 Luftballons gebunden', '🎈'),
      b('meine Schuhe gegen zwei Baguettes getauscht', '🥖'),
      b('mir eine Ballade über Steuerrecht vorgesungen', '🎤'),
      b('meinen Bus entführt', '🚌'),
      b('mich in eine Schneekugel eingesperrt', '❄️'),
      b('meine Hose mit Spaghetti verwechselt', '🍝'),
      b('meinen Wecker hypnotisiert', '⏰'),
      b('mich zum Bürgermeister ernannt', '🎩'),
      b('mich in ein Schachduell verwickelt', '♟️'),
      b('meine Socken zu einem Kunstwerk verknotet', '🧦'),
      b('mir den Weg mit 400 Gummienten versperrt', '🦆'),
      b('meine Haustür zugemauert', '🧱'),
      b('meinen Kaffee in Glitzer verwandelt', '✨'),
      b('mich zu einer spontanen Yogastunde gezwungen', '🧘'),
      b('mein Handy in einen Kuchen eingebacken', '🎂'),
      b('mich mit einem Lasso eingefangen', '🤠'),
      b('mir ein sehr anhängliches Pony geschenkt', '🐴'),
      b('meine Brille gegen eine Lupe getauscht', '🔍'),
      b('meinen Regenschirm als Segel benutzt', '⛵'),
      b('mein Auto in Geschenkpapier eingewickelt', '🎁'),
    ],
    // Präpositionalphrase
    ort: [
      b('an der Bushaltestelle', '🚏'),
      b('mitten auf der Kreuzung', '🚦'),
      b('im Treppenhaus', '🏢'),
      b('vor dem Bäcker', '🥐'),
      b('im Aufzug', '🛗'),
      b('auf dem Parkplatz', '🅿️'),
      b('im Supermarkt', '🛒'),
      b('am Bahnhof', '🚉'),
      b('im Park', '🌳'),
      b('auf der Brücke', '🌉'),
      b('vor meiner Haustür', '🚪'),
      b('in der U-Bahn', '🚇'),
      b('an der Tankstelle', '⛽'),
      b('auf dem Dach', '🏠'),
      b('im Kreisverkehr', '🔄'),
      b('am Kiosk', '🗞️'),
      b('auf dem Wochenmarkt', '🧺'),
      b('am Zebrastreifen', '🦓'),
      b('im Fahrradkeller', '🚲'),
      b('vor dem Rathaus', '🏛️'),
    ],
    // Nebensatz ohne "weil", Verb am Ende
    grund: [
      b('Vollmond war', '🌕'),
      b('die Ampel mich persönlich beleidigt hatte', '🚥'),
      b('Mittwoch war', '📅'),
      b('das Horoskop es so vorhergesagt hatte', '🔮'),
      b('der Mond rückläufig war', '🌙'),
      b('es nach frischen Waffeln roch', '🧇'),
      b('das WLAN ausgefallen war', '📶'),
      b('auf dem Mars angeblich Feiertag war', '🪐'),
      b('ich zwei verschiedene Schuhe anhatte', '👟'),
      b('die Sterne ungünstig standen', '⭐'),
      b('der Wetterbericht Konfetti angesagt hatte', '🎊'),
      b('jemand „Los!“ gerufen hatte', '📣'),
      b('Schaltjahr war', '🗓️'),
      b('eine Sonnenfinsternis bevorstand', '🌒'),
      b('der Kaffeeautomat streikte', '☕'),
      b('ich heute einfach zu gut aussah', '😎'),
      b('Freitag der 13. war', '🐈‍⬛'),
      b('ein Regenbogen im Weg stand', '🌈'),
      b('die Erde sich heute etwas schneller drehte', '🌍'),
      b('mein Glückskeks davor gewarnt hatte', '🥠'),
      b('gerade Ebbe war', '🌊'),
    ],
  };

  const VORLAGEN = [
    'Auf dem Weg {anlass} hat {taeter} {ort} {tat}, weil {grund}.',
    'Ich wollte pünktlich {anlass} kommen, aber {ort} hat {taeter} {tat}, weil {grund}.',
    'Sie werden es nicht glauben: Kurz bevor ich {anlass} aufbrechen konnte, hat {taeter} {ort} {tat}. Und zwar, weil {grund}!',
    'Laut Polizeibericht hat {taeter} {ort} {tat}, als ich gerade {anlass} losgehen wollte – angeblich, weil {grund}.',
    'Mein Weg {anlass} war eigentlich frei, bis {taeter} {ort} {tat} hat, weil {grund}.',
    'Ich schwöre: Kaum war ich {anlass} unterwegs, hat {taeter} {ort} {tat}. Warum? Weil {grund}!',
    'Es ist nicht meine Schuld! Auf halbem Weg {anlass} hat {taeter} {ort} {tat}, nur weil {grund}.',
  ];

  const MAX_ANLASS = 40;

  /** Anlass-id → fertige Form; freier Text → „zum Termin ‚…‘“; leer → „zur Arbeit“. */
  function anlassForm(anlass) {
    const roh = String(anlass == null ? '' : anlass).trim();
    const bekannt = ANLAESSE.find((a) => a.id === roh);
    if (bekannt) return bekannt.form;
    if (!roh) return ANLAESSE[0].form;
    return 'zum Termin ‚' + roh.slice(0, MAX_ANLASS).trim() + '‘';
  }

  function waehle(liste, zufall) {
    return liste[Math.floor(zufall() * liste.length)];
  }

  function zweistellig(n) {
    return String(n).padStart(2, '0');
  }

  function erzeugeAusrede(seed, anlass) {
    const zufall = rng(seed);
    const vorlage = waehle(VORLAGEN, zufall);
    const bausteine = {
      taeter: waehle(BAUSTEINE.taeter, zufall),
      tat: waehle(BAUSTEINE.tat, zufall),
      grund: waehle(BAUSTEINE.grund, zufall),
      ort: waehle(BAUSTEINE.ort, zufall),
    };
    const werte = {
      anlass: anlassForm(anlass),
      taeter: bausteine.taeter.text,
      tat: bausteine.tat.text,
      grund: bausteine.grund.text,
      ort: bausteine.ort.text,
    };
    const text = vorlage.replace(/\{(\w+)\}/g, (_, k) => werte[k]);
    const uhrzeit =
      zweistellig(6 + Math.floor(zufall() * 4)) + ':' +
      zweistellig(Math.floor(zufall() * 60)) + ':' +
      zweistellig(Math.floor(zufall() * 60));
    return {
      seed,
      text,
      emojis: [bausteine.taeter.emoji, bausteine.tat.emoji, bausteine.grund.emoji, bausteine.ort.emoji],
      bausteine,
      uhrzeit,
    };
  }

  function neuerSeed() {
    return 1000 + Math.floor(Math.random() * 9000);
  }

  const api = { rng, ANLAESSE, BAUSTEINE, VORLAGEN, anlassForm, erzeugeAusrede, neuerSeed };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Ausreden = api;
})(this);
