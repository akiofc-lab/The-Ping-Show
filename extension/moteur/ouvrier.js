/* L'ouvrier de synthèse : transforme un texte en voix de personnage.
 *
 * Tout se passe dans le navigateur. Le seul accès réseau est le
 * téléchargement des voix (fichiers publics du projet Piper), une fois ;
 * elles sont ensuite gardées en cache. Le texte des messages ne sort jamais.
 */
"use strict";

importScripts(
  "../vendor/ort.wasm.min.js",
  "../vendor/piper_phonemize.js",
  "personnages.js",
  "effets.js",
  "emojis.js"
);

const VENDOR = new URL("../vendor/", self.location.href).href;
const VOIX_LOCALES = new URL("../voix/", self.location.href).href;
const NOM_CACHE = "ping-voices-v1";
const SESSIONS_MAX = 4;

ort.env.wasm.wasmPaths = VENDOR;
// Plusieurs cœurs si le navigateur le permet (la moitié des cœurs, 4 au plus).
ort.env.wasm.numThreads = self.crossOriginIsolated
  ? Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)))
  : 1;

const { MODELES, voixDe, fichiersDeVoix } = self.PingTroupe;
const Effets = self.PingEffets;
const Emojis = self.PingEmojis;

// --- Fichiers de voix : fournis avec l'extension, en cache, ou téléchargés ---
async function lireAvecProgression(reponse, surProgres) {
  const total = Number(reponse.headers.get("Content-Length")) || 0;
  if (!reponse.body || !total) return new Uint8Array(await reponse.arrayBuffer());
  const lecteur = reponse.body.getReader();
  const morceaux = [];
  let recu = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    morceaux.push(value);
    recu += value.length;
    surProgres(recu, total);
  }
  const tout = new Uint8Array(recu);
  let position = 0;
  for (const m of morceaux) { tout.set(m, position); position += m.length; }
  return tout;
}

async function obtenirFichier(adresse, nomFichier, surProgres) {
  // 1. Fichier glissé dans le dossier voix/ de l'extension (usage hors ligne).
  try {
    const locale = await fetch(VOIX_LOCALES + nomFichier);
    if (locale.ok) return new Uint8Array(await locale.arrayBuffer());
  } catch (_) { /* absent : cas normal */ }
  // 2. Déjà téléchargé.
  const cache = await caches.open(NOM_CACHE);
  const garde = await cache.match(adresse);
  if (garde) return new Uint8Array(await garde.arrayBuffer());
  // 3. Téléchargement (une seule fois).
  const reponse = await fetch(adresse);
  if (!reponse.ok) throw new Error(`Téléchargement impossible (${reponse.status}) : ${nomFichier}`);
  const octets = await lireAvecProgression(reponse, surProgres);
  try {
    await cache.put(adresse, new Response(octets, { headers: { "Content-Length": String(octets.length) } }));
  } catch (_) { /* cache plein : on continue sans garder */ }
  return octets;
}

// --- Voix chargées -----------------------------------------------------------
const voixChargees = new Map(); // nom du modèle -> { session, reglages, dernierUsage }
const chargements = new Map();  // nom du modèle -> promesse en cours

// Charge (une seule fois) le fichier de voix d'un personnage dans une langue.
async function chargerModele(langue, personnage) {
  const { nom, modele, reglages } = voixDe(personnage, langue);
  const prete = voixChargees.get(nom);
  if (prete) { prete.dernierUsage = Date.now(); return prete; }
  if (chargements.has(nom)) return chargements.get(nom);

  const promesse = (async () => {
    const progres = (recu, total) => postMessage({ type: "telechargement", voix: nom, recu, total });
    const texteReglages = await obtenirFichier(reglages, `${nom}.onnx.json`, () => {});
    const octets = await obtenirFichier(modele, `${nom}.onnx`, progres);
    postMessage({ type: "telechargement", voix: nom, recu: 1, total: 1, fini: true });
    const session = await ort.InferenceSession.create(octets, { executionProviders: ["wasm"] });
    const voix = {
      session,
      reglages: JSON.parse(new TextDecoder().decode(texteReglages)),
      dernierUsage: Date.now(),
      enUsage: 0,
    };
    voixChargees.set(nom, voix);
    postMessage({ type: "voix", noms: [...voixChargees.keys()] });
    // On ne garde que quelques voix en mémoire (jamais on n'en retire une en train de parler).
    const libres = [...voixChargees.entries()].filter(([, v]) => !v.enUsage && v !== voix)
      .sort((a, b) => a[1].dernierUsage - b[1].dernierUsage);
    while (voixChargees.size > SESSIONS_MAX && libres.length) {
      const [ancienne, retiree] = libres.shift();
      voixChargees.delete(ancienne);
      try { await retiree.session.release(); } catch (_) { /* rien */ }
    }
    return voix;
  })();
  chargements.set(nom, promesse);
  try { return await promesse; } finally { chargements.delete(nom); }
}

