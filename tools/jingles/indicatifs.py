"""Les indicatifs : un petit motif sonore d'environ 1,3 seconde par voix.

Tous les motifs sont originaux (quelques notes, un bruitage) et ne citent
aucune musique existante.
"""
import numpy as np
from synthe import *

D = 1.3  # durée d'un indicatif, en secondes

NOTES = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def n(nom):
    """Fréquence d'une note : n("A4") = 440."""
    hauteur, octave = nom[:-1], int(nom[-1])
    return 440.0 * 2 ** ((NOTES[hauteur] - 9) / 12 + (octave - 4))


def western():
    p = Piste(D)
    p.poser(sifflet(n("E5"), 0.3), 0.0, 0.7).poser(sifflet(glisse(n("E5"), n("G5"), 0.4, 0.4), 0.4), 0.3, 0.7)
    twang = corde(n("E2"), 0.6, 0.35) * (1 + 0.3 * np.sin(TAU * 7 * temps(0.6)))
    return p.poser(twang, 0.72, 1.0).rendre()


def funk():
    p = Piste(D)
    for instant, note, duree in [(0.0, "E2", 0.16), (0.2, "E2", 0.1), (0.36, "G2", 0.16), (0.56, "A2", 0.14), (0.72, "E3", 0.3)]:
        p.poser(passe_bas(corde(n(note), duree, 0.8), 1800), instant, 1.0)
    accord = sum(scie(n(x), 0.3) for x in ("E4", "G#4", "D5"))
    balayage = np.zeros_like(accord); bas = bande = 0.0
    for i, f in enumerate(glisse(500, 2600, 0.3)):
        k = 2 * np.sin(np.pi * f / SR); bas += k * bande; haut = accord[i] - bas - 0.4 * bande; bande += k * haut; balayage[i] = bande
    p.poser(balayage * enveloppe(len(balayage), 0.01, 0.05, 0.7, 0.1), 0.92, 0.25)
    return p.poser(cymbale(), 0.2, 0.3).poser(cymbale(), 0.56, 0.3).rendre()


def solennel():
    p = Piste(D)
    for k in range(7):
        p.poser(np.sin(phase(92, int(SR * 0.16))) * percussif(int(SR * 0.16), 16), 0.07 * k, 0.25 + 0.1 * k)
    for note in ("C4", "E4", "G4", "C3"):
        c = cuivre(n(note), 0.8, 1800)
        p.poser(c * np.linspace(0.4, 1, len(c)), 0.5, 0.5)
    return p.rendre()


def megaphone():
    p = Piste(D)
    sirene = carre(np.concatenate([glisse(600, 1100, 0.3), glisse(600, 1100, 0.3), glisse(600, 1100, 0.3)]), 0.9)
    p.poser(passe_bande(sirene, 500, 2500) * enveloppe(len(sirene), 0.01, 0.02, 0.9, 0.05), 0.0, 0.6)
    larsen = sinus(glisse(2600, 3100, 0.3), 0.3) * enveloppe(int(SR * 0.3), 0.08, 0.05, 0.6, 0.12)
    return p.poser(larsen, 0.95, 0.35).rendre()


def banjo():
    p = Piste(D)
    for k, note in enumerate(["G3", "B3", "D4", "G4", "D4", "B3", "G4"]):
        p.poser(corde(n(note), 0.35, 1.0, graine=k + 1), 0.11 * k, 0.8)
    return p.poser(corde(n("G2"), 0.5, 0.8), 0.78, 0.9).poser(corde(n("B4"), 0.5, 1.0), 0.8, 0.7).rendre()


def clavecin():
    p = Piste(D)
    for k, note in enumerate(["E5", "F#5", "E5", "F#5", "E5", "D5", "C#5"]):
        p.poser(passe_haut(corde(n(note), 0.25, 1.0, graine=k + 2), 500), 0.08 * k, 0.7)
    for note in ("A3", "E4", "C#5", "A5"):
        p.poser(passe_haut(corde(n(note), 0.7, 1.0), 300), 0.6, 0.7)
    return p.rendre()


def huit_bits():
    p = Piste(D)
    for k, note in enumerate(["C5", "E5", "G5", "C6", "G5", "C6"]):
        m = int(SR * 0.09)
        p.poser(carre(n(note), 0.09, 0.25) * enveloppe(m, 0.002, 0.01, 0.8, 0.01), 0.1 * k, 0.5)
    m = int(SR * 0.35)
    return p.poser(carre(n("E6"), 0.35, 0.5) * enveloppe(m, 0.002, 0.05, 0.5, 0.2), 0.7, 0.5).rendre()


