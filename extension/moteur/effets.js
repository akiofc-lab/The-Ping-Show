/* Effets sonores des personnages : du calcul pur sur des tableaux d'échantillons.
 *
 * Aucun appel réseau, aucune dépendance. Le même fichier sert dans
 * l'extension (dans l'ouvrier de synthèse) et dans les essais (Node).
 */
(function (racine) {
  "use strict";

  const FREQ = 44100; // fréquence de travail (Hz)

  // --- Hauteur et rééchantillonnage ----------------------------------------
  // On relit le son plus vite ou plus lentement (façon dessin animé), puis on
  // le ramène à 44,1 kHz avec un filtre de Lanczos pour éviter le repliement.
  function changerHauteur(x, frequenceEntree, hauteur) {
    const pas = (frequenceEntree * hauteur) / FREQ;
    const n = Math.floor(x.length / pas);
    const y = new Float32Array(n);
    const coupure = Math.min(1, 1 / pas);
    const LOBES = 6;
    const rayon = LOBES / coupure;
    for (let i = 0; i < n; i++) {
      const centre = i * pas;
      const debut = Math.max(0, Math.ceil(centre - rayon));
      const fin = Math.min(x.length - 1, Math.floor(centre + rayon));
      let somme = 0;
      for (let j = debut; j <= fin; j++) {
        const t = (j - centre) * coupure;
        if (t === 0) {
          somme += x[j];
        } else {
          const a = Math.PI * t;
          somme += x[j] * (Math.sin(a) / a) * (Math.sin(a / LOBES) / (a / LOBES));
        }
      }
      y[i] = somme * coupure;
    }
    return y;
  }

  // --- Filtres du second ordre (formules classiques « RBJ ») ---------------
  function biquad(x, b0, b1, b2, a0, a1, a2) {
    const y = new Float32Array(x.length);
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
      y[i] = v;
    }
    return y;
  }

  function passeBas(x, f, q = 0.707) {
    const w = (2 * Math.PI * f) / FREQ, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    return biquad(x, (1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
  }

  function passeHaut(x, f, q = 0.707) {
    const w = (2 * Math.PI * f) / FREQ, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    return biquad(x, (1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
  }

  function cloche(x, f, gainDb, q = 1) {
    const A = Math.pow(10, gainDb / 40);
    const w = (2 * Math.PI * f) / FREQ, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    return biquad(x, 1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
  }

  function plateau(x, f, gainDb, bas) {
    const A = Math.pow(10, gainDb / 40);
    const w = (2 * Math.PI * f) / FREQ, c = Math.cos(w);
    const al = (Math.sin(w) / 2) * Math.SQRT2; // pente douce
    const r = 2 * Math.sqrt(A) * al;
    if (bas) {
      return biquad(x,
        A * (A + 1 - (A - 1) * c + r), 2 * A * (A - 1 - (A + 1) * c), A * (A + 1 - (A - 1) * c - r),
        A + 1 + (A - 1) * c + r, -2 * (A - 1 + (A + 1) * c), A + 1 + (A - 1) * c - r);
    }
    return biquad(x,
      A * (A + 1 + (A - 1) * c + r), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - r),
      A + 1 - (A - 1) * c + r, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - r);
  }

  const graves = (x, gainDb, f = 100) => plateau(x, f, gainDb, true);
  const aigus = (x, gainDb, f = 3000) => plateau(x, f, gainDb, false);

  // --- Effets temporels -----------------------------------------------------
  // Écho : le son d'origine plus une ou plusieurs copies retardées.
  function echo(x, gainEntree, gainSortie, retardsMs, attenuations) {
    const y = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] * gainEntree;
    retardsMs.forEach((ms, k) => {
      const d = Math.round((ms / 1000) * FREQ), g = attenuations[k];
      for (let i = d; i < x.length; i++) y[i] += x[i - d] * g;
    });
    for (let i = 0; i < y.length; i++) y[i] *= gainSortie;
    return y;
  }

  // Trémolo : le volume ondule.
  function tremolo(x, f, profondeur) {
    const y = new Float32Array(x.length);
    const w = (2 * Math.PI * f) / FREQ;
    for (let i = 0; i < x.length; i++) {
      y[i] = x[i] * (1 - profondeur * (0.5 - 0.5 * Math.sin(w * i)));
    }
    return y;
  }

  // Lecture d'un échantillon à une position fractionnaire.
  function lire(x, position) {
    if (position <= 0) return x[0] || 0;
    const i = Math.floor(position);
    if (i >= x.length - 1) return x[x.length - 1] || 0;
    const f = position - i;
    return x[i] * (1 - f) + x[i + 1] * f;
  }

  // Vibrato : la hauteur ondule (retard qui varie).
  function vibrato(x, f, profondeur) {
    const y = new Float32Array(x.length);
    const w = (2 * Math.PI * f) / FREQ;
    const amplitude = profondeur * 0.005 * FREQ * 0.5;
    for (let i = 0; i < x.length; i++) {
      y[i] = lire(x, i - amplitude * (1 + Math.sin(w * i)));
    }
    return y;
  }

  // Flanger : le son mélangé à une copie dont le retard oscille lentement.
  function flanger(x, retardMs, profondeurMs, vitesse, melange) {
    const y = new Float32Array(x.length);
    const w = (2 * Math.PI * vitesse) / FREQ;
    const base = (retardMs / 1000) * FREQ, amplitude = (profondeurMs / 1000) * FREQ * 0.5;
    const norme = 1 / (1 + melange);
    for (let i = 0; i < x.length; i++) {
      y[i] = (x[i] + melange * lire(x, i - base - amplitude * (1 + Math.sin(w * i)))) * norme;
    }
    return y;
  }

  // Grésillement de radio : saturation douce puis réduction du nombre de niveaux.
  function gresillement(x, pousse, niveaux, melange) {
    const y = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const sature = Math.tanh(x[i] * pousse);
      const ecrase = Math.round(sature * niveaux) / niveaux;
      y[i] = x[i] * (1 - melange) + (ecrase / pousse) * melange * 1.5;
    }
    return y;
  }

  // --- Voix de robot --------------------------------------------------------
  // On découpe le son en petites tranches et on aligne toutes les ondes de
  // chaque tranche : la mélodie de la voix disparaît, il reste un timbre
  // monocorde et métallique, mais les mots restent compréhensibles.
  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let taille = 2; taille <= n; taille <<= 1) {
      const angle = ((inverse ? 2 : -2) * Math.PI) / taille;
      const wr = Math.cos(angle), wi = Math.sin(angle);
      for (let i = 0; i < n; i += taille) {
        let cr = 1, ci = 0;
        for (let k = 0; k < taille / 2; k++) {
          const a = i + k, b = a + taille / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  function robot(x, taille = 512, saut = 128, melange = 1) {
    const y = new Float32Array(x.length + taille);
    const fenetre = new Float32Array(taille);
    for (let i = 0; i < taille; i++) fenetre[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / taille);
    const re = new Float32Array(taille), im = new Float32Array(taille);
    const echelle = saut / (taille / 2); // somme des fenêtres qui se recouvrent
    for (let debut = 0; debut <= x.length; debut += saut) {
      for (let i = 0; i < taille; i++) {
        re[i] = (x[debut + i] || 0) * fenetre[i];
        im[i] = 0;
      }
      fft(re, im, false);
      for (let i = 0; i < taille; i++) { re[i] = Math.hypot(re[i], im[i]); im[i] = 0; }
      fft(re, im, true);
      // L'impulsion obtenue est centrée sur le début de la tranche : on la recentre.
      for (let i = 0; i < taille; i++) {
        y[debut + i] += re[(i + taille / 2) % taille] * echelle;
      }
    }
    const sortie = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) sortie[i] = y[i] * melange + x[i] * (1 - melange);
    return sortie;
  }

  // Petit générateur de hasard reproductible (le même message donne le même son).
  function hasard(graine) {
    let a = (graine >>> 0) || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- Chuchotement ---------------------------------------------------------
  // Même découpage en tranches, mais on brouille l'alignement des ondes : la
  // voix perd son timbre « chanté » et devient un souffle, les mots restent.
  function chuchotement(x, melange = 1, taille = 1024, saut = 256) {
    const y = new Float32Array(x.length + taille);
    const fenetre = new Float32Array(taille);
    for (let i = 0; i < taille; i++) fenetre[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / taille);
    const re = new Float32Array(taille), im = new Float32Array(taille);
    const alea = hasard(taille + x.length);
    const echelle = saut / (taille * 0.375); // somme des fenêtres au carré
    for (let debut = 0; debut <= x.length; debut += saut) {
      for (let i = 0; i < taille; i++) { re[i] = (x[debut + i] || 0) * fenetre[i]; im[i] = 0; }
      fft(re, im, false);
      for (let k = 1; k < taille / 2; k++) {
        const module = Math.hypot(re[k], im[k]), phase = 2 * Math.PI * alea();
        re[k] = module * Math.cos(phase); im[k] = module * Math.sin(phase);
        re[taille - k] = re[k]; im[taille - k] = -im[k];
      }
      re[0] = 0; im[0] = 0; im[taille / 2] = 0;
      fft(re, im, true);
      for (let i = 0; i < taille; i++) y[debut + i] += re[i] * fenetre[i] * echelle;
    }
    const sortie = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) sortie[i] = y[i] * melange + x[i] * (1 - melange);
    return sortie;
  }

  // Voix rocailleuse : un grondement irrégulier dans la gorge, un peu de saturation.
  function rocaille(x, f = 62, profondeur = 0.5, pousse = 2.2) {
    const y = new Float32Array(x.length);
    const alea = hasard(977);
    let phase = 0, derive = 0;
    for (let i = 0; i < x.length; i++) {
      if (i % 441 === 0) derive = derive * 0.8 + (alea() - 0.5) * 0.5; // la fréquence flotte
      phase += (2 * Math.PI * f * (1 + derive)) / FREQ;
      const onde = 0.5 + 0.5 * Math.sin(phase);
      y[i] = (Math.tanh(x[i] * pousse) / pousse) * (1 - profondeur * onde * onde);
    }
    return y;
  }

  // Bug d'intelligence artificielle : par moments, un court fragment se répète
  // ou dérape vers le grave.
  function bug(x, graine = 7, intervalle = 1.3) {
    const alea = hasard(graine + x.length);
    const morceaux = [];
    const fondu = Math.round(0.004 * FREQ);
    let position = 0;
    while (position < x.length) {
      const calme = Math.round((0.6 + alea()) * intervalle * FREQ);
      const fin = Math.min(x.length, position + calme);
      morceaux.push(x.subarray(position, fin));
      position = fin;
      if (position >= x.length - 0.2 * FREQ) continue;
      const longueur = Math.round((0.06 + 0.06 * alea()) * FREQ);
      const fragment = x.slice(position, position + longueur);
      for (let i = 0; i < fondu; i++) {
        fragment[i] *= i / fondu;
        fragment[fragment.length - 1 - i] *= i / fondu;
      }
      if (alea() < 0.3) {
        // dérapage : le fragment est relu deux fois plus lentement
        const lent = new Float32Array(fragment.length * 2);
        for (let i = 0; i < lent.length; i++) lent[i] = lire(fragment, i / 2);
        morceaux.push(lent);
      } else {
        const repetitions = 2 + Math.floor(alea() * 3);
        for (let r = 0; r < repetitions; r++) morceaux.push(fragment);
      }
    }
    return coller(morceaux);
  }

  // Compression : rapproche les passages faibles des passages forts (voix « radio »).
  function compression(x, seuil = 0.12, taux = 4) {
    const y = new Float32Array(x.length);
    const montee = Math.exp(-1 / (0.005 * FREQ)), descente = Math.exp(-1 / (0.12 * FREQ));
    let enveloppe = 0;
    for (let i = 0; i < x.length; i++) {
      const a = Math.abs(x[i]);
      enveloppe = a > enveloppe ? a + (enveloppe - a) * montee : a + (enveloppe - a) * descente;
      const gain = enveloppe > seuil ? Math.pow(enveloppe / seuil, 1 / taux - 1) : 1;
      y[i] = x[i] * gain;
    }
    return y;
  }

  // --- Finitions ------------------------------------------------------------
  function allonger(x, secondes) {
    const y = new Float32Array(x.length + Math.round(secondes * FREQ));
    y.set(x);
    return y;
  }

  function coller(morceaux) {
    let total = 0;
    for (const m of morceaux) total += m.length;
    const y = new Float32Array(total);
    let position = 0;
    for (const m of morceaux) { y.set(m, position); position += m.length; }
    return y;
  }

  function silence(secondes) {
    return new Float32Array(Math.round(secondes * FREQ));
  }

  // Ramène chaque réplique au même volume perçu, sans saturer.
  function normaliser(x, cible = 0.11, crete = 0.9) {
    let somme = 0, actifs = 0, maximum = 0;
    for (let i = 0; i < x.length; i++) {
      const a = Math.abs(x[i]);
      if (a > maximum) maximum = a;
      if (a > 0.01) { somme += a * a; actifs++; }
    }
    if (!actifs) return x;
    const gain = Math.min(cible / Math.max(Math.sqrt(somme / actifs), 1e-6), crete / Math.max(maximum, 1e-6));
    const y = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] * gain;
    return y;
  }

  function note(frequence, duree, volume = 0.2) {
    const n = Math.round(duree * FREQ), y = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / FREQ;
      const son = Math.sin(2 * Math.PI * frequence * t) + 0.3 * Math.sin(4 * Math.PI * frequence * t);
      y[i] = volume * son * Math.exp((-5 * t) / duree) * Math.min(1, t / 0.005);
    }
    return y;
  }

  // Quelques notes pour signaler que la lecture démarre (ou s'arrête).
  function jingle(fin) {
    let notes = [523.25, 659.25, 783.99, 1046.5];
    if (fin) notes = notes.reverse();
    return coller([note(notes[0], 0.12), note(notes[1], 0.12), note(notes[2], 0.12), note(notes[3], 0.5)]);
  }

  function bipRadio() {
    const n = Math.round(0.12 * FREQ), y = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / FREQ;
      y[i] = 0.12 * Math.sin(2 * Math.PI * 1320 * t) * Math.min(1, t / 0.005) * Math.min(1, (n - i) / 200);
    }
    return y;
  }

  const TABLE = {
    graves, aigus, passeBas, passeHaut, cloche, echo, tremolo, vibrato, flanger, gresillement, robot,
    chuchotement, rocaille, bug, compression,
  };

  // Applique toute la chaîne d'un personnage à une voix brute.
  function appliquer(brut, frequenceEntree, personnage) {
    let x = changerHauteur(brut, frequenceEntree, personnage.hauteur || 1);
    if (personnage.queue) x = allonger(x, personnage.queue);
    for (const [nom, ...reglages] of personnage.effets || []) {
      x = TABLE[nom](x, ...reglages);
    }
    x = normaliser(x, 0.11 * (personnage.volume || 1));
    if (personnage.bip) x = coller([x, silence(0.05), bipRadio()]);
    return x;
  }

  const api = { FREQ, appliquer, changerHauteur, normaliser, coller, silence, jingle, bipRadio, hasard, TABLE };
  racine.PingEffets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