// --- Du texte aux phonèmes ---------------------------------------------------
let paquetPhonemes = null; // données d'eSpeak NG, lues une seule fois
let binairePhonemes = null;

async function phonemiser(phrases, voixEspeak) {
  if (!paquetPhonemes) {
    const [donnees, binaire] = await Promise.all([
      fetch(VENDOR + "piper_phonemize.data").then((r) => r.arrayBuffer()),
      fetch(VENDOR + "piper_phonemize.wasm").then((r) => r.arrayBuffer()),
    ]);
    paquetPhonemes = donnees;
    binairePhonemes = binaire;
  }
  const lignes = [];
  const module = await createPiperPhonemize({
    print: (ligne) => lignes.push(ligne),
    printErr: () => {},
    wasmBinary: binairePhonemes,
    getPreloadedPackage: () => paquetPhonemes,
    locateFile: (fichier) => VENDOR + fichier,
  });
  module.callMain([
    "-l", voixEspeak,
    "--input", JSON.stringify(phrases.map((text) => ({ text }))),
    "--espeak_data", "/espeak-ng-data",
  ]);
  return lignes.map((ligne) => JSON.parse(ligne).phonemes);
}

function versIdentifiants(phonemes, carte) {
  const ids = [...carte["^"], ...carte["_"]];
  for (const p of phonemes) {
    if (!(p in carte)) continue; // phonème inconnu de cette voix : on l'ignore
    ids.push(...carte[p], ...carte["_"]);
  }
  ids.push(...carte["$"]);
  return ids;
}

// Coupe un message en phrases : la première part plus vite vers les oreilles.
const PHRASE_MAX = 260;   // caractères : au-delà, la phrase est coupée à une virgule (le son arrive plus vite)
function couperLongue(phrase) {
  const bouts = [];
  let reste = phrase;
  while (reste.length > PHRASE_MAX) {
    const debut = reste.slice(0, PHRASE_MAX);
    let ou = Math.max(debut.lastIndexOf(", "), debut.lastIndexOf("; "), debut.lastIndexOf(": "), debut.lastIndexOf(" – "), debut.lastIndexOf(" - "));
    if (ou < PHRASE_MAX / 3) ou = debut.lastIndexOf(" ");
    if (ou < PHRASE_MAX / 3) ou = PHRASE_MAX - 1;
    bouts.push(reste.slice(0, ou + 1).trim());
    reste = reste.slice(ou + 1).trim();
  }
  if (reste) bouts.push(reste);
  return bouts;
}