def sifflet_coulisse():
    p = Piste(D)
    m = int(SR * 0.55)
    p.poser(np.sin(phase(glisse(450, 1700, 0.55, 1.6), m)) * enveloppe(m, 0.02, 0.05, 0.9, 0.04), 0.0, 0.7)
    p.poser(grosse_caisse(0.12, 500, 180), 0.6, 0.9)
    m = int(SR * 0.3)
    return p.poser(np.sin(phase(glisse(1500, 500, 0.3), m)) * enveloppe(m, 0.01, 0.05, 0.8, 0.08), 0.82, 0.6).rendre()


def cloche_ecole():
    p = Piste(D)
    for k in range(13):
        p.poser(cloche(1900, 0.25, 2.4, 2.0), 0.075 * k, 0.5 + 0.03 * (k % 2))
    return p.rendre()


def piano_muet():
    p = Piste(D)
    for k, note in enumerate(["D3", "F3", "A3", "D4", "F4"]):
        p.poser(piano(n(note) * (1 + 0.004 * ((k % 2) * 2 - 1)), 0.9), 0.13 * k, 0.6)
    y = passe_bande(p.y, 300, 3000)
    p.y = y * (1 + 0.08 * np.sin(TAU * 6 * temps(D)))
    return p.rendre()


def twang():
    p = Piste(D)
    for instant, note in [(0.0, "A2"), (0.28, "C3"), (0.56, "E3")]:
        c = corde(n(note), 0.75, 0.55)
        p.poser(c * (1 + 0.35 * np.sin(TAU * 6.5 * temps(0.75))), instant, 0.9)
    return p.poser(cymbale(0.25), 0.56, 0.2).rendre()


def synthe_glisse():
    p = Piste(D)
    f = np.concatenate([np.full(int(SR * 0.3), n("G5")), glisse(n("G5"), n("D5"), 0.25), np.full(int(SR * 0.25), n("D5")), glisse(n("D5"), n("E5"), 0.1), np.full(int(SR * 0.4), n("E5"))])
    m = len(f)
    lead = passe_bas(np.sin(phase(f, m)) + 0.3 * scie(f, m / SR), 3000) * enveloppe(m, 0.03, 0.05, 0.85, 0.2)
    return p.poser(lead, 0.0, 0.6).poser(grosse_caisse(), 0.0, 0.9).poser(caisse_claire(), 0.65, 0.5).rendre()


def boing():
    p = Piste(D)
    t = temps(0.7)
    ressort = np.sin(TAU * np.cumsum(170 + 150 * np.exp(-3.5 * t) * np.sin(TAU * 17 * t)) / SR) * np.exp(-3 * t)
    p.poser(ressort, 0.0, 0.9)
    m = int(SR * 0.5)
    return p.poser(np.sin(phase(glisse(1300, 320, 0.5, 0.7), m)) * enveloppe(m, 0.02, 0.05, 0.8, 0.1), 0.72, 0.6).rendre()


def verre():
    p = Piste(D)
    for k, note in enumerate(["C6", "G6", "E7", "C7"]):
        p.poser(cloche(n(note), 0.9, 3.5, 1.2), 0.12 * k, 0.5)
    return p.rendre()


def tremblant():
    p = Piste(D)
    for instant, note in [(0.0, "E5"), (0.13, "D#5"), (0.31, "E5"), (0.42, "C5"), (0.66, "C#5"), (0.75, "A4"), (0.98, "A#4")]:
        x = cloche(n(note), 0.25, 4.0, 1.5)
        p.poser(x * (1 + 0.5 * np.sin(TAU * 11 * temps(0.25))), instant, 0.6)
    return p.rendre()


def trompette_jouet():
    p = Piste(D)
    for instant, note, duree in [(0.0, "G4", 0.15), (0.2, "G4", 0.15), (0.42, "C5", 0.7)]:
        m = int(SR * duree)
        son = passe_bande(carre(n(note) * (1 + 0.01 * np.sin(TAU * 7 * np.arange(m) / SR)), duree, 0.3), 700, 3000)
        p.poser(son * enveloppe(m, 0.01, 0.03, 0.8, 0.06), instant, 0.7)
    return p.rendre()


