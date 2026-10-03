/* Le panneau : commandes de lecture, distribution des voix et sortie du son.
 *
 * Les messages viennent du script de contenu (contenu.js). Ils sont rangés
 * dans une « bande » (la conversation du salon affiché), nettoyés, envoyés à
 * l'ouvrier de synthèse (moteur/ouvrier.js), puis joués ici.
 *
 * Quatre états :
 *   arret    rien n'est lu, le script de contenu est au repos
 *   direct   chaque nouveau message est lu à son arrivée
 *   lecture  relecture des anciens messages, dans l'ordre, jusqu'au direct
 *   pause    actif mais silencieux ; « précédent » et « suivant » lisent un
 *            message à la fois
 */
"use strict";

const { avecTic } = self.PingTroupe;
const Paquets = self.PingPaquets;
const Effets = self.PingEffets;
const Ambiances = self.PingAmbiances;
const Icones = self.PingIcones;
const Logo = self.PingLogo;
const Genre = self.PingGenre;
const Texte = self.PingTexte;
const Emojis = self.PingEmojis;
const Textes = self.PingTextes;

const FILE_MAX = 20;         // en direct : répliques en attente de synthèse, au plus
const RETARD_MAX_S = 240;    // en direct : au-delà de ce retard (de longs messages s'accumulent), on saute des messages
const AMBIANCE_MAX = 0.8;    // gain de l'ambiance quand le curseur est au maximum (réglage de départ : 0,3)
const APERCU = { en: "Hello, I am {role}.", fr: "Bonjour, je suis {role}." };
const SYMBOLE_GENRE = { h: "♂", f: "♀" };
const PAQUETS_FOURNIS = ["cast", "wacky", "first"];   // le premier est celui de départ
const VERSION_REGLAGES = 7;
const TOUS = "*";            // valeur du menu « tous les paquets ensemble »
const ADRESSES_DISCORD = ["https://discord.com/*", "https://*.discord.com/*"];
// « !voice ogre » (ou !voix, !ping) dans le fil : la personne choisit sa propre voix.
const RE_COMMANDE = /^!(?:voice|voix|ping)\s+(.{1,60})$/i;
// Dans un pseudo : « Camille [ogre] ».
const RE_ETIQUETTE = /\[([^\]]{2,40})\]/;
// « !voice off » (ou l'étiquette [off] dans le pseudo) : la personne ne veut pas être lue. « !voice on » : elle revient.
const RE_REFUS = /^(off|mute|muted?|stop|silence|quiet|no|non|muet(?:te)?|no voice)$/i;
const RE_RETOUR = /^(on|yes|oui|unmute)$/i;

const $ = (id) => document.getElementById(id);
const dire = Textes.dire;

// interface : langue des textes du panneau ; langue : langue de lecture en cas de doute ;
// genre : deviner le genre d'après le prénom ; paquet : paquet de voix en service ;
// emojis : jouer les émojis comme de petits effets sonores.
let reglages = { version: VERSION_REGLAGES, volume: 0.85, ambiance: 0.3, tics: true, indicatifs: true, emojis: true, genre: true, paquet: PAQUETS_FOURNIS[0], langue: "en", interface: "en" };
// nom -> { perso, muet, refus, genre, manuel, souhait }
//   refus    vrai si la personne a demandé à ne pas être lue (« !voice off ») : l'auditeur ne peut pas passer outre
//   perso    clé du personnage qui lit cette personne
//   souhait  clé du personnage qu'elle a choisi elle-même (« !voice … »), s'il y en a un
//   manuel   vrai si l'auditeur a choisi à la main : son choix passe avant tout
let distribution = {};
let ordreNoms = [];           // du plus récent au plus ancien
let mode = "arret";
let contexte = null, gain = null, prochainDepart = 0;
let ouvrier = null;
let battement = null;
let compteur = 0;

// Les paquets de voix : ceux de l'extension, puis ceux ajoutés par l'auditeur.
let paquets = [];
let paquetsAjoutes = [];              // tels qu'ils ont été lus dans les fichiers (c'est ce qu'on garde en mémoire)
const PAR_CLE = new Map();            // clé « paquet/personnage » -> personnage
let actifs = [];                      // les personnages du paquet en service

// La bande : les messages connus du salon affiché, du plus ancien au plus récent.
let bande = [];
let salonBande = null;
let dernierId = null;         // dernier message dont la lecture a commencé
let auBout = true;            // vrai tant qu'on n'a rien relu : on est au bord du direct
let envoyeId = null;          // en relecture : dernier message confié à la synthèse
let ongletDiscord = null;     // l'onglet Discord qu'on lit

let rattrapage = false;       // vrai pendant qu'on lit les messages jamais lus (après « Play ») : on saute ceux déjà entendus
const enAttente = new Map();  // id de réplique -> réplique en cours de synthèse ou de lecture
const sources = new Set();
const lignes = new Map();     // nom -> élément <li>
const tamponsAmbiance = new Map();
const ambiances = new Set();          // fonds sonores en train de jouer
const tamponsIndicatif = new Map();   // indicatif (nom ou son fourni par un paquet) -> son décodé
const tamponsEffet = new Map();       // effet sonore d'un émoji (nom du fichier) -> son décodé
const NIVEAU_INDICATIF = 0.8;
const NIVEAU_EFFET = 1.1;             // les effets sont enregistrés un peu sous le niveau des voix
const SILENCE_AVANT_INDICATIF = 20;   // secondes sans parole après lesquelles l'indicatif revient
let dernierOrateur = null;            // dernière personne entendue (l'indicatif joue quand elle change)
const situation = { telechargement: null, pret: false, discord: null, ongletsDiscord: 0, source: "", trop: false, debut: false, erreur: "", voix: [], sonBloque: false };
let surScene = null;

const proteger = (action) => () => {
  Promise.resolve().then(action).catch((e) => { situation.erreur = e.message || String(e); afficherEtat(); });
};

// --- Textes ------------------------------------------------------------------
const dansLaLangue = (texte) => (texte && (texte[reglages.interface] || texte.en)) || "";
const nomDe = (personnage) => dansLaLangue(personnage.nom);

// Écrit (ou réécrit) tous les textes du panneau dans la langue de l'interface.
function traduire() {
  Textes.choisir(reglages.interface);
  document.documentElement.lang = reglages.interface;
  document.title = dire("nomExtension");
  document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = dire(e.dataset.i18n); });
  document.querySelectorAll("[data-i18n-titre]").forEach((e) => {
    e.title = dire(e.dataset.i18nTitre);
    e.setAttribute("aria-label", e.title);
  });
  document.querySelectorAll("[data-i18n-bulle]").forEach((e) => { e.title = dire(e.dataset.i18nBulle); });   // une explication au survol
  document.querySelectorAll("[data-i18n-aria]").forEach((e) => { e.setAttribute("aria-label", dire(e.dataset.i18nAria)); });
  document.querySelectorAll("[data-interface]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.interface === reglages.interface)));
}

// Refait tout ce qui est fabriqué à la main : la distribution, la réplique en cours, l'état, les menus.
function toutReafficher() {
  for (const ligne of lignes.values()) ligne.remove();
  lignes.clear();
  afficherPaquets();
  afficherDistribution();
  const enCours = surScene && enAttente.get(surScene);
  montrer(enCours || null);
  afficherInterrupteurs();
  afficherRaccourcis();
  afficherSource();
  afficherEtat();
}

// Change la langue de l'interface, sans toucher à la lecture en cours.
function changerInterface(code) {
  reglages.interface = code === "fr" ? "fr" : "en";
  traduire();
  toutReafficher();
  enregistrer();
}

traduire();

// Le logo, dont les yeux suivent le pointeur.
$("logo").innerHTML = Logo.svg();
Logo.animer($("logo"));

