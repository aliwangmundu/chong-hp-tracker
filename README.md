# Chong HP Tracker

A deliberately small HP and AC tracker for [Owlbear Rodeo](https://owlbear.rodeo).

You add the records. Linking a token to one is optional, and everything works
without it.

## What it does

- **You build the list.** `+` in the top bar adds a record: a name, HP, AC and
  whatever else you fill in. Nothing appears on its own, and nothing vanishes
  because a token moved layers or left the scene.
- **Link a token when you want one.** Select a token on the map, expand a
  record, and press **Link**. That is what gives the bubbles somewhere to draw.
  Unlink at any time — the record and its stats stay put. A token belongs to one
  record at a time; linking it elsewhere moves it.
- **The row shows token, name and HP — and HP is the only thing you can edit
  there.** Everything else opens in a panel underneath the row, which is also
  the only place it can be changed. A mistimed click during combat can cost you
  a hit point; it can never rename a character or unlink its token.
  Drag rows to reorder; the order sticks.
- **Categories, made by anyone.** The folder button adds one. Rename it in
  place, drag records into it, and hide the whole thing with the eye. Records
  not filed anywhere sit in an **Ungrouped** section at the top.
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

- **The chevron on each row** expands it in place. Inside: the name, the token
  link, the group, then AC, extra HP (temporary hit points, added into the
  number on the token) and max HP (caps the HP field, never drawn on the map)
  on one line, then conditions and resources. Extra and max are plain number
  fields — arithmetic entry is for HP only, where "-25" is what you actually
  mean.
- **A round counter** sits above the list: `‹ Round 3 ›`. Advancing it counts
  every condition on every record down by one; stepping back counts them up, so
  the two arrows undo each other.
- **Conditions and resources**, any number of each, at the bottom of the
  expanded row. A condition is a name and a countdown the round drives. A
  resource is a name and a counter only you move — mana, ki, charges, arrows —
  with `‹ ›` either side of it. Both have a small `×` to remove them.
- **Condition circles on the token.** Up to four along the top edge, each
  showing that condition's remaining duration, turning red at 0.
- **The list follows you between scenes.** Records, categories and the round
  live in the room, not the scene, so the same party is there whichever map you
  open. Token links are the exception — see below.
- **Hiding is a property of the category.** Players never see a hidden category
  or anything in it; the GM always sees every one. New categories start hidden,
  so staging the next wave takes one step and reveals in one click. Bubbles on
  the linked tokens are unaffected — a monster still shows HP and AC on the map;
  the roster line is what hides, not the numbers.
- **Bubbles on the linked token.** HP bottom-left in red, AC bottom-right in
  slate. HP always draws, because linking a token is the deliberate act that
  says "put this one on the map"; AC appears once you fill it in. An unlinked
  record draws nothing anywhere.

Everyone in the room sees the panel and can edit it.

## Working on it

Node 20 or newer. npm comes with it; there is nothing else to install.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run typecheck
npm run build     # → docs/  (nothing is published until you run this)
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

### Publishing a change

`docs/` is build output. Editing `src/` does **not** change it — only
`npm run build` does, and forgetting that step publishes the previous build
while everything looks like it worked.

1. Bump `version` in `package.json`.
2. `npm run build`
3. Commit and push `docs/`.
4. Open the panel in Owlbear and check the version in the bottom corner.

That version is the whole point of this loop. It is stamped into the panel, into
`manifest.json`, and onto every URL the manifest points at — so if the number
you see is not the number you built, you are looking at a stale deploy, not a
bug in the code.

Filenames in `docs/assets/` already carry a content hash, so those are never
stale. The HTML that points at them is the problem: GitHub Pages sends
`Cache-Control: max-age=600` and gives you no way to change it, which is why a
change can appear to take ten minutes to land. The `?v=` on each manifest URL
sidesteps that — a new version is a new URL, and a new URL cannot be in the
cache.

The one thing still subject to that ten-minute cache is `manifest.json` itself.
To force it immediately: open the manifest URL in a browser tab and hard-refresh
it (Ctrl+Shift+R), then reload Owlbear.

## How it fits together

```
manifest.json    what Owlbear loads
background.html  headless; draws the HP and AC bubbles
action.html      the tracker panel
index.html       landing page that prints the install URL
```

```
src/core/    records, categories, inline math, AC, entries, settings, tokens
src/obr/     bounds maths, bubble builders, the sync loop
src/ui/      the panel
```

### Notes on the design

- **Details open inline, and the popover width never changes.** A second card
  beside the list meant resizing the window on every open, and `setWidth` snaps
  with no animated form — so the card could not move with it without reading as
  jitter. Expanding under the row keeps the list in place and drops the problem
  entirely. `PANEL_WIDTH` in `src/ui/App.tsx` and `action.width` in the manifest
  just have to agree.
- **Only HP is editable in the row.** Every other value is edit-on-expand. The
  list is what you touch mid-combat, and the cost of a slip there should be a
  number you can retype, not an identity you have to reconstruct.

- **Records are the model; tokens are a link.** Stats live in one array in
  room metadata, keyed by nothing but the record's own id. That is what lets a
  record exist before a token does, survive the token being deleted, and be
  moved to a different token without losing anything.
- **Room metadata is the whole of the cross-scene persistence.** It is scoped to
  the room and outlives any scene. This works now only because a record has its
  own id; the earlier attempt had to match a character back to a token by name
  and image, and that guesswork is what made it unreliable.
- **A token link is a scene item id, and those are per-scene.** So a link made
  on one map is inert on another — the row says "Not in this scene" and draws
  nothing — and comes back to life when you return. Each record holds one link
  at a time, so re-linking on a second map replaces the first.
- **Upgrading lifts an old scene list into the room, once.** It only fires when
  the room holds nothing at all, so it can never overwrite a real list, and only
  the GM runs it so two clients cannot race to import the same thing.
- **Attachments are local items.** Each client draws its own bubbles from the
  shared records, so the scene file stays clean, undo history is not full of
  bubble items, and nothing is replicated four times per token.
- **Writes re-read first.** Every record is in one array under one key, so a
  write is built from the scene's current metadata rather than the copy the
  panel is holding — otherwise two people editing different records would
  overwrite each other wholesale. It narrows the race to a single call rather
  than eliminating it; the per-item writes this replaced could not race at all,
  which is the price of the record model.
- **Linking is exclusive.** Assigning a token clears it from any other record
  first. Two records pointing at one token would draw two sets of bubbles on
  top of each other.
- **New categories start hidden, and unreadable ones parse as hidden.** Both
  defaults fail the same way on purpose: revealing something by accident cannot
  be undone, and the usual reason to make a category mid-session is to stage
  what the party should not see yet.
- **Records and categories are written together.** They are separate metadata
  keys but not independent — deleting a category has to unfile its records in
  the same breath, or a refresh landing between two writes would leave rows
  pointing at nothing. `setMetadata` takes both keys in one call.
- **A record filed under a deleted category falls back to Ungrouped** rather
  than vanishing. Losing a category should never lose the thing inside it.
- **The sync loop diffs.** It compares a signature string per token and only
  rebuilds bubbles whose geometry or stats actually moved.
- **Bubbles key off metadata presence, not value.** A monster knocked to 0 HP
  still shows a `0` bubble; a token nobody has touched shows none. Checking for
  a non-zero value would make dead monsters look untracked.
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

- AC allows three characters — `AC_MAX_LENGTH` in `src/core/ac.ts`.
- Record names cap at 32 characters — `RECORD_NAME_MAX_LENGTH` in
  `src/core/records.ts`; category names at 24 —
  `CATEGORY_NAME_MAX_LENGTH` in `src/core/categories.ts`.
- New categories start hidden — `newCategory` in `src/core/categories.ts`.
- Condition and resource names cap at 24 characters —
  `ENTRY_NAME_MAX_LENGTH` in `src/core/entries.ts`.
- Four condition circles per token — `MAX_CONDITION_BUBBLES` in
  `src/obr/attachments.ts`.
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