def sitcom():
    p = Piste(D)
    p.poser(passe_bas(corde(n("C2"), 0.4, 0.7), 1500), 0.0, 1.0).poser(passe_bas(corde(n("G2"), 0.3, 0.7), 1500), 0.3, 1.0)
    for note in ("E4", "G4", "C5"):
        p.poser(cuivre(n(note), 0.14), 0.55, 0.45).poser(cuivre(n(note) * 2 ** (2 / 12), 0.5), 0.72, 0.45)
    return p.poser(cymbale(0.3), 0.72, 0.35).rendre()


def tuba():
    p = Piste(D)
    p.poser(cuivre(n("F2"), 0.45, 700), 0.0, 1.0).poser(cuivre(n("C2"), 0.7, 600), 0.52, 1.0)
    return p.rendre()


def bips():
    p = Piste(D)
    alea = hasard(21)
    for k in range(9):
        f = alea.choice([880, 1175, 1320, 1568, 1760, 2093])
        m = int(SR * 0.07)
        p.poser(np.sin(phase(f, m)) * enveloppe(m, 0.004, 0.01, 0.9, 0.01), 0.13 * k + alea.uniform(0, 0.03), 0.5)
    return p.rendre()


def descente():
    p = Piste(D)
    for k, note in enumerate(["E5", "C5", "A4"]):
        m = int(SR * 0.4)
        son = passe_bas(scie(n(note), 0.4) + scie(n(note) * 1.006, 0.4), 2200) * enveloppe(m, 0.02, 0.1, 0.6, 0.12)
        p.poser(son, 0.38 * k, 0.5)
    return p.rendre()


def note_unique():
    t = temps(D)
    y = (np.sin(TAU * 220 * t) + 0.5 * np.sin(TAU * 440 * t) + 0.2 * np.sin(TAU * 660 * t)) * np.sin(np.pi * t / D) ** 1.5
    return Piste(D).poser(y).rendre(0.4)


def zap():
    p = Piste(D)
    p.poser(souffle_filtre(0.35, 400, 5000) * enveloppe(int(SR * 0.35), 0.01, 0.05, 0.8, 0.05), 0.0, 0.6)
    for k, note in enumerate(["C4", "E4", "G4", "B4", "D5", "G5"]):
        m = int(SR * 0.1)
        p.poser(passe_bas(scie(n(note), 0.1), 4000) * enveloppe(m, 0.003, 0.02, 0.7, 0.02), 0.3 + 0.09 * k, 0.5)
    alea = hasard(4)
    for _ in range(14):
        p.poser(clic(0.006, 5000, graine=int(alea.integers(1, 999))), alea.uniform(0.85, 1.25), 0.7)
    return p.rendre()


def sonar():
    p = Piste(D)
    for instant, f, v in [(0.0, 880, 1.0), (0.42, 660, 0.7), (0.84, 880, 0.35)]:
        m = int(SR * 0.45)
        p.poser(np.sin(phase(f, m)) * percussif(m, 7), instant, v)
    return p.rendre()


def fanfare():
    p = Piste(D)
    for note in ("C4", "G4"):
        p.poser(cuivre(n(note), 0.3, 3000), 0.0, 0.5)
    for note in ("C4", "G4", "C5", "E5"):
        p.poser(cuivre(n(note), 0.8, 3200), 0.36, 0.45)
    return p.poser(cloche(310, 0.9, 1.41, 5.0), 0.36, 0.6).poser(grosse_caisse(0.5, 90, 35), 0.36, 0.9).rendre()


def grincement():
    p = Piste(D)
    m = int(SR * D)
    for f0, f1 in [(620, 410), (880, 600)]:
        f = glisse(f0, f1, D, 0.6) * (1 + 0.01 * np.sin(TAU * 9 * temps(D)))
        p.poser(passe_bande(scie(f, D), 300, 4000) * enveloppe(m, 0.25, 0.1, 0.8, 0.3), 0.0, 0.5)
    return p.poser(passe_haut(bruit(D, 6), 5000) * enveloppe(m, 0.3, 0.1, 0.5, 0.4), 0.0, 0.08).rendre(0.4)


def harpe():
    p = Piste(D)
    for k, note in enumerate(["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5", "C6"]):
        p.poser(corde(n(note), 0.8, 0.6, graine=k + 3), 0.055 * k, 0.6)
    cor = cuivre(n("C3"), 1.0, 900)
    return p.poser(cor, 0.25, 0.35).rendre()


def metal():
    p = Piste(D)
    p.poser(cloche(300, 0.5, 1.41, 6.0), 0.0, 0.8).poser(cloche(300, 0.5, 1.41, 6.0), 0.38, 0.8)
    return p.poser(grosse_caisse(0.55, 80, 30), 0.76, 1.0).poser(cloche(180, 0.5, 1.41, 7.0), 0.76, 0.5).rendre()


