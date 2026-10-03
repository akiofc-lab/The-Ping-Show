"""Les effets sonores des émojis.

Chaque émoji joue un vrai effet sonore : des applaudissements pour 👏, un
trombone triste pour 😢, un ronflement pour 😴, une caisse enregistreuse
pour 💰… Trois sortes de sons :

  - des enregistrements du domaine public (CC0) tirés de Freesound, par le
    jeu de données ESC-50 : animaux, applaudissements, tonnerre, ronflement… ;
  - des notes d'instruments du jeu d'échantillons FluidR3_GM (trombone,
    cuivres, chœur, harpe, xylophone…), assemblées ici en petits motifs ;
  - quelques échantillons du domaine public rassemblés par le projet Sonic Pi
    (caisse enregistreuse, sonnette de vélo, roulement de tambour…) ;
  - des sons fabriqués par calcul (battement de cœur, buzzer, ressort…).

La provenance de chaque son est écrite dans sources.json, à côté des fichiers.

    python effets_sonores.py [dossier de sortie] [noms…]

Les sources se règlent par trois variables d'environnement (voir tools/README.md) :
ESC50 (le dossier « audio » d'ESC-50), FLUIDR3 (un dossier par instrument, une
note par fichier WAV) et SONICPI (le dossier des échantillons de Sonic Pi).
"""
import json
import os
import sys
import wave

import numpy as np
from scipy.signal import fftconvolve, lfilter, resample_poly

ICI = os.path.dirname(os.path.abspath(__file__))
for dossier in (os.path.join(ICI, "..", "jingles"),):
    if os.path.exists(os.path.join(dossier, "synthe.py")):
        sys.path.insert(0, dossier)
        break
from synthe import (SR, TAU, Piste, bruit, caisse_claire, carre, clic, enveloppe, glisse, grosse_caisse, hasard,  # noqa: E402
                    passe_bande, passe_bas, passe_haut, percussif, phase, scie, sinus, temps)

SORTIE = 22050
ESC50 = os.environ.get("ESC50", os.path.join(ICI, "sources", "ESC-50", "audio"))
FLUIDR3 = os.environ.get("FLUIDR3", os.path.join(ICI, "sources", "FluidR3_GM"))
SONICPI = os.environ.get("SONICPI", os.path.join(ICI, "sources", "sonic-pi"))


# --- Outils de synthèse ---------------------------------------------------------------
def N(duree):
    return int(SR * duree)


def courbe(points, duree):
    """Une valeur qui suit des points (instant de 0 à 1, valeur), en ligne brisée adoucie."""
    n = N(duree)
    x = np.linspace(0, 1, n)
    y = np.interp(x, [p[0] for p in points], [p[1] for p in points])
    return lisse(y, 12)


def lisse(y, ms=10):
    k = max(1, int(SR * ms / 1000))
    if k < 2 or len(y) < 2 * k:
        return np.asarray(y, dtype=np.float64)
    bord = np.concatenate([np.full(k, y[0]), y, np.full(k, y[-1])])
    return np.convolve(bord, np.ones(k) / k, "same")[k:-k]


def bords(y, debut=0.004, fin=0.02):
    """Fondu d'entrée et de sortie."""
    y = np.array(y, dtype=np.float64)
    a, r = min(len(y), N(debut)), min(len(y), N(fin))
    if a:
        y[:a] *= np.linspace(0, 1, a)
    if r:
        y[-r:] *= np.linspace(1, 0, r)
    return y


def filtre_mobile(x, fc, amorti=0.6):
    """Filtre dont la fréquence change en route. Renvoie (grave, médium, aigu)."""
    n = len(x)
    f = (2 * np.sin(np.pi * np.minimum(np.broadcast_to(np.asarray(fc, dtype=np.float64), (n,)), SR / 6.5) / SR)).tolist()
    xs = np.asarray(x, dtype=np.float64).tolist()
    bas = bande = 0.0
    B, M, H = [0.0] * n, [0.0] * n, [0.0] * n
    for i in range(n):
        fi = f[i]
        bas += fi * bande
        haut = xs[i] - bas - amorti * bande
        bande += fi * haut
        B[i], M[i], H[i] = bas, bande, haut
    return np.array(B), np.array(M), np.array(H)


