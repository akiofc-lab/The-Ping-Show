/* Fonds sonores : quelques petits sons discrets, propres à chaque personnage.
 *
 * Aucun fichier son : tout est fabriqué par calcul. Le fond d'un personnage est
 * décrit dans son paquet de voix par une courte liste d'événements, par exemple
 *
 *   { "sound": "bell", "at": 1.5, "freq": 660, "length": 2.2, "level": 0.7 }
 *
 * joués dans une boucle de huit secondes presque vide : deux ou trois sons
 * brefs et doux, jamais de nappe ni de souffle continu sous la voix.
 *
 * Les sons disponibles :
 *   bell     clochette (freq, length, decay)
 *   toll     cloche lointaine, plus sombre (freq, length)
 *   pluck    corde pincée : harpe, guitare, piano feutré (freq, length, decay)
 *   drop     goutte ou bulle, une note brève qui monte (freq, length, rise)
 *   knock    toc sur du bois (freq, length)
 *   thump    battement sourd : cœur, ballon, pas (freq, length)
 *   beep     bip électronique (freq, length)
 *   glide    note qui glisse d'une hauteur à une autre (freq, to, length)
 *   croak    coassement (freq, length)
 *   scratch  frottement feutré : craie, touche de clavier, papier (freq, length)
 */
