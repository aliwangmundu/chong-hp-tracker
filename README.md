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
- **Allies persist across scenes.** Change map and your party arrives with the
  HP, AC and temporary HP they had. See below for how a token is recognised.
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

- **`+` on each row** opens a drawer for the stats that do not deserve a column:
  extra HP (temporary hit points, added into the number on the token) and max HP
  (recorded, never drawn on the map).
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
src/core/    plugin id, metadata, inline math, sorting, AC, persistence store
src/obr/     bounds maths, bubble builders, the sync loop, scene persistence
src/ui/      the panel
```

### How persistence works

Item ids are minted per scene, so they cannot identify a character across maps.
The key is **image URL plus name** — the art says which token it is, the name
separates two goblins cut from the same image. Rename a character and it starts
a fresh history.

Stats live in **room** metadata, which is scoped to the room and outlives any
one scene. A token is restored exactly once, the first time it is seen in the
current scene; after that it only ever saves. Without that rule a restore would
overwrite the edit that triggered it and the two would ping-pong.

Only the GM reconciles. Every client runs the background script, and letting
them all write the same room key would mean the last writer wins at random.

### Notes on the design

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
- **Token bounds account for image DPI.** An image's pixels are authored at its
  own DPI and scaled by `sceneDpi / image.grid.dpi` before the item's own scale
  applies. Skipping that is why attachments drift on non-standard token art.

### Two defaults you may want to change

- New tokens land in **Adversaries** — `DEFAULT_CATEGORY` in
  `src/core/metadata.ts`.
- Only **allies** persist across scenes — the category check in
  `src/obr/persistence.ts`.
- AC allows three characters — `AC_MAX_LENGTH` in `src/core/ac.ts`.
- HP floors at 0 — `clampHp` in `src/core/inlineMath.ts`.

## Credits

Inspired by [Stat Bubbles for D&D](https://github.com/SeamusFinlayson/Bubbles-for-Owlbear-Rodeo)
by Seamus Finlayson, which is worth using if you want the full-featured version
— health bars, bulk damage, dice rolling, max and temporary HP, name tags, and
per-token visibility. This is an independent implementation, written from
scratch and much smaller.

## Licence

MIT — see [LICENSE](LICENSE).
