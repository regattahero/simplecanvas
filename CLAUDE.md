# SimpleCanvas — Project Notes

Single-file HTML/CSS/JS canvas drawing app. Everything lives in `index.html` —
no build step, no dependencies.

## Current implementation

The branch/provenance notes below describe earlier development. The current app includes the merged
PR #2 changes: complete working documents and image/history state live in `tabDocuments`, independently
of browser storage. Failed autosave shows a persistent warning with a workspace-download action.

PR #3 adds structured JSON plus PNG clipboard output, whole-workspace HTML export, and Markdown.
Paste validates SimpleCanvas JSON before using the PNG fallback. HTML export reads working documents
and passes each document's items/assets to SVG serialization; do not clear or swap the live asset pool.
Painted export bounds cover plain text and Markdown separately from geometry/pivot bounds. Markdown
requires an exact `---` first line in a text item; table cells are excluded in both renderer and editor.

In Select mode, endpoint clicks/taps cycle each line or open curve head through None, Open, Filled,
Open inverted, Filled inverted, then None. Endpoint drags retain the head style. Double-click/tap
the shape body to enter/leave point editing; anchor taps select points in that mode. Keep rapid
endpoint/anchor taps out of double-tap detection. The line-style popover only controls width/dashes.

Automated Playwright regressions are checked in under `tests/`; see `tests/README.md` for Chromium
and WebKit commands and the remaining manual Office/iPad checks. They are development dependencies
only; opening `index.html` still requires no build step or runtime dependency.

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
  `_italic_`, `- `/`* ` unordered lists, `1. ` numbered lists, `[label](url)` links (styled, not
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
  - **Inter-block vertical spacing** (`mdBlockGapAfter`, in
    `layoutMarkdownBlocks`): originally every block (a paragraph, a
    heading, a list item) advanced `y` by just its own bare line-height
    with nothing extra, so two separate blocks separated by a single hard
    line break read identically to two wrapped lines of the SAME
    paragraph — no visual break at all. Real bug, found via actual use
    (screenshot review), fixed in three passes:
    1. First pass added a flat `lineHeight*0.5` bonus, but only after a
       plain paragraph (`'p'`) — headings and list items still got none.
    2. Second pass (after a follow-up screenshot) generalized the list
       side of this: a run of list items stays tight (`'li'`->`'li'`: no
       bonus at all, so bullets don't spread apart from each other), but
       crossing INTO or OUT OF a list (`'li'` on either side of the
       transition) gets its own, smaller `lineHeight*0.3` bonus — the full
       paragraph bonus read as visibly too large right above a
       tightly-packed list, and (with zero bonus previously) far too
       little right after one. This pass also gave headings the same flat
       `ownLineHeight*0.5` bonus a paragraph gets.
    3. Third pass (after a THIRD screenshot) fixed that headings treatment
       — `ownLineHeight*0.5` overshot every heading level, worst of all
       for `h1`. The fix: a heading targets the SAME total post-block gap
       a paragraph gets (`baseLineHeight*1.5`), not a bonus proportional
       to its own already-font-scaled `lineHeight`. `h1`'s 1.6x scale
       already makes its bare `lineHeight` exceed that target on its own
       (`Math.max(0, target - ownLineHeight)` → `0` — unchanged from
       before headings had any gap logic at all, which is what read as
       correct); `h2`/`h3`'s more modest 1.3x/1.15x scale falls short of
       it on their own, so they get topped up to reach it.
    4. Fourth pass (after a FOURTH screenshot): `hr` itself is still
       handled in its own branch and never gets a trailing bonus of its
       own, but the block **preceding** an `hr` was still getting whichever
       bonus applies to IT (the paragraph/heading target-gap, or the
       list-boundary gap) — stacking on top of the rule's own vertical
       position (15% down into a `capH`-sized footprint, see the `'hr'`
       branch), which was tuned assuming only that preceding block's BARE
       `lineHeight` precedes it. The extra bonus pushed the whole gap
       bigger than that tuning accounts for, so the rule sat further down
       in it than intended — `mdBlockGapAfter` now returns `0` whenever
       `nextType==='hr'`, regardless of what the current block is,
       restoring the original bare-lineHeight-only gap in front of a rule.
    5. Fifth addition (explicit user request, not a bug): a **blank line**
       (two hard breaks back to back — an empty physical line in the
       source) is its own `parseMarkdownBlocks` block type, `'blank'`, a
       deliberate manual half-line spacer rather than an empty paragraph.
       Before this it fell through to a normal, empty `'p'` block, which
       still consumed a FULL `lineHeight` (drawing nothing) *and* still
       got the automatic paragraph bonus on both sides of it — a manually
       inserted blank line ballooned into roughly a double paragraph-gap,
       not the modest half-line nudge someone reaching for a blank line
       actually wants. Fixed with a dedicated early-return branch in
       `layoutMarkdownBlocks` (`y += baseFontPx*1.2*0.5`, draws nothing,
       same shape as the `'hr'` branch) and a matching
       `mdBlockGapAfter` rule (`nextType==='blank'` → `0`, alongside the
       existing `'hr'` case) — a blank line's own half-height is the
       *entire* gap it contributes, with no automatic bonus stacking on
       top of it from either side. Multiple consecutive blank lines stack
       linearly (each still contributes its own flat half-`lineHeight`).
    6. Sixth addition (explicit user request): **numbered lists**
       (`1. item`), a new `parseMarkdownBlocks` block type `'oli'` sitting
       alongside `'li'`. The digit actually typed is parsed but then
       **discarded and recomputed** — a dedicated post-parse pass over the
       whole `blocks` array renumbers every run of consecutive `'oli'`
       blocks starting from the FIRST item's own typed number (matching
       standard Markdown), so typing `1.` on every line — the natural way
       to write a list without hand-renumbering it, and literally the
       user's own example — still counts up `1, 2, 3, ...` instead of
       repeating `1.` on every item; a different start number (`5. five`)
       is honored, same as real Markdown. A `'blank'` spacer inside the
       run does NOT reset the count (a deliberate blank line inside a
       list shouldn't restart it); any other block type does. `isListBlock
       = t => t==='li'||t==='oli'` generalizes `mdBlockGapAfter`'s existing
       `'li'` tight-run/transition-gap logic to both list kinds — a run of
       the SAME type stays tight, switching type (`'li'`↔`'oli'`) gets the
       smaller enter/exit-a-list gap `mdBlockGapAfter` already gave
       list↔non-list transitions.
       - **Real bug, found via actual use, right after this first
         shipped**: the body text after "1." sat at a different indent
         than after "2."/"3." — an early version measured each item's OWN
         number label to size its own indent, so "1." (narrower) and a
         later two-digit "12." (wider) each got a DIFFERENT left indent,
         visibly misaligning the list's own body text down the page (the
         one thing a numbered list must get right). Fixed by computing the
         indent off the WIDEST label in the item's own run instead of its
         own number — `parseMarkdownBlocks`'s renumbering pass now also
         backfills every block in a run with that run's own widest label
         (`oliMaxLabel`, always the run's LAST item, since numbering only
         ever increases within a run) once the run ends, and
         `layoutMarkdownBlocks` sizes `leftPad` off THAT shared value for
         every item in the run. The number itself is then right-aligned
         within that shared column (flush with the gap to the body text),
         matching how a real numbered list lines up its own markers —
         "1." and "12." now both end at the same edge, same as Word/HTML's
         own `<ol>` rendering.
       - Several small follow-up tweaks, all explicit requests: the gap
         between a number's own period and its body text went from `10px`
         to `8px` (20% smaller). Both list kinds also now sit a further
         `listIndent = 12px` to the right of plain paragraph/heading text
         — shifting the bullet/number glyph itself (not just the body text
         after it), so a list visually reads as indented from its
         surrounding text rather than flush with the same left margin
         everything else uses. Finally, the fixed `indentLi = 18px` bullet
         indent was replaced entirely: a bullet's own column is now sized
         off `ctx.measureText('1.')` — the SAME reference width a
         single-digit numbered list's own column uses — and the `'•'`
         glyph is right-aligned within it exactly like a number is (same
         mechanism, reused). Net effect, and the actual point of this
         change: a bullet list's body text now starts at PRECISELY the
         same x a numbered list's does, for as long as that numbered list
         stays single-digit — the two list kinds visually match instead of
         each picking its own unrelated indent.
       - **`listIndent` raised from `12px` to `18px`**, a follow-up after
         the above still read as "still a few pixels too far left" —
         verified two different ways, both pointing the same direction:
         (1) an actual rendered screenshot (`canvas.screenshot()`, real
         `page.route`\-served `index.html`, not a synthetic layout-only
         check) with a per-pixel ink scan confirmed the bullet's and the
         number's own body text ("bullet item"/"numbered item") already
         started at the exact same x (146px in that render) — the
         bullet-vs-number MATCH from the previous fix was never in
         question; (2) the same screenshot, this time with a plain
         paragraph line above the list for comparison, showed `listIndent`
         itself reading as too subtle a nudge next to it. The one concrete
         alternative theory raised (that the trailing period in `"1."` was
         somehow left out of a width calculation) does not hold up — every
         reference width already used the full label including its period
         (`ctx.measureText('1.')`, `oliMaxLabel = num+'.'`) — so the fix is
         a plain, larger `listIndent`, not a missing-period correction.
       - **Real bug, found right after the `listIndent` bump, via actual
         use again**: a bullet list's body text still didn't line up with
         a REAL (2+ item) numbered list's, even though it matched a
         single, literal `"1."`-only list perfectly. Root cause, confirmed
         by measuring each digit's own rendered width in this app's own
         font: `"1."` is the NARROWEST single-digit label by a real margin
         (~18px here, vs ~22-23px for every OTHER digit 2-9) — a common
         proportional-font characteristic (`"1"` is just a simple vertical
         stroke; other digits are wider shapes). `bulletColW` had been
         hard-coded to `ctx.measureText('1.')` specifically, which only
         ever matches a numbered list whose widest item happens to be
         exactly `"1"` — any list with 2+ items (whose own column is sized
         off ITS widest member, almost never `"1"` once other digits show
         up) ends up wider than that, leaving the bullet list visibly
         LESS indented. Fixed with a new `MD_MAX_DIGIT_LABEL_W(fontFamily,
         fontPx)` helper (memoized per family+size) that measures all of
         `"1."`..`"9."` and takes the max, so a bullet list's column always
         matches or safely exceeds any real single-digit numbered list's
         own column, regardless of which specific digits it happens to
         use.
       - **`listIndent` and the marker-to-text gap (`markerGap`) both made
         proportional to the item's own font size**, explicit request:
         `18px`/`8px` were flat pixel counts (tuned by eye at a 24px font)
         regardless of the actual font size in use, so they read fine at
         that one size but increasingly oversized at smaller ones and
         increasingly cramped at larger ones — a fixed pixel count is a
         proportionally BIGGER fraction of a small font's own text than of
         a large one's. Both are now `18 * (baseFontPx/24)` and
         `8 * (baseFontPx/24)` respectively — unchanged at exactly `24px`
         (the calibration point), scaling linearly either direction.
         **Real bug, found via actual use immediately after fixing
         `listIndent` alone**: the list still looked disproportionate at a
         smaller font size specifically, even with `listIndent` now
         scaling correctly — because `markerGap` (the flat `8px` gap
         between the marker and its body text) was still a flat constant,
         and hadn't been touched by that first fix. Confirmed by
         rendering the same list at 12/24/48px font sizes side by side
         (`canvas.screenshot()` on the real app, not a synthetic check)
         before and after scaling `markerGap` too.
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
this large, higher-risk feature isolated. Kept as a single, repeatedly
amended commit — periodically rebased onto oldwired's current `upstream/main`
tip as he keeps committing there (most recently past `de7d0e2`/`e26febe`/
`7f80f73`/`00d3c3f`/`67cdb14` — his own post-PR#3 regression fixes, the arrow-
head-cycling UI redesign, and the click-cycle-through-point-edit-conversion
fix for a bug this branch's own testing surfaced and reported upstream).
Never intended for oldwired — force-pushed freely per standing instruction.
Adds **smart objects**: a new
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
  box, never crashes rendering). Shape: `{ initState(), initStyle(),
  children(state, style, w, h, editing), hitEdit(state, lx, ly, w, h, style),
  dragEdit(state, handle, lx, ly, w, h, style), handles(state, w, h, style) }`
  — `children()` returns
  plain item descriptors in local coords (the container's own top-left as
  origin), merged with inherited style and run back through `shapeOps`
  recursively. `handles()` is optional and purely visual: it returns
  `[{id, x, y, kind}, ...]` (same local coordinate frame) for every point
  `hitEdit`/`dragEdit` can grab, so the app can mark them — without it,
  edit mode gives no clue where to actually click (added per explicit user
  feedback: the 4 corner markers alone don't show WHERE the interactive
  points are, only THAT you're in edit mode). `kind` is optional and
  defaults to `'drag'`; see below for the other value, `'click'`.
  - **`children()`'s 5th argument, `editing`**: `true` only for the one
    instance currently in interactive edit mode (`shapeOps`'s `'smart'`
    case passes `it===items[editingSmartIdx]`, an identity check against
    the live `items[]` array, not a type/uid match), `false`/`undefined`
    otherwise — including during SVG/PNG export, where `editingSmartIdx` is
    read the same way but is simply never set mid-export in normal use.
    Lets a script render edit-only chrome (e.g. a delete/add control) that
    the committed render and every export always omit. Backward compatible
    — a script that doesn't declare a 5th parameter is unaffected. Added
    while building a bar-chart example whose bar *count* needed to be
    editable (a delete "−" per bar, a "+" to add one) — without this, those
    controls would have had no way to hide themselves outside edit mode.
    Both draw their own glyph in `children()` rather than relying on the
    generic blue-dot `handles()` marker.
  - **A `handles()` entry's optional `kind:'click'`** marks it as a
    one-shot action (an add/delete button, a toggle) rather than an
    ordinary continuous drag point (the default, unmarked `'drag'` kind —
    what a bar-top height handle is). Two effects: (1) the render loop that
    draws the generic blue-dot marker skips any `kind:'click'` entry, so it
    only ever shows the script's own glyph, never both stacked on top of
    each other; (2) `onDown` looks up the pressed handle's `kind` in
    `handles()` once (defaulting to `'drag'` if `handles()` is absent or
    doesn't mention that id) and stores it on `smartDrag` — `onMove` then
    SKIPS calling `dragEdit` at all for a `'click'`-kind `smartDrag` (no
    matter how many pointermove events fire while still pressed), and
    `onUp` resolves it exactly once instead, from the ORIGINAL press
    position. Fixes a real bug found after use: pressing the bar chart's
    add button and merely nudging the pointer before releasing (any real
    drag gesture fires many pointermove events) re-ran `dragEdit` on every
    single one of them, inserting a whole run of new bars from what looked
    like one click. A `'drag'`-kind handle's behavior is completely
    unchanged (continuous `dragEdit` calls during `onMove`, plus the
    "resolve once on a truly zero-movement click" fallback described next).
  - **`smartResolvedStyle` also exposes `presetColors`**: `Object.keys(
    PRESETS)`, the toolbar's own color-swatch palette in its own declared
    order. Lets a script size something (or itself) off "however many
    colors the toolbar's own palette actually has" instead of a hard-coded
    number that could silently drift out of sync with it. Added for the
    bar chart's *own* color list/max-bar-count, so both track `PRESETS`
    automatically if it's ever extended, rather than duplicating its count.
  - **`dragEdit`'s new 7th argument, `style`**: the same
    `smartResolvedStyle(it)` object `children()` already receives, passed
    at both call sites (`onMove`'s live-drag path and `onUp`'s
    zero-movement click path above). Needed so a script's `dragEdit` can
    make a decision that depends on real toolbar state (e.g. the bar
    chart's `'add'` handler checking `style.presetColors.length` for the
    real max) without re-deriving or hard-coding a copy of it. Backward
    compatible — a script whose `dragEdit` doesn't declare a 7th parameter
    is unaffected.
  - **`handles()`'s new 4th argument and `hitEdit()`'s new 5th argument,
    both `style`**: the same `smartResolvedStyle(it)` object, passed at
    all three real call sites (the edit-mode handle-marker draw, the
    handle hit-test in `onDown`, and the `kind:'click'` lookup right after
    it). Added for Timer, whose hand sits exactly at the arc's own radius
    (`wedgeR`) — a value that depends on `style.fontSize` — so `handles()`/
    `hitEdit()` need the real current style to report the hand's position
    consistently with what `children()` actually draws; without it, the
    hand's hit-test/marker would silently drift away from its own visual
    position the moment someone changed the Font-size dropdown. Backward
    compatible — a script whose `handles()`/`hitEdit()` don't declare this
    parameter are unaffected.
  - **A new, optional `initStyle()` hook**, read once by the "Add smart
    object…" dialog's submit handler right after `initState()`, mirroring
    it exactly but for creation-time STYLE instead of interaction STATE.
    May return a partial object overriding any subset of `{color,
    fillColor, textColor, fill, strokeOn, size, fontFamily, fontSize, w,
    h}` — anything it doesn't mention keeps the normal default (universal
    black/`strokeOn:true`/`fill:false`, everything else from the toolbar;
    `w`/`h` default to 180×180, bumped up from the original 120×120 — see
    below). Each field is individually type/range-validated (same clamps
    `normalizeItem` already uses; `w`/`h` clamp to 20–2000px) and a
    missing/throwing/garbage `initStyle()` just means none of its fields
    apply — creation always succeeds either way. Replaces the old
    per-template `styleDefaults` table for good this time: that lived on
    `SMART_TEMPLATES`, keyed by whichever picker pill was selected, so it
    broke the moment a script was edited without touching the picker (see
    the Arrow/Blank bugs above) — `initStyle()` instead lives directly on
    the script itself, so it travels with the script regardless of how it
    got created. Added for the bar chart, which wants its own starting font
    size (12px, smaller than the toolbar's usual default), its enclosing
    frame's line style off (`strokeOn:false`), and a wider-than-tall
    starting size (240×160, to fit several bars comfortably) — all three
    still fully adjustable afterward via the ordinary toolbar/resize
    handles, same as any other item; `initStyle()` only ever affects the
    one moment of creation.
  - **The general creation size went from 120×120 to 180×180** (for every
    smart object, independent of `initStyle()`) — a plain, general increase
    per explicit request, on top of which a script's own `initStyle()` can
    ask for something that fits its shape even better (see the bar chart's
    240×160 above).
  - **A container now also has its own `fontFamily`/`fontSize`/`font`**
    (mirroring table's own per-item font fields), exposed to a script via
    `style.fontFamily`/`style.fontSize`/`style.font` in `smartResolvedStyle`.
    `normalizeItem`'s shared text/table font-validation block now also
    covers `'smart'` (same clamps: size 6–400px). The toolbar's Font/Size
    dropdowns now show when a smart object is selected (`texts` filter in
    the select-mode dropdown-visibility code, and `applyFont`'s own mutation
    filter, both extended to include `'smart'` — previously smart objects
    had *no* font-size field or control at all, only text color). Added so
    a script-drawn value label (e.g. the bar chart's per-bar numbers) can
    honestly say "font size and color come from the toolbar" rather than
    faking it from an unrelated field like stroke width.
  - **`onUp`'s smart-edit-drag handling now also fires `dragEdit` once on a
    plain click/tap with zero pointer movement**, not just on a real drag.
    Previously `dragEdit` was ONLY ever called from `onMove`, so a script
    whose handle represents a discrete action (a toggle, a delete/add
    button) rather than a continuous drag silently did nothing on an exact,
    jitter-free click — found while designing a valve/alarm-lamp toggle and
    the bar chart's delete/add buttons, all of which are inherently
    click-not-drag actions. `smartDrag` now also stores the original press
    position (`lx`/`ly`); on `pointerup` with no recorded movement, `onUp`
    calls `dragEdit` once with that position and commits history **only if
    the resulting state actually changed** (compared via `JSON.stringify`),
    so re-clicking something that lands back on the same value (e.g. a
    slider knob clicked without moving it) doesn't push a no-op undo entry.
  - **A new `'A'` (arc) path-segment type**, deliberately scoped to
    smart-object children ONLY — never exposed to a real, user-drawn/
    Point-Edit polygon. This app's shared `'path'` op (used by lines,
    arrows, and polygons alike) previously supported only `M`/`L`/`Q`/`C`
    segments (see `tracePath`) — no circular arc, even though real HTML
    Canvas has one natively (`ctx.arc`). Adding a generic arc primitive to
    the *whole* app (real polygons, Point-Edit, bbox, snapshot/resize) would
    have been a much bigger job for a feature that only ever needs an
    *interactive* angle picker anyway (an arc is meaningless without
    something to drag) — so it's deliberately scoped to scripts only, where
    a script's own `handles()`/`hitEdit`/`dragEdit` already provide that.
    A polygon **point** may now carry an optional `arcTo:{cx,cy,r,a1,a2}` —
    "the segment LEAVING this point is a circular arc, not a straight line
    or bezier" (mirrors how a point's existing `c1`/`c2` already mark a
    bezier segment). Three call sites needed touching:
    - `polyCurveSegments()` — copies `a.arcTo` onto each segment as `.arc`.
    - `shapeOps`'s `'polygon'` case — emits `['A', cx, cy, r, a1, a2]`
      instead of `'L'`/`'C'` when `s.arc` is set.
    - `tracePath()` (canvas) — new case, `ctx.arc(cx, cy, r, a1-PI/2,
      a2-PI/2)`. `pathD()`/`svgArcD()` (SVG export) — new case converting
      to SVG's endpoint-parameterized arc command (`A rx,ry x-rot
      large-arc-flag sweep-flag x,y`); sweep-flag is always `1` (our own
      convention below guarantees `a2>=a1`, i.e. always a clockwise sweep,
      which is what SVG's sweep-flag=1 means in its own y-down coordinate
      system too); large-arc-flag is `1` once the normalized swept angle
      exceeds half a turn; the endpoint is the point at angle `a2`.
    - Deliberately **untouched**: `bbox()`/`snapshotOf()`/
      `applyScaleFromSnapshot()`/`convertToCurve()` — all of these only
      ever run on *top-level* selectable items, and a smart object's
      children are never separately selectable/resizable/convertible, so
      none of them can ever encounter an `arcTo` point.
    - **`translateItem()` needed a real fix, found via actual use**: unlike
      the functions above, `translateItem()` genuinely IS called on a
      smart object's children — `shapeOps`'s `'smart'` case calls
      `translateItem(child, it.x, it.y)` to shift each child from the
      script's LOCAL (0,0)-(w,h) frame into world coordinates. Its
      `'polygon'` case already shifted a point's own `x`/`y` (and `c1`/`c2`
      bezier controls) by `dx`/`dy`, but not a point's `arcTo.cx`/`cy` —
      so an arc's ACTUAL drawn center (read directly by `tracePath`/
      `svgArcD`) stayed stuck in the LOCAL frame while the straight-line
      points around it were correctly shifted to world coordinates,
      producing a wildly wrong, jumped-apart shape: the arc rendered far
      outside the item's own selection box, joined to the correctly-
      positioned straight segments by a long stray line. Fixed by also
      shifting `p.arcTo.cx`/`p.arcTo.cy` by `dx`/`dy` (not `r`/`a1`/`a2` —
      a translation, not a scale or rotation).
    - **Angle convention**: `a1`/`a2` are stored in this app's own existing
      convention (`0` = top/12 o'clock, positive = clockwise — the same
      one Clock's own hand math already uses), NOT canvas/SVG's native
      `0` = 3-o'clock convention. The `-PI/2` conversion happens at exactly
      the two boundary call sites above (`tracePath`/`svgArcD`), so a
      script's own angle math never needs to think about the distinction —
      it stays in the one convention the rest of the app already uses.
    - A **filled** arc is a closed polygon `[{center}, {arcStart, arcTo},
      {arcEnd}]` → `M → L(center→start) → A(start→end) → L(end→center) →
      Z`, a genuine closed pie wedge. An **unfilled** arc is just
      `[{arcStart, arcTo}, {arcEnd}]`, `closed:false` → `M → A` only — the
      bow itself, not connected to any center point.
- **Reference implementation**: an analog clock ships as the "Add smart
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
  right now." Its `handles()` reports the hour/minute hand tips (the same
  points `hitEdit` checks against), each marked with a small solid-blue
  circle — visually distinct from the square corner markers, so it's
  obvious at a glance WHERE to drag, not just THAT you're in edit mode.
- **A second reference template, "Arrow"**, ships alongside the clock —
  Office/PowerPoint's classic block-arrow shape (a single 7-point polygon:
  rectangular shaft + triangular head), with two drag handles matching
  Office's own adjustment handles: one on the shaft's top edge (shaft
  thickness, `state.shaftRatio`) and one at the head's back corner (head
  length, `state.headLenRatio`). Unlike the clock, the arrow's single
  child **fully** inherits the container's color/fill/stroke — nothing is
  hard-coded, since there's only one shape and no reason to override the
  toolbar's own choices. Demonstrates the OTHER end of the spectrum from
  the clock (full inheritance vs. selective hard-set), and that `children()`
  isn't limited to lines/ellipses — a single filled polygon works exactly
  the same way, reusing the item type's own existing fill/stroke rendering.
  Its `handles()` also marks both adjustment points with the same solid-blue
  circles as the clock.
  - **Real bug this fully-inheriting design hit, found after actual use**: a
    freshly-created Arrow rendered completely invisible ("white", both on
    canvas and in its own Shape Library thumbnail) until the Stroke dropdown
    was touched once. Cause: `strokeOn:false` is the sensible default for
    the CONTAINER (it never draws its own box regardless), and the clock's
    children don't check the container's strokeOn at all -- but the arrow's
    one child explicitly follows it (`strokeOn: style.strokeOn`, so the
    Stroke dropdown can later turn its outline off), so a freshly-created
    arrow inherited `strokeOn:false` and had neither outline nor fill. First
    fixed with a per-template `styleDefaults` entry in `SMART_TEMPLATES`
    (Arrow:`strokeOn:true`, Clock/Blank left at the original all-off
    default) — see the next bullet for why that fix didn't hold.
  - **The same symptom recurred for a hand-written script, found after
    actual use again**: a from-scratch script (an ellipse whose `strokeOn`/
    `fill` both explicitly follow `style.*`, the natural thing to do for
    any child meant to respect the toolbar) rendered invisible when typed
    in under the "Blank" pill, exactly like Arrow originally did. Root
    cause: the per-template `styleDefaults` fix above tied visibility to
    *which pill happened to be selected at submit time*, not to what the
    script itself does — so it only ever papered over the one shipped
    Arrow template, not the general case (editing/replacing the script
    text doesn't change `selectedSmartTemplate`). Fixed by dropping
    `styleDefaults`/`selectedSmartTemplate`-based visibility entirely:
    **every** freshly-created smart object now starts `strokeOn:true,
    fill:false` unconditionally, regardless of template. This is harmless
    for Clock (its face hard-codes `strokeOn:true` itself and never reads
    the container's own value), and fixes the general case for any script
    — built-in or hand-written — that follows `style.strokeOn`.
  - **Related real bug, found the same way**: a freshly-created object's
    `color` used to come from `legibleColor(st.color, ...)` where
    `st = styleFor('smart')` resolves to the shared, global `ui` object —
    so a brand-new smart object's color (including its own Shape Library
    thumbnail) depended on whatever color was last left set by some
    completely unrelated action on a different object/tool. Fixed: a new
    smart object's `color` is now unconditionally `#000000` at creation
    time, never inherited from `ui`. `fill` still starts off (`false`)
    rather than a literal "none" fill color, matching how "no fill"
    already works for every other item type in this app.
  - **Third real bug, found via actual use**: dragging the shaft handle to
    its widest position still left a visible notch — the shaft could never
    be made quite as thick as the head's own back-corner width. Cause:
    `dragEdit`'s `shaftRatio` clamp topped out at `0.95`, chosen defensively
    ("don't let a ratio overrun the whole shape") without noticing that
    `shaftRatio:1` is not actually degenerate here — it just makes the
    shaft's top/bottom edges meet the head's back corners exactly, a
    perfectly valid straight-sided shape. Fixed by raising the clamp's
    upper bound to `1`. `headLenRatio`'s own clamp (`0.9`) is unrelated and
    stays as-is — a head consuming the whole box would leave no shaft at
    all, which is a real degenerate case.
- **The "Add smart object…" dialog now has a template picker**
  (`.smart-template-row`, a `<select id="smartTemplateSelect">` dropdown
  above the Name field: Clock / Arrow / Arc / Timer / Chart / Minimal /
  Blank) — choosing one fills the Name + Script fields and updates the
  select's own value. Originally a row of pill buttons
  (`.smart-template-btn`, one per template, `aria-pressed` marking the
  active one) — changed to a dropdown once a sixth template (Timer) made
  the row visibly not scale ("es werden noch mehr", i.e. more templates
  are expected to keep being added). Clock
  is preselected on open, matching the previous single-template behavior
  exactly for anyone who doesn't touch the picker. "Blank" is a minimal,
  valid starting point (`{initState(){return{};}, children(){return[];}}`) for
  writing a smart object from scratch — its Name field is deliberately left
  empty, forcing the user to type a real name rather than accidentally
  keeping a previous template's name.
- **A third reference template, "Minimal"**, sits between Chart and Blank —
  a small, complete, English-commented worked example (a circle with one
  draggable radius handle: one child, one state field, one handle) meant to
  be read end to end, unlike Clock/Arrow which are full-featured reference
  shapes. Grew out of an ad hoc example given informally (outside the
  template picker) while explaining the script contract to someone unfamiliar
  with the codebase — manual testing of that ad hoc version surfaced a real
  bug (below), so the corrected version was promoted into a real, permanent
  template rather than staying a one-off chat example.
  - **Real bug found via that manual testing**: the circle's radius could be
    dragged larger than the container box itself — nothing clips a smart
    object's children to its own container (`shapeOps`'s `'smart'` case only
    translates child coordinates, it never sets a clip region), so a script
    is fully responsible for keeping its own geometry within `w`/`h`. The ad
    hoc version's `dragEdit` only clamped the LOWER bound (`Math.max(5, ...)`,
    a minimum radius) and had no upper bound at all. Clock/Arrow never hit
    this because their geometry is already a function of `w`/`h` by
    construction (e.g. Clock's `r = Math.min(w,h)/2`) — Minimal's whole point
    is to demonstrate that pattern explicitly: `dragEdit` clamps `r` to
    `Math.min(w,h)/2` on the upper end, specifically so the circle can never
    grow past the container's own edges. General framework-level clipping
    (a new clip primitive threaded through `shapeOps`/`paintOp`/`opToSVG`)
    was considered and explicitly declined — deemed too invasive for what a
    same-script clamp already solves; scripts remain responsible for their
    own bounds.
- **A fourth reference template, "Chart"**, sits between Timer and Minimal —
  a 4-bar bar chart with an editable bar *count*, not just editable bar
  heights, built while designing a demo for oldwired (who works at a
  Fernwirktechnik/SCADA-adjacent company; several domain-specific ideas —
  a valve symbol, a Störmeldeleuchte alarm lamp — were explored and set
  aside before landing on a generic chart as the best fit for showing off
  the framework itself rather than one specific vertical). Exercises
  several mechanisms no other shipped template needs:
  - Bar **colors** come from `style.presetColors` (the toolbar's own
    color-swatch palette) rather than a hard-coded list — Red/Green/Blue/
    Yellow are guaranteed first (matching the originally-agreed look)
    regardless of `PRESETS`' own declared order, with white/black/`#1f2937`
    ("Dark", `PRESETS`' closest thing to black) excluded since none of the
    three read well as a bar fill. The bar **count**'s max is therefore
    "however many colors are left after that exclusion" (12 today), not a
    made-up number — it tracks `PRESETS` automatically if it's ever edited.
  - The bar count itself is editable in edit mode: a single shared "−"
    (always drops the LAST bar) and "+" (appends one with a random
    10–90 value, so a new bar is never empty or full-height) pair,
    centered together under the X-axis. Originally one delete icon PER
    bar — simplified to one shared pair once it was noticed that deleting
    always targeted the last bar anyway, so a per-bar row was pure
    clutter with no actual per-bar behavior behind it.
  - Both "−"/"+" are marked `kind:'click'` in `handles()` (see the script
    contract section above) — **found a real bug this way**: before that
    mechanism existed, pressing "+" and merely nudging the pointer before
    releasing (any real drag/tap fires many `pointermove` events) re-ran
    `dragEdit` on every single one of them, inserting a whole run of new
    bars from what looked like one click. `kind:'click'` was added
    specifically to fix this, generalizing well past just this chart.
  - Uses `initStyle()` to start at 12px font, `strokeOn:false` (no frame
    border), and a wider-than-tall 240×160 size — the first (and, so far,
    only) shipped template that overrides any of these creation defaults.
  - Value labels above each bar use the toolbar's own font/text color —
    the label `children()` entries need explicit `strokeOn:false,
    fill:false`, or the `'text'` op's own "box on unless told off" default
    draws a stray border/fill behind every number (a real bug hit and
    fixed while building this).
  - The container's own background+frame rect still follows the toolbar's
    Fill/Stroke (a separate, earlier, still-standing request from before
    Chart existed) — this is the one part of the design NOT specific to
    Chart, reused as-is.
- **A fifth reference template, "Arc"**, sits between Arrow and Timer —
  two independently draggable legs (`state.a1`/`a2`) sweep out a circular
  arc, fully inheriting the
  container's own style (line color, stroke width, fill on/off + fill
  color) exactly like Arrow does — nothing hard-coded, since there's only
  one shape and no reason to override the toolbar's own choices. The
  motivating example for (and first real user of) the `'A'` arc
  path-segment support documented above — a single `polygon` child whose
  points carry an `arcTo` marker instead of approximating the curve with
  many straight segments. Fill on renders a genuine closed pie wedge
  (`[center, arcStart, arcEnd]`, `closed:true`); fill off renders just the
  bow itself (`[arcStart, arcEnd]`, `closed:false`, no center point at
  all) — reusing the SAME `style.fill` toggle every other template's fill
  behavior already comes from, no new concept needed. The swept arc always
  runs clockwise from `a1` to `a2`, wrapping around if `a2` is numerically
  "before" `a1` (`((a2-a1) % 2π + 2π) % 2π`), matching how two
  independently rotatable legs would work regardless of which one you
  rotate past the other. No
  `initStyle()` — the universal `strokeOn:true`/`fill:false`/black default
  already renders a visible quarter-turn bow immediately, same as Arrow.
  Radius is `Math.min(w,h)/2` — no inset margin from the container's own
  edge, matching the toolbar's own Ellipse/circle tool exactly (`rx`/`ry`
  are the box's own half-width/half-height there too, with zero margin).
  An earlier version used `* 0.9` (a 10% inset, "leaves room for the
  handles") — changed per explicit request to match the Ellipse
  convention instead once it read as an inconsistency next to it.
  - **Real bug found right after this first shipped, via actual use**:
    the arc rendered far outside the item's own selection box, joined to
    correctly-positioned straight segments by a long stray line — the
    `translateItem()` bug described above (its `'polygon'` case forgot to
    shift a point's `arcTo.cx`/`cy` alongside the point's own `x`/`y`).
- **A sixth reference template, "Timer"**, sits between Arc and Chart — a
  60-minute visual countdown (styled after the well-known "Time Timer"
  product: a shrinking red pie wedge shows time remaining). Structurally a
  sibling of Clock (same face/tick-mark/hand pattern) but with a single
  value instead of hour+minute, and a filled wedge instead of two hands.
  The second real user of the `'A'` arc path-segment support, after Arc
  itself — grew directly out of an earlier snippet (built as a standalone
  demo before the arc primitive existed, approximating the wedge with
  dozens of straight polygon segments) that was updated to use the new
  primitive once Arc shipped it, per explicit request ("das könnte doch
  jetzt vom Arc profitieren"). Same construction as Arc's own filled case:
  a single closed 3-point `polygon` child (`[center, arcStart-with-arcTo,
  arcEnd]`), 5 path commands total (`M,L,A,L,Z`) instead of ~60.
  - `state.value` is NEGATIVE minutes remaining (`-60` = just started/full
    disk, `0` = time's up/empty), counting UP toward zero — a countdown-
    display convention (like a "T-minus" readout), per explicit request.
    `initState()` starts at `-60` (a genuinely full disk); the hand alone
    can only reach 1..59 plus one ambiguous 0/60 point at the very top
    (a full sweep and a zero sweep look identical there, same wrap-around
    Clock's own hands already have at m=0/m=60) — dragging there resolves
    to `0` (time's-up reads as the more useful default of the two).
  - Unlike Arc/Arrow, the wedge's color is **fixed red** (`#dc2626`), not
    toolbar-driven — "the iconic look of this kind of timer" is the whole
    point, so nothing here reads `style.color`/`style.fillColor`. The face
    outline, all 60 tick marks, and the 5-minute number labels all still
    follow the container's own stroke/text color, exactly like Clock's ticks.
  - **Three real differences from the reference "Time Timer" photo, found
    via screenshot review right after this first went live** (not
    hypothetical — the first shipped version got all three wrong):
    1. **Numbering direction was backwards.** A normal clock face counts UP
       clockwise; this dial counts DOWN clockwise (`60`/`0` at the top,
       `55` just clockwise of it, `5` just counter-clockwise of it, `30` at
       the bottom) — `value = (60 - i*5) % 60`, the exact reverse of the
       original `value = i*5`. The `% 60` is also what keeps the top
       position showing only `"0"`, never `"60"` — both land on the same
       spot, and the formula naturally picks `0` there without a special case.
    2. **Label boxes were too narrow and wrapped** (a fixed `28×18` box
       against the toolbar's real default font size broke "55" into two
       stacked lines, "5" over "5"). Fixed two ways together: `initStyle()`
       now starts the font at `12px` (mirroring Chart's own precedent —
       12 labels around a 180px dial at the toolbar's normal 28px default
       both overlap each other and leave no room for a tick ring at all),
       and the label box itself (`labelW`/`labelH`) is now sized off the
       *actual* `style.fontSize` rather than a fixed guess, so it can never
       wrap regardless of what the Font-size dropdown is later set to.
       Both `labelW` and `labelH` are additionally capped at the
       container's own width/height minus a small margin — past some
       absurdly large font size (`normalizeItem` allows up to 400px) even a
       non-wrapping box would be wider than the whole dial; past that point
       wrapping deliberately returns rather than the box poking outside the
       item's own selection rectangle (same "script owns its own bounds"
       precedent as Minimal's radius clamp).
    3. **Radial layering was wrong**: numbers were drawn *inside* the tick
       marks (which themselves reached the container's own outer edge),
       the reverse of the reference photo's arc → ticks → numbers ordering
       from center outward. Also, only the 12 five-minute ticks existed at
       all, with no finer per-minute division. Fixed by deriving every
       radius from the number ring's own size working inward: `numR` (the
       numbers, sized as above) → `tickOuter` (a small gap inside `numR`)
       → `tickInnerMajor`/`tickInnerMinor` (the 12 five-minute ticks
       reaching further in/longer; the 48 one-minute ticks in between them
       shorter, at half the line width) → `wedgeR` (a small gap inside the
       tick ring). All 60 tick marks now share the same outer radius
       (`tickOuter`) — only the *inner* radius and line width differ
       between a 5-minute and a 1-minute tick, the standard analog-dial look.
    4. **The red wedge's own direction was left over from before the
       numbering was reversed**, found via a follow-up correction right
       after the above three landed: it still ran from the top clockwise
       OUTWARD to the current value (`a1:0, a2:sweepLen`) — correct for
       the *old* (now-reversed) numbering, but no longer matching where
       the "N" label the hand should be pointing at actually sits. Fixed
       by introducing `boundaryAngle = (2*Math.PI - sweepLen) % (2*Math.PI)`
       — the angle where red meets white — and building the wedge as
       `a1:boundaryAngle, a2:boundaryAngle+sweepLen` instead: it now runs
       FROM the current-time boundary CLOCKWISE UP TO the top, `a2` always
       landing at exactly `2*Math.PI` (the top) by construction, matching
       how the reference product's own red disk shrinks toward `0` at the
       top rather than growing away from it. The hand (`handles()`/
       `hitEdit()`) and `dragEdit()`'s angle-to-minutes inversion all had
       to move to the same `boundaryAngle` convention too — the hand is
       drawn "at the wedge's own boundary," so leaving it on the old
       formula would have pointed it at the wrong number entirely (e.g.
       dragging to the position now labeled "45" would have silently set
       15 minutes, and vice versa) even though only the arc was reported
       as wrong.
  - **The wedge's fill color is now toolbar-driven, not fixed red** —
    reverses the earlier "fixed red, not toolbar-driven" design (see
    above) per explicit follow-up request. `children()` reads
    `style.fillColor` instead of a hard-coded `'#dc2626'` constant for
    both `color` and `fillColor` on the wedge's own polygon child (it's
    still unconditionally `fill:true` regardless of the container's own
    Fill on/off toggle — a timer showing no color at all wouldn't make
    sense); `initStyle()` gained a matching `fillColor:'#dc2626'` so a
    freshly-created instance still *starts* red, exactly like before, but
    the toolbar's own Fill-color dropdown now changes it afterward like
    any other filled shape.
  - **Starts at 45 minutes remaining, not a full 60** — `initState()`
    changed from `{value:-60}` to `{value:-45}`, per explicit request
    that this also be visible in the Shape Library's own thumbnail
    preview. No thumbnail-specific code was needed: `shapeThumbSVG()`
    (→ `itemToSVG` → `shapeOps`'s `'smart'` case → `children(state, ...)`)
    already renders a library entry's own stored `state` generically, the
    same derived-render-output path used everywhere else — changing the
    one `initState()` default was sufficient for a freshly-created Timer's
    thumbnail to show a partial, recognizable 3/4 wedge immediately
    instead of a full disk that reads ambiguously as "unset."
  - **Creation size is 234×234, 30% bigger than the generic 180×180
    default** — `initStyle()`'s `w`/`h` override, per explicit request.
    With 12 numbers plus 60 tick marks packed around the dial, the extra
    room reads noticeably less cramped than the generic size (still fully
    adjustable afterward via the ordinary resize handles, like any other
    item). No layout constant needed retuning for this — every radius in
    `children()` is already derived from `r = Math.min(w,h)/2` and the
    label boxes' own `fontSize`, so the whole ring layout simply scales up
    proportionally.
  - **The hand's length is now exactly `wedgeR`** (the arc's own radius,
    "die Schenkellänge des Arcs"), not the earlier fixed `r*0.7` — per
    explicit request. The whole radial-layout derivation (`labelW`/
    `labelH`/`numR`/`tickOuter`/`tickInnerMajor`/`tickInnerMinor`/
    `wedgeR`) was pulled out of `children()` into a shared `_layout(style,
    w, h)` helper method on the script object itself (called via
    `this._layout(...)`, which works because the app always invokes these
    functions as plain method calls, e.g. `def.children(...)` — never
    detached from their `this`), so `children()`, `handles()`, and
    `hitEdit()` all derive `wedgeR` from the exact same formula and can
    never drift apart. This is what motivated adding `style` to
    `handles()`/`hitEdit()` (see the script-contract section above) —
    `wedgeR` depends on `style.fontSize`, which those two functions
    previously had no way to see at all.
  - **A real SVG limitation surfaced while adapting this to the arc
    primitive, found proactively (not yet reported by the user) before it
    could ever be hit**: SVG's endpoint-parameterized arc command cannot
    represent an EXACT 360°/2π sweep — the start and end points coincide,
    degenerating to nothing, which would have broken Timer's very own
    first render (a fresh, full 60-minute disk) in SVG/HTML export. Fixed
    by clamping the sweep to a hair under a full turn
    (`Math.min(sweep, 2*Math.PI - 0.0001)`) whenever `minutesRemaining`
    reaches 60 — invisible in practice (canvas rendering is unaffected;
    the wedge still reads as a full disk), but keeps the SVG arc command
    well-formed. Confirmed via a dedicated check that removing the clamp
    reproduces exactly this — start/end point coordinates computed as
    numerically identical at the unclamped, exact-2π sweep.
- **`examples/drill-template.js`**, added much later than the other
  templates (a separate session, well after Chart/Minimal/Blank already
  existed) — a 4-hole square drilling template ("Bohrschablone") whose
  whole point is real, physically accurate millimeters, not arbitrary
  on-screen pixels. **Lives entirely outside `index.html`, as its own
  standalone file** (explicit two-step request: first "just the script, no
  integration into the demo-object list" — removed from `SMART_TEMPLATES`/
  the dropdown but still an in-app `DRILL_EXAMPLE_SCRIPT` constant at that
  point; then "what's this script doing in the app's own file at all" —
  it isn't a constant in `index.html` anymore either now, just a plain,
  independently-pasteable file meant to be copied by hand into the Script
  field). Confirmed by direct test (`new Function('"use
  strict";return ('+src+');')()` against the file's own full text,
  including its leading `//` usage-comment) that the ENTIRE file — not
  just the object-literal part — can be pasted as-is: a `//` line comment
  only ever consumes its own physical line, so a multi-line comment block
  before the real `({...})` expression parses away harmlessly once the
  app wraps it in `return (...)`, and the real content starts cleanly on
  its own line after. The Playwright suite reads this file directly
  (`fs.readFileSync('examples/drill-template.js')`) and feeds its text into
  `compileSmartScript()` inside the page, exactly mirroring how a real user
  would supply it by hand — never through the picker UI, and never as an
  app-global.
  Grew out of a direct question: could a smart shape specify hole spacing
  in mm and have it come out correctly 1:1 when printed? Answer, confirmed
  before writing any code: yes, in principle, since `96px == 1 inch ==
  25.4mm` is a fixed constant from the CSS/SVG spec itself (not a guess or
  a per-browser setting) — a script can freely convert mm to px with that
  one ratio, and this app's existing SVG export already emits unitless px
  dimensions, which vector programs (Illustrator, Inkscape) already
  interpret at that same 96dpi convention when printing "actual size." The
  one genuinely unreliable link in the chain is `window.print()` itself
  (this app's own **Print** menu item) — the browser/OS print dialog's own
  scale-to-fit setting is outside the page's control, so nothing here can
  *guarantee* a browser-printed page is 1:1; only the SVG-export-then-
  print-elsewhere path can.
  - **Hole spacing is still NOT a drag-handle state field** — it's the
    container's own `w`/`h`, resized with the ordinary GENERIC resize
    handles every item already has (Shift keeps it square) — reusing an
    existing, already-precise mechanism instead of inventing a new one. A
    live `"N.N mm hole spacing"` label gives numeric feedback while
    resizing, since eyeballing raw pixels against a desired mm value isn't
    practical otherwise.
  - **Second design pass, explicit follow-up request**: the first version
    put the 4 holes exactly ON the container's own corners/frame. Changed
    so the holes sit inset from the frame by a fixed `margin` (`15%` of
    `Math.min(w,h)`), and — the actual point of the request — the whole
    4-hole square can be dragged to any position *within* that margin via
    a new `'pos'` handle (at the square's own center), entirely separate
    from `'dia'` (hole diameter, on the top-left hole's own edge).
    Dragging `'pos'` only ever changes `state.offsetXmm`/`offsetYmm` —
    never the container's own `w`/`h` — matching the request precisely
    ("move the hole-square within the drawn rectangle, without changing
    the SmartShape's own size"). Margin is deliberately a flat fraction of
    the container, independent of the CURRENT hole radius, so growing or
    shrinking the hole diameter can never secretly change the hole-to-hole
    spacing — the two stay genuinely independent controls, each with their
    own handle. A shared `_geom(state,w,h)` helper (same precedent as
    Timer's own `_layout()`) derives margin/spacing/center once, reused by
    `children()`/`handles()`/`hitEdit()`/`dragEdit()` so all four can never
    drift apart — the position clamp inside it (keeping every hole fully
    inside the container regardless of where `'pos'` was last dragged to)
    only ever affects the DISPLAYED center, never `state.offsetXmm/Ymm`
    itself, so shrinking an oversized hole back down always restores
    whatever position was last genuinely dragged to, rather than losing it.
  - **The live spacing label moved from inside the container to ABOVE
    it** (negative `y`) — now that the 4-hole square itself can be dragged
    anywhere within the container, anchoring the label at the container's
    own center (as the first version did) would have put it on a collision
    course with the very thing it's meant to describe. Anchoring it
    outside the drawn rectangle entirely sidesteps the problem regardless
    of where the square currently sits.
  - **A separate fixed-length "10mm" calibration mark was tried and then
    explicitly dropped again** (a real, if short-lived, design reversal —
    not something that was always this way). It originally existed
    specifically because the mm math inside the script can be perfectly
    correct while the *printed* result still isn't 1:1 (see the
    `window.print()` caveat above), giving an independently-verifiable
    reference to catch that after the fact. Removed per explicit follow-up
    request — the drawn holes themselves, measured directly against a real
    ruler on the printout, already tell you the same thing the separate
    mark would have, so the extra mark (and its own layout-collision risk,
    see the bug below) was redundant.
  - **Each hole is a circle plus a crosshair**, not just a circle — the
    crosshair (two short perpendicular lines through the hole's own
    center) is the standard technical-drawing convention for a precise
    center-punch/drill mark, independent of whatever the hole's own
    drawn diameter is.
  - **Real bug, found via actual use immediately after the first version
    shipped** (before the margin/position redesign, back when the 10mm
    mark above still existed): its own label text visually overlapped the
    bottom-row holes' own crosshair circles, since the holes sat right on
    the container's own bottom edge at the time. Confirmed via an actual
    rendered screenshot, not just the geometry math, matching this
    project's own established practice for visual-only regressions that
    behavioral tests alone wouldn't catch. Moot now that the mark itself
    is gone entirely, but the screenshot-verification habit is why it was
    caught in the first place.
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

### Group edit mode ("enter group", Point-Edit-style persistence)

Double-clicking a grouped item previously did nothing (only its own
dblclick-on-rotation-handle fallback could ever fire, and only if the click
happened to land exactly on the handle). Double-click now **enters** a
group — modeled explicitly on PowerPoint/Illustrator's own "enter group"
gesture, and on this app's own Point-Edit mode (which already has the
right persistence shape: stays active until a click lands outside the
shape's own body, not until the next unrelated selection change) — letting
its members be moved, resized, recolored, deleted, and edited **one at a
time**, without ungrouping, and without re-double-clicking every time you
switch which member you're touching.

This went through two real designs in the same session. The first
(**superseded, do not resurrect**) modeled it on `editingSmartIdx` instead:
a single member INDEX (`editingGroupMemberIdx`), entered per-member via
double-click, that self-healed (cleared) the instant `selection` stopped
being exactly `[thatIndex]` — meaning clicking a *different* member of the
same group re-expanded to the whole group and dropped you out, forcing a
fresh double-click to drill into each new member in turn. Real use
(comparing directly against Point-Edit's own feel) surfaced that this was
the wrong shape entirely: **the group itself**, not any one member, is
what should be "entered" and stay entered; individual members are picked
one at a time *within* that persistent state, exactly like Point-Edit's
own anchors are picked one at a time within one persistently-entered
shape. The rewrite below reflects the current, correct design.

- **`editingGroupId`** (new state, next to `editingSmartIdx`): the **id of
  the group** currently entered (a string, not a member index); `null`
  when inactive. Deliberately independent of `selection`, which is free to
  become `[]` (browsing, nothing individually picked yet) or
  `[oneMemberIdx]` (that member picked for move/resize/recolor/delete/
  edit) while `editingGroupId` stays constant — only an explicit exit
  (click outside the group's own box, Escape, Ungroup, or the group
  vanishing) clears it.
- **`groupBoxContains(groupId, x, y)`** (new helper, next to `groupPivot`):
  is a world point within a group's own (rotation-aware) bounding box —
  the same box the group's outline is drawn in. The one primitive the
  whole feature is built on: it decides both whether a *miss* should still
  count as "inside the group" (persistence) and whether a double-click on
  *empty space* between members should enter the mode in the first place.
- **Entry — three ways in, all converging on the same state**:
  1. Double-click directly on a member: `onDoubleClick`'s per-type
     branches (see below) set `editingGroupId = that member's group;
     selection = [thatMember]`.
  2. Double-click on **empty space**, but still within an *already
     whole-group-selected* group's own box (a gap between members) — a
     dedicated `hit<0` branch near the top of `onDoubleClick`, guarded by
     `groupBoxContains`, entering with `selection = []` (nothing hit, so
     nothing individually picked yet).
  3. This second path only works because `onDown`'s own miss-handling
     (see "persistence" below) *preserves* a whole-group selection through
     a miss inside its own box, instead of the usual deselect-on-miss — a
     genuine, deliberate change to a plain (non-double) click's behavior
     too, not just double-click's: **a click that misses everything, but
     lands within an already-selected group's own box, is a no-op** rather
     than deselecting. Without this, `selection` would already be `[]` by
     the time the double-click's native event fires, and there'd be no way
     left to tell which group the click was even near.
- **Persistence (`onDown`)** — the actual heart of the redesign, replacing
  the old self-healing-on-any-selection-change model with explicit exit
  points:
  - The old whole-group-grab expansion (`grp = g!=null ? itemsInGroup(g) :
    [hit]`) now reads `grp = (g!=null && g!==editingGroupId) ?
    itemsInGroup(g) : [hit]` — a plain click on **any** member of the
    group currently entered selects *just that member*, letting you click
    straight from one member to another with no double-click in between.
    A click on a member of a genuinely *different* group (or an ungrouped
    item) first does `if(g !== editingGroupId) editingGroupId = null;`,
    exiting before the normal fresh-pick logic applies — clicking outside
    the entered group always behaves exactly as if the mode had never been
    active.
  - The identical `g!==editingGroupId` carve-out was also needed in
    `selectionFor()` (used by click-cycling through a stack) — without it,
    clicking again on a member being browsed while something else is
    stacked underneath it would never advance the cycle (a length-mismatch
    against the whole group would restart it at the top every time).
  - The "missed everything" branch gained two cases *before* the plain
    marquee+deselect fallback: (1) already in the mode, and the miss is
    still within `editingGroupId`'s own box → clear `selection` to `[]`
    (nothing more to do — no drag/marquee starts from what's really just
    browsing) but do **not** exit or touch anything else; only a miss
    *outside* that box clears `editingGroupId` before falling through.
    (2) not in the mode yet, but the current whole-group selection's own
    box contains the miss → preserve the selection (see entry path 2/3
    above). Both directly mirror Point-Edit's own "a miss on the same
    shape's own body is a no-op" precedent, generalized from one shape's
    box to a whole group's.
- **`text`/`table`/`smart` get a TWO-STAGE double-click, not a plain
  exclusion** — these three already have their own dblclick behavior
  (open the text editor, open a cell editor, toggle the smart object's own
  script-edit mode) that fires unconditionally today, group or not. A
  grouped instance's FIRST double-click enters (or switches to) group edit
  mode for its own group instead — `if(items[hit].group!=null &&
  editingGroupId!==items[hit].group){ editingGroupId=items[hit].group;
  selection=[hit]; return; }`, at the top of each of the three branches —
  rather than immediately opening its editor; a SECOND double-click, once
  already browsing THIS item's own group, falls through to the original
  behavior (`openText`/cell-`openText`/`editingSmartIdx` toggle). An
  ungrouped instance is completely unaffected. For `smart` specifically,
  this nests three deep: dblclick 1 → group edit mode; dblclick 2 → the
  smart object's own script-edit mode (`editingSmartIdx`), with
  `editingGroupId` staying set alongside it (harmless — smart's own
  `onDown` branch runs first and fully owns interaction while its
  script-edit mode is active); dblclick 3 → smart's own pre-existing
  toggle exits `editingSmartIdx` back to `null`, landing back in plain
  group edit mode.
- **A real test-methodology trap hit twice while verifying this** (not an
  app bug either time): selecting a text/table/smart item can grow the
  toolbar (its Font/Size controls become visible), which shifts the canvas
  element's on-page position. A Playwright test that caches
  `canvas.getBoundingClientRect()` once and reuses it across two separate
  mouse gestures will click at a stale, wrong position for the second one
  — mistaken for a real "can't move a grouped text box" regression before
  being correctly root-caused via `hitStack`/`pos(e)` tracing. Never an
  issue for an actual person clicking based on what they currently see on
  screen. Every test re-fetches the bounding box between separate gestures.
- **Exit — `syncGroupEdit()` is now a backstop, not the primary
  mechanism** (the opposite of `syncSmartEdit`/`syncPointEdit`'s own
  self-healing-on-every-selection-change convention, deliberately, since
  `selection` is SUPPOSED to move freely between `[]` and `[oneMemberIdx]`
  while this stays active): only clears `editingGroupId` if the group has
  no members left at all, or if `selection` somehow ends up containing
  something that isn't a member of it (a safety net against a future,
  non-click code path, not something the click-driven flows above ever
  trigger). The real exit points are explicit: a click outside the box
  (`onDown`, above), Escape, Ungroup (`ungroupSelection()`'s own
  `expandSelection` naturally re-expands `selection` to the whole
  ex-group, which the backstop then clears), and `cancelGesture()` (the
  undo/redo/document-swap safety net) each got one explicit
  `editingGroupId=null` line, matching their existing
  `editingSmartIdx`/`pointEditIdx` neighbors.
- **Move/resize/recolor/delete were already fully generic over
  `selection[]`** (`translateItem`, `snapshotOf`/`applyScaleFromSnapshot`,
  `colorableSelection()` and every `apply*Color`/size/dash handler,
  `deleteSelected()`) — zero changes needed there beyond the `onDown`
  rework above. Only `resizePivotFor`/`rotationPivotFor` (which
  hard-branched on `first.group==null` for the single-item pivot case)
  needed widening, now checking `editingGroupId===first.group` instead of
  a specific index.
- **Deleting the browsed member now STAYS in the mode** (a deliberate
  behavior change from the old design, and a natural consequence of the
  new persistence model) — `selection` becomes `[]` after the splice, but
  `editingGroupId` is untouched as long as the group still has members
  left, so the very next click can pick a different one without
  re-double-clicking. **Auto-ungroup at one survivor** is unchanged in
  spirit: deleting a group down to exactly one remaining member
  auto-ungroups that survivor (`bakeGroupRotation` then drop
  `group`/`groupRotation`, same convention `ungroupSelection` already
  uses) — a "group of one" would otherwise be a confusing residual state
  — which then also naturally exits the mode (nothing left to browse).
  `deleteSelected()` captures the affected group ids via the existing
  `groupsIn()` helper *before* splicing (indices shift after).
- **Rotated groups — the one real technical wrinkle**: rotation here is
  two independent, composable layers (`it.rotation`, pivoted on the item's
  own *currently-recomputed* bbox center — which is why plain world-delta
  dragging already "just works" for a rotated single item regardless of
  angle — and `it.groupRotation`, shared by the whole group, pivoted on
  the group's *external, fixed* pivot). Moving one member alone while
  `groupRotation != 0` needed the incoming drag/nudge delta rotated by
  `-groupRotation` first (a cheap, exact vector rotation, added to both
  the pointer-drag path in `onMove` and the arrow-key nudge handler) —
  resize/rotate would need a full composed-rotation-pivot (two nested
  rotations around two different centers reduced to a third) that doesn't
  exist anywhere in this codebase. **Explicit scope cut**: move/recolor/
  delete work correctly regardless of `groupRotation`; resize and rotation
  handles are simply **absent** (not wrong) for a member whose enclosing
  group is rotated — `resizePivotFor`/`rotationPivotFor` return `null` in
  that specific case rather than silently falling through to the
  whole-group branch. A composed-pivot follow-up is a known, deliberately
  deferred next step, not an oversight.
- **Visual chrome**: the group's own solid outline no longer draws via the
  ordinary per-`selection`-item loop while it's the one being browsed
  (that loop now explicitly skips `it.group===editingGroupId`) — instead,
  a dedicated block draws it unconditionally off `editingGroupId` itself
  (not off `selection`, which may be `[]` while simply browsing) **plus**
  solid blue corner squares on the group's own box, same 10×10 convention
  smart-object edit mode already established for "this position isn't a
  plain handle anymore" (the group's own corners stop being real resize
  handles while the mode is active — resizing/rotating the whole group
  requires leaving first and reselecting it as a whole). The one
  individually-selected member (if any) additionally gets its own plain
  dashed outline and genuine hollow/white resize handles (once
  `resizePivotFor` recognizes it) — unlike the group's own corners, these
  ARE real, directly-draggable handles, since there's no scripted handle
  set here to indicate otherwise.
- **Hit-testing consistency fix**: a plain click or double-click landing
  ANYWHERE inside a group's own overall bounding box now activates it —
  even in an empty gap between members that misses every individual
  member's own bbox — exactly like a single item's own bbox (e.g. a
  polygon's concave interior) was already fully clickable. Reported as a
  real inconsistency: a lone shape's whole bbox has always been "live,"
  but a group's own visible selection rectangle had dead gaps wherever no
  member's own bbox happened to cover it. Fixed with a group-box fallback
  in **both** `hitTest(x,y,excludeIdx)` and `hitStack(x,y)` — for a
  grouped item whose own bbox test misses, `groupBoxContains(it.group,x,y)`
  is also tried, and a match reports that item's own index as the group's
  representative hit (whichever member happens to be checked first).
  Required no changes to `onDown`'s group-grab logic or the
  `editingGroupId` entry branches — they already resolve a hit's whole
  group via `hitItem.group`, so a fallback-resolved representative index
  works identically to a direct hit. This *did* let two other, now-
  redundant mechanisms be deleted outright: `onDown`'s bespoke "missed
  everything, but still within the browsed/selected group's box" special-
  casing (the miss branch is now only ever reached by a TRUE miss, since
  an in-box click is never reported as a miss anymore) and
  `onDoubleClick`'s dedicated "empty space within an already-selected
  group" entry branch (a `hitTest` call there now already resolves to a
  representative member on its own). Net effect: entering group edit mode
  or selecting a whole group via an empty-space click now lands on
  (and, for double-click entry, pre-selects) that representative member,
  rather than leaving `selection=[]` — simpler and more consistent than
  the previous bespoke "nothing selected" carve-out, and no longer a
  special case a script/test needs to know about separately.
  - **Real bug hit and fixed while building this**: an EARLY version did
    the fallback check inline, per item, during the single top-down scan
    both functions already do for direct hits — so a LOWER z-order
    member's group-box fallback could fire before the scan ever reached a
    HIGHER, more specific direct hit on a sibling further down the loop
    (loop order is highest array index first, i.e. topmost item first;
    the bug was about a group's *other* member's fallback preempting a
    dblclick that landed squarely on a *different* member's own box,
    purely because of which member the loop happened to check first).
    Caught immediately by the existing grouped-text/table/smart tests
    (direct double-clicks started resolving to the wrong sibling). Fixed
    by splitting both functions into two strict passes — a full top-down
    scan for direct (own-bbox) hits first, and the group-box fallback
    scan only runs afterward, only for groups that found no direct hit at
    all in the first pass. Direct hits therefore always take precedence
    over any fallback, regardless of z-order.
- Covered by 16 Playwright tests in `tests/regressions.test.cjs` (enter via
  a direct member double-click and via empty-space double-click, switching
  between members with a single plain click, empty-space clicks staying
  in the mode and resolving to the topmost member, a cold click on an
  unselected group's empty space selecting the whole group directly,
  Escape/click-outside exits, move/resize/recolor scoped to one member,
  delete staying in the mode + auto-ungroup-at-one, undo/redo, the
  rotated-group move-compensation + absent-handles case,
  ungroup-while-browsing, and the text/table/smart two/three-stage
  nesting).

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
  every change. Quota/storage failures retain all working tabs in memory and show a persistent warning.
  Discussed but not yet implemented: moving to IndexedDB (much higher quota)
  and/or JPEG compression for photos would fix this properly.

## Historical testing approach

Early development, before the checked-in Playwright suite, was verified via a Node + jsdom harness
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