// --- Paquets de voix ---------------------------------------------------------------
function rangerPaquets(fournis) {
  paquets = [...fournis];
  for (const brut of paquetsAjoutes) {
    try {
      const paquet = Paquets.normaliser(brut, { importe: true });
      paquet.brut = brut;
      while (paquets.some((p) => p.id === paquet.id)) {           // deux paquets ne peuvent pas porter le même identifiant
        paquet.id += "-2";
        for (const p of paquet.personnages) { p.paquet = paquet.id; p.cle = `${paquet.id}/${p.id}`; }
      }
      paquets.push(paquet);
    } catch (_) { /* paquet devenu illisible : on l'ignore */ }
  }
  PAR_CLE.clear();
  for (const paquet of paquets) for (const p of paquet.personnages) PAR_CLE.set(p.cle, p);
  Icones.oublier();
  choisirActifs();
}

function choisirActifs() {
  const paquet = paquets.find((p) => p.id === reglages.paquet);
  if (reglages.paquet === TOUS) {
    // Tous les paquets ensemble : un personnage présent dans deux paquets ne compte qu'une fois.
    const vus = new Set();
    actifs = [...PAR_CLE.values()].filter((p) => !vus.has(p.id) && vus.add(p.id));
  } else {
    actifs = (paquet || paquets[0] || { personnages: [] }).personnages;
    if (!paquet && paquets[0]) reglages.paquet = paquets[0].id;
  }
}

async function chargerPaquets() {
  const fournis = [];
  for (const id of PAQUETS_FOURNIS) {
    try {
      const reponse = await fetch(`packs/${id}.json`);
      fournis.push(Paquets.normaliser(await reponse.json()));
    } catch (e) { situation.erreur = `packs/${id}.json : ${e.message || e}`; }
  }
  rangerPaquets(fournis);
}

function afficherPaquets() {
  const menu = $("paquet");
  menu.textContent = "";
  for (const p of paquets) menu.append(new Option(`${dansLaLangue(p.nom)} (${p.personnages.length})`, p.id));
  menu.append(new Option(dire("tousLesPaquets"), TOUS));
  menu.value = reglages.paquet;
  const courant = paquets.find((p) => p.id === reglages.paquet);
  $("retirer-paquet").hidden = !(courant && courant.importe);
}

function annoncerPaquet(texte, alerte) {
  const zone = $("paquet-message");
  zone.textContent = texte;
  zone.hidden = !texte;
  zone.dataset.ton = alerte ? "alerte" : "";
}

// Change de paquet : tout le monde reçoit une voix du nouveau paquet, sauf ceux
// qui ont choisi la leur eux-mêmes.
function changerDePaquet(id) {
  reglages.paquet = id;
  choisirActifs();
  for (const nom of ordreNoms) {
    const fiche = distribution[nom];
    fiche.manuel = false;
    fiche.perso = fiche.souhait && PAR_CLE.has(fiche.souhait) ? fiche.souhait : "";
  }
  for (const nom of [...ordreNoms].reverse()) if (!distribution[nom].perso) distribution[nom].perso = tirerAuSort(nom, distribution[nom].genre);
  enregistrer();
  toutReafficher();
  if (mode !== "arret" && ouvrier) precharger();
}

// Ajoute un paquet lu dans un fichier choisi (ou déposé) par l'auditeur.
async function ajouterPaquet(fichier) {
  try {
    if (fichier.size > 4000000) throw new Error("the file is too big (4 MB at most)");
    let brut;
    try { brut = JSON.parse(await fichier.text()); } catch (_) { throw new Error("the file is not valid JSON"); }
    const paquet = Paquets.normaliser(brut, { importe: true });
    paquetsAjoutes = paquetsAjoutes.filter((p) => (Paquets.simplifier(p.id) || "") !== Paquets.simplifier(paquet.id)).concat([brut]);   // même identifiant : on remplace
    await chrome.storage.local.set({ pingPaquets: paquetsAjoutes });
    rangerPaquets(paquets.filter((p) => !p.importe));
    const ajoute = paquets.filter((p) => p.importe).pop();
    annoncerPaquet(dire("paquetAjoute", dansLaLangue(paquet.nom), paquet.personnages.length) + (paquet.alertes.length ? " " + dire("paquetAlertes", paquet.alertes.slice(0, 3).join(" ; ")) : ""));
    changerDePaquet(ajoute ? ajoute.id : reglages.paquet);
  } catch (e) {
    annoncerPaquet(dire("paquetRefuse", fichier.name, e.message || String(e)), true);
  }
}

async function retirerPaquet() {
  const courant = paquets.find((p) => p.id === reglages.paquet && p.importe);
  if (!courant) return;
  paquetsAjoutes = paquetsAjoutes.filter((brut) => brut !== courant.brut);
  await chrome.storage.local.set({ pingPaquets: paquetsAjoutes });
  rangerPaquets(paquets.filter((p) => !p.importe));
  annoncerPaquet(dire("paquetRetire", dansLaLangue(courant.nom)));
  changerDePaquet(PAQUETS_FOURNIS[0]);
}

// --- Distribution : qui parle avec quelle voix ------------------------------------
function enregistrer() {
  chrome.storage.local.set({ pingReglages: reglages, pingDistribution: { fiches: distribution, ordre: ordreNoms } });
}

// Tire un personnage au sort dans le paquet en service, du genre voulu s'il est connu, en évitant ceux déjà pris.
function tirerAuSort(saufNom, genre, eviter) {
  const pris = new Set(Object.entries(distribution).filter(([nom]) => nom !== saufNom).map(([, f]) => f.perso));
  const duGenre = actifs.filter((p) => (!genre || p.genre === genre) && p.cle !== eviter);
  const libres = duGenre.filter((p) => !pris.has(p.cle));
  const choix = libres.length ? libres : duGenre.length ? duGenre : actifs;
  return choix.length ? choix[Math.floor(Math.random() * choix.length)].cle : "";
}

// Le personnage d'une fiche (s'il a disparu avec son paquet, on en retire un).
function persoDe(nom) {
  const fiche = distribution[nom];
  if (!PAR_CLE.has(fiche.perso)) fiche.perso = tirerAuSort(nom, fiche.genre);
  return PAR_CLE.get(fiche.perso);
}

function connaitre(nom) {
  if (!distribution[nom]) {
    const genre = reglages.genre ? Genre.deviner(nom) : null;    // "h", "f", ou null si le prénom ne dit rien
    const fiche = distribution[nom] = { perso: "", muet: false, genre, manuel: false, souhait: null };
    // Une étiquette dans le pseudo (« Camille [ogre] ») vaut choix de sa propre voix.
    const etiquette = RE_ETIQUETTE.exec(nom);
    if (etiquette && RE_REFUS.test(etiquette[1].trim())) fiche.refus = true;       // « Camille [off] » : ne pas la lire
    const voulu = etiquette && !fiche.refus && Paquets.chercher(etiquette[1], actifs, [...PAR_CLE.values()]);
    if (voulu) fiche.souhait = fiche.perso = voulu.cle;
    else fiche.perso = tirerAuSort(nom, genre);
    ordreNoms.unshift(nom);
    if (ordreNoms.length > 200) {
      // On oublie le plus ancien, mais jamais quelqu'un qui a choisi sa voix ou demandé à ne pas être lu :
      // un seul message doit suffire, pour de bon.
      let i = ordreNoms.length - 1;
      while (i > 0 && (distribution[ordreNoms[i]].refus || distribution[ordreNoms[i]].souhait)) i--;
      delete distribution[ordreNoms.splice(i, 1)[0]];
    }
    enregistrer();
    afficherDistribution();
  }
  return distribution[nom];
}