def accord_chaud():
    p = Piste(D)
    for k, note in enumerate(["F3", "A3", "C4", "E4"]):
        p.poser(piano(n(note), 1.2), 0.07 * k, 0.6)
    return p.rendre()


def kazoo():
    p = Piste(D)
    for instant, note, duree in [(0.0, "C5", 0.16), (0.2, "E5", 0.16), (0.4, "G5", 0.16), (0.62, "E5", 0.6)]:
        m = int(SR * duree)
        f = n(note) * (1 + 0.02 * np.sin(TAU * 6 * np.arange(m) / SR))
        p.poser(passe_bande(scie(f, duree) + carre(f, duree, 0.2), 900, 3500) * enveloppe(m, 0.02, 0.03, 0.8, 0.05), instant, 0.5)
    return p.rendre()


def soprano():
    p = Piste(D)
    f = np.concatenate([np.full(int(SR * 0.2), n("C5")), glisse(n("C5"), n("E5"), 0.08), np.full(int(SR * 0.17), n("E5")), glisse(n("E5"), n("G5"), 0.08), np.full(int(SR * 0.17), n("G5")), glisse(n("G5"), n("C6"), 0.1), np.full(int(SR * 0.5), n("C6"))])
    m = len(f); t = np.arange(m) / SR
    f = f * (1 + 0.018 * np.sin(TAU * 5.8 * t) * np.minimum(1, t / 0.4))
    ph = TAU * np.cumsum(f) / SR
    voix = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    return p.poser(voix * enveloppe(m, 0.06, 0.1, 0.85, 0.2), 0.0, 0.6).rendre()


def xylophone():
    p = Piste(D)
    for k, note in enumerate(["C5", "D5", "E5", "G5", "A5", "C6", "E6", "C6"]):
        p.poser(cloche(n(note), 0.25, 3.0, 0.8), 0.085 * k if k < 7 else 0.75, 0.6)
    return p.rendre()


def pop():
    p = Piste(D)
    for instant, f0 in [(0.0, 900), (0.2, 1300)]:
        m = int(SR * 0.12)
        p.poser(np.sin(phase(glisse(f0, f0 * 1.7, 0.12), m)) * np.sin(np.pi * np.arange(m) / m), instant, 0.7)
    for k, note in enumerate(["E6", "G#6", "B6", "E7"]):
        p.poser(cloche(n(note), 0.5, 3.5, 1.0), 0.45 + 0.07 * k, 0.4)
    return p.rendre()


def demarrage():
    p = Piste(D)
    for k, note in enumerate(["C4", "G4", "C5"]):
        m = int(SR * 0.22)
        p.poser(carre(n(note), 0.22, 0.5) * enveloppe(m, 0.005, 0.02, 0.7, 0.03), 0.25 * k, 0.4)
    m = int(SR * 0.4)
    return p.poser(carre(n("E5"), 0.4, 0.5) * enveloppe(m, 0.005, 0.1, 0.5, 0.2), 0.8, 0.4).poser(clic(0.02, 1500), 0.0, 0.6).rendre()


def boum():
    p = Piste(D)
    p.poser(grosse_caisse(0.9, 95, 30), 0.0, 1.0).poser(passe_bas(bruit(0.3, 8), 400) * percussif(int(SR * 0.3), 14), 0.0, 0.6)
    return p.poser(cuivre(n("D2"), 1.1, 500), 0.15, 0.5).poser(cuivre(n("A2"), 1.0, 600), 0.3, 0.35).rendre()


def sonnette():
    p = Piste(D)
    for instant in (0.0, 0.22, 0.4):
        p.poser(cloche(2100, 0.7, 2.0, 1.5), instant, 0.7)
    return p.rendre()


def jingle_radio():
    p = Piste(D)
    for instant, accord, duree in [(0.0, ("C4", "E4", "G4"), 0.16), (0.2, ("D4", "F#4", "A4"), 0.16), (0.42, ("G4", "B4", "D5", "G5"), 0.85)]:
        m = int(SR * duree)
        for note in accord:
            p.poser(passe_bas(scie(n(note), duree) + scie(n(note) * 1.005, duree), 5000) * enveloppe(m, 0.005, 0.05, 0.7, 0.15), instant, 0.3)
    return p.poser(cymbale(0.4), 0.42, 0.4).poser(grosse_caisse(), 0.0, 0.7).poser(grosse_caisse(), 0.42, 0.7).rendre()


