# Grain

A local-first generative wood-art playground. A combinatorial recipe explorer,
illustrated wood / laser-path previews, local favorites, and true-size SVG
downloads. No dependencies, accounts, analytics, AI calls, or remote assets.

## Open it

Open [index.html](./index.html) in a browser, or use VS Code's integrated browser
to open that local file. No terminal, Node.js, or build step is required.
Click **Surprise me** or **Six new directions** to discover new compositions,
not merely reseed the same design. Anything / Geometric / Organic / Optical
guide discovery; they are not fixed art presets. Change the recipe dropdowns
or sliders; select a card to bring its entire recipe into the main preview.
**More like this** retains structure and opening type while varying distortion,
rhythm, focal points, and movement. The small seed button reseeds the current
recipe without replacing its structural choices.

The same complete recipe, seed, dimensions, and slider values reproduce the SVG.
Favorites stay in this browser's local storage, not in GitHub. Download SVGs
to keep portable copies; the SVG description includes the complete generating
settings. First-draft favorites remain usable with their original geometry;
the old score-line and loose-piece families are no longer offered in discovery.

## What makes an idea

The engine combines these independent ingredients:

- **Structure:** honeycomb, quilt, cellular, radial, triangular, or ribbons.
- **Openings:** facets, rounded cells, stars, tracery around wooden hubs, or
  leaves oriented around a shared focal point.
- **Distortion:** ordered, vortex, lens, waves, or saddle.
- **Rhythm:** even, gradient, alternating, or bands.
- Seeded motif point counts, focal positions, aspect, frequency, phase, and
  twist, plus adjustable detail, movement, open space, and reserved wood width.

Network structures partition the panel into convex cells. Distortion moves
the generating sites before tessellation; it does not warp already-cut shapes
into overlaps. Triangular structure subdivides those cells. Motifs are shaped
inside inset cells. Tracery further divides each cell into inset angular
openings around a solid hub. Ribbons instead generate closed wave slots,
interrupted by solid focal islands and, for band rhythm, cross-bands. Their
opening dropdown is disabled because ribbons use slots rather than cell motifs.

This is an endlessly reseedable **procedural combination space**, not an
unbounded invention engine. The vocabulary is finite and can be extended.
It is not a library of copied artworks, an AI image generator, or a 3D
fabrication tool. Optical depth is flat geometry on a single panel.
Some combinations deliberately leave more solid wood than others.

## GitHub Pages (when you're ready)

Nothing is published automatically. Use a **personal repository you are
authorized to publish to**, not an employer repository unless explicitly approved.
Only publish these app files; do not upload reference screenshots, company
documents, credentials, or other workspace contents.

1. Put [index.html](./index.html), [styles.css](./styles.css),
   [generators.js](./generators.js), and [app.js](./app.js) at the repository root.
2. In GitHub, open **Settings > Pages**. Choose **Deploy from a branch**, your
   default branch, and **/ (root)**, then save.
3. Open the Pages URL shown there. Relative links support project-site paths.

The app needs no API keys or server. A public repository makes its source public.
Follow your employer's policies about personal projects and equipment; this app
cannot determine compliance for you.

## Laser workflow

- Dimensions are inches; SVG `width`/`height` have explicit `in` units and the
  viewBox uses the same coordinates. Verify imported size in Glowforge.
- Red (`#ff0000`) groups are intended cuts, blue (`#0000ff`) groups are intended
  scores. Colors are organizational, **not machine settings**. Assign operations
  and appropriate material settings manually.
- Every export has one rectangular boundary cut. Disable that operation in the
  laser UI when working on an existing panel.
- **New recipes:** closed red openings inside an intended connected wood panel.
  There are no fine score-line patterns or loose botanical blobs in discovery.
- **Reserved wood:** 0.10-0.30 inches before kerf (default 0.14). Network cells
  inset each side of a shared edge by half this width; motif shaping only removes
  area from those inset openings. Ribbons conservatively reserve spacing using
  bounds on their wave displacement and slope, and trim interrupted slot ends.
  This is a geometric target, **not a material-strength or cut-quality rating**.
- Openings with area below 0.012 square inches or a bounding-box dimension below
  0.10 inches are omitted. This does **not** guarantee a minimum width everywhere
  inside a hole: stars and leaves can still have sharp tips. The preview note
  reports omitted openings. No-usable-opening recipes fail explicitly; discovery
  skips them with a visible status message and has a bounded candidate limit.
- **Legacy favorites:** ripple retains the original 0.08-inch horizontal spacing
  rule; topographies / flow are blue score lines, not connected through-cut
  patterns; botanical studies remain separate loose pieces. Their original
  operation notes are shown when loaded.
- Width range: 2-19 inches; height: 2-10.5 inches. These are design limits,
  **not universal machine-bed limits**. Check your actual Glowforge model,
  usable cutting area, material placement, and thickness.
- 1/8 inch (3.175 mm) plywood is a material reference only. No kerf compensation,
  joinery/fit calculation, toolpath ordering, cut-time estimate, or strength model.
  Preview colors and texture are illustrative, not a simulation.
- Only use laser-approved material. Unknown plywood glue, coatings, and
  treatments may be unsafe. Follow manufacturer material/ventilation guidance;
  never leave an operating laser unattended. Test on a small scrap.

## Inspiration

Broad ideas: geometric screens, Middle Eastern mosaic rhythms, cellular
lattices, optical funnels, solid islands interrupting waves, and related
botanical forms. The code does not trace the supplied screenshots or copy artworks.
Public browsing references:
[r/generative wiki](https://www.reddit.com/r/generative/wiki/index/) and
[Flow Variations discussion](https://www.reddit.com/r/generative/comments/z2zdwi/flow_variations/).
No Reddit content or image is embedded or fetched by the app.

## Checks

Open [tests.html](./tests.html) in the browser. The dependency-free checks exercise
determinism, dimensions, complete recipe round-trips, actual cutout separation,
boundary clearance, intersections, finite ribbon tips, structural diversity
across 100 generated recipes, and explicit invalid-input handling. Legacy
checks retain coverage for saved first-draft studies.