(function (racine) {
  "use strict";

  const FREQ = 22050;            // suffisant pour un fond sonore
  const DUREE = 8;               // secondes
  const N = FREQ * DUREE;
  const TAU = 2 * Math.PI;
  const CRETE = 0.22;            // toutes les boucles au même niveau de crête
  const MAX_EVENEMENTS = 24;

  function hasard(graine) {
    let a = (graine >>> 0) || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const note = (frequence, t) => Math.sin(TAU * frequence * t);
  const attaque = (t, ms = 4) => Math.min(1, t / (ms / 1000));
  function riche(frequence, t, harmoniques) {
    let s = 0;
    for (let h = 1; h <= harmoniques; h++) s += Math.sin(TAU * frequence * h * t) / h;
    return s;
  }

  // Chaque son : une fonction de t (secondes écoulées) et de r (avancement de 0 à 1).
  const SONS = {
    bell: ({ freq, decay = 5 }) => (t, r) =>
      (note(freq, t) + 0.25 * note(2 * freq, t) + 0.08 * note(3.01 * freq, t)) * Math.exp(-decay * r) * attaque(t) * (1 - r),
    toll: ({ freq }) => (t, r) =>
      (note(freq, t) + 0.5 * note(2.4 * freq, t) + 0.25 * note(3.9 * freq, t) * Math.exp(-6 * r)) * Math.exp(-3.5 * r) * attaque(t, 8) * (1 - r),
    pluck: ({ freq, decay = 4 }) => (t, r) => {
      let s = 0;
      for (let h = 1; h <= 5; h++) s += (Math.sin(TAU * freq * h * t) / h) * Math.exp(-decay * h * 0.6 * r);
      return s * Math.exp(-decay * r) * attaque(t, 3) * (1 - r);
    },
    drop: ({ freq, rise = 2 }) => (t, r) => Math.sin(TAU * freq * (1 + (rise - 1) * r * 0.5) * t) * Math.sin(Math.PI * r) * Math.exp(-2 * r),
    knock: ({ freq }) => (t, r) => (note(freq, t) + 0.4 * note(2.4 * freq, t)) * Math.exp(-14 * r) * attaque(t, 1),
    thump: ({ freq }) => (t, r) => (note(freq * (1 - 0.2 * r), t) + 0.5 * note(2 * freq * (1 - 0.2 * r), t)) * Math.exp(-8 * r) * attaque(t, 6),
    beep: ({ freq }) => (t, r) => note(freq, t) * Math.sin(Math.PI * r),
    glide: ({ freq, to, length }) => (t, r) => Math.sin(TAU * (freq * t + ((to - freq) * t * t) / (2 * length))) * Math.sin(Math.PI * r),
    croak: ({ freq }) => (t, r) => riche(freq, t, 4) * (0.5 + 0.5 * Math.sin(TAU * 30 * t)) * Math.sin(Math.PI * r) * 0.7,
  };
  const LONGUEUR = { bell: 0.8, toll: 2.5, pluck: 1.5, drop: 0.1, knock: 0.08, thump: 0.18, beep: 0.08, glide: 0.3, croak: 0.22, scratch: 0.1 };
  const NOMS_DES_SONS = [...Object.keys(SONS), "scratch"];

  // Filtre passe-bande simple, pour les frottements.
  function bande(x, frequence, resonance) {
    const y = new Float32Array(x.length);
    let bas = 0, milieu = 0;
    const f = 2 * Math.sin((Math.PI * Math.min(frequence, FREQ / 6.5)) / FREQ), q = 1 / resonance;
    for (let i = 0; i < x.length; i++) {
      bas += f * milieu;
      const haut = x[i] - bas - q * milieu;
      milieu += f * haut;
      y[i] = milieu;
    }
    return y;
  }

  const borne = (valeur, mini, maxi, defaut) => (Number.isFinite(Number(valeur)) ? Math.min(maxi, Math.max(mini, Number(valeur))) : defaut);

  // Met une liste d'événements au propre (valeurs bornées, sons connus) ; ce qui est illisible est écarté.
  function nettoyer(evenements) {
    if (!Array.isArray(evenements)) return [];
    const propres = [];
    for (const e of evenements.slice(0, MAX_EVENEMENTS)) {
      if (!e || !NOMS_DES_SONS.includes(e.sound)) continue;
      propres.push({
        sound: e.sound,
        at: borne(e.at, 0, DUREE, 0),
        freq: borne(e.freq, 40, 8000, 440),
        to: borne(e.to, 40, 8000, 880),
        length: borne(e.length, 0.01, 4, LONGUEUR[e.sound]),
        level: borne(e.level, 0, 1, 0.5),
        decay: borne(e.decay, 1, 12, undefined),
        rise: borne(e.rise, 1, 4, undefined),
      });
    }
    return propres;
  }

  // Calcule les sons d'une liste d'événements dans un tampon de n échantillons.
  // En boucle, ce qui dépasse la fin revient au début ; sinon, c'est coupé.
  function fabriquer(evenements, n, enBoucle, crete) {
    const y = new Float32Array(n);
    const alea = hasard(20261002);
    const poser = (i, valeur) => {
      if (enBoucle) y[i % n] += valeur;
      else if (i < n) y[i] += valeur;
    };
    for (const e of nettoyer(evenements)) {
      const debut = Math.round(e.at * FREQ), longueur = Math.round(e.length * FREQ);
      if (e.sound === "scratch") {
        const brut = new Float32Array(longueur);
        for (let i = 0; i < longueur; i++) brut[i] = alea() * 2 - 1;
        const son = bande(brut, e.freq, 1.6);
        for (let i = 0; i < longueur; i++) poser(debut + i, e.level * son[i] * Math.sin((Math.PI * i) / longueur));
        continue;
      }
      const forme = SONS[e.sound](e);
      for (let i = 0; i < longueur; i++) poser(debut + i, e.level * forme(i / FREQ, i / longueur));
    }
    let sommet = 0;
    for (let i = 0; i < n; i++) sommet = Math.max(sommet, Math.abs(y[i]));
    if (sommet > 0) for (let i = 0; i < n; i++) y[i] *= crete / sommet;
    return y;
  }

  const pretes = new Map();

  // Renvoie la boucle d'un fond sonore : { echantillons, frequence }, ou null s'il n'y a rien à jouer.
  function creer(evenements) {
    const cle = JSON.stringify(evenements || []);
    if (!pretes.has(cle)) {
      const propres = nettoyer(evenements);
      pretes.set(cle, propres.length ? { echantillons: fabriquer(propres, N, true, CRETE), frequence: FREQ } : null);
      if (pretes.size > 80) pretes.delete(pretes.keys().next().value);
    }
    return pretes.get(cle);
  }

  const api = { creer, nettoyer, NOMS_DES_SONS, FREQ, DUREE };
  racine.PingAmbiances = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
