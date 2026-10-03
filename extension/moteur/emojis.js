/* Les émojis deviennent des effets sonores.
 *
 * Un émoji ne se lit pas : à sa place dans le message, on entend ce qu'il
 * veut dire. Pour la plupart, c'est un vrai effet sonore (dossier effets/) :
 * des applaudissements pour 👏, un trombone triste pour 😢, un ronflement
 * pour 😴, une caisse enregistreuse pour 💰… Pour quelques émotions qui n'ont
 * pas de bruit à elles, c'est le personnage qui réagit d'un mot, avec sa
 * voix : « Hmm. » pour 🤔, « Oh! » pour 😮, « Oops! » pour 😅, « Yum! » pour 😋.
 *
 * Trois sortes d'émojis sont reconnues : les émojis ordinaires (😂), les
 * émojis de serveur désignés par leur nom (:pepe_laugh:), et les frimousses
 * tapées au clavier ( :)  ;)  :(  <3 ).
 *
 * Les personnages ne rient pas eux-mêmes : l'émoji qui rit joue un vrai rire
 * d'enfant, enregistré.
 */
(function (racine) {
  "use strict";

  // Dans le texte, un effet est noté entre deux caractères réservés : ⟨nom⟩.
  const DEBUT = "", FIN = "";
  const RE_MARQUE = /([a-z]+)/g;
  const MAX_PAR_MESSAGE = 5;

  // Les effets sonores : nom du fichier (effets/<nom>.wav) -> émoji montré à l'écran.
  const SONS = {
    rire: "😂", harpe: "🙂", clin: "😉", coeur: "❤️", triste: "😢", violon: "🥲", bebe: "😭", verre: "💔",
    tonnerre: "😠", censure: "🤬", theatre: "😱", boum: "🤯", bravo: "👍", tada: "🎉", non: "👎",
    applaudir: "👏", bouchon: "🍾", tchin: "🥂", feu: "🔥", fusee: "🚀", yeux: "👀", crane: "💀", cool: "😎", dodo: "😴",
    etoile: "✨", choc: "❗", sirene: "🚨", robot: "🤖", idee: "💡", prout: "💩", chasse: "🚽", fantome: "👻", orgue: "😈",
    grillons: "😐", choeur: "🙏", musique: "🎵", guitare: "🎸", piano: "🎹", saxo: "🎷", trompette: "🎺", tambour: "🥁",
    argent: "💰", degringolade: "🙃", boing: "🤪", vertige: "😵", vent: "💨", goutte: "💧", pluie: "🌧️", vagues: "🌊",
    verser: "☕", telephone: "📞", klaxon: "🚗", moteur: "🏎️", train: "🚂", helico: "🚁", cloche: "🔔", reveil: "⏰",
    horloge: "⏳", toc: "🚪", clavier: "💻", pas: "👣", atchoum: "🤧", toux: "😷", artifice: "🎆", chien: "🐶", chat: "🐱",
    coq: "🐓", poule: "🐔", cochon: "🐷", vache: "🐮", grenouille: "🐸", abeille: "🐝", mouton: "🐑", corbeau: "🐦‍⬛",
    oiseau: "🐦", cheval: "🐴", pop: "🫧",
  };

  // Les réactions dites par le personnage : émoji montré à l'écran, puis le mot dans chaque
  // langue (écrit comme il doit se prononcer : « Oupse », « Chute », « Beurque », « Mouah »).
  const MOTS = {
    surprise: ["😮", { en: "Oh!", fr: "Ho !" }],
    bisou: ["😘", { en: "Mouah!", fr: "Mouah !" }],
    hmm: ["🤔", { en: "Hmm.", fr: "Hum…" }],
    saispas: ["🤷", { en: "Who knows.", fr: "Va savoir." }],
    ohnon: ["🤦", { en: "Oh no.", fr: "Oh là là." }],
    miam: ["😋", { en: "Yum!", fr: "Miam !" }],
    hein: ["❓", { en: "Huh?", fr: "Hein ?" }],
    oups: ["😅", { en: "Oops!", fr: "Oupse !" }],
    aie: ["😬", { en: "Yikes!", fr: "Aïe aïe aïe." }],
    attendri: ["🥺", { en: "Aw.", fr: "Trop mignon." }],
    beurk: ["🤢", { en: "Yuck!", fr: "Beurque !" }],
    bof: ["🙄", { en: "Meh.", fr: "Bof." }],
    chut: ["🤫", { en: "Hush!", fr: "Chute !" }],
    coucou: ["👋", { en: "Yoo-hoo!", fr: "Coucou !" }],
    ouf: ["😮‍💨", { en: "Phew.", fr: "Ouf." }],
  };
  const connu = (nom) => Object.prototype.hasOwnProperty.call(SONS, nom) || Object.prototype.hasOwnProperty.call(MOTS, nom);

  // --- Quel effet pour quel émoji ? ----------------------------------------------------
  const SANS_VARIANTE = /[︎️\u{1F3FB}-\u{1F3FF}]/gu;
  const PAR_EMOJI = {};
  // Un émoji, avec ce qui peut le suivre (couleur de peau, variante, plusieurs émojis collés en un seul).
  const RE_UN_EMOJI = /\p{Extended_Pictographic}(?:[︎️⃣\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic})*/gu;
  const ranger = (nom, emojis) => { for (const c of emojis.match(RE_UN_EMOJI) || []) PAR_EMOJI[c.replace(SANS_VARIANTE, "")] = nom; };
  ranger("rire", "😂🤣😆😄😁😀😃😹😸");
  ranger("harpe", "🙂😊☺😌😺");
  ranger("clin", "😉😏😼");
  ranger("coeur", "❤♥🧡💛💚💙💜🖤🤍🤎💖💗💓💞💕💘💝😍🥰😻🫶💌🩷🩵🩶❤️‍🔥❤️‍🩹");
  ranger("bisou", "😘😗😙😚💋");
  ranger("triste", "😢☹🙁😞😔😟😥😿😩😫😓🥀");
  ranger("violon", "🥲🎻");
  ranger("bebe", "😭👶🍼");
  ranger("verre", "💔");
  ranger("tonnerre", "😠😡👿💢😾😤⚡🌩⛈");
  ranger("censure", "🤬");
  ranger("surprise", "😮😲😯😳😦😧🫢");
  ranger("theatre", "😱🙀😨😰");
  ranger("boum", "🤯💥💣🧨");
  ranger("bravo", "👍👌✅✔☑💯🆗🤝🤙");
  ranger("tada", "🎉🥳🎊🎈🎂🎁🏆🥇🎯💪🏅🎖");
  ranger("non", "👎❌✖🚫⛔🙅🛑");
  ranger("applaudir", "👏🙌");
  ranger("bouchon", "🍾");
  ranger("tchin", "🥂🍻🍷🍺🍸🍹");
  ranger("feu", "🔥🌶");
  ranger("fusee", "🚀🛸");
  ranger("yeux", "👀👁🫣🙈");
  ranger("crane", "💀☠⚰🪦");
  ranger("cool", "😎🕶");
  ranger("dodo", "😴💤🥱😪🛌");
  ranger("etoile", "✨⭐🌟💫🌠🔮🪄🤩");
  ranger("choc", "❗❕‼⁉⚠");
  ranger("sirene", "🚨🚓🚑🚒");
  ranger("robot", "🤖👾");
  ranger("idee", "💡🧠");
  ranger("prout", "💩");
  ranger("chasse", "🚽🧻");
  ranger("fantome", "👻🎃");
  ranger("orgue", "😈🧛🦇🕷🕸");
  ranger("grillons", "😐😑😶🫥🦗");
  ranger("choeur", "🙏😇👼");
  ranger("musique", "🎵🎶🎤🎧🎼");
  ranger("guitare", "🎸");
  ranger("piano", "🎹");
  ranger("saxo", "🎷");
  ranger("trompette", "🎺📯🫡");
  ranger("tambour", "🥁");
  ranger("argent", "💰💸💵🤑💲💶💷🪙");
  ranger("degringolade", "🙃🫠📉");
  ranger("boing", "🤪😜😝😛🤡");
  ranger("vertige", "😵🥴😵‍💫");
  ranger("vent", "💨🌬");
  ranger("goutte", "💧💦");
  ranger("pluie", "🌧☔");
  ranger("vagues", "🌊");
  ranger("verser", "☕🍵🫖🥛");
  ranger("telephone", "📞☎📱");
  ranger("klaxon", "🚗🚕🚙🚌");
  ranger("moteur", "🏎🏍");
  ranger("train", "🚂🚆🚄🚇");
  ranger("helico", "🚁");
  ranger("cloche", "🔔⛪");
  ranger("reveil", "⏰");
  ranger("horloge", "⏱⏲⌛⏳⌚🕐");
  ranger("toc", "🚪✊");
  ranger("clavier", "💻⌨🖥");
  ranger("pas", "🚶👣🏃");
  ranger("atchoum", "🤧");
  ranger("toux", "😷🤒🤕");
  ranger("artifice", "🎆🎇");
  ranger("chien", "🐶🐕🐩");
  ranger("chat", "🐱🐈");
  ranger("coq", "🐓");
  ranger("poule", "🐔🐣🐤🐥");
  ranger("cochon", "🐷🐖🐽");
  ranger("vache", "🐮🐄");
  ranger("grenouille", "🐸");
  ranger("abeille", "🐝🪰🦟");
  ranger("mouton", "🐑🐏");
  ranger("corbeau", "🐦‍⬛");
  ranger("oiseau", "🐦🕊🦜");
  ranger("cheval", "🐴🏇🐎🦄");
  ranger("hmm", "🤔🧐🤨💭");
  ranger("saispas", "🤷");
  ranger("ohnon", "🤦");
  ranger("miam", "😋🤤🍕🍔🍟🍰🍩🍪🍫🍦🌮🍣🍜");
  ranger("hein", "❓❔");
  ranger("oups", "😅");
  ranger("aie", "😬");
  ranger("attendri", "🥺🥹🤗");
  ranger("beurk", "🤢🤮");
  ranger("bof", "🙄😒");
  ranger("chut", "🤫");
  ranger("coucou", "👋");
  ranger("ouf", "😮‍💨🥵");

  // Les émojis de serveur n'ont qu'un nom (:pepe_laugh:) : on y cherche un mot connu.
  const PAR_MOT = [
    ["rire", /laugh|lol|lmao|lul|kek|joy|haha|rofl|giggle|mdr|rire/],
    ["bebe", /sob|bawl|pleur/],
    ["triste", /cry|sad|tear|triste/],
    ["coeur", /heart|love|luv|coeur|amour/],
    ["bisou", /kiss|bisou/],
    ["tonnerre", /angry|rage|mad|grr|colere/],
    ["surprise", /wow|shock|omg|gasp|surpris|pog/],
    ["hmm", /think|hmm|ponder|reflech/],
    ["bravo", /thumbsup|thumbs_up|plus_one|\+1|yes|check|nice|good|100|approve|gg|bravo|oui/],
    ["non", /thumbsdown|thumbs_down|nope|cross|deny|bad|non/],
    ["applaudir", /clap|applau/],
    ["tada", /party|tada|celebrat|hype|confetti|yay|fete|win/],
    ["feu", /fire|flame|lit|feu/],
    ["boum", /boom|explo/],
    ["fusee", /rocket|launch|fusee/],
    ["yeux", /eyes|look|stare|sus|peek/],
    ["crane", /skull|dead|rip/],
    ["cool", /cool|sunglass|chad|swag/],
    ["dodo", /sleep|zzz|tired|yawn|dodo/],
    ["etoile", /star|sparkle|shiny|magic|etoile/],
    ["coucou", /wave|hello|bye|salut/],
    ["robot", /robot|bot|beep/],
    ["idee", /idea|bulb|brain|galaxy|idee/],
    ["fantome", /ghost|boo|spook/],
    ["saispas", /shrug/],
    ["ohnon", /facepalm|bruh/],
    ["bof", /meh|eyeroll/],
    ["choeur", /pray|thank|thx|merci/],
    ["musique", /music|note|dance|vibe|jam/],
    ["argent", /money|cash|rich|stonks/],
    ["prout", /poop|fart/],
    ["beurk", /puke|yuck|ew+$/],
    ["miam", /yum|hungry|miam/],
    ["oups", /oops|sweat/],
    ["attendri", /aww|cute|uwu/],
    ["hein", /question|what|huh|confus/],
    ["chat", /cat|kitty|chat/],
    ["chien", /dog|doge|pup/],
    ["grenouille", /frog|pepe/],
  ];
  function parNom(nom) {
    const n = nom.toLowerCase();
    for (const [effet, motif] of PAR_MOT) if (motif.test(n)) return effet;
    return "pop";
  }

  // Les frimousses tapées au clavier.
  const FRIMOUSSES = [
    ["rire", /(?<![\p{L}\p{N}])(?::-?D+|[xX]D+|=D)(?![\p{L}\p{N}])/gu],
    ["clin", /(?<![\p{L}\p{N}]);-?\)(?![\p{L}\p{N}])/gu],
    ["bebe", /(?<![\p{L}\p{N}]):'-?\((?![\p{L}\p{N}])/gu],
    ["triste", /(?<![\p{L}\p{N}]):-?\(+(?![\p{L}\p{N}])/gu],
    ["harpe", /(?<![\p{L}\p{N}:])(?::-?\)+|=\)|\^\^|\^_\^)(?![\p{L}\p{N}])/gu],
    ["coeur", /(?<![\p{L}\p{N}])<3+(?!\d)/gu],
    ["surprise", /(?<![\p{L}\p{N}])(?::-?[oO]|[oO]_[oO])(?![\p{L}\p{N}])/gu],
    ["saispas", /¯\\_\(ツ\)_\/¯/gu],
    ["bof", /(?<![\p{L}\p{N}])(?:-_-|:-?[|\/\\])(?![\p{L}\p{N}\/\\])/gu],
    ["boing", /(?<![\p{L}\p{N}]):-?[pP](?![\p{L}\p{N}])/gu],
  ];

  const marque = (nom) => ` ${DEBUT}${nom}${FIN} `;
  const RE_SERVEUR = /<a?:(\w+):\d+>/g;
  const RE_NOM = /:([A-Za-z_][\w+-]{1,31}):/g;
  const RE_RESTES = /[\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}‍︎️⃣]/gu;

  // Remplace chaque émoji du texte par la marque de son effet (ou le retire si `actif` est faux).
  // Les émojis identiques qui se suivent ne comptent qu'une fois, et un message n'en joue que quelques-uns.
  function marquer(texte, actif) {
    let t = String(texte || "");
    const poser = (nom) => (actif ? marque(nom) : " ");
    t = t.replace(RE_SERVEUR, (_, nom) => poser(parNom(nom)));
    t = t.replace(RE_NOM, (_, nom) => poser(parNom(nom)));
    for (const [nom, motif] of FRIMOUSSES) t = t.replace(motif, () => poser(nom));
    t = t.replace(RE_UN_EMOJI, (emoji) => {
      const entier = emoji.replace(SANS_VARIANTE, "");
      const premier = entier.match(/\p{Extended_Pictographic}/u)[0];
      const nom = PAR_EMOJI[entier] || PAR_EMOJI[premier];
      if (nom) return poser(nom);
      return premier.codePointAt(0) >= 0x1f000 ? poser("pop") : " ";   // ©, ™, flèches… : rien
    });
    t = t.replace(RE_RESTES, " ");
    if (!actif) return t;
    let dernier = "", nombre = 0, sortie = "";
    for (const bout of t.split(/([a-z]+)/)) {
      const m = /^([a-z]+)$/.exec(bout);
      if (!m) { if (/[\p{L}\p{N}]/u.test(bout)) dernier = ""; sortie += bout; continue; }
      if (m[1] === dernier || nombre >= MAX_PAR_MESSAGE) continue;
      dernier = m[1]; nombre++; sortie += bout;
    }
    return sortie;
  }

  // Pour l'affichage : chaque marque redevient un émoji.
  const emojiDe = (nom) => (SONS[nom] || (MOTS[nom] && MOTS[nom][0]) || "");
  const afficher = (texte) => String(texte || "").replace(RE_MARQUE, (_, nom) => emojiDe(nom)).replace(/\s+([.,;:!?])/g, "$1").replace(/[ \t]+/g, " ").trim();

  // Découpe un texte en passages à dire et en effets à jouer, dans l'ordre :
  // [{ texte }, { effet }, …]. Une réaction dite par le personnage est un passage à dire.
  function decouper(texte, langue) {
    const morceaux = [];
    for (const bout of String(texte || "").split(/([a-z]+)/)) {
      const m = /^([a-z]+)$/.exec(bout);
      if (!m) { if (/[\p{L}\p{N}]/u.test(bout)) morceaux.push({ texte: bout.trim() }); continue; }
      if (SONS[m[1]]) morceaux.push({ effet: m[1] });
      else if (MOTS[m[1]]) morceaux.push({ texte: MOTS[m[1]][1][langue] || MOTS[m[1]][1].en, reaction: true });
    }
    return morceaux;
  }

  const api = { marquer, afficher, decouper, sons: Object.keys(SONS), mots: Object.keys(MOTS), SONS, MOTS, parNom, connu };
  racine.PingEmojis = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