// « !voice ogre » : la personne choisit sa voix. C'est son premier choix ; l'auditeur garde le dernier mot.
// Renvoie vrai si le message est une telle commande (elle n'est alors pas lue à voix haute).
function noterSouhait(message) {
  const m = RE_COMMANDE.exec(String(message.texte || "").trim());
  if (!m) return false;
  const nom = cleNom(message.auteur);
  if (!nom) return true;
  const fiche = connaitre(nom);
  // « !voice off » : la personne ne veut pas être lue ; « !voice on » : elle veut bien de nouveau.
  const refus = RE_REFUS.test(m[1].trim()) ? true : RE_RETOUR.test(m[1].trim()) ? false : null;
  if (refus !== null) {
    if (!!fiche.refus !== refus) {
      fiche.refus = refus;
      if (refus) annuler([...enAttente.values()].filter((r) => r.auteur === nom && !r.apercu).map((r) => r.id));
      enregistrer();
      afficherDistribution();
    }
    return true;
  }
  const voulu = Paquets.chercher(m[1], actifs, [...PAR_CLE.values()]);
  const souhait = voulu ? voulu.cle : null;
  if (!voulu && !/^(random|none|reset|hasard|aucune?)$/i.test(m[1].trim())) return true;   // nom inconnu : on ne touche à rien
  if (fiche.souhait !== souhait) {
    fiche.souhait = souhait;
    if (!fiche.manuel) fiche.perso = souhait || tirerAuSort(nom, fiche.genre);
    enregistrer();
    afficherDistribution();
  }
  return true;
}

const cleNom = (auteur) => String(auteur || "").trim().slice(0, 60);

function changerGenre(nom) {
  const fiche = distribution[nom];
  fiche.genre = fiche.genre === "h" ? "f" : "h";
  fiche.manuel = true;
  if (persoDe(nom).genre !== fiche.genre) fiche.perso = tirerAuSort(nom, fiche.genre);
  enregistrer();
  afficherDistribution();
}

function remplirMenu(choix, nom) {
  const fiche = distribution[nom];
  choix.textContent = "";
  const souhait = fiche.souhait && PAR_CLE.get(fiche.souhait);
  if (souhait) choix.append(new Option(dire("sonChoix", nomDe(souhait)), "@" + souhait.cle));
  for (const [genre, titre] of [["h", "voixMasculines"], ["f", "voixFeminines"]]) {
    const groupe = document.createElement("optgroup");
    groupe.label = dire(titre);
    for (const p of actifs.filter((q) => q.genre === genre)) groupe.append(new Option(nomDe(p), p.cle));
    choix.append(groupe);
  }
  const courant = PAR_CLE.get(fiche.perso);
  if (courant && !actifs.includes(courant) && !(souhait === courant && !fiche.manuel)) {
    const groupe = document.createElement("optgroup");
    groupe.label = dire("autrePaquet");
    groupe.append(new Option(nomDe(courant), courant.cle));
    choix.append(groupe);
  }
  choix.dataset.souhait = fiche.souhait || "";
}

function afficherDistribution() {
  afficherTroupe();
  const liste = $("distribution");
  $("vide").hidden = ordreNoms.length > 0;
  $("redistribuer").hidden = ordreNoms.length === 0;
  for (const [nom, ligne] of lignes) {
    if (!distribution[nom]) { ligne.remove(); lignes.delete(nom); }
  }
  ordreNoms.forEach((nom, rang) => {
    let ligne = lignes.get(nom);
    const fiche = distribution[nom];
    const perso = persoDe(nom);
    if (!perso) return;
    if (!ligne) {
      ligne = $("modele-ligne").content.firstElementChild.cloneNode(true);
      ligne.querySelector(".nom-texte").textContent = nom;
      ligne.querySelector(".nom").title = nom;
      const choix = ligne.querySelector(".choix");
      choix.setAttribute("aria-label", dire("personnageDe", nom));
      choix.addEventListener("change", () => {
        const f = distribution[nom];
        if (choix.value.startsWith("@")) { f.perso = choix.value.slice(1); f.manuel = false; }   // retour au choix de la personne
        else { f.perso = choix.value; f.manuel = true; }
        f.genre = PAR_CLE.get(f.perso).genre;
        enregistrer();
        afficherDistribution();
      });
      ligne.querySelector(".genre").addEventListener("click", () => changerGenre(nom));
      const ecouter = ligne.querySelector(".ecouter");
      ecouter.title = dire("ecouter");
      ecouter.setAttribute("aria-label", dire("ecouter"));
      ecouter.addEventListener("click", () => apercu(persoDe(nom)));
      ligne.querySelector(".muet").addEventListener("click", () => {
        distribution[nom].muet = !distribution[nom].muet;
        enregistrer();
        afficherDistribution();
      });
      lignes.set(nom, ligne);
    }
    const choix = ligne.querySelector(".choix");
    if (choix.dataset.souhait !== (fiche.souhait || "") || !choix.options.length || ![...choix.options].some((o) => o.value === fiche.perso)) remplirMenu(choix, nom);
    const parSonChoix = !!fiche.souhait && fiche.souhait === fiche.perso && !fiche.manuel;
    choix.value = parSonChoix ? "@" + fiche.perso : fiche.perso;
    const etoile = ligne.querySelector(".etoile");
    etoile.hidden = !parSonChoix;
    etoile.title = dire("voixChoisie");
    if (ligne.dataset.perso !== fiche.perso) {
      ligne.dataset.perso = fiche.perso;
      ligne.querySelector(".tete").replaceChildren(Icones.image(perso, 40));
    }
    const genre = ligne.querySelector(".genre");
    genre.textContent = SYMBOLE_GENRE[fiche.genre] || "?";
    genre.title = dire(fiche.genre === "h" ? "genreH" : fiche.genre === "f" ? "genreF" : "genreInconnu");
    genre.setAttribute("aria-label", genre.title);
    ligne.dataset.muet = String(!!(fiche.muet || fiche.refus));
    ligne.dataset.refus = String(!!fiche.refus);
    const muet = ligne.querySelector(".muet");
    muet.setAttribute("aria-pressed", String(!!(fiche.muet || fiche.refus)));
    muet.disabled = !!fiche.refus;          // la personne a demandé à ne pas être lue : ce n'est pas à l'auditeur d'en décider
    muet.title = dire(fiche.refus ? "refus" : fiche.muet ? "relire" : "nePasLire");
    muet.setAttribute("aria-label", muet.title);
    if (liste.children[rang] !== ligne) liste.insertBefore(ligne, liste.children[rang] || null);
  });
}

// --- La bande ------------------------------------------------------------------------
const comparer = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0); // identifiants = grands nombres

function ajouterALaBande(message) {
  let i = bande.length;
  while (i > 0 && comparer(bande[i - 1].id, message.id) > 0) i--;
  if (i > 0 && bande[i - 1].id === message.id) return false;
  const commande = noterSouhait(message);
  bande.splice(i, 0, { id: message.id, auteur: message.auteur, texte: message.texte, commande });
  if (bande.length > 3000) bande.splice(0, bande.length - 3000);
  return true;
}

function viderLaBande() {
  bande = [];
  dernierId = envoyeId = null;
  auBout = true;
}

function changerDeSalon(salon) {
  if (!salon || salon === salonBande) return false;
  rattrapage = false;
  annulerTout();
  viderLaBande();
  salonBande = salon;
  if (mode === "lecture") mode = "direct";
  return true;
}

// Position du dernier message lu dans la bande (bande.length si on est au bord du direct).
function position() {
  if (dernierId === null) return auBout ? bande.length : -1;
  const i = bande.findIndex((m) => m.id === dernierId);
  return i < 0 ? bande.length : i;
}

async function demanderDiscord(type, donnees) {
  if (ongletDiscord === null) return null;
  try {
    return await chrome.tabs.sendMessage(ongletDiscord, { type, ...donnees });
  } catch (_) {
    return null;
  }
}

// Récupère auprès de Discord tous les messages actuellement chargés dans la page.
async function rafraichirBande() {
  const reponse = await demanderDiscord("ping:liste");
  if (!reponse || !Array.isArray(reponse.messages)) return;
  changerDeSalon(reponse.salon);
  for (const message of reponse.messages) ajouterALaBande(message);
  situation.discord = { titre: nettoyerTitre(reponse.titre), messagesVisibles: reponse.messages.length };
  if (situation.discord.titre) { situation.source = situation.discord.titre; afficherSource(); }
}