function enPhrases(texte) {
  const phrases = (texte.match(/[^.!?…]+[.!?…]+["»)]*|[^.!?…]+$/g) || [texte]).flatMap(couperLongue);
  const propres = [];
  for (const p of phrases.map((s) => s.trim()).filter(Boolean)) {
    // Une phrase minuscule (« Ok. ») est rattachée à la précédente.
    if (propres.length && (p.length < 12 || propres[propres.length - 1].length < 12)) {
      propres[propres.length - 1] += " " + p;
    } else {
      propres.push(p);
    }
  }
  return propres;
}

async function synthetiser(phonemes, voix, personnage, locuteur) {
  const reglages = voix.reglages;
  const ids = versIdentifiants(phonemes, reglages.phoneme_id_map);
  if (ids.length < 4) return null;
  const inference = reglages.inference || {};
  const entrees = {
    input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor("float32", Float32Array.from([
      // Expressivité du personnage : de la récitation monocorde au ton très animé.
      personnage.expressivite === undefined ? (inference.noise_scale ?? 0.667) : 0.2 + 0.75 * personnage.expressivite,
      // On ralentit la synthèse d'autant qu'on l'accélérera en changeant la
      // hauteur : le débit final reste naturel.
      (inference.length_scale ?? 1) * ((personnage.hauteur || 1) / (personnage.debit || 1)),
      personnage.expressivite === undefined ? (inference.noise_w ?? 0.8) : 0.4 + 0.5 * personnage.expressivite,
    ]), [3]),
  };
  if ((reglages.num_speakers || 1) > 1) {
    entrees.sid = new ort.Tensor("int64", BigInt64Array.from([BigInt(locuteur || 0)]), [1]);
  }
  voix.enUsage++;
  let brut;
  try {
    const sorties = await voix.session.run(entrees);
    brut = sorties[voix.session.outputNames[0]].data;
  } finally {
    voix.enUsage--;
  }
  try {
    return Effets.appliquer(brut, reglages.audio.sample_rate, personnage);
  } catch (_) {
    // Un effet mal réglé (paquet de voix ajouté à la main) : la voix passe sans effet plutôt que de se taire.
    return Effets.appliquer(brut, reglages.audio.sample_rate, { hauteur: personnage.hauteur, volume: personnage.volume });
  }
}

// --- File de travail ---------------------------------------------------------
const annules = new Set();
let file = Promise.resolve();

// Un message est une suite de passages à dire et d'effets sonores (les émojis),
// dans l'ordre où ils ont été écrits. La voix est calculée ici (y compris les
// petites réactions que certains émojis font dire au personnage) ; pour un effet
// sonore, on prévient seulement le panneau, qui le joue à sa place dans la file.
async function dire({ id, texte, langue, perso }) {
  const personnage = perso && typeof perso === "object" ? perso : { voix: "L4", genre: "f" };   // réglages envoyés par le panneau
  const base = MODELES[langue] ? langue : "en";
  const debut = performance.now();
  const parties = Emojis.decouper(texte, base).map((p) => (p.texte ? { phrases: enPhrases(p.texte) } : p));
  const phrases = parties.flatMap((p) => p.phrases || []);
  let voix = null, locuteur = 0, phonemes = [];
  if (phrases.length) {          // un message fait seulement d'émojis n'a besoin d'aucune voix
    voix = await chargerModele(base, personnage);
    locuteur = voixDe(personnage, base).locuteur;
    phonemes = await phonemiser(phrases, voix.reglages.espeak?.voice || MODELES[base].espeak);
  }
  let envoyes = 0, rang = 0;
  for (const partie of parties) {
    if (annules.has(id)) break;
    if (partie.effet) {
      postMessage({ type: "effet", id, nom: partie.effet, premier: envoyes === 0 });
      envoyes++;
      continue;
    }
    for (let i = 0; i < partie.phrases.length; i++, rang++) {
      if (annules.has(id)) break;
      const son = phonemes[rang] ? await synthetiser(phonemes[rang], voix, personnage, locuteur) : null;
      if (!son || annules.has(id)) continue;
      postMessage(
        { type: "morceau", id, echantillons: son, premier: envoyes === 0, calcul: Math.round(performance.now() - debut) },
        [son.buffer]
      );
      envoyes++;
    }
  }
  postMessage({ type: "fin", id, morceaux: envoyes });
}

self.onmessage = ({ data }) => {
  if (data.type === "annuler") {
    for (const id of data.ids) annules.add(id);
    return;
  }
  if (data.type === "precharger") {
    file = file.then(async () => {
      try {
        const langue = MODELES[data.langue] ? data.langue : "en";
        // Le premier fichier de voix, puis un petit tour à vide : la première
        // vraie réplique partira plus vite.
        const troupe = Array.isArray(data.personnages) && data.personnages.length ? data.personnages : [{ voix: "L4", genre: "f" }];
        const [premier, ...autres] = fichiersDeVoix(troupe, langue);
        const voix = await chargerModele(langue, premier);
        const [phonemes] = await phonemiser(["a"], voix.reglages.espeak?.voice || MODELES[langue].espeak);
        await synthetiser(phonemes, voix, { hauteur: 1, debit: 1 }, voixDe(premier, langue).locuteur);
        // L'autre fichier arrive pendant que la lecture commence.
        for (const p of autres) chargerModele(langue, p).catch(() => {});
        postMessage({ type: "pret", langue });
      } catch (erreur) {
        postMessage({ type: "erreur", message: String(erreur && erreur.message || erreur) });
      }
    });
    return;
  }
  if (data.type === "dire") {
    file = file.then(async () => {
      if (annules.has(data.id)) { annules.delete(data.id); postMessage({ type: "fin", id: data.id, morceaux: 0 }); return; }
      try {
        await dire(data);
      } catch (erreur) {
        postMessage({ type: "erreur", id: data.id, message: String(erreur && erreur.message || erreur) });
        postMessage({ type: "fin", id: data.id, morceaux: 0 });
      }
      annules.delete(data.id);
    });
  }
};

postMessage({ type: "demarre", fils: ort.env.wasm.numThreads });
