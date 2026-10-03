# Files

[← Back to the README](../README.md)

The source code is commented in French.

| File | Role |
| --- | --- |
| `manifest.json` | Extension declaration |
| `fond.js` | Opens the panel, relays the global shortcut, moves the eye of the icon |
| `contenu.js` | Finds the messages in the Discord page |
| `panneau.html`, `.css`, `.js` | The panel: controls, cast, sound output |
| `packs/` | The three voice packs (JSON) |
| `moteur/paquets.js` | Reads and checks voice packs |
| `moteur/personnages.js` | Base voices, catchphrase drawing |
| `moteur/effets.js` | Voice effects |
| `moteur/ambiances.js` | Background sounds (computed, no audio files) |
| `indicatifs/` | Fifty-one one-second jingles (original, computed tunes) |
| `moteur/icones.js` | Shows the character faces |
| `moteur/logo.js` | The logo and its eyes |
| `moteur/textes.js` | Panel texts, in English and French |
| `moteur/genre.js` | First names used to guess gender |
| `moteur/texte.js` | Message clean-up, language detection |
| `moteur/emojis.js` | Which sound effect, or which word, each emoji and smiley gives |
| `effets/` | The emoji sound effects, and `SOURCES.md` with the origin of each one |
| `moteur/ouvrier.js` | Speech synthesis (background worker) |
| `polices/` | Syne typeface |
| `vendor/` | Third-party engines: ONNX Runtime and phonemization (see `LICENCES.md`, which also lists the licence of each voice) |

| `tools/packs/` | Builds the three voice packs (`node tools/packs/build-packs.cjs`) |
| `tools/jingles/` | Builds the jingles (`python tools/jingles/make_jingles.py`, needs numpy and scipy) |
| `tools/effects/` | Builds the emoji sound effects (see `tools/README.md`) |