def resonance(x, F, largeur):
    """Résonance (formant) à la fréquence F, fixe ou mobile."""
    r = np.exp(-np.pi * largeur / SR)
    if np.ndim(F) == 0:
        return lfilter([1 - r], [1, -2 * r * np.cos(TAU * F / SR), r * r], x)
    c = (2 * r * np.cos(TAU * np.asarray(F, dtype=np.float64) / SR)).tolist()
    xs = ((1 - r) * np.asarray(x, dtype=np.float64)).tolist()
    y1 = y2 = 0.0
    r2 = r * r
    Y = [0.0] * len(xs)
    for i in range(len(xs)):
        v = xs[i] + c[i] * y1 - r2 * y2
        Y[i] = v
        y2, y1 = y1, v
    return np.array(Y)


def unite(y):
    return y / (np.sqrt(np.mean(np.square(y))) + 1e-9)


def salle(y, taille=0.22, dose=0.14, graine=5):
    """Un peu d'espace autour du son (réverbération courte)."""
    n = N(taille)
    t = np.arange(n) / SR
    reponse = hasard(graine).normal(0, 1, n) * np.exp(-6.5 * t / taille)
    reponse = passe_bas(reponse, 5000)
    queue = fftconvolve(y, reponse)
    queue /= np.max(np.abs(queue)) + 1e-9
    seche = np.concatenate([y, np.zeros(len(queue) - len(y))])
    return seche / (np.max(np.abs(seche)) + 1e-9) + dose * 3 * queue


def poser(duree, *sons):
    """Assemble des sons : (son, instant, volume)."""
    piste = Piste(duree)
    for son, instant, volume in sons:
        piste.poser(son, instant, volume)
    return piste.y


def plus(*sons):
    """Additionne des sons de longueurs différentes."""
    y = np.zeros(max(len(son) for son in sons))
    for son in sons:
        y[: len(son)] += son
    return y


def coup(n, vitesse, attaque=0.001):
    return percussif(n, vitesse, attaque)


def bois(freq, duree=0.12, vitesse=45, graine=3):
    """Lame de bois frappée : xylophone, claves, sabot."""
    n = N(duree)
    t = np.arange(n) / SR
    y = np.sin(TAU * freq * t) + 0.35 * np.sin(TAU * freq * 3.93 * t) * np.exp(-90 * t) + 0.2 * np.sin(TAU * freq * 9.5 * t) * np.exp(-200 * t)
    return (y + 0.5 * clic(duree, freq * 2.2, graine)[:n]) * coup(n, vitesse)


def bulle(freq=700, duree=0.09, montee=2.2):
    n = N(duree)
    t = np.arange(n) / SR
    return np.sin(phase(freq * (1 + (montee - 1) * (t / duree) ** 0.6), n)) * np.sin(np.pi * t / duree) ** 0.6 * np.exp(-2.5 * t / duree)


# --- Enregistrements et notes d'instruments ---------------------------------------------
def lire(chemin):
    """Un fichier WAV, en mono, à la fréquence de travail."""
    with wave.open(chemin) as f:
        frequence, voies = f.getframerate(), f.getnchannels()
        y = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").astype(np.float64) / 32768
    if voies == 2:
        y = y.reshape(-1, 2).mean(axis=1)
    if frequence != SR:
        y = resample_poly(y, SR, frequence)
    return y


# Les extraits d'enregistrements : fichier d'ESC-50, début, fin (secondes), fondu de sortie,
# et d'où vient chaque enregistrement (tous sont dans le domaine public, CC0).
PRISES = json.load(open(os.path.join(ICI, "prises.json"), encoding="utf8"))
PRISES_UTILISEES = set()


def prise(nom):
    p = PRISES[nom]
    PRISES_UTILISEES.add(nom)
    y = lire(os.path.join(ESC50, p["file"]))[int(p["start"] * SR): int(p["end"] * SR)]
    y = y - np.mean(y)
    if p.get("brighten"):   # on fait ressortir le claquement, pour les petits haut-parleurs qui ne rendent pas les graves
        y = passe_haut(y, 70)
        y = y + p["brighten"] * passe_bande(y, 350, 4000)
    return bords(y, 0.008, p["fade"])


# Les échantillons de Sonic Pi (domaine public, CC0), avec l'adresse de l'enregistrement d'origine.
ECHANTILLONS = json.load(open(os.path.join(ICI, "echantillons.json"), encoding="utf8"))
ECHANTILLONS_UTILISES = set()


def echantillon(nom, debut=0.0, duree=None, relache=0.08, attaque=0.003):
    ECHANTILLONS_UTILISES.add(nom)
    y = lire(os.path.join(SONICPI, f"{nom}.wav"))
    y = y[int(debut * SR):] if duree is None else y[int(debut * SR): int((debut + duree) * SR)]
    return bords(y / (np.max(np.abs(y)) + 1e-9), attaque, relache)


