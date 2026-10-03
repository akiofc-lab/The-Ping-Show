# Tools

Small scripts that generate files of the extension. You only need them if
you want to change the built-in voice packs, jingles or sound effects.

| Folder | What it builds | How |
| --- | --- | --- |
| `packs/` | `extension/packs/*.json`, the three voice packs | `node tools/packs/build-packs.cjs` |
| `jingles/` | `extension/indicatifs/*.wav`, the 51 one-second jingles | `python tools/jingles/make_jingles.py` (needs `numpy` and `scipy`) |
| `effects/` | `extension/effets/*.wav`, the emoji sound effects, and their `SOURCES.md` | see below |

### Sound effects

`effects/effets_sonores.py` cuts the recordings listed in
`effects/prises.json`, assembles instrument notes and computes the rest. It
needs `numpy`, `scipy` and three sets of source sounds, which are not
copied in this repository:

1. the ESC-50 dataset: `git clone https://github.com/karolpiczak/ESC-50`;
2. the FluidR3_GM notes of midi-js-soundfonts
   (https://github.com/gleitz/midi-js-soundfonts, folder `FluidR3_GM`),
   converted to WAV, one folder per instrument and one file per note
   (`trombone/Bb3.wav`). `effects/notes.json` lists the notes used;
3. the Sonic Pi samples as WAV files: the `sonic-pi` folder of
   https://github.com/adafruit/Adafruit-Sound-Samples.
   `effects/echantillons.json` lists the ones used.

Then:

```
ESC50=path/to/ESC-50/audio FLUIDR3=path/to/notes SONICPI=path/to/samples python tools/effects/effets_sonores.py extension/effets
```

Which emoji plays which sound is decided in `extension/moteur/emojis.js`.

The scripts are commented in French, like the rest of the code.
