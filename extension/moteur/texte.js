/* Préparation du texte : rendre un message Discord lisible à voix haute,
 * et deviner s'il est en français ou en anglais.
 *
 * Ce qui ne se dit pas est retiré sans un mot : adresses web, courriels,
 * chemins de fichiers, identifiants, blocs de code, texte masqué. Un message
 * qui ne contient rien d'autre n'est pas lu du tout.
 *
 * Les émojis ne se lisent pas non plus : ils deviennent de petits effets
 * sonores (voir emojis.js), ou disparaissent si ce réglage est éteint.
 */
(function (racine) {
  "use strict";

  // Un message est lu en entier, quelle que soit sa longueur (Discord en limite lui-même
  // la taille à quelques milliers de caractères) ; ce plafond n'est qu'un garde-fou.
  const MAX_CARACTERES = 8000;
  const LANGUES = ["fr", "en"];

  // Le script de contenu remplace ce qui ne se lit pas par ces repères.
  const REPERE_CODE = "⟦code⟧";
  const REPERE_SPOILER = "⟦spoiler⟧";

  const MOTS = {
    fr: { suite: "et cetera" },
    en: { suite: "and so on" },
  };

  // Abréviations de clavardage, développées pour que la voix les prononce bien.
  const ABREVIATIONS = {
    fr: {
      mdr: "mort de rire", ptdr: "pété de rire", jsp: "je sais pas", stp: "s'il te plaît",
      svp: "s'il vous plaît", pk: "pourquoi", pq: "pourquoi", tkt: "t'inquiète", bcp: "beaucoup",
      dsl: "désolé", cad: "c'est-à-dire", rdv: "rendez-vous", qqn: "quelqu'un",
      qqch: "quelque chose", tjs: "toujours", tjrs: "toujours", pcq: "parce que",
      ajd: "aujourd'hui", slt: "salut", bjr: "bonjour", jpp: "j'en peux plus",
    },
    en: {
      idk: "I don't know", imo: "in my opinion", imho: "in my humble opinion", btw: "by the way",
      tbh: "to be honest", afaik: "as far as I know", iirc: "if I recall correctly",
      brb: "be right back", thx: "thanks", pls: "please", plz: "please", omg: "oh my god",
      ngl: "not gonna lie", fwiw: "for what it's worth", wdyt: "what do you think",
      lgtm: "looks good to me",
    },
  };

  const RE_BLOC_CODE = /```[\s\S]*?```/g;
  const RE_CODE = /`([^`\n]*)`/g;
  const RE_SPOILER = /\|\|[\s\S]+?\|\|/g;
  const RE_LIEN_MD = /\[([^\]]+)\]\(https?:\/\/[^)]+\)/g;
  const RE_URL = /<?(?:https?|ftp):\/\/[^\s<>()]+>?/gi;
  // Adresses sans « http » : www.exemple.com, exemple.org/page, sous.domaine.net.
  const RE_DOMAINE = /(?<![\p{L}\p{N}@.])(?:www\.[\w-]+(?:\.[\w-]+)+|[\w-]+(?:\.[\w-]+)*\.(?:com|org|net|edu|gov)|[\w-]+(?:\.[\w-]+)+(?=\/))(?:\/\S*)?/giu;
  const RE_COURRIEL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const RE_DOI = /\b(?:doi:\s*)?10\.\d{4,9}\/\S+/gi;
  const RE_ARXIV = /\barxiv:\s*\d{4}\.\d{4,5}(?:v\d+)?/gi;
  // Chemins de fichiers : /usr/local/bin, ~/notes/a.txt, C:\\Users\\moi, dossier/sous/fichier.py
  const RE_CHEMIN = /(?<![\p{L}\p{N}])(?:~|\.{1,2})?(?:[\/\\][\w.@-]+){2,}[\/\\]?|(?<![\p{L}\p{N}])[A-Za-z]:\\\S+|(?<![\p{L}\p{N}\/])[\w.-]+(?:\/[\w.-]+){2,}/gu;
  // Identifiants : longues suites de lettres et de chiffres mêlés (clés, empreintes, numéros de message).
  const RE_IDENTIFIANT = /(?<![\p{L}\p{N}])(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z_-])[A-Za-z0-9_-]{16,}(?![\p{L}\p{N}])|(?<!\d)\d{12,}(?!\d)/gu;
  const RE_EMOJI_PERSO = /<a?:(\w+):\d+>/g;
  const RE_EMOJI_NOM = /:[A-Za-z_]\w{1,31}:/g;
  const RE_EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}‍︎️⃣]/gu;
  const RE_MARKDOWN = /[*_~]+/g;
  const RE_ESPACES = /[ \t ]+/g;
  const RE_REPETITION = /(.)\1{3,}/g;
  const RE_PONCTUATION = /([!?.,;:])\1+/g;

  function echapper(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Transforme le texte brut d'un message en texte prononçable.
  // Renvoie une chaîne vide si rien ne mérite d'être dit.
  // options.emojis : garder les émojis, sous forme de marques d'effets sonores.
  function nettoyer(texte, langue, limite, options) {
    const mots = MOTS[langue] || MOTS.fr;
    const Emojis = racine.PingEmojis;
    const effets = !!(Emojis && options && options.emojis);
    limite = limite || MAX_CARACTERES;
    let t = String(texte || "");
    t = t.split(REPERE_CODE).join(" ").split(REPERE_SPOILER).join(" ");
    t = t.replace(RE_BLOC_CODE, " ").replace(RE_SPOILER, " ");
    t = t.replace(RE_LIEN_MD, "$1");                 // d'un lien, on garde l'intitulé…
    t = t.replace(RE_URL, " ");                      // …jamais l'adresse
    t = t.replace(RE_COURRIEL, " ").replace(RE_DOI, " ").replace(RE_ARXIV, " ");
    t = t.replace(RE_DOMAINE, " ");
    t = t.replace(RE_EMOJI_PERSO, Emojis ? ":$1:" : " ");   // émoji de serveur : on n'en garde que le nom
    // Code dans le fil du texte : un mot simple se lit, le reste (appels, symboles) se tait.
    t = t.replace(RE_CODE, (_, code) => (/^[\p{L}\p{N}']+(?: [\p{L}\p{N}']+){0,2}$/u.test(code) && code.length <= 30 ? code : " "));
    t = t.replace(RE_CHEMIN, " ").replace(RE_IDENTIFIANT, " ");
    t = t.replace(/^\s*>+\s?/gm, "").replace(/^\s*#{1,3}\s+/gm, "").replace(/^\s*[-*•]\s+/gm, "");
    if (Emojis) t = Emojis.marquer(t, effets);         // chaque émoji devient la marque d'un effet sonore (ou disparaît)
    else t = t.replace(RE_EMOJI_NOM, " ");
    t = t.replace(RE_MARKDOWN, "");
    if (!Emojis) t = t.replace(RE_EMOJI, " ");
    t = t.replace(/[@#]/g, "");

    // Les retours à la ligne deviennent des pauses.
    t = t.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      .map((l) => (/[.!?:;,…]$/.test(l) ? l : l + "."))
      .join(" ");

    t = t.replace(RE_REPETITION, "$1$1$1");   // « nooooooon » -> « nooon »
    t = t.replace(RE_PONCTUATION, "$1");      // « !!!! » -> « ! »
    t = t.replace(RE_ESPACES, " ").trim();
    // La ponctuation qui suit un effet sonore passe devant lui : « fini 🎉. » se dit « fini. » puis l'effet.
    t = t.replace(/((?:\s*\uE000[a-z]+\uE001)+)\s*([.,;:!?…]+)/g, "$2$1");
    // Ce qui reste autour d'une adresse retirée : « voir : . », parenthèses vides, ponctuation orpheline.
    t = t.replace(/\(\s*\)|\[\s*\]|<\s*>/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/([,;:])(?=[.!?])/g, "")
      .replace(/([.!?])\s*[.,;:]+/g, "$1").replace(/^[\s.,;:!?-]+/, "").replace(RE_ESPACES, " ").trim();
    if (/[,;:]$/.test(t)) t = t.replace(/[\s,;:]+$/, "") + ".";

    const abrev = ABREVIATIONS[langue];
    if (abrev) {
      const motif = new RegExp("(?<![\\p{L}\\p{N}'])(" + Object.keys(abrev).map(echapper).join("|") + ")(?![\\p{L}\\p{N}'])", "giu");
      t = t.replace(motif, (m) => abrev[m.toLowerCase()]);
    }

    if (!/[\p{L}\p{N}]/u.test(t)) return "";

    if (t.length > limite) {
      let coupe = t.slice(0, limite);
      const fin = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf("! "), coupe.lastIndexOf("? "));
      if (fin > limite / 2) coupe = coupe.slice(0, fin + 1);
      else coupe = coupe.slice(0, coupe.lastIndexOf(" ")).replace(/[,;:]+$/, "") + "…";
      t = `${coupe.replace(/\uE000[a-z]*$/, "")} ${mots.suite}.`;
    }
    return t;
  }

  // --- Détection de langue : une liste de petits mots très fréquents ---------
  const INDICES = {
    fr: new Set(("le la les des du un une et est sont pas que qui je tu il elle on nous vous ils " +
      "elles ce cette ces mon ma mes ton ta tes son sa ses pour avec dans sur mais ou où " +
      "donc car très plus moins être avoir fait faire ça cela oui non merci bonjour salut " +
      "quoi comment pourquoi quand aussi alors bien tout tous toute comme si au aux en " +
      "j'ai c'est j'suis qu'il qu'on d'un d'une n'est y'a ai suis es").split(" ")),
    en: new Set(("the and is are was were of to in that it you for with this not have has had i we " +
      "they he she what how why when also then well all as if at on but or so do does " +
      "did be been can could would should will just from by an my your our their there " +
      "yes no thanks hello hi about which who it's i'm don't that's i've you're").split(" ")),
  };
  const ELISIONS = new Set(["j", "l", "d", "c", "n", "qu", "s", "m", "t"]);

  function scoreLangue(texte) {
    const bas = String(texte || "").toLowerCase().replace(/’/g, "'");
    const scores = { fr: 0, en: 0 };
    for (const mot of bas.match(/[a-zàâäçéèêëîïôöùûüÿœæ']+/g) || []) {
      for (const langue of LANGUES) if (INDICES[langue].has(mot)) scores[langue]++;
      if (mot.includes("'") && ELISIONS.has(mot.split("'")[0])) scores.fr++;
    }
    scores.fr += (bas.match(/[àâçéèêëîïôùûœ]/g) || []).length;
    return scores;
  }

  // Devine la langue d'un message ; retombe sur `defaut` si c'est trop serré.
  function devinerLangue(texte, defaut) {
    const s = scoreLangue(texte);
    if (s.fr - s.en >= 2) return "fr";
    if (s.en - s.fr >= 2) return "en";
    return defaut || "fr";
  }

  const api = { nettoyer, devinerLangue, scoreLangue, REPERE_CODE, REPERE_SPOILER, MAX_CARACTERES };
  racine.PingTexte = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