NOTES_UTILISEES = set()
TOUTES_LES_NOTES = set()


def note(instrument, nom, duree=None, relache=0.06, attaque=0.0):
    """Une note d'instrument, calée sur son attaque et ramenée à la même force."""
    NOTES_UTILISEES.add(f"{instrument}/{nom}")
    TOUTES_LES_NOTES.add(f"{instrument}/{nom}")
    y = lire(os.path.join(FLUIDR3, instrument, f"{nom}.wav"))
    fort = np.max(np.abs(y)) + 1e-9
    depart = max(0, int(np.argmax(np.abs(y) > 0.02 * fort)) - 64)
    y = y[depart:] / fort
    if duree is not None:
        y = y[: N(duree)]
    return bords(y, attaque or 0.002, relache)


def inflechir(y, rapport):
    """Rejoue un son en changeant sa hauteur en route (rapport : vitesse de lecture, tableau)."""
    position = np.cumsum(np.asarray(rapport, dtype=np.float64))
    position = position[position < len(y) - 1]
    return np.interp(position, np.arange(len(y)), y)


def cymbale():
    """Un coup de cymbale (l'échantillon « cymbale à l'envers », remis à l'endroit)."""
    y = lire(os.path.join(FLUIDR3, "reverse_cymbal", "C4.wav"))
    NOTES_UTILISEES.add("reverse_cymbal/C4")
    TOUTES_LES_NOTES.add("reverse_cymbal/C4")
    fin = len(y) - int(np.argmax(np.abs(y[::-1]) > 0.05 * np.max(np.abs(y))))
    y = y[:fin][::-1]
    return bords(y / (np.max(np.abs(y)) + 1e-9), 0.001, 0.3)


# --- Les effets faits de notes d'instruments ------------------------------------------------
def trombone_triste():
    """Ouah, ouah, ouah, ouaaah : la déception."""
    sons, instant = [], 0.0
    for k, (nom, duree) in enumerate((("Bb3", 0.26), ("A3", 0.26), ("Ab3", 0.26), ("G3", 0.78))):
        y = note("trombone", nom, duree + 0.25, 0.05)
        n = len(y)
        t = np.arange(n) / SR
        if k == 3:   # la dernière s'affaisse en tremblant
            y = inflechir(y, (1 - 0.07 * np.minimum(1, t / duree) ** 2) * (1 + 0.022 * np.sin(TAU * 5.3 * t) * np.minimum(1, t / 0.2)))
            y = y[: N(duree)]
        else:
            y = y[: N(duree)]
        n = len(y)
        t = np.arange(n) / SR
        ouverture = 450 + 2300 * np.sin(np.pi * np.minimum(1, t / (duree * (0.6 if k == 3 else 0.92)))) ** 1.3
        sourdine = filtre_mobile(y, ouverture, 0.5)[0]
        y = 0.8 * sourdine / (np.max(np.abs(sourdine)) + 1e-9) + 0.2 * y
        sons.append((bords(y, 0.004, 0.06 if k < 3 else 0.3), instant, 1.0))
        instant += duree
    return salle(poser(instant, *sons), 0.22, 0.1)


def tada():
    """Ta-daaa ! La fanfare de la victoire."""
    court = note("brass_section", "G4", 0.13, 0.03)
    long = sum(note("brass_section", n, 0.85, 0.25) for n in ("C5", "E5", "G5")) + 0.8 * note("trumpet", "C6", 0.85, 0.25)
    return salle(poser(1.05, (court, 0.0, 2.2), (long, 0.15, 1.0), (cymbale()[: N(0.85)], 0.15, 1.1), (note("timpani", "C3", 0.6, 0.2), 0.15, 1.6)), 0.25, 0.12)


def accord_choc():
    """Tadam ! Un coup d'orchestre, pour ce qui est important."""
    y = plus(note("orchestra_hit", "C4", 0.9, 0.2), 0.8 * note("orchestra_hit", "C3", 0.9, 0.2), 0.9 * note("timpani", "C3", 0.6, 0.2))
    return salle(y, 0.3, 0.15)


def coup_de_theatre():
    """Poum, poum, pouuum : trois accords dramatiques."""
    def coup_bref():
        return plus(note("brass_section", "G3", 0.22, 0.05), 0.8 * note("brass_section", "D4", 0.22, 0.05), 1.2 * note("timpani", "G2", 0.3, 0.1))
    final = plus(1.1 * note("brass_section", "Eb3", 0.9, 0.3), 0.7 * note("tremolo_strings", "Eb3", 0.9, 0.3), 0.6 * note("tremolo_strings", "Bb3", 0.9, 0.3),
                 0.7 * note("tremolo_strings", "Eb2", 0.9, 0.3), 1.4 * note("timpani", "Eb2", 0.8, 0.3))
    return salle(poser(1.45, (coup_bref(), 0.0, 1.0), (coup_bref(), 0.26, 1.0), (final, 0.52, 1.0)), 0.3, 0.15)


