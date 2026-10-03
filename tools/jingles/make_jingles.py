"""Fabrique tous les indicatifs : un petit motif d'une seconde chacun, en fichier WAV (nommé d'après le motif).

Ce sont les indicatifs des tests de voix (1,3 s), resserrés : les notes gardent leur son,
mais se suivent plus vite. Tout est calculé, aucun enregistrement, aucune musique existante.
"""
import os, sys, wave
import numpy as np
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "extension", "indicatifs")
import synthe, indicatifs
from synthe import SR

DUREE = 1.0
RAPPORT = DUREE / indicatifs.D
indicatifs.D = DUREE
poser_origine = synthe.Piste.poser
def poser(self, son, instant=0.0, volume=1.0):
    return poser_origine(self, son, instant * RAPPORT, volume)
synthe.Piste.poser = poser

for f in os.listdir(SORTIE): os.remove(os.path.join(SORTIE, f))
CHOIX = {nom: nom for nom in indicatifs.INDICATIFS}
FREQ = 22050
for perso, nom in CHOIX.items():
    y = indicatifs.INDICATIFS[nom]().astype(np.float64)
    assert abs(len(y) - SR * DUREE) < 3, (nom, len(y))
    k = int(SR * 0.12); y[-k:] *= np.linspace(1, 0, k) ** 1.5           # la fin s'éteint en douceur
    # Même niveau perçu pour tous (comme dans les tests) : volume moyen visé, crête limitée.
    y *= 0.085 / max(np.sqrt(np.mean(y ** 2)), 1e-9)
    m = np.abs(y).max()
    if m > 0.5: y *= 0.5 / m
    y = resample_poly(y, 1, 2)                                           # 44,1 kHz → 22,05 kHz
    pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
    with wave.open(os.path.join(SORTIE, f"{perso}.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(FREQ); f.writeframes(pcm.tobytes())
    e = y ** 2
    print(f"{perso:12s} {nom:16s} {len(y)/FREQ:.2f}s rms={np.sqrt(e.mean()):.3f} crête={np.abs(y).max():.2f} dernier quart={e[int(FREQ*.75):].sum()/e.sum():.2f}")
