# Third-party components shipped with The Ping Show

| File | Project | Licence | Source |
| --- | --- | --- | --- |
| `ort.wasm.min.js`, `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm` | ONNX Runtime Web 1.30.0 | MIT | https://github.com/microsoft/onnxruntime |
| `piper_phonemize.js`, `piper_phonemize.wasm` | piper-phonemize (WebAssembly build, package `@diffusionstudio/piper-wasm` 1.0.0) | MIT | https://github.com/rhasspy/piper-phonemize |
| `piper_phonemize.data` | eSpeak NG data | GPL-3.0-or-later | https://github.com/rhasspy/espeak-ng |
| `../polices/syne-*.woff2` | Syne typeface (package `@fontsource/syne` 5.3.0) | SIL Open Font License 1.1 | https://fontsource.org/fonts/syne (licence in `polices/LICENCE-Syne.txt`) |

The voices are not shipped here: The Ping Show downloads them on first use from the
public repository of the Piper project
(https://huggingface.co/rhasspy/piper-voices). Each voice has its own
licence, stated in its `MODEL_CARD` in that repository:

| Voice file | Used for | Dataset | Licence stated in the model card |
| --- | --- | --- | --- |
| `en_US-libritts_r-medium` | characters with an American voice (`"voice": "L…"` in the packs) | LibriTTS-R | CC BY 4.0 |
| `en_GB-vctk-medium` | characters with a British voice (`"voice": "V…"`) | VCTK | CC BY 4.0 |
| `fr_FR-siwis-medium` | messages written in French (female characters) | SIWIS | CC BY 4.0 |
| `fr_FR-tom-medium` | messages written in French (male characters) | French-tts-model-piper | AGPLv3 |