def choeur():
    """Aaah : un chœur céleste."""
    y = sum(note("choir_aahs", n, 1.1, 0.35, 0.12) for n in ("C4", "E4", "G4", "C5"))
    return salle(y, 0.45, 0.3)


def fantome():
    """Ou-ouuuh : un fantôme."""
    d = 1.25
    t = np.arange(N(d)) / SR
    contour = courbe([(0, 0.75), (0.38, 1.22), (0.62, 1.12), (1, 0.68)], d) * (1 + 0.03 * np.sin(TAU * 6 * t))
    y = plus(inflechir(note("voice_oohs", "A4", None, 0.0), contour), 0.5 * inflechir(note("voice_oohs", "E4", None, 0.0), contour))
    y = y[: N(d)]
    return salle(y * np.sin(np.pi * np.arange(len(y)) / len(y)) ** 0.7, 0.4, 0.3)


def orgue_inquietant():
    """Un accord d'orgue lugubre."""
    d = 1.0
    y = sum(note("church_organ", n, d, 0.2) for n in ("D2", "D3", "F3", "A3", "D4"))
    y = y * (1 + 0.1 * np.sin(TAU * 6.3 * np.arange(len(y)) / SR))
    return salle(y, 0.4, 0.25)


def bonne_reponse():
    """Fuiiit, dring ! Un pouce qui se lève d'un coup, et une sonnette de vélo qui approuve."""
    d = 0.2
    t = np.arange(N(d)) / SR
    y = note("whistle", "C6", None, 0.0)
    montee = bords(inflechir(y, 0.55 * (2.1 / 0.55) ** ((t / d) ** 0.8)), 0.01, 0.02)
    return poser(1.15, (montee, 0.0, 0.55), (echantillon("perc_bell", 0.0, 0.9, 0.35), len(montee) / SR, 1.0))


def idee():
    """Clic, ding ! L'ampoule s'allume."""
    return salle(poser(0.95, (clic(0.012, 2200), 0.0, 0.5), (note("glockenspiel", "E6", 0.85, 0.3), 0.06, 1.0), (note("celesta", "E7", 0.6, 0.25), 0.06, 0.5)), 0.2, 0.1)


def clin_doeil():
    """Ting ! Le petit éclat d'un clin d'œil."""
    return salle(poser(0.6, (note("celesta", "E6", 0.2, 0.1), 0.0, 0.5), (note("celesta", "G6", 0.2, 0.1), 0.045, 0.6),
                       (note("celesta", "C7", 0.5, 0.2), 0.09, 1.0), (note("tinkle_bell", "C7", 0.3, 0.1), 0.09, 0.9)), 0.15, 0.08)


def scintillement():
    """Une pluie d'étincelles : la baguette magique."""
    rng = hasard(81)
    sons = [(note("orchestral_harp", n, 0.5, 0.2), 0.03 * k, 0.45) for k, n in enumerate(("C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7"))]
    for k in range(9):
        sons.append((note("celesta", str(rng.choice(["C7", "E7", "G7", "G6"])), 0.35, 0.15), 0.12 + 0.07 * k + float(rng.uniform(0, 0.03)), float(rng.uniform(0.4, 0.8))))
    for k in range(5):
        sons.append((note("tinkle_bell", str(rng.choice(["A6", "C7", "E7"])), 0.25, 0.1), 0.2 + 0.12 * k + float(rng.uniform(0, 0.04)), float(rng.uniform(0.3, 0.6))))
    return salle(poser(1.0, *sons), 0.2, 0.14)


def harpe():
    """Un glissando de harpe : quelque chose d'agréable."""
    notes = ("C4", "E4", "G4", "C5", "E5", "G5", "C6")
    return salle(poser(0.95, *[(note("orchestral_harp", n, 0.75, 0.3), 0.045 * k, 0.7 + 0.05 * k) for k, n in enumerate(notes)]), 0.25, 0.12)


def os_qui_claquent():
    """Un squelette qui s'entrechoque : xylophone d'os."""
    notes = ("D6", "B5", "E6", "A5", "G5", "C6", "E5")
    instants = (0.0, 0.07, 0.14, 0.23, 0.30, 0.37, 0.5)
    return salle(poser(0.75, *[(note("xylophone", n, 0.2, 0.05), i, 0.8 + 0.2 * (k % 2)) for k, (n, i) in enumerate(zip(notes, instants))]), 0.15, 0.1)


