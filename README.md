# Chong HP Tracker

A deliberately small HP and AC tracker for [Owlbear Rodeo](https://owlbear.rodeo).

Every token on the map shows up in the list on its own. Two categories, three
columns, and a health field you can do arithmetic in.

## What it does

- **Automatic token list.** Any image token on the character or mount layer
  appears. Nothing to add, nothing to select first.
- **Two categories.** Allies and Adversaries. Drag rows between them; the
  order sticks with the scene.
- **Three columns.** Token, HP, AC. Everything else is behind the `+` button.
- **AC is free text.** Three characters, so `18`, `M` and `?` are all fine.
- **Inline math in the HP field.** Click into HP and keep typing:

  | current | you type   | result |
  | ------- | ---------- | ------ |
  | 27      | `-25`      | 2      |
  | 27      | `+25`      | 52     |
  | 27      | `-25 + 8`  | 10     |
  | 27      | `*2`       | 54     |
  | 27      | `(12-4)/2` | 4      |

  A leading operator applies to the current value; anything else replaces it.
  `+ - * /` and parentheses work. An expression that will not parse flashes red
  and leaves the value alone rather than committing a wrong number.

- **`+` on each row** toggles a second card open *beside* the list, widening
  the popover rather than covering it, so the roster stays visible and usable
  while you edit. The same `+` closes it, and it highlights while its card is
  open.
- **On that card:** extra HP (temporary hit points, added into the number on
  the token) and max HP (caps the HP field, never drawn on the map). Both are
  plain number fields — arithmetic entry is for HP only, where "-25" is what
  you actually mean.
- **A round counter** sits above the token list: `‹ Round 3 ›`. Advancing it
  counts every condition in the scene down by one; stepping back counts them
  up, so the two arrows undo each other.
- **Conditions and resources**, any number of each, below max HP on the second
  card. A condition is a name and a countdown the round drives. A resource is a
  name and a counter only you move — mana, ki, charges, arrows — with `‹ ›`
  either side of it. Both have a small `×` to remove them.
- **Saved rolls.** Each token keeps a list: a label and an expression, with a
  Roll button. Add as many as you like. Full expressions work — `1d20 + 3`,
  `2d6 + 1d4 + 3`, `(1d8 + 2) * 2`, `d20 - 1`.
- **A dice card floats over the map**, top centre, with two tabs. **Result**
  shows the newest roll as `1d20 (17) + 3 = 20`, any die on its highest face
  bolded green (a crit) and any 1 bolded red (a fumble). **Log** holds the last
  20, newest first. It opens on every roll and for everyone in the room,
  whether or not they have the tracker open; the dice button beside the round
  counter reopens it.
- **Condition circles on the token.** Up to four along the top edge, each
  showing that condition's remaining duration, turning red at 0.
- **Nothing carries between scenes.** Stats live on the token, in the scene
  that token belongs to.
- **Hide adversaries.** A GM-only switch on the Adversaries heading takes that
  list off every player's panel. Bubbles on the tokens are unaffected, so the
  monsters still show their HP and AC on the map — the roster is what gets
  hidden, not the numbers. The setting lives on the scene, so it holds for
  players who join later.
- **Bubbles on the token.** HP bottom-left in red, AC bottom-right in slate.
  A bubble appears once you have set that stat and holds its position whether
  one or both are shown. A token you have never given stats to shows nothing.

Everyone in the room sees the panel and can edit it.

## Working on it

Node 20 or newer. npm comes with it; there is nothing else to install.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run typecheck
npm run build     # → dist/
```

To try your changes, run `npm run dev`, then in an Owlbear room choose
**Add Extension** and paste `http://localhost:5173/manifest.json`.

The panel hot-reloads as you edit. The code that draws bubbles on tokens runs
once per page load, so refresh the Owlbear tab after changing anything under
`src/obr/`.

## Publishing

`npm run build` produces a **`docs`** folder. That folder *is* the site.

GitHub Pages serves from either the repository root or a folder named `docs` —
those are the only two options it offers, which is why the build lands there.
One repository can then hold both the source and the published site, and the
two `index.html` files never collide.

1. Set `basePath` in **`site.config.json`** to `/<your-repo-name>/`, matching the
   repository name exactly, capitals included. Pages URLs are case-sensitive and
   Owlbear will fail to load if this is wrong.
2. `npm run build`
3. Upload the project to the repository — everything except `node_modules`,
   which is large, pointless to store, and rebuilt by `npm install`.
4. **Settings → Pages → Source: Deploy from a branch → `main` / `docs`.**
5. Install in Owlbear from
   `https://<your-username>.github.io/<your-repo-name>/manifest.json`

To publish a change: edit, `npm run build`, re-upload `docs`.

Filenames in `docs/assets/` carry a content hash, so old ones linger after an
upload. Harmless, but browsers cache the HTML that points at them for ten
minutes — if a change does not show up, that cache is why. Removing and re-adding
the extension in Owlbear clears it fastest.

## How it fits together

```
manifest.json    what Owlbear loads
background.html  headless; draws the HP and AC bubbles
action.html      the tracker panel
index.html       landing page that prints the install URL
```

```
src/core/    metadata, inline math, dice, sorting, AC, entries, settings, rolls
src/obr/     bounds maths, bubble builders, the sync loop
src/ui/      the panel
```

### Notes on the design

- **The popover resizes itself.** `manifest.json` sets the narrow width for the
  list alone; opening a token's extra stats calls `OBR.action.setWidth` to grow
  the window by exactly the second card's width. `PANEL_WIDTH` in
  `src/ui/App.tsx` must stay in step with `action.width` in the manifest.
- **No transition on the second card.** `setWidth` snaps, with no animated
  form, so a card animating against a window that cannot animate with it reads
  as jitter rather than motion. The card appears in one frame instead, and the
  list is pinned to `PANEL_WIDTH` so it does not shift by a pixel either way.

- **Attachments are local items.** Each client draws its own bubbles from the
  shared token metadata, so the scene file stays clean, undo history is not
  full of bubble items, and nothing is replicated four times per token.
- **Metadata is written only when you edit.** A token with no metadata parses to
  defaults and still lists, so opening the panel never mutates the map.
- **The sync loop diffs.** It compares a signature string per token and only
  rebuilds bubbles whose geometry or stats actually moved.
- **Bubbles key off metadata presence, not value.** A monster knocked to 0 HP
  still shows a `0` bubble; a token nobody has touched shows none. Checking for
  a non-zero value would make dead monsters look untracked.
- **The floating result is a popover, not part of the panel.** An extension
  gets no drawing surface over the map, but `OBR.popover.open` with
  `anchorReference: "POSITION"` takes screen coordinates, and `hidePaper: true`
  drops Owlbear's frame — which together make a free-floating card. It is
  opened from the background script, so it shows for everyone in the room
  regardless of whether their panel is open.
- **The popover reads the log rather than being passed a roll.** It needs no
  message channel that way: whoever opened it, every client renders the same
  newest entry.
- **The roll log is the broadcast channel.** Every client already listens for
  scene metadata changes, so appending an entry both stores it and delivers it
  to everyone — no separate message channel, and the banner each player sees is
  driven by the log rather than their own roll.
- **The log stores segments, not a finished string.** The bold on a crit has to
  survive the trip through scene metadata to everyone else, which a rendered
  line of text could not carry.
- **Dice use `crypto.getRandomValues`, with rejection sampling.** `% sides` on
  a raw 32-bit value skews the low faces; the loop discards the short tail
  instead so every face is equally likely.
- **Expired conditions are kept, not deleted.** A duration of 0 turns red and
  stays put. The counter's job is counting; deciding an effect has actually
  ended is the GM's call — and keeping the row is what lets stepping the round
  back restore exactly what stepping forward did.
- **Stepping the round is one batch write.** It is the only action that edits
  every token at once, so it goes through `writeStatsBatch`: a single undo step
  and a single round trip rather than one per token.
- **Malformed entries are skipped, not fatal.** Another extension or a
  hand-edited scene can leave junk under our key; `readEntries` drops the bad
  row instead of letting it take the whole token's stats down.
- **Token bounds account for image DPI.** An image's pixels are authored at its
  own DPI and scaled by `sceneDpi / image.grid.dpi` before the item's own scale
  applies. Skipping that is why attachments drift on non-standard token art.

### Two defaults you may want to change

- New tokens land in **Adversaries** — `DEFAULT_CATEGORY` in
  `src/core/metadata.ts`.
- AC allows three characters — `AC_MAX_LENGTH` in `src/core/ac.ts`.
- Condition and resource names cap at 24 characters —
  `ENTRY_NAME_MAX_LENGTH` in `src/core/metadata.ts`.
- The log keeps 20 rolls — `ROLL_LOG_LIMIT` in `src/core/rolls.ts`.
- Four condition circles per token — `MAX_CONDITION_BUBBLES` in
  `src/obr/attachments.ts`.
- A roll is capped at 100 dice, d1000 — the limits in `src/core/dice.ts`.
- HP floors at 0 and is capped by max HP once one is set; a max of 0 means no
  cap — `clampHp` in `src/core/inlineMath.ts`.

## Credits

Inspired by [Stat Bubbles for D&D](https://github.com/SeamusFinlayson/Bubbles-for-Owlbear-Rodeo)
by Seamus Finlayson, which is worth using if you want the full-featured version
— health bars, bulk damage, dice rolling, max and temporary HP, name tags, and
per-token visibility. This is an independent implementation, written from
scratch and much smaller.

## Licence

MIT — see [LICENSE](LICENSE).
