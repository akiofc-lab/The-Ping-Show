/* Service de fond : ouvre le panneau latéral quand on clique sur l'icône,
 * remet la lecture à l'arrêt au démarrage du navigateur, relaie le raccourci
 * clavier (lecture / pause) vers le panneau, et fait suivre le pointeur à
 * l'œil de l'icône.
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

function eteindre() {
  chrome.storage.local.set({ pingActifDepuis: 0, pingBattement: 0 });
}
chrome.runtime.onInstalled.addListener(eteindre);
chrome.runtime.onStartup.addListener(eteindre);

// Les raccourcis clavier. Ils sont déclarés « globaux » : ils marchent aussi quand une
// autre application est au premier plan, tant que Chrome tourne et que le panneau est ouvert.
const COMMANDES = { "play-pause": "lecture", "previous-message": "precedent", "next-message": "suivant" };
chrome.commands.onCommand.addListener((commande, onglet) => {
  const action = COMMANDES[commande];
  if (!action) return;
  // Le panneau doit être ouvert pour que le son sorte : s'il ne l'est pas, on essaie de l'ouvrir
  // (il faut le faire tout de suite, tant que l'appui sur les touches compte ; hors de Chrome,
  // il n'y a pas de fenêtre à qui s'adresser et l'appel reste sans effet).
  if (action === "lecture" && onglet && onglet.windowId !== undefined) chrome.sidePanel.open({ windowId: onglet.windowId }).catch(() => {});
  chrome.runtime.sendMessage({ type: "ping:commande", commande: action }).catch(() => {
    // Personne n'écoute : le panneau vient juste de s'ouvrir. Il lira cette note en arrivant.
    if (action === "lecture") chrome.storage.session.set({ pingCommande: Date.now() }).catch(() => {});
  });
});

// --- L'icône : un œil, dont la pupille suit le pointeur --------------------------------------
// Le dessin tient dans un carré de 128 : l'anneau, le blanc, et la pupille qui tourne
// dans le blanc (elle est de la couleur de l'anneau : là où elle le touche, ils se fondent). Les pages (Discord, le panneau) envoient seulement une direction.
const OEIL = { cx: 64, cy: 64, rx: 56.5, ry: 60, blancX: 38, blancY: 42.8, pupille: 24.7, a: 20.9, b: 23.5, repos: 2.33 };
const BLEU = "#2440e6";

function dessinerOeil(taille, angle, portee) {
  const toile = new OffscreenCanvas(taille, taille), c = toile.getContext("2d");
  c.scale(taille / 128, taille / 128);
  c.fillStyle = BLEU;
  c.beginPath(); c.ellipse(OEIL.cx, OEIL.cy, OEIL.rx, OEIL.ry, 0, 0, 2 * Math.PI); c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath(); c.ellipse(OEIL.cx, OEIL.cy, OEIL.blancX, OEIL.blancY, 0, 0, 2 * Math.PI); c.fill();
  c.fillStyle = BLEU;
  c.beginPath();
  c.arc(OEIL.cx + OEIL.a * portee * Math.cos(angle), OEIL.cy + OEIL.b * portee * Math.sin(angle), OEIL.pupille, 0, 2 * Math.PI);
  c.fill();
  return c.getImageData(0, 0, taille, taille);
}

let dernierRegard = "";
chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "ping:regard") return;
  const repos = typeof message.angle !== "number" || !Number.isFinite(message.angle);
  const angle = repos ? OEIL.repos : message.angle;
  const portee = repos ? 1 : Math.max(0.35, Math.min(1, Number(message.portee) || 1));
  const cle = `${angle.toFixed(2)}/${portee.toFixed(1)}`;
  if (cle === dernierRegard) return;
  dernierRegard = cle;
  try {
    chrome.action.setIcon({ imageData: { 16: dessinerOeil(16, angle, portee), 32: dessinerOeil(32, angle, portee) } }).catch(() => {});
  } catch (_) { /* pas de dessin possible : l'icône garde sa pose */ }
});