def clignement():
    """Plink, plink : deux pizzicatos, des yeux qui épient."""
    return salle(poser(0.7, (note("pizzicato_strings", "E4", 0.4, 0.1), 0.0, 1.0), (note("pizzicato_strings", "G4", 0.45, 0.12), 0.2, 1.0)), 0.15, 0.08)


def cool():
    """Deux claquements de doigts sur une ligne de contrebasse."""
    return salle(poser(1.0, (note("acoustic_bass", "G2", 0.3, 0.06), 0.0, 1.0), (note("acoustic_bass", "Bb2", 0.3, 0.06), 0.26, 0.9), (note("acoustic_bass", "C3", 0.45, 0.12), 0.52, 1.0),
                       (echantillon("perc_snap", 0.0, 0.25, 0.05), 0.26, 0.8), (echantillon("perc_snap", 0.0, 0.25, 0.05), 0.78, 0.8)), 0.15, 0.1)


def suite(instrument, notes, relache=0.05, chevauchement=0.02):
    """Des notes jouées l'une après l'autre : [(nom, durée), …]."""
    sons, instant = [], 0.0
    for nom, duree in notes:
        sons.append((note(instrument, nom, duree + chevauchement, relache), instant, 1.0))
        instant += duree
    return poser(instant + 0.05, *sons)


def flute():
    """Quatre notes de flûte : de la musique."""
    return salle(suite("flute", (("G5", 0.13), ("A5", 0.13), ("B5", 0.13), ("D6", 0.42)), 0.08), 0.2, 0.12)


def guitare():
    """Un accord de guitare, gratté."""
    return salle(poser(1.15, *[(note("acoustic_guitar_steel", n, 1.1, 0.4), 0.024 * k, 1.0) for k, n in enumerate(("E2", "B2", "E3", "Ab3", "B3", "E4"))]), 0.2, 0.08)


def piano():
    """Un accord de piano, égrené."""
    return salle(poser(1.1, *[(note("acoustic_grand_piano", n, 1.0, 0.35), 0.05 * k, 1.0) for k, n in enumerate(("C4", "E4", "G4", "C5"))]), 0.2, 0.08)


def violon():
    """Le plus petit violon du monde : quatre notes qui descendent."""
    return salle(suite("violin", (("A5", 0.22), ("G5", 0.22), ("F5", 0.22), ("E5", 0.7)), 0.12, 0.05), 0.25, 0.12)


def saxo():
    """Quatre notes de saxophone."""
    return salle(suite("tenor_sax", (("G3", 0.14), ("Bb3", 0.14), ("D4", 0.14), ("F4", 0.5)), 0.1, 0.03), 0.25, 0.12)


def trompette():
    """Une sonnerie de trompette."""
    return salle(suite("trumpet", (("C5", 0.1), ("E5", 0.1), ("G5", 0.1), ("C6", 0.5)), 0.08, 0.02), 0.25, 0.12)


def telephone():
    """Dring !"""
    return note("telephone_ring", "C5", 1.25, 0.12)


def galop():
    """Cataclop, cataclop."""
    sons = []
    for tour in range(2):
        for ecart, n, force in ((0.0, "C5", 0.8), (0.11, "G4", 0.8), (0.22, "E5", 1.0)):
            sons.append((note("woodblock", n, 0.1, 0.03), 0.42 * tour + ecart, force))
    return salle(poser(0.8, *sons), 0.1, 0.1)


def vertige():
    """Des petits oiseaux qui tournent autour de la tête."""
    sons = []
    for k in range(5):
        y = note("bird_tweet", "C6" if k % 2 else "C5", 0.3, 0.05)
        sons.append((inflechir(y, np.full(len(y), 1.0 + 0.06 * (k % 3 - 1))), 0.17 * k, 0.7 + 0.3 * (k % 2)))
    return poser(1.1, *sons)


def degringolade():
    """La dégringolade en sifflet à coulisse, puis boum."""
    d = 0.55
    y = note("whistle", "C7", None, 0.0)
    t = np.arange(N(d)) / SR
    chute = inflechir(y, 1.05 * (0.22 / 1.05) ** ((t / d) ** 1.3))
    chute = bords(chute, 0.02, 0.03)
    return poser(0.9, (chute, 0.0, 0.7), (note("woodblock", "A4", 0.1, 0.03), len(chute) / SR, 1.0), (note("timpani", "C3", 0.35, 0.15), len(chute) / SR, 1.3))


