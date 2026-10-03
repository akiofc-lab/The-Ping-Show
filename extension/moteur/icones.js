/* Les têtes des personnages : de petits dessins ronds et colorés.
 *
 * Chaque personnage apporte le sien dans son paquet de voix (un dessin SVG de
 * 48 × 48). Il est affiché comme une image : rien de ce qu'il contient ne peut
 * s'exécuter. Un personnage sans dessin reçoit une tête toute simple.
 */
(function (racine) {
  "use strict";

  const COULEURS = ["#ffc93c", "#ff6b35", "#f5a3d0", "#2fa35b", "#8ed1fc", "#b9a5f5", "#e8452c"];

  // Tête par défaut : une patate de couleur (toujours la même pour un personnage donné) et deux yeux.
  function parDefaut(personnage) {
    let h = 0;
    for (const c of String(personnage.cle || personnage.id || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `<path d="M9 25c0-10 6-16 15-16s16 5 16 15-5 17-16 17S9 35 9 25z" fill="${COULEURS[h % COULEURS.length]}"/>` +
      `<circle cx="18.500" cy="24" r="2" fill="#111"/><circle cx="29.500" cy="24" r="2" fill="#111"/>` +
      `<path d="M19 32q5 3.500 10 0" fill="none" stroke="#111" stroke-width="1.800" stroke-linecap="round"/>`;
  }

  const adresses = new Map();   // personnage -> adresse « data: » de son dessin
  function adresse(personnage) {
    const cle = personnage.cle || personnage.id;
    if (!adresses.has(cle)) {
      const dessin = personnage.icone || parDefaut(personnage);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${dessin}</svg>`;
      adresses.set(cle, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    }
    return adresses.get(cle);
  }

  // Balise image de la tête d'un personnage, à la taille voulue.
  function image(personnage, taille = 28) {
    const img = document.createElement("img");
    img.src = adresse(personnage);
    img.width = img.height = taille;
    img.alt = "";
    img.draggable = false;
    return img;
  }

  const api = { image, adresse, oublier: () => adresses.clear() };
  racine.PingIcones = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
