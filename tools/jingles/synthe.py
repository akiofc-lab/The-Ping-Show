"""Petit synthétiseur pour les indicatifs et les ambiances des tests de voix.

Aucun échantillon enregistré : tout est calculé (oscillateurs, bruit filtré,
cordes pincées). Les motifs sont originaux et très courts ; aucun ne reprend
une mélodie existante.
"""
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
TAU = 2 * np.pi


def hasard(graine):
    return np.random.default_rng(graine)


def temps(duree):
    return np.arange(int(SR * duree)) / SR


# --- Filtres ---------------------------------------------------------------------
def passe_bas(x, f, ordre=2):
    return sosfilt(butter(ordre, min(f, SR * 0.45), "low", fs=SR, output="sos"), x)


def passe_haut(x, f, ordre=2):
    return sosfilt(butter(ordre, f, "high", fs=SR, output="sos"), x)


def passe_bande(x, f1, f2, ordre=2):
    return sosfilt(butter(ordre, [f1, min(f2, SR * 0.45)], "band", fs=SR, output="sos"), x)


# --- Enveloppes ------------------------------------------------------------------
def enveloppe(n, attaque=0.005, chute=0.1, tenue=0.7, relache=0.08):
    """Attaque, chute vers un palier, relâchement (durées en secondes, n en échantillons)."""
    a, c, r = int(attaque * SR), int(chute * SR), int(relache * SR)
    e = np.full(n, tenue, dtype=np.float64)
    a = min(a, n); e[:a] = np.linspace(0, 1, a, endpoint=False)
    c = min(c, max(0, n - a)); e[a:a + c] = np.linspace(1, tenue, c, endpoint=False)
    r = min(r, n); e[n - r:] *= np.linspace(1, 0, r)
    return e


def percussif(n, vitesse=6.0, attaque=0.003):
    t = np.arange(n) / SR
    return np.exp(-vitesse * t) * np.minimum(1, t / attaque)


# --- Oscillateurs ----------------------------------------------------------------
def phase(freq, n):
    """Phase cumulée pour une fréquence fixe ou variable (tableau de n valeurs)."""
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    return TAU * np.cumsum(f) / SR


def sinus(freq, duree):
    n = int(SR * duree)
    return np.sin(phase(freq, n))


def carre(freq, duree, largeur=0.5):
    n = int(SR * duree)
    return np.where((phase(freq, n) / TAU) % 1 < largeur, 1.0, -1.0)


def scie(freq, duree):
    n = int(SR * duree)
    return 2 * ((phase(freq, n) / TAU) % 1) - 1


def triangle(freq, duree):
    return 2 * np.abs(scie(freq, duree)) - 1


def glisse(f0, f1, duree, courbe=1.0):
    """Fréquence qui glisse de f0 à f1."""
    n = int(SR * duree)
    return f0 + (f1 - f0) * np.linspace(0, 1, n) ** courbe


def bruit(duree, graine=1):
    return hasard(graine).uniform(-1, 1, int(SR * duree))


# --- Instruments -----------------------------------------------------------------
def corde(freq, duree, brillance=0.5, graine=3):
    """Corde pincée (algorithme de Karplus-Strong) : guitare, banjo, harpe, clavecin."""
    n = int(SR * duree)
    periode = max(2, int(SR / freq))
    tampon = hasard(graine).uniform(-1, 1, periode)
    if brillance < 1:  # plus c'est bas, plus l'attaque est douce
        tampon = passe_bas(np.tile(tampon, 3), 1500 + 9000 * brillance)[periode:2 * periode]
    y = np.empty(n)
    amorti = 0.996 if duree > 0.5 else 0.992
    for i in range(n):
        j = i % periode
        y[i] = tampon[j]
        tampon[j] = amorti * 0.5 * (tampon[j] + tampon[(j + 1) % periode])
    return y


def cloche(freq, duree, inharmonie=2.76, indice=3.0):
    """Cloche ou carillon par modulation de fréquence."""
    t = temps(duree)
    mod = np.sin(TAU * freq * inharmonie * t) * indice * np.exp(-4 * t / duree)
    return np.sin(TAU * freq * t + mod) * np.exp(-4.5 * t / duree) * np.minimum(1, t / 0.002)


def cuivre(freq, duree, eclat=2500):
    """Cuivre : dent de scie adoucie, attaque franche."""
    n = int(SR * duree)
    return passe_bas(scie(freq, duree) + 0.5 * scie(np.asarray(freq) * 1.003, duree), eclat) * enveloppe(n, 0.03, 0.08, 0.75, 0.1)