def roulement():
    """Roulement de tambour, puis la cymbale."""
    return poser(1.6, (echantillon("drum_roll", 0.25, 0.75, 0.05, 0.03), 0.0, 0.8), (echantillon("drum_cymbal_hard", 0.0, 0.8, 0.3), 0.74, 1.0),
                 (echantillon("drum_bass_hard", 0.0, 0.5, 0.1), 0.74, 1.0))


def caisse_enregistreuse():
    """Ka-ching ! Une vraie caisse enregistreuse."""
    return echantillon("perc_till", 0.0, 1.4, 0.3)


def explosion():
    """Boum !"""
    d = 1.1
    n = N(d)
    t = np.arange(n) / SR
    souffle = filtre_mobile(bruit(d, 31), 150 + 4500 * np.exp(-7 * t), 0.9)[0] * np.exp(-4.2 * t)
    grave = np.sin(phase(glisse(70, 30, d, 0.5), n)) * np.exp(-5 * t)
    y = poser(d, (souffle / np.max(np.abs(souffle)), 0, 1.0), (grave, 0, 0.8), (note("gunshot", "C3", 0.9, 0.3), 0.0, 1.2), (note("timpani", "D2", 0.8, 0.3), 0.0, 1.0))
    return np.tanh(2.0 * y / np.max(np.abs(y)))


def feu():
    """Fouuf ! Une flamme qui prend, puis le bois qui crépite (enregistré)."""
    d = 0.35
    n = N(d)
    t = np.arange(n) / SR
    bouffee = filtre_mobile(bruit(d, 51), 250 + 1700 * np.exp(-((t - 0.16) / 0.12) ** 2), 0.7)[1] * np.exp(-((t - 0.16) / 0.11) ** 2)
    braises = prise("braises")[: N(1.15)]
    return poser(1.35, (bouffee / np.max(np.abs(bouffee)), 0.0, 0.9), (bords(braises / np.max(np.abs(braises)), 0.15, 0.3), 0.18, 1.0))


# --- Les effets fabriqués par calcul ----------------------------------------------------------
def coeur():
    """Poum-poum, poum-poum, poum-poum : un cœur qui bat."""
    def battement(duree, force, graine):
        n = N(duree)
        t = np.arange(n) / SR
        return passe_bas(passe_bas(bruit(duree, graine), 100), 100) * np.exp(-((t - 0.03) / 0.025) ** 2) * force
    paire = poser(0.34, (battement(0.12, 1.0, 3), 0.0, 1), (battement(0.1, 0.7, 4), 0.14, 1))
    return poser(1.36, *[(paire, 0.42 * k, 1) for k in range(3)])


def buzzer():
    """Bzzzt : mauvaise réponse."""
    d = 0.55
    t = np.arange(N(d)) / SR
    y = ((160 * t) % 1 < 0.1).astype(float) - 0.1
    return bords(passe_bande(y, 1200, 3500), 0.003, 0.01)


def bouchon():
    """Pop ! Un bouchon qui saute, puis les bulles."""
    d = 0.75
    m = N(d)
    tt = np.arange(m) / SR
    grains = (hasard(5).uniform(0, 1, m) > 0.992).astype(float) * hasard(6).uniform(0.3, 1, m)
    petillement = passe_haut(lfilter([1], [1, -0.6], grains) + 0.25 * bruit(d, 7), 4200) * np.exp(-3.5 * tt / d) * np.minimum(1, tt / 0.05)
    return poser(0.9, (bulle(520, 0.1, 2.5), 0.0, 1.0), (petillement, 0.08, 0.9))


def verres():
    """Tchin ! Deux verres qui trinquent."""
    def verre(freq, duree):
        t = temps(duree)
        return sum(a * np.sin(TAU * freq * r * t) * np.exp(-v * t) for r, a, v in ((1, 1.0, 5), (2.32, 0.5, 8), (4.25, 0.3, 12), (6.63, 0.15, 18))) * np.minimum(1, t / 0.001)
    return salle(poser(0.9, (verre(2150, 0.85), 0.0, 1.0), (verre(2540, 0.8), 0.015, 0.8), (clic(0.01, 5000), 0.0, 0.6)), 0.12, 0.06)