// --- Les messages déjà lus ------------------------------------------------------------------
// Pour chaque salon, on retient les messages dont la lecture a commencé. « Play » propose
// alors de rattraper ceux qu'on n'a jamais entendus, s'ils ont moins d'un jour.
const UN_JOUR_MS = 24 * 3600 * 1000;
const JOUES_PAR_SALON = 400, SALONS_RETENUS = 40;
let joues = new Map();            // salon -> ensemble d'identifiants de messages
let enregistrementJoues = 0;
// L'heure d'un message se lit dans son identifiant (c'est ainsi que Discord les numérote).
const dateDuMessage = (id) => { try { return Number(BigInt(id) >> 22n) + 1420070400000; } catch (_) { return Date.now(); } };
const dejaJoue = (salon, id) => { const serie = joues.get(salon); return !!serie && serie.has(id); };
const tropVieux = (id) => dateDuMessage(id) < Date.now() - UN_JOUR_MS;

function noterJoue(salon, id) {
  if (!salon || !id) return;
  const serie = joues.get(salon) || new Set();
  joues.delete(salon);            // le salon repasse en dernier : c'est le plus récemment lu
  serie.delete(id);
  serie.add(id);
  joues.set(salon, serie);
  clearTimeout(enregistrementJoues);
  enregistrementJoues = setTimeout(() => {
    const garde = {};
    for (const [s, ids] of [...joues].slice(-SALONS_RETENUS)) garde[s] = [...ids].slice(-JOUES_PAR_SALON);
    chrome.storage.local.set({ pingJoues: garde });
  }, 300);
}

// Les messages du salon affiché qu'on n'a jamais lus (lisibles, et de moins d'un jour).
function nonLus() {
  if (!salonBande) return [];
  return bande.filter((m) => !dejaJoue(salonBande, m.id) && !tropVieux(m.id) && estLisible(m));
}

// Ceux que « Play » lirait maintenant : tous au repos ; après une pause, ceux qui suivent.
function aRattraper() {
  const liste = nonLus();
  if (mode !== "pause") return liste;
  const ici = position();
  return liste.filter((m) => bande.indexOf(m) > ici);
}

// Lit d'abord les messages jamais lus, dans l'ordre, puis passe au direct.
function rattraper() {
  const liste = nonLus();
  if (!liste.length) return;
  const i = bande.indexOf(liste[0]);
  rattrapage = true;
  mode = "lecture";
  auBout = false;
  dernierId = envoyeId = i > 0 ? bande[i - 1].id : null;
  afficherEtat();
  avancer();
}

// Au repos, on regarde de temps en temps ce que Discord affiche, pour compter les nouveaux messages.
async function sonder() {
  if (mode !== "arret" || document.visibilityState !== "visible") return;
  await rafraichirBande();
  if (mode === "arret") afficherEtat();
}
setInterval(proteger(sonder), 5000);

// --- État affiché -------------------------------------------------------------------------
function afficherEtat() {
  const etat = $("etat");
  const rang = Math.min(position() + 1, bande.length), total = bande.length;
  let texte, alerte = false;
  if (situation.erreur) { texte = dire("etatErreur", situation.erreur); alerte = true; }
  else if (situation.sonBloque && mode !== "arret") { texte = dire("etatSonBloque"); alerte = true; }
  else if (situation.telechargement) texte = dire("etatTelechargement", nomDesVoix(situation.telechargement.voix), situation.telechargement.pourcent);
  else if (mode === "arret") texte = dire("etatRepos");
  else if (mode === "lecture" && rattrapage && situation.pret) texte = dire("etatRattrapage", nonLus().length);
  else if (!situation.pret) texte = dire("etatPreparation");
  else if (ongletDiscord === null && !situation.ongletsDiscord) { texte = dire("etatSansDiscord"); alerte = true; }
  else if (situation.discord && !situation.discord.messagesVisibles && !total) { texte = dire("etatSansMessages"); alerte = true; }
  else if (situation.debut) texte = dire("etatDebut");
  else if (mode === "lecture") texte = dire("etatRelecture", rang, total);
  else if (mode === "pause") texte = rang >= 1 && dernierId ? dire("etatPause", rang, total) : dire("etatPauseSimple");
  else if (situation.trop) texte = dire("etatTrop");
  else if (situation.source) texte = dire("etatDirect", situation.source);
  else texte = dire("etatDirectSimple");
  etat.textContent = texte;
  etat.dataset.ton = alerte ? "alerte" : "";

  const enMarche = mode === "direct" || mode === "lecture";
  document.body.dataset.mode = mode;
  $("scene").dataset.ouvert = String(mode !== "arret");
  $("lecture").setAttribute("aria-pressed", String(enMarche));
  $("lecture-texte").textContent = dire(enMarche ? "pause" : "lecture");
  // « Play », et dessous le nombre de messages jamais lus qu'il va rattraper.
  const nouveaux = enMarche ? 0 : aRattraper().length;
  $("lecture-nouveaux").textContent = nouveaux ? dire(nouveaux === 1 ? "unNouveau" : "nouveaux", nouveaux) : "";
  $("lecture-nouveaux").hidden = !nouveaux;
  if (mode === "arret" && nouveaux && !situation.erreur) etat.textContent = dire(nouveaux === 1 ? "etatReposUnNouveau" : "etatReposNouveaux", nouveaux);
  $("arret").disabled = mode === "arret";
  $("suivant").disabled = mode === "arret";
  $("direct").hidden = !(mode === "lecture" || mode === "pause");
}

// Sous le logo, rideaux fermés : « with #salon | serveur ».
function afficherSource() {
  const zone = $("source");
  zone.textContent = situation.source ? dire("avec", situation.source) : "";
  zone.hidden = !situation.source;
}

// « en_US-libritts_r-medium » → « American voices ».
function nomDesVoix(fichier) {
  return dire(fichier.startsWith("en_US") ? "voixAmericaines" : fichier.startsWith("en_GB") ? "voixBritanniques" : "voixFrancaises");
}

// La troupe qui patiente sur scène quand personne ne parle : les personnages des gens du fil
// (les plus récents d'abord), complétés par d'autres du paquet pour que la scène ne soit jamais vide.
let troupeAffichee = "";
function afficherTroupe() {
  const vus = new Set(), liste = [];
  for (const nom of ordreNoms) {
    const fiche = distribution[nom], p = fiche && PAR_CLE.get(fiche.perso);
    if (!p || fiche.muet || fiche.refus || vus.has(p.cle)) continue;
    vus.add(p.cle);
    liste.push({ p, nom });
    if (liste.length >= 6) break;
  }
  for (const p of actifs) {
    if (liste.length >= 5) break;
    if (!vus.has(p.cle)) { vus.add(p.cle); liste.push({ p, nom: "" }); }
  }
  const cle = reglages.interface + "|" + liste.map(({ p, nom }) => `${p.cle}=${nom}`).join("|");
  if (cle === troupeAffichee) return;
  troupeAffichee = cle;
  $("troupe").replaceChildren(...liste.map(({ p, nom }, rang) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "comedien";
    bouton.style.setProperty("--rang", rang);
    bouton.title = nom ? `${nom} — ${nomDe(p)}` : nomDe(p);
    bouton.setAttribute("aria-label", bouton.title);
    bouton.dataset.perso = p.cle;
    bouton.append(Icones.image(p, 52));
    bouton.addEventListener("click", proteger(() => apercu(p)));
    return bouton;
  }));
}

function montrer(replique) {
  surScene = replique ? replique.id : null;
  $("scene").dataset.parle = String(!!replique);
  const perso = replique && PAR_CLE.get(replique.perso);
  $("masque").replaceChildren(...(perso ? [Icones.image(perso, 76)] : []));
  $("qui").textContent = replique ? replique.auteur : "";
  $("quoi").textContent = replique ? Emojis.afficher(replique.texte) : dire("enAttente");
  if (!replique) afficherTroupe();
  for (const [nom, ligne] of lignes) ligne.dataset.parle = String(!!replique && !replique.apercu && nom === replique.auteur);
}

