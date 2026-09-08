# SimpleCanvas — Project Notes

Single-file HTML/CSS/JS canvas drawing app. Everything lives in `index.html` —
no build step, no dependencies.

## Provenance

- Upstream: https://github.com/oldwired/simplecanvas (maintainer: oldwired)
- This repo (`regattahero/simplecanvas`) is a fork with a large feature branch
  built on top of oldwired's `main` (as of the "Bugfixes" commit, ~2575 lines).
- A pull request with this branch's changes was opened against
  `oldwired/simplecanvas`. Outcome unknown — treat this fork as the
  source of truth regardless of what happens to the PR.

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

## Kept from upstream, worth knowing about

- **UID-based selection** (`ensureUids`, `selectByUids`, `selectedUids`):
  selection survives undo/redo correctly even when the items array reorders.
  Our new interaction code still uses plain array indices during a live
  gesture (`selection = [idx]`) — that's fine, upstream's UID resolution only
  kicks in at undo/redo boundaries.
- **`normalizeItem`/`normalizeScene`**: strict validation on load (rejects
  malformed saved files instead of crashing). Any new per-item field
  (`textColor`, `align`, `texts`, `aligns`, `closed`, `strokeOn`, table's
  `fontFamily`/`fontSize`/`font`) **must be added here explicitly** or it
  gets silently dropped on save/reload.
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