def fusee():
    """Fchhhh : le décollage."""
    d = 1.1
    n = N(d)
    t = np.arange(n) / SR
    x = t / d
    jet = filtre_mobile(bruit(d, 61), 180 * (22 ** x), 0.35)[1] * (0.15 + 0.85 * x ** 1.5)
    grondement = passe_bas(bruit(d, 62), 220) * (1 - x) ** 0.5
    sifflement = np.sin(phase(350 * (7 ** x), n)) * x ** 2 * 0.12
    y = jet + 0.9 * grondement + sifflement
    y[-N(0.12):] *= np.linspace(1, 0, N(0.12)) ** 2
    return bords(y, 0.03, 0.0)


def robot():
    """Bip bop bidibip : un robot qui parle."""
    rng = hasard(91)
    notes = [523, 659, 784, 988, 1175, 1568, 392]
    sons = []
    instant = 0.0
    for k in range(8):
        duree = rng.choice([0.05, 0.07, 0.1])
        f = float(rng.choice(notes))
        son = passe_bas(carre(f if k % 3 else glisse(f, f * 1.5, duree), duree, 0.5), 4500) * bords(np.ones(N(duree)), 0.003, 0.006)
        sons.append((son, instant, 0.9))
        instant += duree + rng.choice([0.012, 0.03])
    return poser(instant + 0.02, *sons)


def pet():
    """Prout."""
    d = 0.6
    n = N(d)
    t = np.arange(n) / SR
    x = t / d
    f = (300 - 150 * x + 30 * np.sin(TAU * 3.1 * t)) * (1 + 0.2 * lisse(hasard(5).normal(0, 1, n), 14))
    f = np.where(x > 0.8, f * (1 - 2.6 * (x - 0.8)), f).clip(16, 400)
    ph = (np.cumsum(f) / SR) % 1
    impulsions = np.exp(-9 * ph) * (1 + 0.5 * hasard(6).normal(0, 1, n))
    y = unite(resonance(impulsions, 400, 200)) + 0.8 * unite(resonance(impulsions, 1000, 300)) + 0.4 * unite(resonance(impulsions, 2200, 500))
    return passe_bas(y, 5000) * (0.5 + 0.5 * np.sin(np.pi * x) ** 0.5) * bords(np.ones(n), 0.008, 0.03)


def pop():
    """Pop : une bulle."""
    return bulle(650, 0.1, 2.6)


