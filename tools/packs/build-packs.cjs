/* Fabrique les trois paquets de voix fournis avec l'extension (extension/packs/*.json).
 *
 *   node tools/packs/build-packs.cjs
 *
 * Les paquets sont de simples fichiers JSON, au même format que ceux qu'on peut
 * ajouter depuis le panneau : ils servent aussi d'exemples.
 */
const fs = require("fs"), path = require("path");
const ICI = __dirname, SORTIE = path.join(ICI, "..", "..", "extension", "packs");
const lire = (f) => JSON.parse(fs.readFileSync(path.join(ICI, f), "utf8"));
const cast = lire("source-cast.json"), first = lire("source-first.json");

// Noms des effets : le format des paquets les donne en anglais.
const EFFETS = { graves: "bass", aigus: "treble", passeBas: "lowpass", passeHaut: "highpass", cloche: "peak", echo: "echo", tremolo: "tremolo",
  vibrato: "vibrato", flanger: "flanger", gresillement: "crackle", robot: "robot", chuchotement: "whisper", rocaille: "growl", bug: "glitch", compression: "compress" };
const effets = (liste) => (liste || []).map(([nom, ...reste]) => [EFFETS[nom] || nom, ...reste]);

// ------------------------------------------------------------------ fonds sonores
const e = (sound, at, freq, length, level, plus) => ({ sound, at, freq, ...(length ? { length } : {}), level, ...(plus || {}) });
const FONDS = {
  salon: [...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => e("knock", k + 0.2, k % 2 ? 900 : 1150, 0.06, 0.35)), e("bell", 5.7, 2637, 0.7, 0.6, { decay: 6 })],
  marais: [e("croak", 1.4, 190, 0.22, 0.7), e("croak", 1.75, 175, 0.22, 0.7), e("drop", 4.6, 520, 0.12, 0.7), e("drop", 6.3, 690, 0.1, 0.5)],
  desert: [e("pluck", 0.9, 165, 1.6, 0.8), e("pluck", 4.8, 196, 1.6, 0.7), e("beep", 3.1, 3600, 0.05, 0.18), e("beep", 3.19, 3600, 0.05, 0.18), e("beep", 3.28, 3600, 0.05, 0.18)],
  etincelles: [e("drop", 0.8, 420, 0.11, 0.7, { rise: 2.2 }), e("drop", 1.05, 560, 0.11, 0.55, { rise: 2.2 }), e("drop", 3.9, 380, 0.11, 0.8, { rise: 2.2 }),
    e("drop", 6.1, 610, 0.11, 0.5, { rise: 2.2 }), e("drop", 6.3, 470, 0.11, 0.7, { rise: 2.2 }), e("drop", 6.45, 520, 0.11, 0.6, { rise: 2.2 }), e("bell", 4.9, 3136, 0.5, 0.4, { decay: 7 })],
  coulisses: [e("knock", 1.0, 700, 0.09, 0.7), e("knock", 1.22, 930, 0.09, 0.7), { sound: "glide", at: 5.0, freq: 520, to: 1040, length: 0.32, level: 0.45 }],
  cour: [e("bell", 1.2, 2093, 0.45, 0.5, { decay: 6 }), e("bell", 1.38, 2093, 0.5, 0.5, { decay: 6 }), e("thump", 5.0, 150, 0.14, 0.7), e("thump", 5.42, 150, 0.14, 0.45),
    e("thump", 5.72, 150, 0.14, 0.28), e("thump", 5.92, 150, 0.14, 0.15)],
  coeur: [e("thump", 1.0, 95, 0.2, 0.9), e("thump", 1.3, 85, 0.2, 0.55), e("thump", 5.0, 95, 0.2, 0.9), e("thump", 5.3, 85, 0.2, 0.55)],
  clavier: [[0.8, 1900], [0.93, 2400], [1.1, 1700], [1.24, 2600], [1.4, 2100], [1.58, 1800], [4.9, 2300], [5.05, 1750], [5.2, 2500], [5.36, 2000], [5.5, 2700], [5.7, 1850]]
    .map(([at, f]) => e("scratch", at, f, 0.018, 0.5)),
  servos: [e("beep", 1.1, 1320, 0.09, 0.5), e("beep", 1.24, 1760, 0.12, 0.5), { sound: "glide", at: 5.2, freq: 300, to: 620, length: 0.35, level: 0.4 }],
  note: [e("bell", 1.5, 660, 2.2, 0.7, { decay: 4 }), e("bell", 5.5, 660, 2.2, 0.45, { decay: 4 })],
  laboratoire: [e("bell", 2.0, 1319, 1.2, 0.6), e("bell", 2.45, 1047, 1.4, 0.6), e("bell", 6.4, 1568, 0.8, 0.3, { decay: 6 })],
  magasin: [e("bell", 1.0, 659, 1.3, 0.7, { decay: 4 }), e("bell", 1.5, 523, 1.6, 0.7, { decay: 4 }), e("bell", 5.8, 2093, 0.6, 0.35, { decay: 6 })],
  glas: [e("toll", 1.2, 294, 3.0, 0.7), e("toll", 5.4, 247, 2.4, 0.4)],
  harpe: [...[294, 370, 440, 587, 740].map((f, k) => e("pluck", 1.0 + 0.11 * k, f, 1.5, 0.5)), e("bell", 5.6, 2349, 0.9, 0.3, { decay: 6 })],
  orage: [[0.5, 1900, 0.4], [1.9, 2500, 0.3], [3.0, 1500, 0.5], [4.6, 2700, 0.35], [5.9, 1700, 0.45], [7.1, 2200, 0.3]].map(([at, f, v]) => e("drop", at, f, 0.06, v, { rise: 1.3 }))
    .concat([e("pluck", 3.6, 220, 1.4, 0.6, { decay: 3 }), e("pluck", 4.1, 175, 1.8, 0.6, { decay: 3 })]),
  fete: [[0.9, 1568], [1.25, 2093], [1.6, 1319], [4.8, 1760], [5.15, 1047], [5.6, 2093]].map(([at, f]) => e("bell", at, f, 0.7, 0.5, { decay: 6 })),
  bulles: [[0.7, 640, 0.7], [2.4, 820, 0.6], [2.6, 560, 0.8], [5.1, 900, 0.55], [6.6, 700, 0.7]].map(([at, f, v]) => e("drop", at, f, 0.09, v, { rise: 2.4 })),
  parasites: [...[0, 1, 2, 3].map((k) => e("beep", 1.3 + 0.07 * k, 1480, 0.04, 0.4)), e("beep", 4.4, 1210, 0.06, 0.4), e("beep", 6.2, 1975, 0.05, 0.35)],
  piano: [e("pluck", 1.0, 523, 1.6, 0.6, { decay: 3.5 }), e("pluck", 2.2, 440, 1.6, 0.6, { decay: 3.5 }), e("pluck", 5.2, 349, 1.6, 0.6, { decay: 3.5 })],
  classe: [e("scratch", 0.9, 2600, 0.12, 0.6), e("scratch", 1.15, 2600, 0.08, 0.6), e("scratch", 1.4, 2600, 0.16, 0.6), e("bell", 5.0, 1760, 1.0, 0.55)],
  // --- le premier paquet
  impact: [e("thump", 1.0, 70, 0.5, 0.9), e("toll", 1.05, 110, 2.5, 0.45)],
  radio: [e("pluck", 1.0, 523, 0.8, 0.6), e("pluck", 1.15, 659, 0.8, 0.6), e("pluck", 1.3, 784, 1.0, 0.6), e("bell", 5.5, 1568, 0.6, 0.3, { decay: 6 })],
  stade: [{ sound: "glide", at: 1.0, freq: 2100, to: 2400, length: 0.22, level: 0.4 }, { sound: "glide", at: 1.3, freq: 2100, to: 2400, length: 0.38, level: 0.4 }, e("thump", 5.0, 120, 0.16, 0.7)],
  navire: [e("bell", 1.0, 880, 1.2, 0.6), e("bell", 1.45, 880, 1.4, 0.6), e("drop", 5.2, 300, 0.2, 0.4), e("drop", 5.5, 360, 0.16, 0.3)],
  dojo: [e("scratch", 1.0, 1500, 0.35, 0.35), e("bell", 4.5, 1319, 1.5, 0.45), e("bell", 5.1, 1976, 1.2, 0.3)],
  retro: [e("beep", 1.0, 880, 0.09, 0.45), e("beep", 1.15, 1175, 0.09, 0.45), e("beep", 5.0, 660, 0.12, 0.4)],
  sonar: [e("bell", 1.2, 1245, 1.4, 0.6, { decay: 6 }), e("beep", 5.0, 1480, 0.09, 0.3)],
  notification: [e("bell", 1.0, 1568, 0.5, 0.5), e("bell", 1.12, 2093, 0.7, 0.5), e("bell", 5.5, 2637, 0.5, 0.3)],
  tapotements: [e("knock", 1.0, 520, 0.06, 0.4), e("knock", 1.18, 560, 0.06, 0.35), e("knock", 1.4, 500, 0.06, 0.4), e("scratch", 4.8, 1200, 0.3, 0.3), e("knock", 6.0, 540, 0.06, 0.3)],
  // --- le paquet loufoque
  ballon: [{ sound: "glide", at: 1.0, freq: 700, to: 1500, length: 0.25, level: 0.4 }, e("drop", 4.5, 900, 0.07, 0.6, { rise: 3 }), { sound: "glide", at: 6.0, freq: 1400, to: 800, length: 0.3, level: 0.3 }],
  pas: [e("thump", 1.0, 60, 0.35, 0.9), e("thump", 2.6, 55, 0.35, 0.8), e("thump", 5.6, 60, 0.35, 0.7)],
  marteau: [e("knock", 1.0, 420, 0.1, 0.8), e("knock", 1.25, 420, 0.1, 0.8), e("knock", 5.2, 420, 0.1, 0.9)],
  hante: [e("toll", 1.0, 196, 2.6, 0.5), { sound: "glide", at: 4.6, freq: 500, to: 380, length: 0.9, level: 0.25 }],
  aspirateur: [e("beep", 1.0, 990, 0.1, 0.45), e("thump", 3.4, 130, 0.14, 0.6), e("beep", 3.7, 660, 0.14, 0.4), e("beep", 6.2, 1320, 0.08, 0.35)],
  fonds_marins: [e("drop", 0.9, 300, 0.14, 0.6, { rise: 2.5 }), e("drop", 1.2, 380, 0.12, 0.5, { rise: 2.5 }), e("drop", 1.45, 460, 0.1, 0.4, { rise: 2.5 }), e("bell", 5.0, 1100, 1.4, 0.45, { decay: 6 })],
  crieur: [e("bell", 1.0, 1175, 0.5, 0.6, { decay: 4 }), e("bell", 1.3, 1175, 0.5, 0.6, { decay: 4 }), e("bell", 1.6, 1175, 0.8, 0.6, { decay: 4 })],
  soucoupe: [{ sound: "glide", at: 1.0, freq: 500, to: 1300, length: 0.5, level: 0.35 }, { sound: "glide", at: 1.55, freq: 1300, to: 600, length: 0.5, level: 0.3 }, e("beep", 5.3, 1760, 0.07, 0.3), e("beep", 5.45, 2093, 0.07, 0.3)],
  cafe: [e("knock", 0.9, 1400, 0.03, 0.4), e("knock", 0.98, 1500, 0.03, 0.4), e("knock", 1.06, 1400, 0.03, 0.4), e("knock", 1.14, 1600, 0.03, 0.4), e("bell", 4.8, 2794, 0.4, 0.4, { decay: 7 }),
    e("knock", 6.0, 1500, 0.03, 0.35), e("knock", 6.08, 1400, 0.03, 0.35)],
  drame: [e("pluck", 1.0, 147, 1.8, 0.7, { decay: 3 }), e("pluck", 1.05, 175, 1.8, 0.6, { decay: 3 }), e("pluck", 5.2, 139, 1.6, 0.5, { decay: 3 })],
  morse: [e("scratch", 1.0, 2200, 0.25, 0.35), e("beep", 4.6, 740, 0.06, 0.3), e("beep", 4.72, 740, 0.06, 0.3), e("beep", 4.84, 740, 0.16, 0.3)],
  telephone: [e("bell", 1.0, 1397, 0.35, 0.5, { decay: 3 }), e("bell", 1.4, 1397, 0.35, 0.5, { decay: 3 }), e("knock", 5.0, 1900, 0.03, 0.3), e("knock", 5.25, 2100, 0.03, 0.3), e("knock", 5.5, 1900, 0.03, 0.3)],
  bol: [e("toll", 1.0, 392, 3.5, 0.6), e("bell", 5.5, 1568, 1.6, 0.3, { decay: 4 })],
  chaudron: [e("drop", 0.9, 240, 0.16, 0.7, { rise: 2 }), e("drop", 1.25, 300, 0.14, 0.6, { rise: 2 }), e("drop", 1.5, 210, 0.16, 0.6, { rise: 2 }), e("croak", 5.0, 210, 0.2, 0.5)],
  boite: [[1.0, 1319], [1.4, 1245], [1.8, 988], [5.0, 1319], [5.5, 932]].map(([at, f]) => e("bell", at, f, 0.9, 0.5, { decay: 5 })),
  aeroport: [e("bell", 1.0, 784, 1.0, 0.6, { decay: 4 }), e("bell", 1.45, 587, 1.3, 0.6, { decay: 4 })],
};