def corne():
    p = Piste(D)
    m = int(SR * 0.7)
    klaxon = passe_bande(scie(349, 0.7) + scie(440, 0.7) + scie(352, 0.7), 300, 3500) * enveloppe(m, 0.02, 0.05, 0.9, 0.08)
    p.poser(klaxon, 0.0, 0.5)
    m = int(SR * 0.45)
    roulette = np.sin(phase(2900, m)) * (0.6 + 0.4 * np.sign(np.sin(TAU * 28 * np.arange(m) / SR)))
    return p.poser(roulette * enveloppe(m, 0.01, 0.02, 0.9, 0.05), 0.8, 0.4).rendre()


def impact():
    p = Piste(D)
    montee = souffle_filtre(0.6, 200, 3500) * np.linspace(0, 1, int(SR * 0.6)) ** 2
    p.poser(montee, 0.0, 0.5)
    return p.poser(grosse_caisse(0.7, 70, 28), 0.6, 1.0).poser(passe_bas(bruit(0.7, 3), 300) * percussif(int(SR * 0.7), 5), 0.6, 0.8).rendre()


def cloche_bateau():
    p = Piste(D)
    p.poser(cloche(900, 0.6, 2.2, 2.5), 0.0, 0.7).poser(cloche(900, 0.6, 2.2, 2.5), 0.22, 0.7)
    for note in ("D4", "F#4", "A4"):
        m = int(SR * 0.7)
        anche = passe_bas(carre(n(note), 0.7, 0.4) + scie(n(note) * 1.004, 0.7), 2500) * enveloppe(m, 0.05, 0.1, 0.8, 0.15)
        p.poser(anche * (1 + 0.1 * np.sin(TAU * 5 * temps(0.7))), 0.55, 0.25)
    return p.rendre()


def lame():
    p = Piste(D)
    for instant in (0.0, 0.5):
        p.poser(souffle_filtre(0.22, 6000, 900, graine=int(17 + instant * 10)) * np.sin(np.pi * np.linspace(0, 1, int(SR * 0.22))), instant, 0.6)
        p.poser(clic(0.03, 1800), instant + 0.24, 1.0).poser(np.sin(phase(600, int(SR * 0.06))) * percussif(int(SR * 0.06), 60), instant + 0.24, 0.6)
    return p.poser(np.sin(phase(300, int(SR * 0.2))) * percussif(int(SR * 0.2), 25), 1.02, 0.7).rendre()


def notification():
    p = Piste(D)
    p.poser(cloche(n("E6"), 0.5, 2.0, 0.8), 0.0, 0.6).poser(cloche(n("A6"), 0.7, 2.0, 0.8), 0.14, 0.6)
    return p.poser(clic(0.015, 3500), 0.75, 0.8).poser(clic(0.02, 2200, 12), 0.83, 0.8).rendre()


def tapotements():
    p = Piste(D)
    for k, instant in enumerate((0.0, 0.14, 0.3, 0.4, 0.62)):
        p.poser(passe_bas(clic(0.02, 1200, graine=30 + k), 2500), instant, 0.9)
    m = int(SR * 0.55)
    return p.poser(passe_bande(bruit(0.55, 14), 2500, 7000) * np.sin(np.pi * np.arange(m) / m) ** 2, 0.72, 0.12).rendre(0.35)


def orgue_mineur():
    p = Piste(D)
    for note in ("A2", "A3", "C4", "E4"):
        o = orgue(n(note), 1.15, (1, 0.7, 0.5, 0.4, 0.25))
        p.poser(o * (1 + 0.08 * np.sin(TAU * 5.5 * temps(1.15))), 0.0, 0.4)
    return p.rendre()


def double_bip():
    p = Piste(D)
    for instant, f in [(0.0, 1000), (0.18, 1400)]:
        m = int(SR * 0.12)
        p.poser(np.sin(phase(f, m)) * enveloppe(m, 0.005, 0.01, 0.9, 0.02), instant, 0.5)
    m = int(SR * 0.6)
    return p.poser((np.sin(phase(520, m)) + 0.5 * np.sin(phase(780, m))) * enveloppe(m, 0.03, 0.1, 0.6, 0.3), 0.5, 0.4).rendre(0.4)