// --- Son ---------------------------------------------------------------------------------
async function preparerSon() {
  if (!contexte) {
    contexte = new AudioContext({ sampleRate: Effets.FREQ, latencyHint: "interactive" });
    gain = contexte.createGain();
    gain.connect(contexte.destination);
    chargerEffets();
  }
  gain.gain.value = reglages.volume;
  if (contexte.state === "running") return;
  // Le navigateur ne laisse sortir le son qu'après un geste dans le panneau. Lancé
  // par le raccourci clavier depuis un autre onglet, il faut parfois un clic ici.
  contexte.resume().catch(() => {});
  await new Promise((suite) => setTimeout(suite, 250));
  situation.sonBloque = contexte.state !== "running";
  if (situation.sonBloque) {
    const debloquer = () => {
      contexte.resume().then(() => { situation.sonBloque = false; afficherEtat(); }).catch(() => {});
      removeEventListener("pointerdown", debloquer, true);
      removeEventListener("keydown", debloquer, true);
    };
    addEventListener("pointerdown", debloquer, true);
    addEventListener("keydown", debloquer, true);
  }
}

// Met un son à la suite de ce qui est déjà prévu ; renvoie l'instant où il commencera.
function programmerTampon(tampon, id, niveau, pause) {
  const source = contexte.createBufferSource();
  source.buffer = tampon;
  if (niveau === 1) source.connect(gain);
  else {
    const volume = contexte.createGain();
    volume.gain.value = niveau;
    source.connect(volume);
    volume.connect(gain);
  }
  const depart = Math.max(contexte.currentTime + 0.03, prochainDepart);
  source.start(depart);
  prochainDepart = depart + tampon.duration + pause;
  source.repliqueId = id;
  sources.add(source);
  source.onended = () => { sources.delete(source); if (id) terminerSiFini(id); };
  return depart;
}

function programmer(echantillons, id) {
  const tampon = contexte.createBuffer(1, echantillons.length, Effets.FREQ);
  tampon.copyToChannel(echantillons, 0);
  return programmerTampon(tampon, id, 1, 0.04);
}

// Les effets sonores des émojis (dossier effets/) : chargés une fois, dès que le son est prêt.
function chargerEffets() {
  for (const nom of Emojis.sons) {
    if (tamponsEffet.has(nom)) continue;
    tamponsEffet.set(nom, null);
    fetch(`effets/${nom}.wav`)
      .then((reponse) => (reponse.ok ? reponse.arrayBuffer() : Promise.reject(new Error(String(reponse.status)))))
      .then((octets) => contexte.decodeAudioData(octets))
      .then((tampon) => tamponsEffet.set(nom, tampon))
      .catch(() => { /* effet absent : l'émoji passera en silence */ });
  }
}

// L'effet sonore d'un émoji, à sa place entre deux passages de voix.
function programmerEffet(nom, id) {
  const tampon = tamponsEffet.get(nom);
  if (!tampon) return Math.max(contexte.currentTime, prochainDepart);
  prochainDepart += 0.06;   // un souffle entre la voix et l'effet
  return programmerTampon(tampon, id, NIVEAU_EFFET, 0.1);
}

// Les indicatifs : un petit motif d'une seconde, joué quand un personnage prend
// la parole. Ils sont chargés à l'avance, dès qu'on sait qu'un personnage va parler.
function demanderIndicatif(personnage) {
  const cle = personnage.indicatif;
  if (!cle || !contexte || tamponsIndicatif.has(cle)) return;
  tamponsIndicatif.set(cle, null);
  fetch(cle.startsWith("data:") ? cle : `indicatifs/${cle}.wav`)
    .then((reponse) => (reponse.ok ? reponse.arrayBuffer() : Promise.reject(new Error(String(reponse.status)))))
    .then((octets) => contexte.decodeAudioData(octets))
    .then((tampon) => { if (tampon.duration <= 3) tamponsIndicatif.set(cle, tampon); })
    .catch(() => { /* pas d'indicatif pour ce personnage : on s'en passe */ });
}

// Faut-il annoncer cette réplique par l'indicatif de son personnage ?
// Oui pour un aperçu, quand la parole change de bouche, et après un long silence.
function annoncer(replique) {
  if (!reglages.indicatifs) return null;
  const perso = PAR_CLE.get(replique.perso);
  const tampon = perso && tamponsIndicatif.get(perso.indicatif);
  if (!tampon) return null;
  const silence = contexte.currentTime - prochainDepart;
  if (!replique.apercu && replique.auteur === dernierOrateur && silence < SILENCE_AVANT_INDICATIF) return null;
  return programmerTampon(tampon, replique.id, NIVEAU_INDICATIF, 0.08);
}

// Le fond sonore du personnage : quelques petits sons pendant la réplique,
// qui s'effacent à la fin (ou tout de suite si la lecture est interrompue).
function ouvrirAmbiance(replique, depart) {
  const niveau = reglages.ambiance * AMBIANCE_MAX;
  const perso = PAR_CLE.get(replique.perso);
  if (!(niveau > 0) || !perso) return;
  if (!tamponsAmbiance.has(perso.cle)) {
    const boucle = Ambiances.creer(perso.ambiance);
    let tampon = null;
    if (boucle) {
      tampon = contexte.createBuffer(1, boucle.echantillons.length, boucle.frequence);
      tampon.copyToChannel(boucle.echantillons, 0);
    }
    tamponsAmbiance.set(perso.cle, tampon);
  }
  if (!tamponsAmbiance.get(perso.cle)) return;
  const source = contexte.createBufferSource();
  source.buffer = tamponsAmbiance.get(perso.cle);
  source.loop = true;
  const fondu = contexte.createGain();
  fondu.gain.setValueAtTime(0, depart);
  fondu.gain.linearRampToValueAtTime(niveau, depart + 0.35);
  source.connect(fondu);
  fondu.connect(gain);
  // La boucle est prise en route à un endroit au hasard : pas deux fois le même enchaînement.
  source.start(depart, Math.random() * source.buffer.duration);
  replique.ambiance = { source, fondu, niveau, fermee: false };
  ambiances.add(source);
  source.onended = () => ambiances.delete(source);
}

function fermerAmbiance(replique, quand) {
  const a = replique.ambiance;
  if (!a || a.fermee) return;
  a.fermee = true;   // on garde la référence : une pause doit pouvoir la couper net
  const fin = Math.max(quand, contexte.currentTime);
  try {
    a.fondu.gain.cancelScheduledValues(fin);
    a.fondu.gain.setValueAtTime(a.niveau, fin);
    a.fondu.gain.linearRampToValueAtTime(0, fin + 0.5);
    a.source.stop(fin + 0.55);
  } catch (_) { /* déjà arrêtée */ }
}

function terminerSiFini(id) {
  const replique = enAttente.get(id);
  if (!replique || !replique.synthesee) return;
  for (const s of sources) if (s.repliqueId === id) return; // il reste du son à jouer
  enAttente.delete(id);
  if (surScene === id) montrer(null);
  situation.trop = false;
  if (replique.pasAPas && !enAttente.size) demanderDiscord("ping:ranger");
  afficherEtat();
  avancer();
}

function annuler(ids) {
  if (!ids.length) return;
  if (ouvrier) ouvrier.postMessage({ type: "annuler", ids });
  for (const id of ids) {
    const replique = enAttente.get(id);
    if (replique && replique.ambiance) couperAmbiance(replique.ambiance.source);
    enAttente.delete(id);
    for (const s of [...sources]) {
      if (s.repliqueId === id) { s.onended = null; try { s.stop(); } catch (_) { /* déjà fini */ } sources.delete(s); }
    }
    if (surScene === id) montrer(null);
  }
  if (contexte && !sources.size) prochainDepart = contexte.currentTime;
}

function couperAmbiance(source) {
  try { source.stop(); } catch (_) { /* déjà arrêtée */ }
  ambiances.delete(source);
}

function annulerTout() {
  annuler([...enAttente.keys()]);
  for (const source of [...ambiances]) couperAmbiance(source);   // plus aucun fond sonore ne traîne
  dernierOrateur = null;
  envoyeId = dernierId;
}

