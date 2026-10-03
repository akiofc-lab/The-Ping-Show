# User guide

[← Back to the README](../README.md)

## Use

Open Discord in a Chrome tab (`discord.com/app`), show a channel or a
thread, then click the eye icon: the panel opens on the side and shows the name of
the thread it is about to read (“with #channel | server”). Press Play: the
curtains open and the reading starts.

If you switch to another channel or thread in Discord, the panel follows on
its own; there is no need to reload the Discord page, including after an
update of the extension. When Discord shows a thread next to a channel, the
thread is the one being read.

Messages are read in full, however long and however many paragraphs. Web
addresses, e-mail addresses, file paths, long identifiers, code blocks and
hidden (spoiler) text are never read out; a message that contains nothing
else is skipped.

Emojis are not read either: each one plays a sound effect at the place
where it was written (see *Emoji sounds* below). The Discord
desktop app will not do; the extension only sees the web version.

### Controls

| Button | What it does |
| --- | --- |
| **Play** | Starts the reading. If the thread holds messages that were never read to you and are less than a day old, the button says how many (“Play / 3 new messages”): it reads those first, in order, then goes live, where each new message is read as it arrives. With nothing to catch up, the button just says Play and goes live at once. After going back, it replays what follows until it catches up with live. |
| **Pause** (same button) | Silences the reading and waits. |
| ⏪ | Goes back: reads the previous message, one at a time. |
| ⏭ | Skips to the next message. |
| ⏮ | Starts over from the oldest message loaded in the page. |
| ⏹ | Stops everything. |
| Back to live | Leaves the replay and returns to new messages. |

Between two messages, the characters of the people in the thread wait on
the stage; click one to hear it introduce itself.

What counts as “never read” is remembered per thread, in your browser, and
only for the messages Discord currently has loaded in the page.

During a replay, Discord scrolls to the message being read and outlines it.
Discord only keeps part of the conversation in memory: when ⏪ reaches the
oldest loaded message, Discord loads more and you can press again.

The first time, The Ping Show downloads the voices: about 80 MB before reading can
start, then another 80 MB in the background (the characters with a British
voice wait for that second file). French voices (about 60 MB each) are fetched
only if a message in French shows up. Everything is then kept in the
browser cache.

### Keyboard shortcuts

| Keys (Windows, Linux) | Keys (Mac) | What it does |
| --- | --- | --- |
| **Ctrl+Shift+8** | **⌘⇧8** | Play / pause |
| **Ctrl+Shift+7** | **⌘⇧7** | Previous message |
| **Ctrl+Shift+9** | **⌘⇧9** | Next message |
| Shift+Space, Shift+←, Shift+→ | same | The same three, when the panel itself has the focus |

The first three are *global*: they work from any tab and from any other
application, as long as Chrome is running and the panel is open. Chrome
only lets an extension propose Ctrl+Shift+digit (⌘⇧digit on a Mac) for
global shortcuts; 7, 8 and 9 are free at system level on both Mac and
Windows (⌘⇧3 to ⌘⇧6 are the Mac screenshot keys).

Because they are global, they take these combinations away from other
applications while Chrome runs: in Google Docs, for example, ⌘⇧7 and ⌘⇧8
normally start a numbered or a bulleted list. To choose other keys (any
combination, media keys included) or to stop them from being global, open
`chrome://extensions/shortcuts`. The panel shows the keys currently in use.
Chrome leaves a shortcut unset when another extension already has it; set
it by hand on that page.

### The cast

Each person appears in the list at their first message, with a voice from
the pack in use.

- **Voice chosen from the first name.** If the nickname contains a known
  first name, the voice is drawn among the male or the female voices.
  Otherwise it is drawn among all of them and the button shows “?”. A guess
  can be wrong; the **Guess gender** switch turns it off.
- **People can pick their own voice.** Anyone types `!voice ogre` in the
  thread (any character name or part of it works: `!voice the grumpy ogre`,
  `!voice witch`; `!voice random` undoes it). The message is not read out;
  from then on every listener hears that person with that character. A name
  tag also works: a nickname such as `Camille [ogre]`. A ★ marks people who
  picked their own voice.
- **People can refuse to be read.** Anyone types `!voice off` in the
  thread, once: their messages are no longer read out, in any thread.
  `!voice on` brings them back. This one is not yours to override: the
  speaker button of that person is locked.
- **One message is enough.** A listener's extension remembers a pick or a
  refusal for good once it has seen it; nobody has to repeat it. To be sure
  it also holds for people who start listening later, the person can put
  it in their nickname instead, which is seen with every message:
  `Camille [off]`, `Camille [ogre]`.
- **You keep the last word on voices.** Whatever people picked, the menu, the
  ♂ / ♀ / ? button and **Draw again** on your side override it for you. The
  first line of the menu (“★ Their own pick”) goes back to their choice.
- **▶** lets you hear the character; **the speaker** mutes that person
  (handy for not hearing your own messages).

The bottom of the panel recalls the three commands (`!voice off`,
`!voice on`, `!voice` and the name of a voice), so that you can tell the
people in the thread.

A person's own pick, or refusal, only reaches listeners whose Discord page still shows
that `!voice` message when they start reading (or who were reading when it
was posted). Nothing is sent anywhere: each listener's extension reads the
command in the thread.

### Voice packs

A pack is a set of characters. Three come with the extension, and the menu
above the cast switches between them (or uses them all together). The cast
is the one in use at the start:

| Pack | Characters |
| --- | --- |
| **The cast** | 10 male, 10 female (snob, grumpy ogre, quiet cowboy, outraged customer…) |
| **The wacky pack** | 16 silly ones (helium balloon, slow-motion giant, auctioneer, haunted doll, grandma on speakerphone…) |
| **The first pack** | the 16 characters of the first version (pirate, ninja, radio host, sports commentator…) |

**Add a pack…** loads a pack from a `.json` file; you can also drop the file
anywhere on the panel. The pack is checked, kept in the browser, and can be
removed again. A pack contains only settings, texts and a drawing: nothing
in it is executed. The three packs in `extension/packs/` are in the same
format and make good starting points; see [Writing a voice pack](VOICE-PACKS.md).

### Settings

- **Volume** and **Background sound**: the background is a handful of
  short, soft sounds that belong to the character (two guitar notes for the
  cowboy, a clock and a teaspoon for the snob…), never a continuous layer.
  It stops with the voice, including on Pause. At zero there is none.
- **Jingles** (on / off): a one-second tune when a character
  takes the floor, that is when the speaker changes, after a long silence,
  and when you preview a character.
- **Catchphrases** (on / off): when on, a character adds a few
  words of its own to about one message in two, before it, after it, or
  both (“Um, actually…”, “I want to speak to the manager.”). Each character
  has about a dozen and never says the same one twice in a row. Turn it
  off to hear exactly what was written.
- **Emoji sounds** (on / off): when on, an emoji is not skipped:
  you hear what it means, in its place in the sentence. Most emojis play a
  real sound effect of about a second: a child's laugh for 😂, applause for
  👏, a sad trombone for 😢, a heartbeat for ❤️, a slide whistle and a
  bicycle bell for 👍, a buzzer for 👎, a fanfare for 🎉, thunder for 😠,
  snoring for 😴, crickets for 😐, a cash register for 💰, and the animal
  itself for an animal: about eighty sounds, shared by the emojis that mean
  roughly the same thing. A few emotions have no sound of their own; for
  those, the character reacts with a word, in its own voice: “Oh!” for 😮,
  “Hmm.” for 🤔, “Oops!” for 😅, “Who knows.” for 🤷, “Yum!” for 😋, a
  spoken kiss for 😘 (in French when the message is in French). Server
  emojis are matched by their name (`:pepe_laugh:` plays the laugh), and
  typed smileys count too: `:)`, `;)`, `:(`, `:D`, `<3`. Several identical
  emojis in a row play once, and a message plays five at most. A message
  made only of sound emojis plays its effects, with no voice and no jingle.
  Reactions added under a message are not played. Off, emojis are skipped
  in silence. The sounds are recordings, instrument notes and computed
  sounds; `extension/effets/SOURCES.md` says where each one comes from.
- **If unsure, read in**: each message is read in English or
  French depending on its content; this decides when it is not clear.
- **Guess gender** (on / off): off, every voice is drawn
  at random among all the characters of the pack.
- **EN / FR**: language of the panel itself.

Hover over a switch to read what it does.

## Known limits

- Only the channel shown in the Discord tab is read.
- Live, messages queue up while a long one is being read. Only when the
  reading falls more than four minutes behind does The Ping Show skip some
  to catch up.
- A message edited afterwards (a bot writing its answer bit by bit, for
  example) is read as it was when it arrived.
- The Ping Show finds the messages from the structure of the Discord page. If
  Discord changes it, the panel will say it cannot see any message and
  `contenu.js` will need an update.
- Discord does not officially support browser extensions. This one sends
  nothing and does not act on your account. In the page, it only scrolls
  the conversation and outlines the message being read.