def glitch():
    p = Piste(D)
    alea = hasard(8)
    t = 0.0
    while t < 1.15:
        duree = alea.uniform(0.02, 0.09)
        m = int(SR * duree)
        son = carre(alea.uniform(150, 2500), duree) if alea.random() < 0.7 else alea.uniform(-1, 1, m)
        p.poser(np.round(son * 3) / 3 * enveloppe(m, 0.001, 0.005, 0.9, 0.003), t, 0.45)
        t += duree + alea.choice([0.0, 0.0, 0.03, 0.08])
    return p.rendre()


def boite_a_musique():
    p = Piste(D)
    for k, note in enumerate(["G5", "E5", "C6", "B5", "G5", "A5"]):
        p.poser(cloche(n(note), 0.5, 4.0, 0.6), 0.17 * k, 0.6)
    return p.poser(grosse_caisse(0.1, 600, 200), 1.08, 0.6).rendre()


def tonnerre():
    p = Piste(D)
    m = int(SR * D)
    gronde = passe_bas(bruit(D, 2), 350) * percussif(m, 2.2, 0.01) * (1 + 0.5 * np.sin(TAU * 9 * temps(D)))
    p.poser(gronde, 0.0, 1.0).poser(passe_bande(bruit(0.08, 5), 800, 5000) * percussif(int(SR * 0.08), 40), 0.0, 0.5)
    for note in ("A1", "C2", "E2"):
        p.poser(piano(n(note), 1.0), 0.3, 0.5)
    return p.rendre()


def glissade_basse():
    p = Piste(D)
    m = int(SR * 0.35)
    p.poser(passe_bas(scie(glisse(n("E2"), n("A2"), 0.35, 0.5), 0.35), 900) * enveloppe(m, 0.01, 0.05, 0.9, 0.05), 0.0, 0.9)
    for instant, note in [(0.4, "A2"), (0.58, "C3"), (0.78, "A2")]:
        p.poser(passe_bas(corde(n(note), 0.3, 0.9), 2200), instant, 0.9)
    return p.poser(cymbale(0.3), 0.78, 0.3).rendre()


def basse_feutree():
    p = Piste(D)
    for instant, note in [(0.0, "G2"), (0.45, "A#2")]:
        p.poser(passe_bas(corde(n(note), 0.4, 0.3), 700), instant, 1.0)
    claquement = passe_bande(bruit(0.03, 19), 1500, 3500) * percussif(int(SR * 0.03), 80)
    return p.poser(claquement, 0.9, 0.6).poser(claquement, 0.94, 0.25).poser(claquement, 0.99, 0.12).rendre()


def piano_pub():
    p = Piste(D)
    for instant in (0.0, 0.4):
        for note in ("C4", "E4", "G4", "A#4"):
            p.poser(piano(n(note) * 1.004, 0.6), instant, 0.4).poser(piano(n(note) * 0.996, 0.6), instant + 0.012, 0.4)
    return p.poser(piano(n("C3"), 0.5), 0.8, 0.7).poser(piano(n("C5"), 0.5), 0.8, 0.5).rendre()


def donnees():
    p = Piste(D)
    alea = hasard(33)
    for k in range(22):
        m = int(SR * 0.035)
        p.poser(carre(1200 if alea.random() < 0.5 else 2200, 0.035) * enveloppe(m, 0.002, 0.002, 1, 0.002), 0.04 * k, 0.4)
    return p.poser(clic(0.03, 900), 0.95, 0.9).poser(cloche(1800, 0.3, 2.0, 1.0), 1.0, 0.5).rendre()


INDICATIFS = {f.__name__: f for f in [
    western, funk, solennel, megaphone, banjo, clavecin, huit_bits, sifflet_coulisse, cloche_ecole, piano_muet,
    twang, synthe_glisse, boing, verre, tremblant, trompette_jouet, sitcom, tuba, bips, descente, note_unique,
    zap, sonar, fanfare, grincement, harpe, metal, accord_chaud, kazoo, soprano, xylophone, pop, demarrage, boum,
    sonnette, jingle_radio, corne, impact, cloche_bateau, lame, notification, tapotements, orgue_mineur,
    double_bip, glitch, boite_a_musique, tonnerre, glissade_basse, basse_feutree, piano_pub, donnees,
]}

if __name__ == "__main__":
    import time
    for nom, f in INDICATIFS.items():
        t0 = time.time(); y = f()
        assert np.isfinite(y).all(), nom
        print(f"{nom:18s} {len(y)/SR:.2f}s crête={np.abs(y).max():.2f} rms={np.sqrt(np.mean(y**2)):.3f} {int((time.time()-t0)*1000)} ms")
