# Notices

The Ping Show is copyright (C) 2026 François-Akio Côté and is distributed under the
GNU General Public License, version 3 or later (see [LICENSE](LICENSE)).

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE. Its author is not responsible for how it
is used; see the Disclaimer section of the [README](README.md).

The GPL was chosen because the extension ships eSpeak NG data (through the
piper-phonemize WebAssembly build), which is under the GPL version 3 or
later.

## Third-party components shipped in `extension/`

| File | Project | Licence | Source |
| --- | --- | --- | --- |
| `vendor/ort.wasm.min.js`, `vendor/ort-wasm-simd-threaded.*` | ONNX Runtime Web 1.30.0 | MIT | https://github.com/microsoft/onnxruntime |
| `vendor/piper_phonemize.js`, `vendor/piper_phonemize.wasm` | piper-phonemize (WebAssembly build, package `@diffusionstudio/piper-wasm` 1.0.0) | MIT | https://github.com/rhasspy/piper-phonemize |
| `vendor/piper_phonemize.data` | eSpeak NG data | GPL-3.0-or-later | https://github.com/rhasspy/espeak-ng |
| `polices/syne-*.woff2` | Syne typeface (package `@fontsource/syne` 5.3.0) | SIL Open Font License 1.1 | https://fontsource.org/fonts/syne (licence in `polices/LICENCE-Syne.txt`) |

## Sound effects shipped in `extension/effets/`

The emoji sound effects come from four places; `extension/effets/SOURCES.md`
gives the origin of every file.

- **Recordings.** Public-domain sounds (CC0 1.0) published on Freesound by
  their authors, obtained through the ESC-50 dataset
  (https://github.com/karolpiczak/ESC-50). ESC-50 as a collection is under
  CC BY-NC; only clips that its `LICENSE` file marks as CC0 at their source
  are used here, shortened, and each is listed with its author and its
  Freesound address.
- **More recordings.** A few other public-domain sounds (CC0 1.0) from
  Freesound, obtained through the sample set of the Sonic Pi project
  (https://github.com/sonic-pi-net/sonic-pi), in the WAV copies published
  by Adafruit (https://github.com/adafruit/Adafruit-Sound-Samples). Sonic
  Pi lists the source of each sample.
- **Instrument notes.** The FluidR3_GM soundfont by Frank Wen, as
  pre-rendered by the midi-js-soundfonts project
  (https://github.com/gleitz/midi-js-soundfonts), Creative Commons
  Attribution 3.0. The notes are assembled into short motifs by
  `tools/effects/effets_sonores.py`.
- **Computed sounds.** Made by the same script, with no recording.

## Voices

The voices are not shipped in this repository: The Ping Show downloads them on first use from the
public repository of the Piper project
(https://huggingface.co/rhasspy/piper-voices). Each voice has its own
licence, stated in its `MODEL_CARD` in that repository:

| Voice file | Used for | Dataset | Licence stated in the model card |
| --- | --- | --- | --- |
| `en_US-libritts_r-medium` | characters with an American voice (`"voice": "L…"` in the packs) | LibriTTS-R | CC BY 4.0 |
| `en_GB-vctk-medium` | characters with a British voice (`"voice": "V…"`) | VCTK | CC BY 4.0 |
| `fr_FR-siwis-medium` | messages written in French (female characters) | SIWIS | CC BY 4.0 |
| `fr_FR-tom-medium` | messages written in French (male characters) | French-tts-model-piper | AGPLv3 |

## Original material

The character voices' settings, catchphrases, faces, jingles and background
sounds were made for this project. The jingles and background sounds are
computed (see `tools/jingles/` and `extension/moteur/ambiances.js`); they
contain no recording and quote no existing music. The characters are
archetypes, not imitations of real people or existing characters.

The “the ping show” logo and the eye icon drawn from it were designed by
François-Akio Côté. The logo is not covered by the GPL; all rights reserved. They are
included so that the extension works as published; if you distribute a
modified version, replace them with your own.

Discord is a trademark of Discord Inc. The Ping Show is not affiliated with,
endorsed by, or supported by Discord.