def orgue(freq, duree, tirettes=(1, 0.6, 0.4, 0.25)):
    t = temps(duree)
    y = sum(a * np.sin(TAU * freq * (k + 1) * t) for k, a in enumerate(tirettes))
    return y * enveloppe(len(t), 0.01, 0.02, 0.9, 0.06)


def piano(freq, duree):
    t = temps(duree)
    y = sum(np.sin(TAU * freq * k * (1 + 0.0004 * k * k) * t) / k ** 1.4 for k in range(1, 7))
    return y * np.exp(-3.2 * t / max(duree, 0.3)) * np.minimum(1, t / 0.004)


def sifflet(freq, duree, vibrato=5.5, souffle=0.12, graine=5):
    """Sifflement humain : sinus qui tremble, un peu de souffle."""
    n = int(SR * duree)
    t = np.arange(n) / SR
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,)) * (1 + 0.012 * np.sin(TAU * vibrato * t) * np.minimum(1, t / 0.15))
    air = passe_bande(hasard(graine).uniform(-1, 1, n), 1500, 5000) * souffle
    return (np.sin(TAU * np.cumsum(f) / SR) + air) * enveloppe(n, 0.04, 0.05, 0.85, 0.09)


def grosse_caisse(duree=0.35, f0=110, f1=42):
    n = int(SR * duree)
    return np.sin(phase(glisse(f0, f1, duree, 0.4), n)) * percussif(n, 12)


def caisse_claire(duree=0.2, graine=7):
    n = int(SR * duree)
    return (passe_haut(hasard(graine).uniform(-1, 1, n), 1200) * 0.8 + 0.5 * np.sin(phase(190, n))) * percussif(n, 22)


def cymbale(duree=0.07, graine=9):
    n = int(SR * duree)
    return passe_haut(hasard(graine).uniform(-1, 1, n), 6500) * percussif(n, 45)


def clic(duree=0.012, f=2500, graine=11):
    n = int(SR * duree)
    return passe_bande(hasard(graine).uniform(-1, 1, n + 200), f * 0.6, f * 1.6)[100:100 + n] * percussif(n, 220, 0.0005)


def souffle_filtre(duree, f1, f2, graine=13):
    """Bruit dont la couleur glisse (whoosh, scratch)."""
    n = int(SR * duree)
    x = hasard(graine).uniform(-1, 1, n)
    y = np.zeros(n); bas = bande = 0.0
    freqs = glisse(f1, f2, duree)
    for i in range(n):
        f = 2 * np.sin(np.pi * min(freqs[i], SR / 6.5) / SR)
        bas += f * bande
        haut = x[i] - bas - 0.6 * bande
        bande += f * haut
        y[i] = bande
    return y


# --- Assemblage ------------------------------------------------------------------
class Piste:
    """Une petite table de mixage : on y pose des sons à des instants donnés."""

    def __init__(self, duree):
        self.y = np.zeros(int(SR * duree))

    def poser(self, son, instant=0.0, volume=1.0):
        i = int(SR * instant)
        if i >= len(self.y):
            return self
        n = min(len(son), len(self.y) - i)
        self.y[i:i + n] += volume * np.asarray(son)[:n]
        return self

    def rendre(self, crete=0.5, fondu=0.04):
        y = self.y.copy()
        m = np.max(np.abs(y))
        if m > 0:
            y *= crete / m
        k = int(SR * fondu)
        y[-k:] *= np.linspace(1, 0, k)
        return y.astype(np.float32)


def boucle_de(fonction, duree, raccord=0.5):
    """Allonge un motif court en le répétant, avec un fondu enchaîné à chaque raccord."""
    motif = fonction()
    n = int(SR * duree)
    if len(motif) >= n:
        return motif[:n]
    k = int(SR * raccord)
    sortie = motif.copy()
    while len(sortie) < n:
        fin, debut = sortie[-k:], motif[:k]
        t = np.linspace(0, 1, k)
        sortie = np.concatenate([sortie[:-k], fin * np.cos(t * np.pi / 2) + debut * np.sin(t * np.pi / 2), motif[k:]])
    return sortie[:n]


def niveau(y, rms=0.035, crete_max=0.3):
    y = np.asarray(y, dtype=np.float64)
    r = np.sqrt(np.mean(y ** 2))
    if r > 0:
        y = y * (rms / r)
    m = np.max(np.abs(y))
    if m > crete_max:
        y = y * (crete_max / m)
    return y.astype(np.float32)
