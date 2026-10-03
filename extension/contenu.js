/* Script de contenu : repère les messages affichés par Discord et les
 * transmet au panneau de l'extension, uniquement quand la lecture est
 * activée. Il n'envoie rien à personne et n'agit pas sur le compte : il lit
 * ce qui est déjà à l'écran, comme un lecteur d'écran. Pendant la relecture
 * d'anciens messages, il fait défiler Discord jusqu'au message lu et
 * l'entoure d'un trait.
 */
(() => {
  "use strict";
  // Déjà en place dans cet onglet ? On ne s'installe pas deux fois. Mais si l'extension a
  // été rechargée ou mise à jour, l'ancien script est sourd : on le remplace, sans qu'il
  // faille recharger Discord.
  const vivant = () => { try { return !!chrome.runtime.id; } catch (_) { return false; } };
  if (window.__pingShow && window.__pingShow.vivant()) return;
  if (window.__pingShow) { try { window.__pingShow.arreter(); } catch (_) { /* déjà arrêté */ } }

  const REPERE_CODE = "⟦code⟧";
  const REPERE_SPOILER = "⟦spoiler⟧";
  const STABILISATION_MS = 1500;   // temps laissé à Discord pour afficher un salon
  const BATTEMENT_MAX_MS = 150000; // sans nouvelles du panneau, on se tait
  const ANCIENNETE_MAX_MS = 10 * 60 * 1000;
  const EPOQUE_DISCORD = 1420070400000n;

  let actifDepuis = 0;
  let battement = 0;
  let observateur = null;
  let salonCourant = null;
  let stableApres = 0;
  const dernierVu = new Map(); // salon -> identifiant du message le plus récent déjà vu
  const vus = new Set();
  const recents = [];

  const estActif = () => actifDepuis > 0 && Date.now() - battement < BATTEMENT_MAX_MS;

  function envoyer(message) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {});
    } catch (_) {
      fermer(); // l'extension a été rechargée : ce script n'a plus d'interlocuteur
    }
  }

  // --- Lecture d'un message ---------------------------------------------------
  function decouper(element) {
    const m = /^chat-messages-(\d+)-(\d+)$/.exec(element.id || "");
    return m ? { salon: m[1], id: m[2] } : null;
  }

  function dateDuMessage(id) {
    try { return Number((BigInt(id) >> 22n) + EPOQUE_DISCORD); } catch (_) { return 0; }
  }

  function nomDepuis(etiquette) {
    if (!etiquette) return "";
    const nom = etiquette.querySelector('[class*="username"]') || etiquette;
    return (nom.textContent || "").trim();
  }

  function auteurDe(element, id) {
    // 1. Le message porte lui-même le nom (premier message d'un groupe).
    let nom = nomDepuis(element.querySelector(`[id="message-username-${id}"]`));
    if (nom) return nom;
    // 2. Message groupé : il renvoie au nom affiché plus haut.
    const article = element.querySelector("[aria-labelledby]");
    const renvoi = article && (article.getAttribute("aria-labelledby") || "")
      .split(/\s+/).find((x) => x.startsWith("message-username-"));
    nom = renvoi ? nomDepuis(document.getElementById(renvoi)) : "";
    if (nom) return nom;
    // 3. Un nom dans l'en-tête du message, hors citation.
    nom = nomDepuis([...element.querySelectorAll('h3 [class*="username"]')].find(HORS_CITATION));
    if (nom) return nom;
    // 4. À défaut, on remonte jusqu'au dernier nom affiché.
    for (let e = element.previousElementSibling, n = 0; e && n < 60; e = e.previousElementSibling, n++) {
      nom = nomDepuis(e.querySelector('[id^="message-username-"]'));
      if (nom) return nom;
    }
    return "";
  }

  const HORS_CITATION = (e) => !e.closest('[id^="message-reply-context-"]');

  function texteDe(element, id) {
    // Le texte du message lui-même, pas celui du message cité au-dessus.
    const contenu = element.querySelector(`[id="message-content-${id}"]`)
      || [...element.querySelectorAll('[id^="message-content-"], [class*="messageContent"]')].find(HORS_CITATION);
    if (!contenu) return "";
    const copie = contenu.cloneNode(true);
    copie.querySelectorAll("pre").forEach((e) => e.replaceWith(` ${REPERE_CODE} `));
    copie.querySelectorAll('[class*="spoilerContent"]:not([aria-expanded="true"])')
      .forEach((e) => e.replaceWith(` ${REPERE_SPOILER} `));
    // Un émoji est une image : on garde son nom (« 😂 » ou « :nom: »), il deviendra un petit effet sonore.
    copie.querySelectorAll('img.emoji, img[data-type="emoji"], img[class*="emoji"]').forEach((e) => {
      const nom = (e.getAttribute("alt") || e.getAttribute("data-name") || e.getAttribute("aria-label") || "").trim();
      e.replaceWith(nom && nom.length <= 40 ? ` ${nom} ` : " ");
    });
    copie.querySelectorAll('img, time, svg, [class*="edited"], [class*="timestamp"], [class*="hiddenVisually"]')
      .forEach((e) => e.remove());
    copie.querySelectorAll("br, div, li, blockquote, h1, h2, h3")
      .forEach((e) => e.append("\n"));
    return (copie.textContent || "").trim();
  }

  function extraire(element) {
    const repere = decouper(element);
    if (!repere) return null;
    const texte = texteDe(element, repere.id);
    if (!texte) return null;
    const auteur = auteurDe(element, repere.id);
    if (!auteur) return null;
    return { ...repere, auteur, texte };
  }

  // --- Qu'est-ce qu'un « nouveau » message ? ----------------------------------
  // Discord ajoute aussi des messages à la page quand on change de salon ou
  // qu'on remonte l'historique. On ne lit qu'un message jamais vu, arrivé une
  // fois l'affichage du salon posé, et qui est soit plus récent que tout ce
  // qu'on a vu dans ce salon, soit le tout dernier de la liste.
  function plusRecent(a, b) {
    try { return BigInt(a) > BigInt(b); } catch (_) { return false; }
  }

  function estDernier(element) {
    for (let e = element.nextElementSibling; e; e = e.nextElementSibling) {
      if (decouper(e)) return false;
    }
    return true;
  }

  function noter(repere, element) {
    if (vus.size > 6000) vus.clear();
    vus.add(repere.id);
    // Un message en cours d'envoi porte un numéro provisoire : il ne sert pas de repère.
    if (element && element.querySelector('[class*="isSending"]')) return;
    const connu = dernierVu.get(repere.salon);
    if (!connu || plusRecent(repere.id, connu)) dernierVu.set(repere.salon, repere.id);
  }

  function traiter(element) {
    const repere = decouper(element);
    if (!repere) return;
    const maintenant = Date.now();

    // Un message de l'autre conversation affichée à côté : on le note, on ne le lit pas.
    const voulu = salonDeLAdresse();
    if (voulu && repere.salon !== voulu && estALEcran(voulu)) { noter(repere, element); return; }

    if (repere.salon !== salonCourant) {
      salonCourant = repere.salon;
      stableApres = maintenant + STABILISATION_MS;
      for (const delai of [200, STABILISATION_MS + 100]) setTimeout(signalerEtat, delai);
    }
    const dejaVu = vus.has(repere.id);
    const connu = dernierVu.get(repere.salon);
    const enTete = !connu || plusRecent(repere.id, connu);
    if (!dejaVu) noter(repere, element);

    if (!estActif() || maintenant < stableApres || dejaVu) return;
    if (!enTete && !estDernier(element)) return;
    const date = dateDuMessage(repere.id);
    if (date && maintenant - date > ANCIENNETE_MAX_MS) return;

    const message = extraire(element);
    if (!message) return;

    // Un message qu'on envoie apparaît deux fois (en cours d'envoi, puis confirmé).
    const cle = message.auteur + "\u0000" + message.texte;
    if (recents.some((r) => r.cle === cle && maintenant - r.date < 60000)) return;
    recents.push({ cle, date: maintenant });
    if (recents.length > 40) recents.shift();

    envoyer({ type: "ping:message", ...message });
  }

  function parcourir(noeud) {
    if (noeud.nodeType !== 1) return;
    if (noeud.id && noeud.id.startsWith("chat-messages-")) { traiter(noeud); return; }
    if (noeud.firstElementChild) {
      noeud.querySelectorAll('[id^="chat-messages-"]').forEach(traiter);
    }
  }

  // --- Marche / arrêt -----------------------------------------------------------
  function messagesVisibles() {
    return document.querySelectorAll('li[id^="chat-messages-"], [id^="chat-messages-"][class*="message"]');
  }

  // Le fil qu'on lit. Discord peut afficher deux conversations à la fois (un salon et,
  // à côté, un fil ouvert) : celle qu'on lit est celle de l'adresse de la page, le fil
  // s'il y en a un. À défaut, c'est la conversation qui a le plus de messages à l'écran.
  function salonDeLAdresse() {
    const m = /\/channels\/[^/]+\/(\d+)(?:\/threads\/(\d+))?/.exec(location.pathname);
    return m ? (m[2] || m[1]) : null;
  }
  const estALEcran = (salon) => !!document.querySelector(`[id^="chat-messages-${salon}-"]`);

  function salonAffiche() {
    const voulu = salonDeLAdresse();
    if (voulu && estALEcran(voulu)) return voulu;
    const comptes = new Map();
    for (const e of messagesVisibles()) {
      const repere = decouper(e);
      if (repere) comptes.set(repere.salon, (comptes.get(repere.salon) || 0) + 1);
    }
    let meilleur = null, nombre = 0;
    for (const [salon, n] of comptes) if (n > nombre) { meilleur = salon; nombre = n; }
    return meilleur || voulu || salonCourant;
  }

  function signalerEtat() {
    if (!estActif()) return;
    envoyer({
      type: "ping:etat",
      salon: salonAffiche(),
      titre: document.title,
      messagesVisibles: listeDesMessages().messages.length,
    });
  }

  // Discord change de salon sans recharger la page : on guette l'adresse, et on
  // prévient le panneau tout de suite, puis une fois les messages affichés.
  let adresse = location.pathname, guet = null;
  function guetter() {
    if (location.pathname === adresse) return;
    adresse = location.pathname;
    stableApres = Date.now() + STABILISATION_MS;
    for (const delai of [250, 900, STABILISATION_MS + 150]) setTimeout(signalerEtat, delai);
  }

  function demarrer() {
    if (observateur) return;
    // Tout ce qui est déjà à l'écran est considéré comme vu.
    messagesVisibles().forEach((e) => {
      const repere = decouper(e);
      if (repere) { noter(repere, e); salonCourant = repere.salon; }
    });
    stableApres = Date.now() + 500;
    observateur = new MutationObserver((mutations) => {
      for (const mutation of mutations) mutation.addedNodes.forEach(parcourir);
    });
    observateur.observe(document.body, { childList: true, subtree: true });
    adresse = location.pathname;
    guet = setInterval(guetter, 400);
    signalerEtat();
  }

  function arreter() {
    if (observateur) observateur.disconnect();
    observateur = null;
    clearInterval(guet);
    desentourer();
  }

  // --- Anciens messages : liste, repérage, retour au direct ---------------------
  function listeDesMessages() {
    const messages = [], salon = salonAffiche();
    messagesVisibles().forEach((e) => {
      const message = extraire(e);
      if (message && message.salon === salon) messages.push(message);
    });
    return { salon, titre: document.title, messages };
  }

  let entoure = null;
  function desentourer() {
    if (entoure) entoure.style.outline = entoure.style.outlineOffset = entoure.style.borderRadius = "";
    entoure = null;
  }

  function montrer(id) {
    desentourer();
    const element = id && document.querySelector(`[id^="chat-messages-"][id$="-${id}"]`);
    if (!element) return false;
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.style.outline = "2px solid #ff7a3d";
    element.style.outlineOffset = "-2px";
    element.style.borderRadius = "6px";
    entoure = element;
    return true;
  }

  // Revient en bas de la conversation, là où arrivent les nouveaux messages.
  function allerAuDirect() {
    desentourer();
    const bouton = document.querySelector('[class*="jumpToPresentBar"] button');
    if (bouton) { bouton.click(); return; }
    const liste = document.querySelector('[data-list-id="chat-messages"]');
    for (let e = liste; e && e !== document.body; e = e.parentElement) {
      if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) {
        e.scrollTop = e.scrollHeight;
        return;
      }
    }
  }

  function repondre(message, _expediteur, reponse) {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "ping:liste") reponse(listeDesMessages());
    else if (message.type === "ping:montrer") reponse({ trouve: montrer(message.id) });
    else if (message.type === "ping:direct") { allerAuDirect(); reponse({}); }
    else if (message.type === "ping:ranger") { desentourer(); reponse({}); }
  }

  function appliquer(etat) {
    actifDepuis = Number(etat.pingActifDepuis) || 0;
    battement = Number(etat.pingBattement) || 0;
    if (estActif()) demarrer(); else arreter();
  }

  // --- L'œil de l'icône suit le pointeur -----------------------------------------
  // On indique seulement une direction au service de fond de l'extension (rien ne
  // sort du navigateur) : l'icône est dans la barre d'outils, en haut à droite.
  let dernierRegard = "";
  function regarder(angle, portee) {
    const cle = angle === null ? "repos" : `${Math.round(angle / (Math.PI / 12))}/${Math.round(portee * 2)}`;
    if (cle === dernierRegard) return;
    dernierRegard = cle;
    if (!vivant()) { fermer(); return; }
    envoyer({ type: "ping:regard", angle, portee });
  }
  const surPointeur = (e) => {
    const dx = e.clientX - (innerWidth - 110), dy = e.clientY + 55;
    regarder(Math.atan2(dy, dx), Math.min(1, Math.hypot(dx, dy) / 500));
  };
  const surSortie = () => regarder(null, 1);
  addEventListener("pointermove", surPointeur, { passive: true });
  document.documentElement.addEventListener("pointerleave", surSortie);

  // Tout retirer (quand une version plus récente du script prend la relève).
  function fermer() {
    arreter();
    removeEventListener("pointermove", surPointeur);
    document.documentElement.removeEventListener("pointerleave", surSortie);
  }
  window.__pingShow = { vivant, arreter: fermer };

  try {
    chrome.storage.local.get(["pingActifDepuis", "pingBattement"]).then(appliquer);
    chrome.runtime.onMessage.addListener(repondre);
    chrome.storage.onChanged.addListener((changements, zone) => {
      if (zone !== "local") return;
      if (!("pingActifDepuis" in changements) && !("pingBattement" in changements)) return;
      appliquer({
        pingActifDepuis: "pingActifDepuis" in changements ? changements.pingActifDepuis.newValue : actifDepuis,
        pingBattement: "pingBattement" in changements ? changements.pingBattement.newValue : battement,
      });
    });
  } catch (_) { /* extension rechargée */ }
})();