// ------------------------------------------------------------------ le paquet actuel
const CAST = {
  snob: ["clavecin", "salon", ["snob", "posh"]], ogre: ["tuba", "marais", ["ogre", "grumpy"]], cowboy: ["western", "desert", ["cowboy", "cow-boy"]],
  savant: ["zap", "etincelles", ["scientist", "savant", "professor"]], marionnette: ["kazoo", "coulisses", ["puppet", "marionnette"]],
  garnement: ["trompette_jouet", "cour", ["brat", "garnement", "kid"]], alpha: ["boum", "coeur", ["alpha"]], nerd: ["huit_bits", "clavier", ["nerd", "actually"]],
  androide: ["bips", "servos", ["android", "androide", "robot"]], calme: ["note_unique", "note", ["computer", "ordinateur", "calm"]],
  ia: ["descente", "laboratoire", ["ai", "ia", "passive-aggressive"]], cliente: ["sonnette", "magasin", ["customer", "cliente", "manager"]],
  gothique: ["orgue_mineur", "glas", ["goth", "gothique"]], diva: ["soprano", "harpe", ["diva"]], mechante: ["tonnerre", "orage", ["villainess", "villain", "mechante"]],
  fofolle: ["boite_a_musique", "fete", ["madcap", "fofolle"]], synthese: ["pop", "bulles", ["tts", "peppy", "synthese"]], bug: ["glitch", "parasites", ["glitch", "bug"]],
  star: ["piano_muet", "piano", ["star", "hollywood"]], premiere: ["cloche_ecole", "classe", ["class", "premiere", "student"]],
};
const tics = (t) => ({ before: t.debut || [], after: t.fin || [] });
// Réglages retouchés pour que chaque voix reste facile à comprendre : hauteurs moins
// extrêmes, débits moins rapides, effets plus légers, ton un peu moins agité.
const CLAIR = {
  snob: { effects: [["peak", 1300, 3, 1.5], ["highpass", 180]] },
  ogre: { voice: "L50", pitch: 0.9, effects: [["bass", 5, 90], ["growl", 50, 0.14, 1.4]] },
  cowboy: { pitch: 0.95, pace: 0.82, effects: [["whisper", 0.14], ["growl", 55, 0.16, 1.4], ["bass", 4, 110]] },
  savant: { pace: 1.14, expressiveness: 0.8 },
  marionnette: { pitch: 1.14, effects: [["highpass", 300], ["peak", 1500, 5, 2]] },
  garnement: { pitch: 1.24, expressiveness: 0.8, effects: [["highpass", 220], ["peak", 1200, 4, 1.5]] },
  alpha: { pitch: 0.85, pace: 0.86, effects: [["bass", 5, 95], ["compress", 0.1, 4]] },
  nerd: { pitch: 1.1, pace: 1.03, effects: [["highpass", 200], ["peak", 1100, 4, 1.5]] },
  androide: { voice: "L24", pitch: 1.1, pace: 0.98, expressiveness: 0.7, effects: [["echo", 0.9, 0.85, [6, 11], [0.14, 0.07]], ["peak", 2000, 3, 1]] },
  calme: { effects: [["lowpass", 5500], ["echo", 0.9, 0.7, [45], [0.12]]] },
  ia: { effects: [["robot", 1024, 256, 0.28], ["lowpass", 6500], ["echo", 0.88, 0.65, [60], [0.14]]] },
  cliente: { pitch: 1.08, pace: 1.0, expressiveness: 0.7, effects: [["peak", 3000, 3, 1.2]] },
  gothique: { pitch: 0.9, pace: 0.88, effects: [["lowpass", 5000], ["echo", 0.88, 0.65, [120], [0.14]]] },
  diva: { pitch: 1.06, pace: 0.88, expressiveness: 0.8, effects: [["vibrato", 5.5, 0.22], ["echo", 0.85, 0.6, [100], [0.16]]] },
  mechante: { pitch: 0.97, pace: 0.93, expressiveness: 0.6, effects: [["peak", 2500, 3, 1], ["echo", 0.9, 0.7, [80], [0.08]]] },
  fofolle: { pitch: 1.13, pace: 1.03, expressiveness: 0.8, effects: [["treble", 2]] },
  synthese: { pace: 1.07, expressiveness: 0.8 },
  bug: { pitch: 0.94, effects: [["glitch", 7, 2.8], ["flanger", 3, 2, 0.4, 0.3], ["crackle", 2, 28, 0.12]] },
  star: { pitch: 0.92, pace: 0.83, effects: [["highpass", 240], ["lowpass", 4800], ["crackle", 1.8, 40, 0.1], ["vibrato", 0.8, 0.08]] },
  premiere: { expressiveness: 0.65 },
  // le premier paquet
  annonce: { pitch: 0.88, effects: [["bass", 5, 120], ["compress", 0.1, 3], ["echo", 0.85, 0.6, [55], [0.15]]] },
  radio: { expressiveness: 0.8, pace: 1.03 },
  commentateur: { expressiveness: 0.8, pace: 1.06, effects: [["highpass", 180], ["peak", 2400, 4, 1], ["crackle", 2.2, 40, 0.12]] },
  pirate: { pitch: 0.9, expressiveness: 0.75, effects: [["growl", 62, 0.22, 1.6], ["bass", 4, 130]] },
  ninja: { effects: [["whisper", 0.22], ["echo", 0.88, 0.65, [140, 280], [0.15, 0.07]]] },
  retro: { effects: [["robot", 1024, 256, 0.5], ["highpass", 150], ["lowpass", 4200], ["crackle", 2, 20, 0.15]] },
  ordinateur: { effects: [["robot", 1024, 256, 0.3], ["lowpass", 6000], ["echo", 0.88, 0.65, [70], [0.14]]] },
  influenceuse: { expressiveness: 0.8 },
  asmr: { pace: 0.85, effects: [["whisper", 0.55], ["highpass", 180], ["treble", 3]] },
};
const clair = (id, perso) => ({ ...perso, ...(CLAIR[id] || {}) });
const persoCast0 = (p) => ({
  id: p.id, name: { en: p.nom, fr: p.nomFr }, role: { en: p.role, fr: p.roleFr }, keywords: CAST[p.id][2], gender: p.genre === "h" ? "m" : "f",
  voice: p.voix, pitch: p.hauteur, pace: p.debit, expressiveness: p.expressivite, volume: p.volume || 1, tail: p.queue || 0, effects: effets(p.effets),
  jingle: CAST[p.id][0], background: FONDS[CAST[p.id][1]], catchphrases: { en: tics(p.tics.en), fr: tics(p.tics.fr) }, icon: cast.icones[p.id],
});