// --- L'ouvrier de synthèse -------------------------------------------------------------------
function demarrerOuvrier() {
  if (ouvrier) return;
  ouvrier = new Worker("moteur/ouvrier.js");
  ouvrier.onmessage = ({ data }) => {
    if (data.type === "telechargement") {
      situation.telechargement = data.fini ? null
        : { voix: data.voix, pourcent: Math.floor((100 * data.recu) / Math.max(1, data.total)) };
      afficherEtat();
    } else if (data.type === "voix") {
      situation.voix = data.noms; // voix actuellement en mémoire
    } else if (data.type === "pret") {
      situation.pret = true;
      situation.erreur = "";
      afficherEtat();
    } else if (data.type === "morceau" || data.type === "effet") {
      const replique = enAttente.get(data.id);
      if (!replique || !contexte) return;
      // L'indicatif passe avant la voix. Un message fait seulement d'émojis reste léger : ni indicatif, ni fond sonore.
      const annonce = data.premier && !replique.sansVoix ? annoncer(replique) : null;
      const depart = data.type === "effet" ? programmerEffet(data.nom, data.id) : programmer(data.echantillons, data.id);
      if (data.premier) {
        replique.commence = true;
        if (!replique.apercu && !replique.sansVoix) dernierOrateur = replique.auteur;
        if (!replique.sansVoix) ouvrirAmbiance(replique, depart);
        if (replique.messageId) { dernierId = replique.messageId; noterJoue(replique.salon, replique.messageId); }
        setTimeout(() => {
          if (!enAttente.has(data.id)) return;
          montrer(replique);
          if (replique.historique) demanderDiscord("ping:montrer", { id: replique.messageId });
          afficherEtat();
        }, Math.max(0, ((annonce ?? depart) - contexte.currentTime) * 1000));
      }
    } else if (data.type === "fin") {
      const replique = enAttente.get(data.id);
      if (!replique) return;
      replique.synthesee = true;
      situation.pret = true;
      fermerAmbiance(replique, prochainDepart);
      if (data.morceaux) prochainDepart += 0.25; // un temps entre deux répliques
      terminerSiFini(data.id);
      avancer();
    } else if (data.type === "erreur") {
      situation.erreur = data.message;
      situation.telechargement = null;
      afficherEtat();
    }
  };
  ouvrier.onerror = (e) => { situation.erreur = e.message || "ouvrier"; afficherEtat(); };
}

// Ce que l'ouvrier a besoin de savoir d'un personnage pour le faire parler.
const pourOuvrier = (p) => ({ voix: p.voix, genre: p.genre, hauteur: p.hauteur, debit: p.debit, expressivite: p.expressivite, volume: p.volume, queue: p.queue, effets: p.effets });

function precharger() {
  situation.pret = false;
  ouvrier.postMessage({ type: "precharger", langue: reglages.langue, personnages: actifs.map((p) => ({ voix: p.voix, genre: p.genre })) });
}

function mettreEnFile(replique) {
  if (contexte && contexte.state !== "running") contexte.resume().catch(() => {});
  if (mode === "direct" && !replique.apercu) {
    if (contexte && prochainDepart - contexte.currentTime > RETARD_MAX_S) {
      situation.trop = true;
      afficherEtat();
      return;
    }
    const pasCommencees = [...enAttente.values()].filter((r) => !r.commence && !r.apercu);
    if (pasCommencees.length >= FILE_MAX) annuler([pasCommencees[0].id]);
  }
  const perso = PAR_CLE.get(replique.perso);
  if (!perso) return;
  demanderIndicatif(perso);
  enAttente.set(replique.id, replique);
  situation.erreur = "";
  ouvrier.postMessage({ type: "dire", id: replique.id, texte: replique.texte, langue: replique.langue, perso: pourOuvrier(perso) });
  afficherEtat();
}

// Prépare la réplique d'un message : voix de la personne, langue, texte prononçable.
// Renvoie null s'il n'y a rien à dire (personne en sourdine, message sans texte,
// adresse web toute seule, commande « !voice »).
function preparer(message, options) {
  const nom = cleNom(message.auteur);
  if (!nom || message.commande || RE_COMMANDE.test(String(message.texte || "").trim())) return null;
  const fiche = connaitre(nom);
  if (fiche.muet || fiche.refus) return null;
  const perso = persoDe(nom);
  if (!perso) return null;
  const langue = Texte.devinerLangue(message.texte, reglages.langue);
  let texte = Texte.nettoyer(message.texte, langue, 0, { emojis: reglages.emojis });
  if (!texte) return null;
  // Un message fait seulement d'émojis sonores : on joue les effets, personne ne parle.
  const sansVoix = !Emojis.decouper(texte, langue).some((p) => p.texte);
  if (reglages.tics && !sansVoix) texte = avecTic(texte, perso, langue, message.id);
  return { id: `${message.id}#${++compteur}`, messageId: message.id, auteur: nom, texte, langue, perso: perso.cle, sansVoix, salon: salonBande, ...options };
}

async function apercu(p) {
  if (!p) return;
  await preparerSon();
  demarrerOuvrier();
  const langue = reglages.langue;
  mettreEnFile({
    id: `apercu-${++compteur}`, apercu: true, auteur: nomDe(p),
    texte: APERCU[langue].replace("{role}", p.role[langue] || p.role.en), langue, perso: p.cle,
  });
}

// --- Relecture des anciens messages -----------------------------------------------------------
// En mode « lecture », on confie les messages à la synthèse deux par deux,
// dans l'ordre, jusqu'à rattraper le direct.
let avanceEnCours = false;
async function avancer() {
  if (mode !== "lecture" || avanceEnCours) return;
  avanceEnCours = true;
  try {
    let dejaRafraichi = false;
    while (mode === "lecture" && [...enAttente.values()].filter((r) => !r.apercu).length < 2) {
      const dernierEnvoye = envoyeId === null ? (auBout ? bande.length : -1) : bande.findIndex((m) => m.id === envoyeId);
      const i = dernierEnvoye + 1;
      if (i >= bande.length) {
        if (!dejaRafraichi) { dejaRafraichi = true; await rafraichirBande(); continue; }
        if (!enAttente.size) await passerAuDirect();
        break;
      }
      envoyeId = bande[i].id;
      auBout = false;
      if (rattrapage && (dejaJoue(salonBande, bande[i].id) || tropVieux(bande[i].id))) continue;
      const replique = preparer(bande[i], { historique: true });
      if (replique) mettreEnFile(replique);
    }
  } finally {
    avanceEnCours = false;
  }
}

async function passerAuDirect() {
  rattrapage = false;
  annulerTout();
  mode = "direct";
  situation.debut = false;
  await demanderDiscord("ping:direct");
  await rafraichirBande();
  dernierId = envoyeId = bande.length ? bande[bande.length - 1].id : null;
  auBout = true;
  afficherEtat();
}

// Lit un seul message de la bande (retour en arrière ou avance pas à pas).
function lireUnSeul(i) {
  dernierId = envoyeId = bande[i].id;
  auBout = false;
  const replique = preparer(bande[i], { historique: true, pasAPas: true });
  if (replique) mettreEnFile(replique);
  afficherEtat();
}

async function reculer() {
  if (mode === "arret") await activer("pause");
  rattrapage = false;
  annulerTout();
  mode = "pause";
  await rafraichirBande();
  let i = position() - 1;
  while (i >= 0 && !estLisible(bande[i])) i--;
  if (i < 0) {
    // Plus rien de chargé au-dessus : on montre le plus ancien pour que Discord en charge d'autres.
    situation.debut = true;
    if (bande.length) demanderDiscord("ping:montrer", { id: bande[0].id });
    afficherEtat();
    return;
  }
  situation.debut = false;
  lireUnSeul(i);
}

async function suivant() {
  if (mode === "arret") return;
  annulerTout();
  situation.debut = false;
  if (mode === "lecture") { avancer(); afficherEtat(); return; }
  if (mode === "pause") {
    await rafraichirBande();
    let i = position() + 1;
    while (i < bande.length && !estLisible(bande[i])) i++;
    if (i < bande.length) lireUnSeul(i);
    else await passerAuDirect();
    return;
  }
  afficherEtat();
}

