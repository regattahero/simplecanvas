# SimpleCanvas — Project Notes

Single-file HTML/CSS/JS canvas drawing app. Everything lives in `index.html` —
no build step, no dependencies.

## Provenance

- Upstream: https://github.com/oldwired/simplecanvas (maintainer: oldwired)
- This repo (`regattahero/simplecanvas`) is a fork with a large feature branch
  built on top of oldwired's `main` (as of the "Bugfixes" commit, ~2575 lines).
- The pull request with this branch's changes was merged into
  `oldwired/simplecanvas:main` (merge commit `672ce14`, "Merge pull request #1
  from regattahero/feature/toolbar-overhaul").
- oldwired kept committing directly to upstream `main` after that merge —
  touch/dblclick handling reworked into a shared `onDoubleClick(e, fromTap)`
  (real dblclick and a manually-detected double-tap both call it), the color
  picker rewritten as an app-drawn rainbow tile + hidden `input[type=color]`
  (`PRESETS` is now one `{hex:name}` map, not two parallel arrays), felt-tip
  draws with a chisel nib, a toolbar brand/logo. Latest upstream commit as of
  this note: `8132811` ("Double tap on touch closes the polygon cleanly and
  raises the keyboard").
- **Current branch (`feature/next`) is based directly on that upstream
  `main` (`8132811`)**, not on the old `feature/toolbar-overhaul` lineage —
  treat upstream `main` as the source of truth going forward and rebase new
  work on top of it, not on `Update-2`/old `feature/toolbar-overhaul`.
- The dblclick-on-empty-canvas → select-tool feature (from `Update-2`) was
  deliberately **not** ported onto this new base — left for oldwired to add
  upstream if/when they want it, since it would need reworking against the
  new shared `onDoubleClick` function anyway.

## What this branch adds on top of upstream

- **Text tool**: drag-to-create (like rect), own fill/stroke/border (default
  both off for new text), own text color (separate attribute from stroke),
  left/center/right alignment (click a selected text in the left/middle/right
  third to set it; a dblclick within 300ms cancels the alignment change and
  only opens the editor), precise vertical centering via
  `actualBoundingBoxAscent/Descent` (not the `middle` baseline, which sits
  visually high). Resizable via corner handles like a rect — font size stays
  fixed on resize.
- **Table tool**: deliberately still **click-to-place** (not drag) — this was
  an explicit choice, don't "fix" it back to drag. Cells can hold their own
  text + own alignment (`it.texts[r][c]`, `it.aligns[r][c]`), edited via
  double-click or long-press on a cell. Own font + text color, shared across
  the whole table (not per-cell).
- **Polygon**: can be finished "open" (no closing edge back to the first
  point) via a second toolbar button next to Finish/Cancel — `it.closed`
  (default `true` for old files).
- **Click-without-drag on a draw tool** (line/arrow/rect/ellipse/text) falls
  back to the select tool and selects whatever's under the cursor, instead of
  silently discarding. **Table is deliberately excluded** from this — a plain
  click there is the normal way to place one.
- **Rotation handle**: 30% bigger circle, 30% longer stem, hit-radius scaled
  to match (three call sites: drag-start, dblclick-reset, both in `onDown`/
  dblclick handler).
- Toolbar: icon+color-bar design for Fill/Stroke/Text-color (neutral glyph,
  separate colored bar underneath — not a tinted glyph). Vertical slider for
  stroke width (real native vertical range input via
  `-webkit-appearance:slider-vertical` + `writing-mode:vertical-lr`, not a
  rotated horizontal one — the rotate-hack doesn't reliably fill its declared
  length in Chrome/Windows). App starts on the select tool if the canvas
  already has content, pen otherwise.
- SVG export updated to match: text/table now export fill+stroke+textColor+
  alignment (SVG `text-anchor` needs `start/middle/end`, not our internal
  `left/center/right` — see `svgAnchor()`).

# Änderungen seit upstream `8132811`

- Shape-Library: Auswahl als wiederverwendbare Form speichern, per Klick aus Toolbar-Popover platzieren
- Edit Points: Linie/Pfeil/Rechteck/Ellipse/Polygon per Doppelklick in editierbare Bézier-Kurve umwandeln
- Polygon: Fertigstellen landet jetzt im Select-Modus mit ausgewähltem Polygon; Doppelklick-Schließen fügt keine überflüssige Ecke mehr hinzu
- Linien-Strichelung: Muster-Auswahl (durchgezogen/eng/weit) im Stiftbreite-Popover, Pfeilspitzen bleiben immer durchgezogen
- Snap-Ziele einblenden: beim Ziehen eines Linien-/Pfeil-Endpunkts zeigt das gehoverte Objekt seine Magnetpunkte an
- Shape-Library-Fixes: ein gerade gespeichertes Shape verschwindet nicht mehr aus der Liste beim erneuten Öffnen; das Werkzeug bleibt nicht mehr hängen (bzw. platziert kein altes Shape erneut), wenn das Popover ohne Auswahl geschlossen wird
- Strg/Cmd-Resize um den Mittelpunkt, kombinierbar mit der bestehenden Shift-Proportional-Sperre

**Warum das Doppelklick-Verhalten beim Polygon geändert wurde**: Am Desktop ließ das Schließen eines Polygons per Doppelklick beide Klicks des Doppelklicks als „Punkt setzen" durchgehen, wodurch noch eine überflüssige Ecke an der Klickposition entstand — nur beim Touch-Doppeltipp war das bereits abgefangen. Der Fix gleicht Maus und Touch an: Der Klick, der das Polygon schließt, setzt keinen eigenen Punkt mehr, sondern schließt direkt zur zuletzt bewusst gesetzten Ecke.

## Branch `experiments`

Local-only, not pushed into `oldwired`'s PR #2 — created off `feature/next`
at `ce8afcb` specifically so further work here does **not** flow into that
PR automatically. Rebase future upstream-tracking work onto `feature/next`,
not this branch.

- **Copy (Ctrl+C) also writes to the real OS clipboard**: `text/plain`
  carries our own JSON (what our own paste handler looks for first);
  `image/png` is a universally-supported fallback so pasting into another
  app (Word, PowerPoint, ...) shows the actual graphic instead of nothing.
  A `text/html` entry with inline `<svg>` was tried and then removed —
  Office's paste-special never picked it up as vector content anyway
  (showed an empty box), so `image/png` alone covers this now.
- **HTML export** (`exportHtml()`, new menu item) — a standalone `.html`
  file that opens in any browser, no SimpleCanvas needed. Reproduces the
  canvas **1:1** at its current `cssW`×`cssH` viewport size (no auto-crop) —
  deliberately different from SVG export/copy, which still tight-crop to
  the items' own bbox + margin. `itemsToSVGMarkup(itemList, {width, height})`
  is the shared builder behind both: the opt-in full-canvas mode skips all
  bbox/crop math; the default (no `{width,height}`) stays the original
  tight-crop, used by `saveSvg()`/copy.
- **Markdown in a plain text item**: recognized only when the item's first
  line is bare `---` (matches YAML front-matter, deliberately not
  `---markdown`). Supports `#`/`##`/`###` headings (forced bold, sized
  1.6/1.3/1.15× the item's own font size), `**bold**`, `*italic*`/
  `_italic_`, `- `/`* ` unordered lists, `[label](url)` links (styled, not
  clickable — v1 limitation: one style per run, no nested bold-links), and
  a `---` line *inside* the body (never the first physical line, which is
  the marker) as a horizontal rule. Forces left+top alignment — both saved
  and LIVE while editing, the instant the first 3 typed characters are
  `---` — regardless of the item's own chosen alignment. Table cells are
  explicitly excluded; Markdown only ever applies to plain text items. No
  new per-item field — detection is fully derived from `it.text` at render
  time (`markdownBodyOf`), so `normalizeItem` needed no changes.
  - Horizontal rule's vertical alignment: sized to the font's own cap-height
    (`actualBoundingBoxAscent`), not the full `1.2×fontSize` line-height a
    real text line needs (that also carries descent + leading a rule
    doesn't), and positioned at 15% down that footprint rather than
    dead-center — the block preceding a rule already carries its own
    trailing line-height slack, which would otherwise stack with the rule's
    own top-padding and read as too much gap above vs. below it.
- **Markdown links are real, clickable `<a href>` elements** in SVG/HTML
  export (both share `opToSVG`) — `href` **and** `xlink:href` are both
  emitted (some browsers only wire up SVG anchor navigation via the older,
  namespaced `xlink:href` when the SVG is inline in an HTML document rather
  than a standalone `.svg` file; `href` alone parses and styles fine but
  can silently fail to navigate). `safeHref()` treats a schemeless URL
  (`example.com` — how most people actually type one) as implicitly
  `https://`; an explicitly different scheme (`javascript:`, etc.) is
  rejected and renders as plain unlinked text. Canvas click-through to a
  link was considered and explicitly dropped (would need new per-mousemove
  hit-testing and a new dynamic-cursor mechanism for marginal benefit).
- **HTML export covers the whole workspace**, not just the active tab —
  every open tab becomes its own full-canvas SVG, switchable via a
  view-only tab bar matching the app's own tab-bar design. A single tab
  still exports exactly as before (no tab bar). Only the active tab's
  `items`/`assets` live in memory (`enterTab()`/`flushActiveTab()`); every
  other tab's data is read from `localStorage` (`docKey(t.id)`), same
  gather-all-tabs shape `exportWorkspace()` already used. `opToSVG`'s
  `'image'` case reads the module-level `assets` global directly (not a
  parameter), so generating a non-active tab's SVG requires temporarily
  swapping `assets` to that tab's own bundle and restoring it after.

## Branch `intelliobjects`

Local-only, branched off `experiments` (at `b22a58e`) specifically to keep
this large, higher-risk feature isolated. Adds **smart objects**: a new
Shape Library item type (`type:'smart'`) — a container rectangle (unfilled,
strokeless by default) whose visible children are generated by a
JavaScript **script that ships inside the library entry itself**, with an
interactive double-click edit mode.

- **Data shape**: identical top-level style fields to a rect (`color`,
  `fillColor`, `fill`, `strokeOn`, `textColor`, `size`, `dash`) plus
  `script` (a JS expression string) and `state` (a plain JSON-safe object).
  Children are **never stored** — they're pure derived render output,
  recomputed fresh every render from the container's current
  `x/y/w/h/state` (mirrors the existing precedent of `shapeOps` already
  recursing into a table's cells). This is why toolbar Fill/Stroke/
  Stroke-width/Text-color needed **zero logic changes**: the container
  itself is just a normal styleable item (`'smart'` added to `FILLABLE`/
  `DASHABLE`'s type lists), and "hard-set unless overridden" lives entirely
  *inside the script* — it receives the container's own resolved style as
  a plain argument and freely chooses, per child, whether to use it.
  **The container itself never renders a visible box, ever** — its
  `fill`/`fillColor`/`strokeOn`/`color`/`textColor`/`size` fields exist
  purely as a style bus the toolbar writes to and the script reads from
  (`smartResolvedStyle`); `shapeOps`'s `'smart'` case never emits a `rect`
  op for the container. So e.g. turning Fill on doesn't fill some invisible
  wrapping rectangle — it's up to the script which child (the clock's face
  circle, say) actually shows it.
- **Script contract**: `new Function('"use strict";return ('+src+');')()`,
  compiled once per distinct script string and cached, every call wrapped
  in try/catch (a throwing/hostile script just renders the container's own
  box, never crashes rendering). Shape: `{ initState(), children(state,
  style, w, h), hitEdit(state, lx, ly, w, h), dragEdit(state, handle, lx,
  ly, w, h) }` — `children()` returns plain item descriptors in local
  coords (the container's own top-left as origin), merged with inherited
  style and run back through `shapeOps` recursively.
- **Reference implementation**: an analog clock ships as the "New smart
  object…" dialog's prefilled starting script (Shape Library → Manage) —
  face outline, all 12 ticks and both hands all follow the container's own
  Stroke color together; the face circle (only) also follows Fill on/off +
  Fill color (per explicit user request — originally the face/ticks were
  hard-coded and only the hands inherited color, demonstrating "hard-set
  vs. inherit"; changed so the whole clock is stylable, which means this
  particular reference script no longer demonstrates hard-set itself —
  the *mechanism* still fully supports it, this example just doesn't use
  it). Drag either hand in edit mode to set the time. While in edit mode,
  the item's 4 corner markers switch from the normal white resize-handle
  look to solid blue (same 10×10 size/position, same convention Point-Edit
  already uses for its own anchor squares) — resize itself is suppressed
  while editing, so this also signals "these squares don't mean resize
  right now."
- **Two real bugs found via the test suite while building this** (not just
  hypothetical — both silently broke the reference clock the first time):
  1. **Style inheritance must NOT blanket-copy `fill`/`fillColor`/
     `strokeOn`** onto every child. `strokeOn` means something different
     per type — for a `rect`/`ellipse` it's "show an outline," but for a
     `line`/`arrow` it's "is this visible **at all**." The container's own
     everyday `strokeOn:false` (an invisible box, by design) was silently
     making every line/arrow child invisible too. Fix: only `color`/
     `textColor`/`size`/`dash` are inherited by default; a script must
     explicitly set `fill`/`fillColor`/`strokeOn` on any child that should
     follow the container's own toggle.
  2. **`toLocal(it,x,y)` only ever undoes rotation — it does NOT subtract
     `it.x/it.y`.** It still returns world-frame coordinates (the same
     convention `tableCellAt` already relies on), not coordinates relative
     to the item's own top-left. A script's `hitEdit`/`dragEdit` need real
     origin-relative coordinates (matching `children()`'s own (0,0)-(w,h)
     frame), so both call sites explicitly subtract `it.x`/`it.y` after
     `toLocal()`.
  3. **`snapshotOf(it)` has its own separate type-switch from `bbox`/
     `applyScaleFromSnapshot`** — easy to update the latter two (which sit
     right next to each other) and still miss this third one. Falling
     through to its `default: return {}` silently produced an EMPTY
     pre-resize snapshot, so dragging a corner handle computed `NaN` for
     the item's `x`/`y`/`w`/`h` — rendered nowhere, which read to the user
     as "the object got deleted." Found via real manual testing (not the
     original test suite, which didn't have a resize phase) — a resize
     regression phase was added to `smart-objects-test` specifically to
     lock this in. **Any future new item type needs `'smart'`-style
     treatment added in all three of `snapshotOf`/`bbox`/
     `applyScaleFromSnapshot` — they don't share one switch.**
  4. **`bbox()`'s padding for a smart object must NOT scale with `it.size`**
     the way a rect/ellipse's does. Those types pad their bbox by
     `(it.size||2)/2+2` because their own rendered stroke straddles the
     box edge — but a smart container never renders its own stroke at all
     (see bug/design note above: the box itself is never drawn), so
     `it.size` there is purely a style-bus value with no relationship to
     this box's own visual extent. Sharing the same padding formula meant
     the selection outline/resize handles visibly grew as the Stroke-width
     dropdown increased, even though nothing about the (invisible) box
     itself changed. Fixed with a dedicated `'smart'` case in `bbox()`
     using a flat 2px pad, independent of `size`. Found via real manual
     testing, again (this session's own test suite is thorough on
     *behavior*, but visual-only regressions like this one and #3 above
     are easy to miss without actually looking at the running app).
- **Accepted risk, explicit and deliberate** (confirmed via two clarifying
  questions before building this — the more ambitious, more work-intensive
  answer was chosen both times over a safer built-in-only/simple-form
  alternative): a smart object's script is real JavaScript, executed via
  `new Function()` in the page's own global scope — **no sandbox**. The
  Shape Library is already file-export/import-able
  (`exportShapeLibrary`/`importShapeLibraryFile`); importing a shared
  library file that contains a malicious smart object executes that
  script the moment its thumbnail renders in the library popover — not
  only when explicitly placed on the canvas. Mitigation actually in place:
  every script call only ever returns plain data (never handed `ctx`,
  `document`, or app internals) and is wrapped in try/catch — this
  prevents a crash, but does **not** prevent a script from doing anything
  a normal `<script>` tag on the page could do.
- **Everywhere `'smart'` was added**: `ITEM_TYPES`, `normalizeItem` (new
  case + script/state validation, capped at `MAX_SCRIPT`/`MAX_STATE_JSON`
  chars), `shapeOps` (new case, the one doing the real work), `bbox` /
  `snapshotOf` / `applyScaleFromSnapshot` (three SEPARATE type-switches,
  all needed for correct resize — see bug #3 below), `snapAnchorsOf` (so a
  line/arrow endpoint can snap to a smart object's box like it already can
  to a rect's), `FILLABLE`/`DASHABLE`, `applyTextColor`'s type filter, two
  dropdown-visibility filters in `updateOrderButtons`/`refreshColorUI`.
  Deliberately **not** added to `CONVERTIBLE_TYPES` (Point-Edit doesn't
  apply here). `paintOp`/`opToSVG` needed **no changes** — children resolve
  to existing op kinds only, so full SVG/PNG export and undo-safe rendering
  come for free.

## Kept from upstream, worth knowing about

- **UID-based selection** (`ensureUids`, `selectByUids`, `selectedUids`):
  selection survives undo/redo correctly even when the items array reorders.
  Our new interaction code still uses plain array indices during a live
  gesture (`selection = [idx]`) — that's fine, upstream's UID resolution only
  kicks in at undo/redo boundaries.
- **`normalizeItem`/`normalizeScene`**: strict validation on load (rejects
  malformed saved files instead of crashing). Any new per-item field
  (`textColor`, `align`, `texts`, `aligns`, `closed`, `strokeOn`, table's
  `fontFamily`/`fontSize`/`font`, smart object's `script`/`state`) **must
  be added here explicitly** or it gets silently dropped on save/reload.
- **`segCircleCuts`**: the eraser does real segment↔circle intersection, not
  just per-vertex distance — it correctly splits a stroke erased mid-segment
  even when neither endpoint is near the eraser. Don't regress this to a
  naive vertex-only check.
- Autosave writes the whole scene (incl. base64 images) to `localStorage` on
  every change — has a hard ~5-10MB browser quota, shows a toast on failure.
  Discussed but not yet implemented: moving to IndexedDB (much higher quota)
  and/or JPEG compression for photos would fix this properly.

## Testing approach used this session

No formal test suite — verified interactively via a Node + jsdom harness
(`npm install jsdom` in a scratch dir, load `index.html` with
`runScripts:'dangerously'`, dispatch synthetic `PointerEvent`/`MouseEvent`s,
read back canvas pixels via `getImageData` or inspect `localStorage`). Useful
gotchas hit repeatedly:
- jsdom needs a `url` option (e.g. `http://localhost/`) or `localStorage`
  throws.
- `canvas.getBoundingClientRect` must be stubbed (jsdom returns all-zero
  rects otherwise), before firing any pointer events.
- Selection-outline pixels are `#6366f1`ish and will contaminate color
  sampling near a selected item — deselect before sampling fill/stroke/text
  colors from pixels.
- Prefer reading `localStorage` (`JSON.parse(...).items`) over pixel-sampling
  when checking data correctness — much less fragile than guessing exact
  glyph/cell pixel coordinates.

## Known open items (not yet done)

- IndexedDB storage / JPEG compression for the localStorage-quota issue
  (discussed, not implemented).
- No formal automated test suite checked into the repo — the jsdom checks
  above were ad hoc, run in a scratch dir outside the project.
