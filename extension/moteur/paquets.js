/* Paquets de voix : lecture, vérification et recherche.
 *
 * Un paquet est un fichier JSON (voir le dossier packs/ pour des exemples, et
 * le README pour le format). Ceux fournis avec l'extension et ceux qu'on
 * ajoute depuis le panneau passent par la même porte : `normaliser`, qui
 * vérifie tout, borne les valeurs et rend des personnages prêts à l'emploi.
 * Rien de ce que contient un paquet n'est exécuté : ce sont des réglages, des
 * textes et un dessin, affiché comme une simple image.
 */
(function (racine) {
  "use strict";

  const FORMAT = "ping-show-pack/";
  const MAX_PERSONNAGES = 60;
  const MAX_ICONE = 30000;          // caractères
  const MAX_INDICATIF = 600000;     // caractères d'une adresse « data: » (environ 450 Ko de son)

  // Les indicatifs fournis avec l'extension (dossier indicatifs/), utilisables par leur nom.
  const INDICATIFS = ("western funk solennel megaphone banjo clavecin huit_bits sifflet_coulisse cloche_ecole piano_muet twang synthe_glisse boing verre " +
    "tremblant trompette_jouet sitcom tuba bips descente note_unique zap sonar fanfare grincement harpe metal accord_chaud kazoo soprano xylophone pop " +
    "demarrage boum sonnette jingle_radio corne impact cloche_bateau lame notification tapotements orgue_mineur double_bip glitch boite_a_musique tonnerre " +
    "glissade_basse basse_feutree piano_pub donnees").split(" ");

  // Les effets : nom dans les paquets -> nom dans effets.js, et bornes de chaque réglage.
  // n(min, max, défaut) : un nombre ; liste(min, max) : jusqu'à quatre nombres.
  const n = (min, max, defaut) => ({ min, max, defaut });
  const liste = (min, max) => ({ min, max, liste: true });
  const EFFETS = {
    bass: ["graves", n(-12, 12, 4), n(40, 400, 100)],
    treble: ["aigus", n(-12, 12, 3), n(1000, 8000, 3000)],
    lowpass: ["passeBas", n(500, 10000, 5000)],
    highpass: ["passeHaut", n(50, 2000, 200)],
    peak: ["cloche", n(100, 8000, 2000), n(-12, 12, 3), n(0.3, 6, 1)],
    echo: ["echo", n(0.3, 1, 0.9), n(0.3, 1, 0.7), liste(1, 1000), liste(0, 0.9)],
    tremolo: ["tremolo", n(0.5, 20, 6), n(0, 1, 0.3)],
    vibrato: ["vibrato", n(0.2, 12, 5), n(0, 1, 0.15)],
    flanger: ["flanger", n(0.5, 20, 3), n(0, 10, 2), n(0.05, 5, 0.4), n(0, 1, 0.3)],
    crackle: ["gresillement", n(0.5, 6, 2), n(4, 256, 32), n(0, 1, 0.15)],
    robot: ["robot", { choix: [256, 512, 1024, 2048], defaut: 1024 }, { quart: true }, n(0, 1, 0.3)],
    whisper: ["chuchotement", n(0, 1, 0.3)],
    growl: ["rocaille", n(20, 150, 60), n(0, 1, 0.15), n(0.5, 4, 1.4)],
    glitch: ["bug", n(0, 9999, 7), n(0.5, 10, 2.5)],
    compress: ["compression", n(0.01, 1, 0.1), n(1, 20, 3)],
  };
  const NOMS_INTERNES = Object.fromEntries(Object.entries(EFFETS).map(([anglais, [interne]]) => [interne, anglais]));

  const nombre = (v, { min, max, defaut }) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.min(max, Math.max(min, Number(v))) : defaut);

  function effets(source, alerte) {
    const propres = [];
    for (const effet of Array.isArray(source) ? source.slice(0, 8) : []) {
      if (!Array.isArray(effet) || typeof effet[0] !== "string") continue;
      const nom = EFFETS[effet[0]] ? effet[0] : NOMS_INTERNES[effet[0]];
      if (!nom) { alerte(`unknown effect “${String(effet[0]).slice(0, 30)}”`); continue; }
      const [interne, ...regles] = EFFETS[nom];
      const reglages = [];
      regles.forEach((regle, k) => {
        const valeur = effet[k + 1];
        if (regle.liste) reglages.push((Array.isArray(valeur) ? valeur : []).slice(0, 4).map((v) => nombre(v, { ...regle, defaut: regle.min })));
        else if (regle.choix) reglages.push(regle.choix.includes(Number(valeur)) ? Number(valeur) : regle.defaut);
        else if (regle.quart) reglages.push(reglages[0] / 4);
        else reglages.push(nombre(valeur, regle));
      });
      if (interne === "echo") reglages[3] = reglages[2].map((_, k) => reglages[3][k] ?? 0.1);   // une atténuation par retard
      propres.push([interne, ...reglages]);
    }
    return propres;
  }

  const texte = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  // Un texte donné tel quel, ou par langue : { en, fr }.
  function bilingue(v, max, defaut) {
    const en = texte(v && typeof v === "object" ? v.en : v, max), fr = texte(v && typeof v === "object" ? v.fr : "", max);
    return { en: en || fr || defaut, fr: fr || en || defaut };
  }
  const identifiant = (v) => texte(String(v ?? ""), 60).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const phrases = (v) => (Array.isArray(v) ? v : []).map((t) => texte(t, 90)).filter(Boolean).slice(0, 16);

  function voix(v) {
    const m = /^([LV])\s*(\d{1,3})$/i.exec(String(v ?? "").trim());
    if (!m) return null;
    const lettre = m[1].toUpperCase(), numero = Number(m[2]);
    return numero < (lettre === "L" ? 904 : 109) ? lettre + numero : null;
  }

  function icone(v) {
    const dessin = typeof v === "string" ? v.trim() : "";
    if (!dessin || dessin.length > MAX_ICONE) return "";
    // Le dessin est affiché comme une image : rien ne peut s'y exécuter. On écarte quand même ce qui n'a rien à y faire.
    if (/<\s*(script|foreignObject|iframe|image|use|a)\b|\bon\w+\s*=|javascript:|(?:xlink:)?href\s*=/i.test(dessin)) return "";
    return dessin.replace(/^<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  }

  function indicatif(v) {
    if (typeof v !== "string") return "";
    if (INDICATIFS.includes(v)) return v;
    return /^data:audio\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_INDICATIF ? v : "";
  }

  // Vérifie un paquet lu dans un fichier et le rend prêt à l'emploi. Lève une
  // erreur (message en anglais, montré dans le panneau) s'il est inutilisable.
  function normaliser(source, options) {
    const alertes = [];
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("this file is not a voice pack");
    if (typeof source.format !== "string" || !source.format.startsWith(FORMAT)) throw new Error(`the “format” line should say “${FORMAT}1”`);
    if (!Array.isArray(source.characters) || !source.characters.length) throw new Error("the pack has no characters");
    const nom = bilingue(source.name, 60, "");
    const id = identifiant(source.id) || identifiant(nom.en);
    if (!id || !nom.en) throw new Error("the pack needs an “id” and a “name”");
    const personnages = [], pris = new Set();
    source.characters.slice(0, MAX_PERSONNAGES).forEach((c, rang) => {
      const ou = `character ${rang + 1}`;
      if (!c || typeof c !== "object") { alertes.push(`${ou}: skipped (not an object)`); return; }
      const nomPerso = bilingue(c.name, 60, "");
      const idPerso = identifiant(c.id) || identifiant(nomPerso.en);
      const base = voix(c.voice);
      if (!idPerso || !nomPerso.en) { alertes.push(`${ou}: skipped (no name)`); return; }
      if (pris.has(idPerso)) { alertes.push(`${ou}: skipped (“${idPerso}” appears twice)`); return; }
      if (!base) { alertes.push(`“${nomPerso.en}”: skipped (voice must be L0–L903 or V0–V108)`); return; }
      pris.add(idPerso);
      const alerte = (message) => alertes.push(`“${nomPerso.en}”: ${message}`);
      const repliques = {};
      for (const langue of ["en", "fr"]) {
        const t = (c.catchphrases && c.catchphrases[langue]) || {};
        repliques[langue] = { debut: phrases(t.before), fin: phrases(t.after) };
      }
      personnages.push({
        cle: `${id}/${idPerso}`, id: idPerso, paquet: id,
        genre: /^(f|female|femme)$/i.test(String(c.gender)) ? "f" : "h",
        nom: nomPerso,
        role: bilingue(c.role, 80, nomPerso.en.replace(/^The /, "the ")),
        mots: (Array.isArray(c.keywords) ? c.keywords : []).map((m) => texte(m, 30)).filter(Boolean).slice(0, 12),
        voix: base,
        hauteur: nombre(c.pitch, n(0.6, 1.6, 1)), debit: nombre(c.pace, n(0.5, 1.6, 1)), expressivite: nombre(c.expressiveness, n(0, 1, 0.6)),
        volume: nombre(c.volume, n(0.5, 1.5, 1)), queue: nombre(c.tail, n(0, 1.5, 0)),
        effets: effets(c.effects, alerte),
        indicatif: indicatif(c.jingle),
        ambiance: racine.PingAmbiances ? racine.PingAmbiances.nettoyer(c.background) : (Array.isArray(c.background) ? c.background : []),
        tics: repliques,
        icone: icone(c.icon),
      });
    });
    if (!personnages.length) throw new Error("no usable character in this pack" + (alertes.length ? ` (${alertes[0]})` : ""));
    return { id, nom, description: bilingue(source.description, 200, ""), personnages, importe: !!(options && options.importe), alertes };
  }

  // --- Retrouver un personnage d'après un nom tapé par quelqu'un (« !voice grumpy ogre ») -------------
  const simplifier = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[“”«»"'’`]/g, " ").replace(/\b(the|le|la|les|l|un|une|a|an)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

  function ressemblance(demande, p) {
    const noms = [p.id, p.nom.en, p.nom.fr].map(simplifier);
    if (noms.includes(demande)) return 4;
    const mots = p.mots.map(simplifier);
    if (mots.includes(demande)) return 3;
    const motsDemande = demande.split(" ");
    if (mots.some((m) => motsDemande.includes(m))) return 2;
    if (noms.some((nom) => nom && (` ${nom} `.includes(` ${demande} `) || ` ${demande} `.includes(` ${nom} `)))) return 1;
    return 0;
  }

  // Cherche d'abord parmi `preferes` (le paquet en cours), puis parmi tous les autres.
  function chercher(demande, preferes, tous) {
    const d = simplifier(demande);
    if (!d) return null;
    for (const groupe of [preferes, tous]) {
      let meilleur = null, note = 0;
      for (const p of groupe || []) {
        const r = ressemblance(d, p);
        if (r > note) { meilleur = p; note = r; }
      }
      if (meilleur) return meilleur;
    }
    return null;
  }

  const api = { normaliser, chercher, simplifier, INDICATIFS, EFFETS: Object.keys(EFFETS), FORMAT };
  racine.PingPaquets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
