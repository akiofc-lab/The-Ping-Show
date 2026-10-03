# Changelog

## 6.5.1 — 2026-10-03

First public version.

- Play catches up on the messages never read before (up to a day old),
  then goes live; the button shows how many there are.
- Reads the Discord thread shown in the browser, live or as a replay, with
  one character voice per person; voices computed locally (Piper, ONNX
  Runtime Web).
- Three voice packs (52 characters), each character with a jingle,
  catchphrases, background sounds and a face. Packs are JSON files and can
  be added from the panel.
- People can pick their own voice with `!voice name` or a `[name]` tag in
  their nickname; the listener can override.
- People can refuse to be read with `!voice off` or an `[off]` tag in
  their nickname; the listener cannot override that.
- Whole messages are read; web addresses, e-mail addresses, file paths,
  code blocks and hidden text are skipped.
- Emojis, server emojis and typed smileys are played as sound effects in
  their place in the message (about eighty sounds); a few are spoken by
  the character (“Oh!”, “Hmm.”, “Oops!”).
- Global keyboard shortcuts (play / pause, previous, next).
- Panel in English or French; messages read in English or French.