const persoCast = (p) => clair(p.id, persoCast0(p));

// ------------------------------------------------------------------ le premier paquet
const FIRST = {
  annonce: ["L52", "impact", "impact", ["trailer", "annonce", "movie"]], alpha: ["L48", "boum", "coeur", ["alpha"]], nerd: ["L32", "huit_bits", "clavier", ["nerd", "actually"]],
  radio: ["L44", "jingle_radio", "radio", ["radio", "host", "dj"]], commentateur: ["L49", "corne", "stade", ["commentator", "commentateur", "sports"]],
  pirate: ["L34", "cloche_bateau", "navire", ["pirate"]], ninja: ["L55", "lame", "dojo", ["ninja"]], retro: ["L43", "demarrage", "retro", ["retro", "synth"]],
  synthese: ["L4", "pop", "bulles", ["tts", "peppy", "synthese"]], cliente: ["L9", "sonnette", "magasin", ["customer", "cliente", "manager"]],
  ordinateur: ["L12", "double_bip", "sonar", ["ship", "computer", "ordinateur"]], bug: ["L13", "glitch", "parasites", ["glitch", "bug"]],
  influenceuse: ["V68", "notification", "notification", ["influencer", "influenceuse"]], asmr: ["L1", "tapotements", "tapotements", ["asmr", "whisperer", "chuchoteuse"]],
  gothique: ["V59", "orgue_mineur", "glas", ["goth", "gothique"]], diva: ["L15", "soprano", "harpe", ["diva"]],
};
// Le premier paquet garde ses répliques d'origine, un peu étoffées (et sans rien qui ressemble à un rire).
const PLUS = {
  annonce: { en: { before: ["Coming soon.", "From the people who brought you this channel."] }, fr: { before: ["Prochainement.", "Par l'équipe qui vous a apporté ce salon."] } },
  radio: { en: { before: ["You're on the air.", "Good morning, everybody!"], after: ["Back to you.", "Don't touch that dial."] }, fr: { before: ["Vous êtes à l'antenne.", "Bonjour à tous !"], after: ["À vous les studios.", "Ne zappez pas."] } },
  commentateur: { en: { before: ["And they're off!", "What a move!"], after: ["Extra time!", "The crowd goes wild!"] }, fr: { before: ["Et c'est parti !", "Quel geste !"], after: ["Prolongations !", "Le public est en délire !"] } },
  pirate: { en: { before: ["Avast!", "All hands on deck!"], after: ["Anchors aweigh.", "To the treasure!"] }, fr: { before: ["Tous sur le pont !", "Mille sabords de bois !"], after: ["Levez l'ancre.", "Au trésor !"] } },
  ninja: { en: { before: ["Silence.", "Breathe."], after: ["Vanish.", "The blade remembers."] }, fr: { before: ["Silence.", "Respire."], after: ["Disparais.", "La lame se souvient."] } },
  retro: { en: { before: ["Ready.", "Loading. Please wait."], after: ["Beep.", "Insert disk two.", "Press any key."] }, fr: { before: ["Prêt.", "Chargement. Veuillez patienter."], after: ["Bip.", "Insérez la disquette deux.", "Appuyez sur une touche."] } },
  ordinateur: { en: { before: ["All decks:", "Status report:"], after: ["Shields holding.", "Course unchanged."] }, fr: { before: ["À tous les ponts :", "Rapport de situation :"], after: ["Les boucliers tiennent.", "Cap inchangé."] } },
  influenceuse: { en: { before: ["Okay, storytime:", "You guys!"], after: ["Link in bio.", "Smash that like button!"] }, fr: { before: ["Alors, petite histoire :", "Les amis !"], after: ["Lien en bio.", "Lâchez un pouce !"] } },
  asmr: { en: { before: ["Shh…", "So softly…", "Relax…"], after: ["So soothing.", "Sweet dreams."] }, fr: { before: ["Chut…", "Tout doucement…", "Détends-toi…"], after: ["Tellement apaisant.", "Fais de beaux rêves."] } },
};
const sansRire = (liste) => liste.filter((t) => !/yo ho ho/i.test(t));
function persoFirst(p) {
  const [voix, jingle, fond, mots] = FIRST[p.id];
  const actuel = cast.personnages.find((q) => q.id === p.id);          // même personnage dans le paquet actuel : mêmes répliques
  const phrases = {};
  for (const l of ["en", "fr"]) {
    if (actuel) { phrases[l] = tics(actuel.tics[l]); continue; }
    const plus = (PLUS[p.id] || {})[l] || {};
    phrases[l] = { before: sansRire([...(p.tics[l].debut || []), ...(plus.before || [])]), after: sansRire([...(p.tics[l].fin || []), ...(plus.after || [])]) };
    if (p.id === "asmr") phrases[l].before = plus.before;
  }
  if (actuel) return { ...persoCast(actuel), keywords: mots };                // même personnage que dans le paquet actuel
  return clair(p.id, {
    id: p.id, name: { en: actuel ? actuel.nom : "The " + p.nom.en.replace(/^.(?=[a-z])/, (c) => c.toLowerCase()), fr: actuel ? actuel.nomFr : articleFr(p.nom.fr) },
    role: { en: p.role.en, fr: p.role.fr }, keywords: mots, gender: p.genre === "h" ? "m" : "f",
    voice: voix, pitch: p.hauteur, pace: p.id === "commentateur" ? 1.08 : p.debit, expressiveness: p.expressivite, volume: p.volume || 1, tail: p.queue || 0, effects: effets(p.effets),
    jingle, background: FONDS[fond], catchphrases: phrases, icon: first.icones[p.id],
  });
}
function articleFr(nom) {
  const bas = nom.replace(/^./, (c) => c.toLowerCase());
  const feminin = /^(voix|cliente|influenceuse|chuchoteuse|gothique|diva)/i.test(nom);
  return (/^[aeiouhéèi]/i.test(bas) && !/^h/.test(bas) ? "L'" : feminin ? "La " : "Le ") + bas;
}

