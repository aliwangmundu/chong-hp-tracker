# Chong HP Tracker

A deliberately small HP and AC tracker for [Owlbear Rodeo](https://owlbear.rodeo).

You add the records. Linking a token to one is optional, and everything works
without it.

## What it does

- **You build the list.** `+` in the top bar adds a record: a name, HP, AC and
  whatever else you fill in. Nothing appears on its own, and nothing vanishes
  because a token moved layers or left the scene.
- **Link a token in two clicks.** Select it on the map, then click the empty
  slot at the left of a row — a **+** appears there when something is selected,
  and the slot is inert when nothing is. That is what gives the bubbles
  somewhere to draw. Unlink from the expanded row; the record and its stats stay
  put. A token belongs to one record at a time; linking it elsewhere moves it.
- **The row shows token, name and HP — and HP is the only thing you can edit
  there.** Everything else opens in a panel underneath the row, which is also
  the only place it can be changed. A mistimed click during combat can cost you
  a hit point; it can never rename a character or unlink its token.
  Drag rows to reorder; the order sticks.
- **Tabs, three to a row, one list at a time.** `Player`, `Ungrouped`, then a
  tab per category — so AZRAQI and Undead are two tabs rather than two headings
  you scroll past. Past three they wrap onto another row rather than scrolling
  off the edge, because a tab you cannot see is no use as a drop target.
  Every tab is a drop target: drag a record up onto a tab and it files there.
  That is what replaced dragging between sections, and it is still the only way
  to file a record — it is faster than a dropdown and you can see where it
  lands. Dragging onto a row inside the open tab reorders instead.
  New records follow the open tab, so eight goblins typed in on **Undead** land
  on Undead. Everyone gets the same strip; your role only picks which tab opens
  first, and players simply have fewer tabs.
- **Tick Player at the bottom of a record's panel** to hand it to the table: it
  moves to the Player tab and leaves whichever tab it was on. Everything starts
  with the GM, so a monster typed in mid-fight is never in front of the party
  before you have looked at it. Untick and it goes home to the category it came
  from. Dropping a record on the **Player** tab does the same thing.
- **A one-press damage button beside HP, on the Player tab.** It applies
  whatever signed number is in that record's **AC** field: put `-5` there and
  every press takes five off. The sign is required, so a plain `18` leaves the
  button greyed out — which is also what an ordinary armour class does.
- **Whatever you have selected on the map sits at the top of every tab**, above
  a hairline, with no heading. Select a token and its record appears there;
  deselect and it drops back into its own list. It is the same record either
  way — editing it up there edits the real thing, not a copy — and it is lifted
  out of the list below rather than shown twice.
- **Categories, made by anyone.** The folder button adds one and opens it.
  Under the strip, the open category gets one row of controls: rename it in
  place, hide it from players with the eye, delete it with the ✕. A hidden
  category shows a struck-through eye on its tab, and players do not see the
  tab at all.
  **Deleting a category deletes the records in it.** The ✕ arms first and tells
  you how many are going; the second click does it, and it disarms itself after
  a few seconds. There is no undo.
- **A command bar for bulk entry**, on the terminal button. One line per record,
  name first, then any of these in any order:

  | you type    | means                                    |
  | ----------- | ---------------------------------------- |
  | `x8`        | eight of them, numbered `Goblin 1`, `2`… |
  | `7`         | 7 current HP                             |
  | `7/12`      | 7 current, 12 max                        |
  | `ac 15`     | armour class — `ac:15` and `ac=15` too   |
  | `#wave1`    | file under that category, creating it    |

  So `Goblin x8 7/7 ac 15 #wave1` is eight goblins in a new hidden category.
  It parses as you type and tells you what it will add before you commit;
  `Ctrl+Enter` adds, `Esc` closes. Lines starting `//` are ignored.
- **AC is free text.** Three characters, so `18`, `M` and `?` are all fine —
  and a signed `-5` doubles as the amount the player view's damage button
  applies.
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

- **The chevron on each row** expands it in place, full width and flush with
  the row. Inside, top to bottom: a free-text **note**, the conditions, the
  name, the token link, then AC, extra HP and max HP (caps the HP field, never
  drawn on the map) on one line. Extra HP is not a pool of its own — type an
  amount and it is added straight onto HP, then the field resets to 0. Extra
  and max are plain number fields — arithmetic entry is for HP only, where
  "-25" is what you actually mean.
- **A round counter** sits top left: `Round 3 ‹ ›`. Advancing it counts
  every condition on every record down by one; stepping back counts them up, so
  the two arrows undo each other.
- **Conditions**, any number of them, near the top of the expanded row — the
  thing most likely to change mid-fight sits where you can reach it. Each is a
  name and a countdown the round drives, with a small `×` to remove it.
- **Condition circles on the token.** Up to four along the top edge, each
  showing that condition's remaining duration, turning red at 0.
- **Players follow you between scenes; everyone else stays with the map.**
  Player records and the round live in the room, so the party is there
  whichever map you open. Monsters and NPCs, and the categories that hold
  them, live in the scene instead — the roster for one map does not bleed
  into the next. Tick a record onto the Player tab and it moves from the
  scene into the room, ready to follow you anywhere; untick it and it goes
  back to a category in the scene that is open when you do it. Adding or
  filing a non-player record needs a scene open, for the same reason a token
  link does — see below.
- **Hiding is a property of the category.** Players never see a hidden category
  or anything in it; the GM always sees every one. New categories start hidden,
  so staging the next wave takes one step and reveals in one click. The bar
  and bubble on the linked tokens are unaffected — a monster still shows HP
  and AC on the map; the roster line is what hides, not the numbers.
- **A health bar and an AC bubble on the linked token.** A slim bar sits
  bottom-left, its fill shrinking with HP and the number sitting just above
  it; AC stays a small circle, bottom-right in slate. The bar always draws,
  because linking a token is the deliberate act that says "put this one on
  the map"; AC appears once you fill it in. An unlinked record draws nothing
  anywhere.

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

The panel hot-reloads as you edit. The code that draws the bar and bubbles on
tokens runs once per page load, so refresh the Owlbear tab after changing
anything under `src/obr/`.

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
background.html  headless; draws the HP bar and AC bubble
action.html      the tracker panel
index.html       landing page that prints the install URL
```

```
src/core/    records, categories, command parser, inline math, AC, settings
src/obr/     bounds maths, health bar and bubble builders, the sync loop
src/ui/      the panel
```

### Notes on the design

- **Details open inline, and the popover width never changes.** A second card
  beside the list meant resizing the window on every open, and `setWidth` snaps
  with no animated form — so the card could not move with it without reading as
  jitter. Expanding under the row keeps the list in place and drops the problem
  entirely. `PANEL_WIDTH` in `src/ui/App.tsx` and `action.width` in the manifest
  just have to agree.
- **The round and its conditions are one write.** They were two — the records
  in one call, the round in another — and because each re-read the room first,
  each echoed back a snapshot the other had not landed in yet. The second echo
  reverted the first, so the counters appeared not to move. Anything that
  changes together now goes in a single `setMetadata`.
- **The selection strip is per-person and never stored.** It mirrors your map
  selection, and a selection is already yours alone; writing it to the room
  would mean two players fighting over one highlight.
- **The damage button demands a sign.** `15` could mean fifteen damage or
  fifteen healing, and picking one silently is how a character loses a fight to
  a stray click. Requiring `+` or `-` also means a record using AC as an actual
  armour class simply shows a disabled button rather than doing something
  surprising.
- **A button, not a field.** The amount is a property of the character that
  rarely changes, so it is set once where the other numbers live and then
  applied with one click for the rest of the fight.
- **Dragging inside the Player tab or the selection strip never refiles.** Both
  mix records from several categories, so taking the drop target's category
  would silently move the dragged record somewhere else; there, a drag reorders
  and nothing more.
- **The selection is not a tab.** It was one, briefly, and that was backwards:
  what you have clicked on is what you are dealing with now, so putting it
  behind a tab meant leaving the group you were working in to reach it. A
  hairline is enough to set it apart — it explains itself the moment you select
  a token.
- **Deleting a category takes its records.** A category is usually a wave of
  monsters, and tipping fifteen goblins into Ungrouped turned finishing a fight
  into a tidying job. Two clicks guard it, since it cannot be undone.
- **The dragged row floats above the panel rather than moving in place.** The
  list scrolls and the tabs sit above it, so a row dragged up to a tab would be
  clipped at the edge of its own container — which is precisely the drag that
  now matters most.
- **Only HP is editable in the row.** Every other value is edit-on-expand. The
  list is what you touch mid-combat, and the cost of a slip there should be a
  number you can retype, not an identity you have to reconstruct.
- **The expanded panel caps its own height and scrolls.** A record with a long
  note and six conditions would otherwise push the rest of the roster off the
  screen. The bar is hidden — it scrolls, it just does not advertise it.
- **A bare number in the command bar is current HP, not max.** Setting max to
  match would look helpful and then quietly stop a half-health character from
  healing. `7/12` sets both, explicitly.
- **The command bar previews before it commits.** A typo becomes visible while
  you are still typing rather than becoming eight wrongly-named goblins you
  then delete one at a time. Bad lines are reported and skipped; the good ones
  still go in.
- **Notes are capped at 400 characters.** The whole tracker shares Owlbear's
  16kB of room metadata, and free text is the one field that could eat it. Long
  enough for a reminder, short enough that fifty records still fit.

- **Records are the model; tokens are a link.** Stats live in one array, keyed
  by nothing but the record's own id — in room metadata for players, in scene
  metadata for everyone else. That is what lets a record exist before a token
  does, survive the token being deleted, and be moved to a different token
  without losing anything.
- **Room metadata is the cross-scene persistence; scene metadata is everything
  local to a map.** A player's id is what lets it survive a scene change at
  all — the earlier attempt had to match a character back to a token by name
  and image, and that guesswork is what made it unreliable. Everyone else
  simply has no reason to survive one: a scene's monsters belong to that
  scene, so they live and die with it.
- **A token link is a scene item id, and those are per-scene.** So a link made
  on one map is inert on another — the row says "Not in this scene" and draws
  nothing — and comes back to life when you return. Each record holds one link
  at a time, so re-linking on a second map replaces the first. This applies
  doubly to non-player records, which cannot even be edited from a different
  scene: they are not there to edit.
- **Attachments are local items.** Each client draws its own health bar and
  bubbles from the shared records, so the scene file stays clean, undo history
  is not full of attachment items, and nothing is replicated four times per
  token.
- **Writes re-read first.** Every record is in one array under one key, so a
  write is built from the room's and scene's current metadata rather than the
  copy the panel is holding — otherwise two people editing different records
  would overwrite each other wholesale. It narrows the race to a single call
  per store rather than eliminating it; the per-item writes this replaced
  could not race at all, which is the price of the record model.
- **Linking is exclusive.** Assigning a token clears it from any other record
  first. Two records pointing at one token would draw two sets of bubbles on
  top of each other.
- **New categories start hidden, and unreadable ones parse as hidden.** Both
  defaults fail the same way on purpose: revealing something by accident cannot
  be undone, and the usual reason to make a category mid-session is to stage
  what the party should not see yet.
- **Records and categories are written together, within each store.**
  Non-player records and categories are separate keys in scene metadata but
  not independent — deleting a category has to unfile its records in the same
  breath, or a refresh landing between two writes would leave rows pointing at
  nothing. `updateState` re-reads both stores, applies the mutation to the
  combined state, then splits it back: room metadata always gets the player
  records and the round in one `setMetadata`, and scene metadata gets the
  non-player records and categories in another — skipped entirely when no
  scene is open, since there is nowhere for that half to go.
- **A record filed under a deleted category falls back to Ungrouped** rather
  than vanishing. Losing a category should never lose the thing inside it.
- **The sync loop diffs.** It compares a signature string per token and only
  rebuilds attachments whose geometry or stats actually moved.
- **Attachments key off metadata presence, not value.** A monster knocked to 0
  HP still shows an empty bar and a `0`; a token nobody has touched shows
  nothing. Checking for a non-zero value would make dead monsters look
  untracked.
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
- New records start with the GM, and otherwise follow the open tab —
  `isPlayer` in `newRecord`, `src/core/records.ts`, and `tabDefaults` in
  `src/ui/App.tsx`.
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