def boing():
    """Boi-oi-oing : un ressort."""
    d = 0.7
    n = N(d)
    t = np.arange(n) / SR
    f = 110 * (1 + 1.2 * (1 - np.exp(-25 * t))) * (1 + 0.25 * np.sin(TAU * 7 * t) * np.exp(-3 * t))
    ph = phase(f, n)
    return (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * np.exp(-3 * t) * np.minimum(1, t / 0.004)


def vent():
    """Fffiou : un courant d'air, quelque chose qui file."""
    return echantillon("ambi_swoosh", 0.3, 1.25, 0.3, 0.05)


def bip_de_censure():
    """Biiip : le mot qu'on ne peut pas dire."""
    return bords(sinus(1000, 0.48), 0.004, 0.006)


# nom de l'effet -> fabrication. Les noms seuls sont des extraits d'enregistrements (PRISES).
EFFETS = {
    "triste": trombone_triste, "tada": tada, "choc": accord_choc, "theatre": coup_de_theatre, "choeur": choeur,
    "fantome": fantome, "orgue": orgue_inquietant, "bravo": bonne_reponse, "idee": idee, "clin": clin_doeil, "etoile": scintillement,
    "harpe": harpe, "crane": os_qui_claquent, "yeux": clignement, "cool": cool, "musique": flute, "guitare": guitare, "piano": piano,
    "violon": violon, "saxo": saxo, "trompette": trompette, "telephone": telephone, "cheval": galop, "vertige": vertige,
    "degringolade": degringolade, "tambour": roulement, "argent": caisse_enregistreuse, "boum": explosion, "feu": feu,
    "coeur": coeur, "non": buzzer, "bouchon": bouchon, "tchin": verres, "fusee": fusee,
    "robot": robot, "prout": pet, "pop": pop, "boing": boing, "vent": vent, "censure": bip_de_censure,
}
for _nom in PRISES:
    if _nom != "braises":
        EFFETS[_nom] = (lambda n: (lambda: prise(n)))(_nom)

DUREE_MAX = 1.6
DUREES = {"tonnerre": 1.9}   # quelques effets ont besoin d'un peu plus de temps
NIVEAU = 0.11       # niveau moyen visé, mesuré sur le passage le plus fort
CRETE = 0.85


def finir(y, duree_max=DUREE_MAX):
    """Même niveau pour tous les effets, pas de silence au bout, pas de clic."""
    y = np.asarray(y, dtype=np.float64)
    y = y - np.mean(y)
    y = resample_poly(y, 1, SR // SORTIE)
    y = y[: int(duree_max * SORTIE)]
    fort = np.max(np.abs(y)) + 1e-12
    utiles = np.nonzero(np.abs(y) > fort * 0.004)[0]
    y = y[: utiles[-1] + int(0.02 * SORTIE)] if len(utiles) else y
    k = int(0.012 * SORTIE)
    y[-k:] *= np.linspace(1, 0, k)
    y[: int(0.002 * SORTIE)] *= np.linspace(0, 1, int(0.002 * SORTIE))
    fenetre = int(0.2 * SORTIE)
    if len(y) > fenetre:
        moyen = np.sqrt(np.max(np.convolve(y ** 2, np.ones(fenetre) / fenetre, "valid")))
    else:
        moyen = np.sqrt(np.mean(y ** 2)) * np.sqrt(len(y) / fenetre)
    y = y * (NIVEAU / (moyen + 1e-12))
    crete = np.max(np.abs(y))
    if crete > CRETE:   # les sons très brefs : on arrondit les pointes plutôt que de tout baisser
        y = np.tanh(y / CRETE * 1.2) / np.tanh(1.2) * CRETE if crete < CRETE * 2.2 else y * (CRETE / crete)
    return y.astype(np.float32)


def ecrire(chemin, y):
    with wave.open(chemin, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SORTIE)
        f.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def provenance(nom):
    """D'où vient un effet : enregistrement, notes d'instruments, calcul (ou un mélange)."""
    lignes = []
    for p in sorted(PRISES_UTILISEES):
        d = PRISES[p]
        lignes.append(f"recording “{d['title']}” by {d['author']} on Freesound ({d['source']}), CC0, via ESC-50 clip {d['file']}")
    for e in sorted(ECHANTILLONS_UTILISES):
        lignes.append(f"recording on Freesound ({ECHANTILLONS[e]}), CC0, via the Sonic Pi sample `{e}`")
    instruments = sorted({n.split("/")[0] for n in NOTES_UTILISEES})
    if instruments:
        lignes.append("FluidR3_GM samples: " + ", ".join(i.replace("_", " ") for i in instruments))
    if not lignes or nom in CALCULS:
        lignes.append("computed by tools/effects/effets_sonores.py")
    return "; ".join(lignes)


# Les effets où le calcul s'ajoute à des échantillons ou à un enregistrement.
CALCULS = {"boum", "feu", "idee"}

if __name__ == "__main__":
    dossier = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "..", "..", "extension", "effets")
    seulement = sys.argv[2:]
    os.makedirs(dossier, exist_ok=True)
    origines = {}
    for nom, fabrique in sorted(EFFETS.items()):
        if seulement and nom not in seulement:
            continue
        NOTES_UTILISEES.clear()
        PRISES_UTILISEES.clear()
        ECHANTILLONS_UTILISES.clear()
        try:
            son = finir(fabrique(), DUREES.get(nom, DUREE_MAX))
        except Exception as erreur:   # noqa: BLE001
            print(f"{nom:12s} ERREUR {type(erreur).__name__}: {erreur}")
            continue
        ecrire(os.path.join(dossier, f"{nom}.wav"), son)
        origines[nom] = provenance(nom)
        print(f"{nom:12s} {len(son) / SORTIE:5.2f} s  crête {np.max(np.abs(son)):.2f}")
    if not seulement:
        json.dump(sorted(TOUTES_LES_NOTES), open(os.path.join(ICI, "notes.json"), "w"), indent=1)
        with open(os.path.join(dossier, "SOURCES.md"), "w", encoding="utf8") as f:
            f.write("# Where each sound effect comes from\n\n"
                    "Recordings are public-domain (CC0) clips from Freesound, taken from the ESC-50 dataset\n"
                    "(https://github.com/karolpiczak/ESC-50), which lists the licence of every clip.\n"
                    "A few more public-domain (CC0) Freesound recordings come through the Sonic Pi sample set\n"
                    "(https://github.com/sonic-pi-net/sonic-pi, WAV copies from https://github.com/adafruit/Adafruit-Sound-Samples).\n"
                    "Instrument notes come from the FluidR3_GM soundfont by Frank Wen, as pre-rendered by\n"
                    "midi-js-soundfonts (https://github.com/gleitz/midi-js-soundfonts), Creative Commons\n"
                    "Attribution 3.0. The rest is computed.\n\n| File | Origin |\n| --- | --- |\n")
            for nom, origine in origines.items():
                f.write(f"| `{nom}.wav` | {origine} |\n")
