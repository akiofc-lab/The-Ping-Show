# Privacy

The Ping Show is built so that nothing you read leaves your computer.

## What the extension reads

- The messages shown on the Discord page of your browser (author name and
  text), while the panel is open: to read them aloud when reading is on,
  and otherwise only to count the messages you have not heard yet.
- The title of the Discord tab, to show which thread is being read.

## What it does with it

- The text is turned into speech **inside your browser**. It is not sent to
  any server, and it is not stored.
- The extension keeps, in the browser's local storage on your computer:
  your settings, the list “name → character” of people already heard, the
  numbers (not the text) of the messages already read, and any voice pack
  you added. Removing the extension removes them.

## Network access

- The only network requests are the one-time downloads of the voice files
  from the public Piper voices repository on Hugging Face
  (`huggingface.co/rhasspy/piper-voices`). They are then kept in the
  browser cache. Hugging Face sees that download request, like any website
  you fetch a file from; it does not receive any message text.
- To avoid even that, put the voice files in `extension/voix/` (see the
  `README.txt` there).

## The eye icon

So that the eye of the toolbar icon can follow the pointer, the Discord
page and the panel tell the extension's own background script which way the
pointer is. That direction stays inside the browser.

## If you do not want to be read

Anyone in a thread can type `!voice off`, or add `[off]` to their nickname:
The Ping Show then stops reading their messages, and the listener cannot
turn that back on. The command reaches the listeners whose Discord page
shows it; the nickname tag is seen with every message, so it always works.

## What it does not do

- It does not post, edit or delete anything on Discord, and does not act on
  your account. On the page, it only scrolls the conversation and outlines
  the message being read.
- It contains no analytics, no advertising and no tracking.

## Permissions, and why

| Permission | Why |
| --- | --- |
| Access to `discord.com` | Read the messages shown on the page |
| Access to `huggingface.co` | Download the voice files once |
| `sidePanel` | Show the panel |
| `storage`, `unlimitedStorage` | Keep settings, added voice packs and the voice files |
| `scripting` | Start reading in a Discord tab that was already open |
