/* Les voix de base et les répliques fétiches.
 *
 * Les personnages eux-mêmes sont dans les paquets de voix (dossier packs/, ou
 * ajoutés depuis le panneau ; voir paquets.js). Ce sont des archétypes (le
 * snob, l'ogre grognon, l'ordinateur trop calme…), pas des imitations de
 * personnes réelles ni de personnages existants : le moteur de synthèse ne
 * sait pas imiter une voix précise, et ce n'est pas le but.
 *
 * Réglages d'un personnage (une fois le paquet lu) :
 *   genre         "h" ou "f"
 *   voix          voix de base en anglais : L<n> = locuteur n de la voix américaine
 *                 LibriTTS, V<n> = locuteur n de la voix britannique VCTK
 *                 (en français, la voix de base dépend seulement du genre)
 *   hauteur       au-dessus de 1, plus aigu ; en dessous, plus grave
 *   debit         vitesse de parole
 *   expressivite  0 = récitation monocorde, 1 = très animé
 *   volume        1 = normal
 *   effets        liste d'effets appliqués dans l'ordre (voir effets.js)
 *   queue         secondes ajoutées pour laisser mourir l'écho
 *   ambiance      fond sonore : quelques sons brefs (voir ambiances.js)
 *   indicatif     petit air d'une seconde quand le personnage prend la parole
 *   tics          petites phrases fétiches ajoutées de temps en temps (début ou fin)
 */
(function (racine) {
  "use strict";

  // Voix de base (fichiers du projet libre Piper). L'anglais tient en deux
  // fichiers qui contiennent chacun beaucoup de locuteurs ; le français n'est
  // chargé que si un message en français se présente.
  const MODELES = {
    en: {
      espeak: "en-us",
      L: { modele: "en_US-libritts_r-medium", chemin: "en/en_US/libritts_r/medium" },
      V: { modele: "en_GB-vctk-medium", chemin: "en/en_GB/vctk/medium" },
    },
    fr: {
      espeak: "fr",
      h: { modele: "fr_FR-tom-medium", chemin: "fr/fr_FR/tom/medium" },
      f: { modele: "fr_FR-siwis-medium", chemin: "fr/fr_FR/siwis/medium" },
    },
  };
  const LANGUES = Object.keys(MODELES);

  // La voix de base d'un personnage dans une langue : fichiers à charger et
  // numéro du locuteur dans ce fichier.
  function voixDe(personnage, langue) {
    const anglais = langue === "en";
    const cle = anglais ? (personnage.voix || "L0")[0] : (personnage.genre === "f" ? "f" : "h");
    const v = MODELES[langue][cle] || MODELES[langue][anglais ? "L" : "h"];
    const base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/";
    return {
      nom: v.modele,
      locuteur: anglais ? Number(String(personnage.voix || "L0").slice(1)) || 0 : 0,
      modele: `${base}${v.chemin}/${v.modele}.onnx`,
      reglages: `${base}${v.chemin}/${v.modele}.onnx.json`,
    };
  }

  // Les fichiers de voix dont une troupe a besoin dans une langue : un
  // personnage par fichier, le fichier le plus utilisé d'abord.
  function fichiersDeVoix(personnages, langue) {
    const fichiers = new Map();
    for (const p of personnages) {
      const { nom } = voixDe(p, langue);
      if (!fichiers.has(nom)) fichiers.set(nom, { personnage: p, usages: 0 });
      fichiers.get(nom).usages++;
    }
    return [...fichiers.values()].sort((a, b) => b.usages - a.usages).map((f) => f.personnage);
  }

  // Ajoute de temps en temps une phrase fétiche du personnage : au début, à la
  // fin, ou plus rarement les deux. Le tirage dépend du message (une même
  // réplique rejouée donne le même résultat), mais un personnage ne redit
  // jamais deux fois de suite la même phrase.
  const dernierTic = new Map();   // personnage -> dernières phrases dites
  function choisirTic(liste, tirage, personnage) {
    if (!liste || !liste.length) return "";
    const recents = dernierTic.get(personnage.cle) || [];
    let i = tirage % liste.length;
    for (let essai = 0; essai < liste.length && recents.includes(liste[i]); essai++) i = (i + 1) % liste.length;
    dernierTic.set(personnage.cle, [liste[i], ...recents].slice(0, 3));
    return liste[i];
  }
  function avecTic(texte, personnage, langue, graine) {
    const tics = personnage.tics && personnage.tics[langue];
    if (!tics) return texte;
    let h = 2166136261;
    for (const c of String(graine) + personnage.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const sort = h % 100, tirage = Math.floor(h / 100);
    if (sort >= 50) return texte;                          // une fois sur deux, rien
    const lesDeux = sort < 8;                              // de temps en temps, début et fin
    const auDebut = lesDeux || tirage % 2 === 0;
    const debut = auDebut ? choisirTic(tics.debut, Math.floor(tirage / 2), personnage) : "";
    const fin = lesDeux || !auDebut ? choisirTic(tics.fin, Math.floor(tirage / 7), personnage) : "";
    return [debut, texte, fin].filter(Boolean).join(" ");
  }

  const api = { MODELES, LANGUES, voixDe, fichiersDeVoix, avecTic };
  racine.PingTroupe = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