async function depuisLeDebut() {
  if (mode === "arret") await activer("pause");
  rattrapage = false;
  annulerTout();
  await rafraichirBande();
  if (!bande.length) { afficherEtat(); return; }
  situation.debut = false;
  dernierId = envoyeId = null;
  auBout = false;
  mode = "lecture";
  afficherEtat();
  avancer();
}

function estLisible(message) {
  if (message.commande) return false;
  const fiche = distribution[cleNom(message.auteur)];
  if (fiche && (fiche.muet || fiche.refus)) return false;
  return !!Texte.nettoyer(message.texte, reglages.langue, 0, { emojis: reglages.emojis });
}

async function lectureOuPause() {
  if (mode === "arret") { await activer("direct"); rattraper(); return; }
  if (mode === "direct" || mode === "lecture") {
    mode = "pause";
    annulerTout();
    afficherEtat();
    return;
  }
  // Reprise après une pause : on rejoue la suite, ou on retourne au direct s'il n'y en a pas.
  situation.debut = false;
  await rafraichirBande();
  if (position() >= bande.length - 1) { await passerAuDirect(); return; }
  mode = "lecture";
  afficherEtat();
  avancer();
}

// --- Messages venus de Discord ---------------------------------------------------------------
function recevoir(message) {
  if (mode === "arret") return;
  changerDeSalon(message.salon);
  if (!ajouterALaBande(message)) return;
  if (mode !== "direct") { afficherEtat(); return; }
  const replique = preparer(bande.find((m) => m.id === message.id) || message, {});
  if (replique) mettreEnFile(replique);
}

chrome.runtime.onMessage.addListener((message, expediteur, repondre) => {
  if (!message || typeof message.type !== "string" || !message.type.startsWith("ping:")) return;
  if (message.type === "ping:commande") {            // un raccourci clavier, relayé par fond.js
    if (expediteur.tab) return;
    const action = { lecture: lectureOuPause, precedent: reculer, suivant: suivant }[message.commande];
    if (action) proteger(action)();
    repondre({ recu: true });
    return;
  }
  if (!expediteur.tab) return;
  if (ongletDiscord === null) ongletDiscord = expediteur.tab.id;
  if (expediteur.tab.id !== ongletDiscord) return;    // un autre onglet Discord : ce n'est pas lui qu'on lit
  if (message.type === "ping:message") recevoir(message);
  if (message.type === "ping:etat") {
    situation.discord = { titre: nettoyerTitre(message.titre), messagesVisibles: message.messagesVisibles };
    if (situation.discord.titre) { situation.source = situation.discord.titre; afficherSource(); }
    if (mode !== "arret" && changerDeSalon(message.salon)) rafraichirBande().then(afficherEtat);
    afficherEtat();
  }
});

// « (3) Discord | #dart-600-26 | MDes » ou « #dart-600-26 | MDes - Discord » → « #dart-600-26 | MDes ».
function nettoyerTitre(titre) {
  return String(titre || "").replace(/^\(\d+\+?\)\s*/, "").replace(/^[•●]\s*/, "")
    .replace(/^Discord\s*[|–-]\s*/i, "").replace(/\s*[|–-]\s*Discord\s*$/i, "").replace(/^Discord$/i, "").trim().slice(0, 80);
}

// --- L'onglet Discord qu'on lit ---------------------------------------------------------------
// C'est l'onglet Discord affiché dans cette fenêtre ; à défaut, le dernier utilisé.
// Son titre (« #salon | serveur ») est suivi en permanence : pas besoin de recharger Discord.
async function suivreDiscord() {
  let onglets = [], devant = [];
  try {
    onglets = await chrome.tabs.query({ url: ADRESSES_DISCORD });
    devant = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (_) { /* pas d'accès aux onglets */ }
  situation.ongletsDiscord = onglets.length;
  const choisi = onglets.find((o) => devant.some((d) => d.id === o.id))
    || onglets.find((o) => o.id === ongletDiscord)
    || onglets.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  const change = (choisi ? choisi.id : null) !== ongletDiscord;
  ongletDiscord = choisi ? choisi.id : null;
  const titre = choisi ? nettoyerTitre(choisi.title) : "";
  const autreSalon = titre !== situation.source;
  situation.source = titre;
  afficherSource();
  if (mode !== "arret" && (change || autreSalon)) {
    if (change) { annulerTout(); viderLaBande(); salonBande = null; situation.discord = null; }
    await rafraichirBande();
  } else if (mode === "arret" && (change || autreSalon)) {
    if (change) { viderLaBande(); salonBande = null; }
    await rafraichirBande();
  }
  afficherEtat();
}

// Met le script de lecture en place dans les onglets Discord déjà ouverts
// (ceux ouverts avant l'installation ou la mise à jour de l'extension).
async function brancherDiscord() {
  let onglets = [];
  try { onglets = await chrome.tabs.query({ url: ADRESSES_DISCORD }); } catch (_) { /* pas d'accès aux onglets */ }
  for (const onglet of onglets) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: onglet.id }, files: ["contenu.js"] });
    } catch (_) { /* onglet non accessible */ }
  }
  await suivreDiscord();
}

const estDiscord = (adresse) => /^https:\/\/([\w-]+\.)?discord\.com\//.test(adresse || "");
let suiviPrevu = 0;
const suivreBientot = (delai) => { clearTimeout(suiviPrevu); suiviPrevu = setTimeout(proteger(suivreDiscord), delai); };
try {
  chrome.tabs.onUpdated.addListener((id, changement, onglet) => {
    if (id !== ongletDiscord && !estDiscord(onglet && onglet.url)) return;
    if (changement.title !== undefined || changement.url !== undefined || changement.status === "complete") suivreBientot(120);
  });
  chrome.tabs.onActivated.addListener(() => suivreBientot(60));
  chrome.tabs.onRemoved.addListener((id) => { if (id === ongletDiscord) suivreBientot(60); });
} catch (_) { /* pas d'accès aux onglets */ }

// --- Marche / arrêt -------------------------------------------------------------------------------
async function activer(modeInitial) {
  await preparerSon();
  demarrerOuvrier();
  mode = modeInitial;
  situation.discord = null;
  situation.trop = situation.debut = false;
  viderLaBande();
  salonBande = null;
  const maintenant = Date.now();
  await chrome.storage.local.set({ pingActifDepuis: maintenant, pingBattement: maintenant });
  battement = setInterval(() => chrome.storage.local.set({ pingBattement: Date.now() }), 15000);
  montrer(null);
  programmer(Effets.jingle(false), null);
  precharger();
  afficherEtat();
  await brancherDiscord();
  await rafraichirBande();
  afficherEtat();
}

function arreter() {
  if (mode === "arret") return;
  mode = "arret";
  rattrapage = false;
  clearInterval(battement);
  chrome.storage.local.set({ pingActifDepuis: 0, pingBattement: 0 });
  annulerTout();
  demanderDiscord("ping:ranger");
  situation.telechargement = null;
  situation.debut = false;
  afficherEtat();
  setTimeout(proteger(sonder), 400);
}

$("lecture").addEventListener("click", proteger(lectureOuPause));
$("reculer").addEventListener("click", proteger(reculer));
$("suivant").addEventListener("click", proteger(suivant));
$("debut").addEventListener("click", proteger(depuisLeDebut));
$("direct").addEventListener("click", proteger(passerAuDirect));
$("arret").addEventListener("click", arreter);
$("volume").addEventListener("input", (e) => {
  reglages.volume = Number(e.target.value) / 100;
  if (gain) gain.gain.value = reglages.volume;
  enregistrer();
});
$("ambiance").addEventListener("input", (e) => { reglages.ambiance = Number(e.target.value) / 100; enregistrer(); });