// ------------------------------------------------------------------ le paquet loufoque
const ENCRE = "#111111", BLANC = "#ffffff";
const JAUNE = "#ffc93c", ORANGE = "#ff6b35", ROSE = "#f5a3d0", VERT = "#2fa35b", CIEL = "#8ed1fc", LILAS = "#b9a5f5", ROUGE = "#e8452c", BLEU = "#2440e6";
const FORMES = {
  haricot: "M9 25c0-10 6-16 15-16s16 5 16 15-5 17-16 17S9 35 9 25z",
  pave: "M11 14c4-5 14-6 21-3s8 10 7 19-7 12-16 12-13-4-14-12 0-13 2-16z",
  poire: "M24 8c7 0 11 6 13 13s3 20-13 20S9 28 11 21 17 8 24 8z",
  nuage: "M12 19c-1-6 5-10 10-9 3-3 10-2 12 3 5 1 7 7 5 12 2 6-2 12-9 12-3 3-10 3-13 0-6 1-10-5-8-10-2-2-2-6 3-8z",
  colline: "M24 9c5 0 8 4 11 10s8 13 4 19-25 6-30 0 1-13 4-19 6-10 11-10z",
};
const corps = (forme, couleur) => `<path d="${FORMES[forme]}" fill="${couleur}"/>`;
const yeux = (y = 24, r = 2, x1 = 18.5, x2 = 29.5) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${ENCRE}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${ENCRE}"/>`;
const trait = (d, couleur = ENCRE, epaisseur = 1.8) => `<path d="${d}" fill="none" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ICONES = {
  // Le ballon d'hélium : tout rond, tout content, avec sa ficelle.
  ballon: `${trait("M24 37q-3 4 0 6t0 4", ENCRE, 1.4)}<path d="M21.500 36.500l2.500-3 2.500 3z" fill="${ROUGE}"/><ellipse cx="24" cy="19.500" rx="14.500" ry="16" fill="${ROUGE}"/>
    <ellipse cx="17.500" cy="12.500" rx="3" ry="4.500" fill="${BLANC}" opacity=".5" transform="rotate(25 17.500 12.500)"/>
    ${trait("M16.500 19q2.500-3 5 0M26.500 19q2.500-3 5 0", ENCRE, 1.900)}<ellipse cx="24" cy="26.500" rx="3" ry="3.600" fill="${ENCRE}"/>`,
  // Le géant au ralenti : si grand qu'il a la tête dans les nuages.
  geant: `<g transform="translate(0 6)">${corps("pave", VERT)}</g>${trait("M14.500 26.500h7M26.500 26.500h7", ENCRE, 2.300)}${trait("M17 37q7 2.500 14 0", ENCRE, 2)}
    <path d="M3 17q-1-5 4-5 1-5 7-3 4-4 8 0 5-1 5 4 3 4-2 5H6q-4 0-3-1z" fill="#dfe8f5"/><path d="M27 14q0-4 4-4 2-4 6-1 5-1 5 3 4 2 0 5H30q-4 0-3-3z" fill="#dfe8f5"/>
    <circle cx="13" cy="42" r="1.300" fill="${ENCRE}"/><circle cx="36" cy="43" r="1" fill="${ENCRE}"/>`,
  // Le commissaire-priseur : nœud papillon, bouche grande ouverte, marteau levé.
  commissaire: `<g transform="translate(-3 2)">${corps("poire", JAUNE)}${trait("M14.500 21.500l6 1.500M33.500 21.500l-6 1.500", ENCRE, 2)}${yeux(26, 1.900)}
    <ellipse cx="24" cy="33.500" rx="5" ry="4" fill="${ENCRE}"/><path d="M20.500 31.500h7v1.600h-7z" fill="${BLANC}"/>
    <path d="M24 41l-6-3v6zM24 41l6-3v6z" fill="${ROUGE}"/><circle cx="24" cy="41" r="1.600" fill="${ROUGE}"/></g>
    ${trait("M36 22l6-9", "#8a5a2b", 2.400)}<rect x="37" y="5" width="11" height="6.500" rx="1.500" fill="#8a5a2b" transform="rotate(34 42.500 8.300)"/>`,
  // Le fantôme cabotin : un drap, deux yeux, une main sur le cœur.
  fantome: `<path d="M9 44V22C9 12 15 6 24 6s15 6 15 16v22l-5-4-5 4-5-4-5 4-5-4z" fill="${BLANC}" stroke="${LILAS}" stroke-width="1.500" stroke-linejoin="round"/>
    <ellipse cx="18.500" cy="20" rx="2.600" ry="3.600" fill="${ENCRE}"/><ellipse cx="29.500" cy="20" rx="2.600" ry="3.600" fill="${ENCRE}"/>${trait("M15 14.500l5-1.500M33 14.500l-5-1.500", ENCRE, 1.600)}
    <ellipse cx="24" cy="29" rx="3.400" ry="4.400" fill="${ENCRE}"/>${trait("M39 26q5-2 5-7M9 30q-5 0-6 5", LILAS, 2.600)}`,
  // L'aspirateur robot égaré : un disque, un pare-chocs, un point d'interrogation.
  aspirateur: `<ellipse cx="22" cy="30" rx="19" ry="13" fill="#3a3f55"/><ellipse cx="22" cy="27" rx="19" ry="13" fill="#6a72b5"/><path d="M4 30q18 13 36 0" fill="none" stroke="${ENCRE}" stroke-width="2.200"/>
    <circle cx="16" cy="24" r="3.400" fill="${BLANC}"/><circle cx="28" cy="24" r="3.400" fill="${BLANC}"/><circle cx="17" cy="24.800" r="1.500" fill="${ENCRE}"/><circle cx="29" cy="24.800" r="1.500" fill="${ENCRE}"/>
    <circle cx="22" cy="17.500" r="1.800" fill="#6dfa8d"/>${trait("M38.500 6q3.500-3 5.500 0t-2.500 5v2", ROUGE, 2)}<circle cx="41.500" cy="16.500" r="1.300" fill="${ROUGE}"/>`,
  // Le scaphandrier : casque en cuivre, hublot, bulles.
  scaphandrier: `<rect x="12" y="36" width="24" height="9" rx="3" fill="#b9772e"/><circle cx="24" cy="23" r="16.500" fill="#e0a04a"/><circle cx="24" cy="23" r="10.500" fill="${CIEL}" stroke="#8a5a2b" stroke-width="2.400"/>
    ${yeux(22, 1.800, 20, 28)}${trait("M20.500 27q3.500 2.500 7 0", ENCRE, 1.700)}
    <circle cx="9.500" cy="13" r="1.600" fill="#8a5a2b"/><circle cx="38.500" cy="13" r="1.600" fill="#8a5a2b"/><circle cx="24" cy="8.500" r="1.600" fill="#8a5a2b"/>
    <circle cx="42" cy="7" r="2.600" fill="none" stroke="${CIEL}" stroke-width="1.400"/><circle cx="45" cy="13.500" r="1.500" fill="none" stroke="${CIEL}" stroke-width="1.200"/>`,
  // Le crieur public : tricorne, cloche à la main, bouche grande ouverte.
  crieur: `<g transform="translate(-3 5)">${corps("haricot", ORANGE)}${yeux(24, 1.900)}<ellipse cx="24" cy="32.500" rx="5.500" ry="5" fill="${ENCRE}"/><ellipse cx="24" cy="35" rx="3.400" ry="1.900" fill="${ROSE}"/></g>
    <path d="M3 17l9-9q9-4 18 0l9 9q-18-6-36 0z" fill="#1b1f4b"/><path d="M3 17q18-6 36 0" fill="none" stroke="${JAUNE}" stroke-width="1.600"/>
    ${trait("M41.500 22v4", "#8a5a2b", 2.400)}<path d="M36 36q1-10 5.500-10t5.500 10z" fill="${JAUNE}"/><circle cx="41.500" cy="38" r="1.800" fill="#8a5a2b"/>`,
  // Le visiteur extraterrestre : antennes, trois yeux, petite soucoupe.
  extraterrestre: `${trait("M17 12l-4-8M31 12l4-8", LILAS, 1.800)}<circle cx="13" cy="4" r="2.200" fill="${JAUNE}"/><circle cx="35" cy="4" r="2.200" fill="${JAUNE}"/>
    <g transform="translate(0 2)">${corps("colline", LILAS)}</g>
    <circle cx="15.500" cy="25" r="3.800" fill="${BLANC}"/><circle cx="24" cy="21" r="3.800" fill="${BLANC}"/><circle cx="32.500" cy="25" r="3.800" fill="${BLANC}"/>
    <circle cx="16" cy="25.500" r="1.600" fill="${ENCRE}"/><circle cx="24" cy="21.500" r="1.600" fill="${ENCRE}"/><circle cx="32" cy="25.500" r="1.600" fill="${ENCRE}"/>${trait("M19.500 34q4.500 3 9 0", ENCRE, 1.900)}`,
  // Le tamia sous caféine : grosses joues, dents, tasse fumante.
  tamia: `<circle cx="11" cy="11" r="4.500" fill="#b9772e"/><circle cx="31" cy="11" r="4.500" fill="#b9772e"/><g transform="translate(-3 3)">${corps("nuage", "#e0a04a")}</g>
    <path d="M18 6q3 6 0 13M24 6q3 6 0 13" fill="none" stroke="#8a5a2b" stroke-width="2.200" stroke-linecap="round" transform="translate(-3 4)"/>
    <circle cx="14.500" cy="24" r="3.600" fill="${BLANC}"/><circle cx="27.500" cy="24" r="3.600" fill="${BLANC}"/><circle cx="15" cy="24" r="1.300" fill="${ENCRE}"/><circle cx="27" cy="24" r="1.300" fill="${ENCRE}"/>
    <rect x="18.500" y="31" width="2.600" height="4" rx=".7" fill="${BLANC}" stroke="${ENCRE}" stroke-width=".8"/><rect x="21.300" y="31" width="2.600" height="4" rx=".7" fill="${BLANC}" stroke="${ENCRE}" stroke-width=".8"/>
    <path d="M35 32h9v6q0 5-4.500 5t-4.500-5z" fill="${BLANC}" stroke="${ENCRE}" stroke-width="1.200"/>${trait("M44 34q3 .5 0 4.500", ENCRE, 1.200)}${trait("M38 29q-1.500-2 0-4M41.500 29q-1.500-2 0-4", "#8a81a8", 1.200)}`,
  // La star de feuilleton : main sur le front, larme, bouche en « oh ».
  feuilleton: `${corps("poire", ROSE)}<path d="M11 21q-1-9 6-12t15 0 5 12q-3-6-8-7-6 4-18 7z" fill="#8a5a2b"/>
    ${trait("M15.500 25q3-2.600 6 0M26.500 25q3-2.600 6 0", ENCRE, 1.900)}${trait("M14.500 22l-1.500-1.500M33.500 22l1.500-1.500", ENCRE, 1.300)}
    <ellipse cx="24" cy="33.500" rx="3" ry="3.600" fill="${ROUGE}"/><path d="M33 28q2.500 4 0 5.500q-2.500-1.500 0-5.500z" fill="${CIEL}"/>
    <path d="M36 14q7-3 9 3q-3 4-9 2z" fill="${ROSE}" stroke="${ENCRE}" stroke-width="1.100" stroke-linejoin="round"/>`,
  // La complotiste : chapeau en papier d'alu, regard de côté, doigt sur la bouche.
  complotiste: `<g transform="translate(0 4)">${corps("haricot", CIEL)}</g><path d="M10 19l14-16 14 16q-14-5-28 0z" fill="#cfd4dc" stroke="#8f96a3" stroke-width="1.200" stroke-linejoin="round"/>${trait("M24 3v13M17 11l5 6M31 11l-5 6", "#8f96a3", 1)}
    <circle cx="18" cy="27" r="3.600" fill="${BLANC}"/><circle cx="30" cy="27" r="3.600" fill="${BLANC}"/><circle cx="19.800" cy="27" r="1.500" fill="${ENCRE}"/><circle cx="31.800" cy="27" r="1.500" fill="${ENCRE}"/>
    <rect x="22" y="31" width="4" height="12" rx="2" fill="${BLANC}" stroke="${ENCRE}" stroke-width="1.200"/>`,
  // La mamie au téléphone : chignon, lunettes, combiné.
  mamie: `<circle cx="24" cy="7" r="5.500" fill="#d9dbe6"/><g transform="translate(0 3)">${corps("nuage", ROSE)}</g><path d="M11 21q1-10 13-10t13 10q-13-5-26 0z" fill="#d9dbe6"/>
    <circle cx="18" cy="27" r="4.300" fill="${BLANC}" stroke="${ENCRE}" stroke-width="1.500"/><circle cx="30" cy="27" r="4.300" fill="${BLANC}" stroke="${ENCRE}" stroke-width="1.500"/>${trait("M22.300 27h3.400", ENCRE, 1.300)}
    <circle cx="18" cy="27.500" r="1.400" fill="${ENCRE}"/><circle cx="30" cy="27.500" r="1.400" fill="${ENCRE}"/>${trait("M19.500 36q4.500 3 9 0", ENCRE, 1.800)}
    <path d="M40 16q5 0 5 4.500v9q0 4.500-5 4.500v-4q1.500 0 1.500-2v-6q0-2-1.500-2z" fill="${ROUGE}"/>`,
  // La gourou du yoga : yeux clos, bandeau, mains jointes, lotus.
  yoga: `<g transform="translate(0 2)">${corps("colline", JAUNE)}</g><path d="M11.500 20q12.500-5 25 0v3.500q-12.500-5-25 0z" fill="${ROSE}"/>
    ${trait("M15.500 27q3 2.600 6 0M26.500 27q3 2.600 6 0", ENCRE, 1.900)}${trait("M20 33.500q4 2.500 8 0", ENCRE, 1.800)}
    <path d="M24 37l-3 7h6z" fill="${BLANC}" stroke="${ENCRE}" stroke-width="1.100" stroke-linejoin="round"/>
    <path d="M40 9q3 3 0 7q-3-4 0-7zM35 12q4 1 5 4.500q-4.500-.5-5-4.500zM45 12q-4 1-5 4.500q4.500-.5 5-4.500z" fill="${ROSE}"/>`,
  // La sorcière : chapeau pointu, nez crochu, verrue.
  sorciere: `<g transform="translate(0 6)">${corps("haricot", VERT)}</g><path d="M4 21q20-7 40 0l-9-3-9-17-5 4-4 13z" fill="#6a1f5a"/><path d="M12.500 17.300q11.500-3 23 0l1 2.200q-12.500-3.300-25 0z" fill="${JAUNE}"/>
    ${trait("M14.500 26l6 2M33.500 26l-6 2", ENCRE, 2)}${yeux(30.500, 1.800, 18.500, 29.500)}<path d="M24 30q4 4 1 6.500q-3-.5-1-6.500z" fill="#237a44"/><circle cx="31" cy="36" r="1.100" fill="#237a44"/>
    ${trait("M17.500 39q6.500 3.500 13 0", ENCRE, 1.900)}<rect x="21" y="39.800" width="2.300" height="2.600" fill="${BLANC}"/>`,
  // La poupée hantée : yeux-boutons, sourire cousu, nœud dans les cheveux.
  poupee: `<path d="M9 20q0-12 15-12t15 12v9q-3-9-15-9T9 29z" fill="${ENCRE}"/><g transform="translate(0 3)">${corps("pave", "#fff1e0")}</g>
    <path d="M15 8l-7-4v9zM15 8l7-4v9z" fill="${ROUGE}"/><circle cx="15" cy="8.500" r="2.400" fill="${ROUGE}"/>
    <circle cx="18" cy="26" r="4" fill="${ENCRE}"/><circle cx="30" cy="26" r="4" fill="${ENCRE}"/>${trait("M16.500 24.500l3 3M19.500 24.500l-3 3M28.500 24.500l3 3M31.500 24.500l-3 3", BLANC, 1.200)}
    <circle cx="14" cy="32.500" r="2.200" fill="${ROSE}"/><circle cx="34" cy="32.500" r="2.200" fill="${ROSE}"/>
    ${trait("M17.500 36q6.500 4 13 0", ENCRE, 1.600)}${trait("M20 36v2.500M24 37.500v2.500M28 36v2.500", ENCRE, 1.100)}`,
  // L'annonceuse d'aéroport : micro-casque, sourire professionnel, petit avion.
  aeroport: `${trait("M10 27v-4a14 14 0 0 1 28 0v4", ENCRE, 2.800)}<g transform="translate(0 3)">${corps("haricot", BLEU)}</g><rect x="5.500" y="24" width="6.500" height="10" rx="3" fill="${ENCRE}"/>
    ${trait("M16.500 27q2.500-3 5 0M26.500 27q2.500-3 5 0", BLANC, 1.900)}${trait("M19 34.500q5 3.500 10 0", BLANC, 1.900)}${trait("M9 34q1 8 9 7", ENCRE, 1.500)}<circle cx="19" cy="41" r="2" fill="${ENCRE}"/>
    <path d="M33 9l11-4q3-.5 1.500 1.500l-5.500 5.500 1 5.500-2 1-2.500-4.500-4 2.500-.5 2.500-1.500.5-.5-4-3.500-2 1-1.500 2.500.5 4-3.500z" fill="${JAUNE}" stroke="${ENCRE}" stroke-width=".9" stroke-linejoin="round"/>`,
};
const net = (svg) => svg.replace(/\s*\n\s*/g, "");

const W = (id, en, fr, roleEn, roleFr, mots, genre, voix, pitch, pace, expr, effects, jingle, fond, avant, apres, avantFr, apresFr, plus) => ({
  id, name: { en, fr }, role: { en: roleEn, fr: roleFr }, keywords: mots, gender: genre, voice: voix, pitch, pace, expressiveness: expr,
  volume: (plus && plus.volume) || 1, tail: (plus && plus.tail) || 0, effects, jingle, background: FONDS[fond],
  catchphrases: { en: { before: avant, after: apres }, fr: { before: avantFr, after: apresFr } }, icon: net(ICONES[id]),
});
const WACKY = [
  W("ballon", "The helium balloon", "Le ballon d'hélium", "the helium balloon", "le ballon d'hélium", ["balloon", "ballon", "helium"], "m", "L60", 1.3, 1.04, 0.8,
    [["treble", 3]], "sifflet_coulisse", "ballon",
    ["Squeak!", "Up, up, up!", "Whoa, I'm floating!", "Hold my string!", "Look at me go!"], ["Don't let go!", "Higher! Higher!", "Mind the ceiling fan.", "Pop goes nothing.", "I'm full of ideas. And helium."],
    ["Couic !", "Plus haut, plus haut !", "Oh, je flotte !", "Tiens ma ficelle !", "Regardez-moi monter !"], ["Ne lâche pas !", "Encore plus haut !", "Attention au ventilateur.", "Pourvu que ça n'éclate pas.", "Je suis plein d'idées. Et d'hélium."]),
  W("geant", "The slow-motion giant", "Le géant au ralenti", "the slow-motion giant", "le géant au ralenti", ["giant", "geant", "slow"], "m", "L52", 0.83, 0.78, 0.4,
    [["bass", 5, 90], ["echo", 0.88, 0.65, [130], [0.14]]], "solennel", "pas",
    ["Slowly now.", "Who goes there?", "Down there, little ones.", "One moment.", "Hmm."], ["Mind your heads.", "I was not finished.", "Careful where I step.", "It is a long way down.", "Take your time."],
    ["Doucement.", "Qui va là ?", "Vous, en bas, les petits.", "Un instant.", "Hum."], ["Attention aux têtes.", "Je n'avais pas fini.", "Gare à mes pieds.", "C'est haut, ici.", "Prenez votre temps."], { tail: 0.4 }),
  W("commissaire", "The auctioneer", "Le commissaire-priseur", "the auctioneer", "le commissaire-priseur", ["auctioneer", "commissaire", "auction"], "m", "L49", 1.04, 1.24, 0.8,
    [["peak", 2400, 3, 1]], "xylophone", "marteau",
    ["Lot number seven!", "Do I hear fifty?", "Who will start the bidding?", "Ladies and gentlemen!", "Fresh on the block:"], ["Going once, going twice!", "Sold!", "To the bidder in the back!", "Any advance on that?", "Next lot, please!"],
    ["Lot numéro sept !", "Qui dit cinquante ?", "Qui ouvre les enchères ?", "Mesdames et messieurs !", "Tout frais sur l'estrade :"], ["Une fois, deux fois !", "Adjugé, vendu !", "Au fond de la salle !", "Qui dit mieux ?", "Lot suivant !"], { volume: 1.1 }),
  W("fantome", "The theatrical ghost", "Le fantôme cabotin", "the theatrical ghost", "le fantôme cabotin", ["ghost", "fantome"], "m", "V97", 0.96, 0.85, 0.6,
    [["vibrato", 4.5, 0.1], ["echo", 0.88, 0.62, [160, 320], [0.16, 0.07]], ["lowpass", 5500]], "grincement", "hante",
    ["Boo.", "Who disturbs my rest?", "From beyond the attic,", "Do not be afraid.", "Brrr."], ["I am right behind you.", "The lights are flickering.", "I have haunted better channels.", "Now, where did I leave my chains?", "Spooky, is it not?"],
    ["Bouh.", "Qui trouble mon repos ?", "Depuis le fond du grenier,", "N'ayez pas peur.", "Brrr."], ["Je suis juste derrière vous.", "Les lumières vacillent.", "J'ai hanté de meilleurs salons.", "Où ai-je rangé mes chaînes ?", "Ça fait peur, non ?"], { tail: 0.6 }),
  W("aspirateur", "The lost robot vacuum", "L'aspirateur robot égaré", "the lost robot vacuum", "l'aspirateur robot égaré", ["vacuum", "aspirateur"], "m", "L31", 1.05, 0.95, 0.1,
    [["robot", 1024, 256, 0.35], ["highpass", 200], ["crackle", 2, 24, 0.12]], "donnees", "aspirateur",
    ["Bump.", "Obstacle detected.", "Recalculating.", "Cleaning in progress.", "Where is the dock?"], ["Please empty my bin.", "Returning to base.", "I am stuck under the sofa.", "Carpet. My old enemy.", "Battery low."],
    ["Boum.", "Obstacle détecté.", "Nouveau calcul.", "Nettoyage en cours.", "Où est ma base ?"], ["Veuillez vider mon bac.", "Retour à la base.", "Je suis coincé sous le canapé.", "Un tapis. Mon vieil ennemi.", "Batterie faible."]),
  W("scaphandrier", "The deep-sea diver", "Le scaphandrier", "the deep-sea diver", "le scaphandrier", ["diver", "scaphandrier", "sea"], "m", "L50", 0.95, 0.9, 0.5,
    [["lowpass", 3800], ["tremolo", 8, 0.2], ["flanger", 3, 2, 0.4, 0.25]], "sonar", "fonds_marins",
    ["Glub.", "Diver to surface:", "Bubbles ahead.", "From the sea floor,", "Do you read me?"], ["Checking my oxygen.", "Was that a shark?", "Pull me up, please.", "It is very wet down here.", "Over and out."],
    ["Gloub.", "Plongeur à surface :", "Des bulles droit devant.", "Depuis le fond de la mer,", "Vous me recevez ?"], ["Je vérifie mon oxygène.", "C'était un requin ?", "Remontez-moi, s'il vous plaît.", "C'est très mouillé, ici.", "Terminé."]),
  W("crieur", "The town crier", "Le crieur public", "the town crier", "le crieur public", ["crier", "crieur", "town"], "m", "L44", 0.98, 0.9, 0.7,
    [["peak", 1800, 3, 1], ["echo", 0.9, 0.7, [110], [0.1]]], "fanfare", "crieur",
    ["Hear ye, hear ye!", "Good people of this channel!", "Let it be known!", "By order of the moderators!", "Gather round!"], ["So it is proclaimed!", "Long live the channel!", "Spread the word!", "Nine o'clock and all is well!", "That is all, good people."],
    ["Oyez, oyez !", "Bonnes gens de ce salon !", "Qu'on se le dise !", "Par ordre des modérateurs !", "Approchez, approchez !"], ["Ainsi est-il proclamé !", "Longue vie au salon !", "Faites passer !", "Il est neuf heures et tout va bien !", "C'est tout, bonnes gens."], { volume: 1.2, tail: 0.3 }),
  W("extraterrestre", "The alien visitor", "Le visiteur extraterrestre", "the alien visitor", "le visiteur extraterrestre", ["alien", "extraterrestre"], "m", "L53", 1.18, 0.95, 0.6,
    [["robot", 512, 128, 0.15], ["flanger", 4, 3, 0.5, 0.45], ["vibrato", 6, 0.12]], "synthe_glisse", "soucoupe",
    ["Greetings, earthlings.", "We come in peace.", "Humans are fascinating.", "Translating.", "On my planet,"], ["Take me to your leader.", "This is noted for the mothership.", "Your snacks are excellent.", "We are watching. Kindly.", "End of transmission."],
    ["Salutations, Terriens.", "Nous venons en paix.", "Les humains sont fascinants.", "Traduction en cours.", "Sur ma planète,"], ["Conduisez-moi à votre chef.", "C'est noté pour le vaisseau mère.", "Vos goûters sont excellents.", "Nous vous observons. Gentiment.", "Fin de transmission."]),
  W("tamia", "The chipmunk on espresso", "Le tamia sous caféine", "the chipmunk on espresso", "le tamia sous caféine", ["chipmunk", "tamia", "espresso", "coffee"], "f", "L57", 1.25, 1.12, 0.7,
    [["treble", 2]], "boing", "cafe",
    ["Coffee, coffee, coffee!", "Okay okay okay!", "Quick, quick!", "No time, no time!", "Zoom!"], ["One more cup!", "I can hear colours!", "Gotta go, gotta go!", "Who needs sleep?", "Did somebody say acorns?"],
    ["Café, café, café !", "D'accord d'accord d'accord !", "Vite, vite !", "Pas le temps, pas le temps !", "Zou !"], ["Encore une tasse !", "J'entends les couleurs !", "Je file, je file !", "Dormir, pour quoi faire ?", "Quelqu'un a dit noisettes ?"]),
  W("feuilleton", "The soap-opera star", "La star de feuilleton", "the soap-opera star", "la star de feuilleton", ["soap", "feuilleton", "drama"], "f", "L15", 1.02, 0.86, 0.7,
    [["vibrato", 5, 0.12], ["echo", 0.88, 0.65, [70], [0.1]]], "tremblant", "drame",
    ["Gasp!", "How could you?", "After all these years!", "I knew it!", "No. It cannot be."], ["To be continued.", "Cue the dramatic music.", "And he was my twin all along.", "I shall never forgive this.", "Hold me."],
    ["Ciel !", "Comment as-tu pu ?", "Après toutes ces années !", "Je le savais !", "Non. C'est impossible."], ["La suite au prochain épisode.", "Musique dramatique, s'il vous plaît.", "Et c'était mon jumeau depuis le début.", "Je ne pardonnerai jamais.", "Retenez-moi."], { tail: 0.2 }),
  W("complotiste", "The whispering conspiracy theorist", "La complotiste qui chuchote", "the whispering conspiracy theorist", "la complotiste qui chuchote", ["conspiracy", "complotiste", "whisper"], "f", "L1", 1.0, 0.95, 0.6,
    [["whisper", 0.5], ["highpass", 180], ["treble", 3]], "basse_feutree", "morse",
    ["Psst.", "Between you and me,", "They don't want you to know this, but", "Lean in.", "Not so loud."], ["Think about it.", "Coincidence? I think not.", "Follow the pigeons.", "I've said too much.", "Delete this after reading."],
    ["Psst.", "Entre nous,", "On ne veut pas que tu le saches, mais", "Approche.", "Moins fort."], ["Réfléchis-y.", "Une coïncidence ? Je ne crois pas.", "Suis les pigeons.", "J'en ai trop dit.", "Efface ça après lecture."]),
  W("mamie", "The grandma on speakerphone", "La mamie au téléphone", "the grandma on speakerphone", "la mamie au téléphone", ["grandma", "mamie", "granny"], "f", "L2", 1.05, 0.82, 0.7,
    [["highpass", 300], ["lowpass", 4500]], "piano_pub", "telephone",
    ["Hello? Is this thing on?", "Can you hear me, dear?", "It's your grandmother.", "Speak up, sweetie.", "Now, where are my glasses?"], ["Did you eat?", "Call me more often.", "Put on a sweater.", "I'll put the kettle on.", "How do I hang up?"],
    ["Allô ? Ça marche, ce truc ?", "Tu m'entends, mon chou ?", "C'est ta grand-mère.", "Parle plus fort, mon trésor.", "Où sont mes lunettes ?"], ["Tu as mangé ?", "Appelle-moi plus souvent.", "Mets un gilet.", "Je mets de l'eau à chauffer.", "Comment on raccroche ?"]),
  W("yoga", "The yoga guru", "La gourou du yoga", "the yoga guru", "la gourou du yoga", ["yoga", "guru", "gourou"], "f", "L0", 0.95, 0.75, 0.3,
    [["echo", 0.9, 0.7, [140, 280], [0.13, 0.06]], ["lowpass", 5500]], "harpe", "bol",
    ["Breathe in.", "Find your center.", "Gently now.", "Close your eyes.", "Namaste."], ["And exhale.", "Let it go.", "Feel the calm.", "Stretch a little further.", "Be the channel."],
    ["Inspirez.", "Trouvez votre centre.", "Tout en douceur.", "Fermez les yeux.", "Namasté."], ["Et expirez.", "Lâchez prise.", "Sentez le calme.", "Étirez-vous un peu plus.", "Soyez le salon."], { tail: 0.5 }),
  W("sorciere", "The witch at the cauldron", "La sorcière au chaudron", "the witch at the cauldron", "la sorcière au chaudron", ["witch", "sorciere"], "f", "V90", 1.1, 0.95, 0.7,
    [["growl", 70, 0.12, 1.3], ["peak", 2600, 4, 1.2]], "glissade_basse", "chaudron",
    ["Come closer, dearie.", "Stir, stir, stir!", "A pinch of frog.", "By my broomstick!", "Now then, my pretties,"], ["Into the cauldron!", "The potion is ready.", "Mind the cat.", "Just a little curse.", "Bubble, bubble."],
    ["Approche, mon petit.", "Touille, touille, touille !", "Une pincée de crapaud.", "Par mon balai !", "Alors, mes jolis,"], ["Dans le chaudron !", "La potion est prête.", "Attention au chat.", "Juste un petit sortilège.", "Ça bouillonne."]),
  W("poupee", "The haunted doll", "La poupée hantée", "the haunted doll", "la poupée hantée", ["doll", "poupee"], "f", "L54", 1.2, 0.85, 0.3,
    [["echo", 0.88, 0.68, [180], [0.16]], ["vibrato", 3, 0.08], ["highpass", 250]], "boite_a_musique", "boite",
    ["Play with me.", "Hello, friend.", "I never blink.", "Let's play a game.", "Wind me up."], ["I see you.", "We will be friends forever.", "Tea time.", "Don't put me back in the box.", "I moved when you looked away."],
    ["Joue avec moi.", "Bonjour, mon ami.", "Je ne cligne jamais des yeux.", "On joue à un jeu ?", "Remonte-moi."], ["Je te vois.", "Nous serons amis pour toujours.", "C'est l'heure du thé.", "Ne me remets pas dans la boîte.", "J'ai bougé quand tu ne regardais pas."], { tail: 0.4 }),
  W("aeroport", "The airport announcer", "L'annonceuse d'aéroport", "the airport announcer", "l'annonceuse d'aéroport", ["airport", "aeroport", "announcer"], "f", "L12", 1.0, 0.9, 0.2,
    [["highpass", 300], ["lowpass", 4000], ["echo", 0.88, 0.68, [60, 120], [0.15, 0.07]], ["compress", 0.1, 3]], "verre", "aeroport",
    ["Attention, passengers.", "Your attention, please.", "This is a final call.", "Good afternoon, travellers.", "Passengers of this channel:"], ["Thank you for your patience.", "Please proceed to gate twelve.", "Do not leave your messages unattended.", "Boarding is now closed.", "We apologise for the delay."],
    ["Votre attention, s'il vous plaît.", "Mesdames et messieurs les voyageurs,", "Dernier appel.", "Bonjour à tous les passagers.", "Passagers de ce salon :"], ["Merci de votre patience.", "Veuillez vous présenter porte douze.", "Ne laissez pas vos messages sans surveillance.", "L'embarquement est terminé.", "Veuillez excuser ce retard."], { tail: 0.3 }),
];

const PAQUETS = [
  { id: "cast", name: { en: "The cast", fr: "La troupe" }, description: { en: "Ten male and ten female characters: the current selection.", fr: "Dix personnages masculins et dix féminins : la sélection actuelle." },
    characters: cast.personnages.map(persoCast) },
  { id: "first", name: { en: "The first pack", fr: "Le premier paquet" }, description: { en: "The sixteen characters of the first version.", fr: "Les seize personnages de la première version." },
    characters: first.personnages.map(persoFirst) },
  { id: "wacky", name: { en: "The wacky pack", fr: "Le paquet loufoque" }, description: { en: "Sixteen sillier, wackier characters.", fr: "Seize personnages plus drôles et plus loufoques." },
    characters: WACKY },
];
fs.mkdirSync(SORTIE, { recursive: true });
for (const p of PAQUETS) {
  const fichier = path.join(SORTIE, `${p.id}.json`);
  fs.writeFileSync(fichier, JSON.stringify({ format: "ping-show-pack/1", ...p }, null, 1));
  const rire = JSON.stringify(p.characters.map((c) => c.catchphrases)).match(/\b(ha ha|haha|hee hee|ho ho|lol|mdr)\b/gi);
  console.log(p.id, p.characters.length, "personnages,", Math.round(fs.statSync(fichier).size / 1024), "Ko", rire ? "RIRE: " + rire : "",
    "| sans icône:", p.characters.filter((c) => !c.icon).map((c) => c.id).join(",") || "aucun", "| sans fond:", p.characters.filter((c) => !c.background).map((c) => c.id).join(",") || "aucun");
}