const INTERRUPTEURS = ["indicatifs", "tics", "emojis", "genre"];
function afficherInterrupteurs() {
  for (const cle of INTERRUPTEURS) {
    $(cle).checked = !!reglages[cle];
  }
}
for (const cle of INTERRUPTEURS) {
  $(cle).addEventListener("change", (e) => { reglages[cle] = e.target.checked; afficherInterrupteurs(); enregistrer(); });
}
$("langue").addEventListener("change", (e) => {
  reglages.langue = e.target.value === "fr" ? "fr" : "en";
  enregistrer();
  if (mode !== "arret") { precharger(); afficherEtat(); }
});
$("redistribuer").addEventListener("click", () => {
  for (const nom of ordreNoms) {
    const fiche = distribution[nom];
    fiche.manuel = false;
    fiche.perso = fiche.souhait && PAR_CLE.has(fiche.souhait) ? fiche.souhait : "";
  }
  for (const nom of [...ordreNoms].reverse()) if (!distribution[nom].perso) distribution[nom].perso = tirerAuSort(nom, distribution[nom].genre);
  enregistrer();
  afficherDistribution();
});
$("paquet").addEventListener("change", (e) => { annoncerPaquet(""); changerDePaquet(e.target.value); });
$("ajouter-paquet").addEventListener("click", () => $("fichier-paquet").click());
$("fichier-paquet").addEventListener("change", async (e) => {
  for (const fichier of e.target.files) await ajouterPaquet(fichier);
  e.target.value = "";
});
$("retirer-paquet").addEventListener("click", proteger(retirerPaquet));
// On peut aussi déposer le fichier d'un paquet n'importe où dans le panneau.
addEventListener("dragover", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
addEventListener("drop", async (e) => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return;
  e.preventDefault();
  for (const fichier of e.dataTransfer.files) await ajouterPaquet(fichier);
});
addEventListener("pagehide", () => {
  chrome.storage.local.set({ pingActifDepuis: 0, pingBattement: 0 });
});

// --- L'œil de l'icône suit le pointeur ------------------------------------------------------------
// On dit au service de fond dans quelle direction regarder ; l'icône de l'extension est au-dessus du panneau.
let dernierRegard = "";
function regarder(angle, portee) {
  const cle = angle === null ? "repos" : `${Math.round(angle / (Math.PI / 12))}/${Math.round(portee * 2)}`;
  if (cle === dernierRegard) return;
  dernierRegard = cle;
  try { chrome.runtime.sendMessage({ type: "ping:regard", angle, portee }).catch(() => {}); } catch (_) { /* extension rechargée */ }
}
addEventListener("pointermove", (e) => {
  const dx = e.clientX - innerWidth * 0.5, dy = e.clientY + 60;
  regarder(Math.atan2(dy, dx), Math.min(1, Math.hypot(dx, dy) / 300));
}, { passive: true });
document.documentElement.addEventListener("pointerleave", () => regarder(null, 1));

// --- Démarrage ---------------------------------------------------------------------------------------
(async () => {
  const garde = await chrome.storage.local.get(["pingReglages", "pingDistribution", "pingPaquets", "pingJoues"]);
  for (const [salon, ids] of Object.entries(garde.pingJoues || {})) if (Array.isArray(ids)) joues.set(salon, new Set(ids));
  const anciens = garde.pingReglages;
  if (anciens) reglages = { ...reglages, ...anciens };
  // Réglages gardés d'une version précédente : les nouveaux réglages de départ s'appliquent une fois
  // (paquet « The cast » ; et, pour les plus anciens, devinette du genre allumée).
  const aRajeunir = !!anciens && (anciens.version || 0) < VERSION_REGLAGES;
  if (aRajeunir) reglages = { ...reglages, version: VERSION_REGLAGES, paquet: PAQUETS_FOURNIS[0], ...((anciens.version || 0) < 6 ? { genre: true } : {}) };
  paquetsAjoutes = Array.isArray(garde.pingPaquets) ? garde.pingPaquets : [];
  await chargerPaquets();
  if (garde.pingDistribution) {
    distribution = garde.pingDistribution.fiches || {};
    ordreNoms = (garde.pingDistribution.ordre || []).filter((nom) => distribution[nom]);
    // Fiches gardées d'une autre version : personnages disparus, genre absent.
    for (const nom of ordreNoms) {
      const fiche = distribution[nom];
      if (fiche.genre === undefined) fiche.genre = Genre.deviner(nom);
      if (!PAR_CLE.has(fiche.perso)) fiche.perso = PAR_CLE.has(`cast/${fiche.perso}`) ? `cast/${fiche.perso}` : tirerAuSort(nom, fiche.genre);
    }
  }
  if (aRajeunir) {
    choisirActifs();
    for (const nom of ordreNoms) {
      const fiche = distribution[nom];
      if (fiche.genre === null || fiche.genre === undefined) fiche.genre = Genre.deviner(nom);
      if (!(fiche.souhait && fiche.souhait === fiche.perso)) { fiche.manuel = false; fiche.perso = ""; }
    }
    for (const nom of [...ordreNoms].reverse()) if (!distribution[nom].perso) distribution[nom].perso = tirerAuSort(nom, distribution[nom].genre);
    enregistrer();
  }
  chrome.storage.local.set({ pingActifDepuis: 0, pingBattement: 0 });
  $("volume").value = Math.round(reglages.volume * 100);
  $("ambiance").value = Math.round(reglages.ambiance * 100);
  $("langue").value = reglages.langue;
  traduire();
  toutReafficher();
  brancherDiscord().then(sonder).catch(() => {});
  // Le raccourci clavier a ouvert le panneau : on démarre comme demandé.
  chrome.storage.session.get("pingCommande").then(({ pingCommande }) => {
    if (!pingCommande) return;
    chrome.storage.session.remove("pingCommande");
    if (Date.now() - pingCommande < 5000 && mode === "arret") proteger(lectureOuPause)();
  }).catch(() => {});
})();

// --- Raccourcis clavier ---------------------------------------------------------------------------
// Dans le panneau : Maj+Espace (lecture / pause), Maj+flèches (message précédent / suivant).
addEventListener("keydown", (e) => {
  if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
  const action = e.code === "Space" ? lectureOuPause : e.code === "ArrowLeft" ? reculer : e.code === "ArrowRight" ? suivant : null;
  if (!action) return;
  e.preventDefault();
  proteger(action)();
});
// Un bouton qui a le focus ne doit pas, en plus, se déclencher au relâchement de la barre d'espace.
addEventListener("keyup", (e) => { if (e.shiftKey && e.code === "Space") e.preventDefault(); });

// Rappel des raccourcis, avec celui qui marche depuis n'importe quel onglet (réglable dans Chrome).
let tourRaccourcis = 0;
function afficherRaccourcis() {
  const zone = $("raccourcis"), tour = ++tourRaccourcis;
  const maj = dire("toucheMaj");
  // Les raccourcis réglés dans Chrome marchent partout ; à défaut, ceux du panneau.
  const lignes = [
    ["play-pause", `${maj}+${dire("toucheEspace")}`, "raccourciLecture"],
    ["previous-message", `${maj}+←`, "raccourciPrecedent"],
    ["next-message", `${maj}+→`, "raccourciSuivant"],
  ];
  const montrerLignes = (commandes) => {
    if (tour !== tourRaccourcis) return;      // la langue a changé entre-temps
    const regles = Object.fromEntries(commandes.map((c) => [c.name, c.shortcut]));
    zone.replaceChildren(...lignes.flatMap(([nom, secours, texte]) => {
      const touche = document.createElement("dt"), action = document.createElement("dd"), k = document.createElement("kbd");
      k.textContent = regles[nom] || secours;
      touche.append(k);
      action.textContent = dire(texte);
      return [touche, action];
    }));
  };
  montrerLignes([]);
  try {
    chrome.commands.getAll().then(montrerLignes).catch(() => {});
  } catch (_) { /* pas d'accès aux raccourcis */ }
}
document.querySelectorAll("[data-interface]").forEach((bouton) => {
  bouton.addEventListener("click", () => changerInterface(bouton.dataset.interface));
});
