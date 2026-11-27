# Grain

A dependency-free, local-first generative wood-art studio. No accounts,
analytics, remote assets, AI calls, uploads, or automatic publication.

## Open the studio

Live site: https://gilman2026.github.io/gen1/

Open [index.html](./index.html) directly in a browser. No server, package
installation, or build is required. Refresh after changing the app files.

Four starting directions replace the combinatorial control panel:

- **Soft current:** smooth quilt cells moving around a common focus.
- **Crystal field:** intentionally angular honeycomb facets with center expansion.
- **Orbital drift:** golden-angle sites with true elliptical openings.
- **Long tides:** wave slots interrupted by a single solid island.

Each shows three relevant sliders: detail or wave count, field strength, and
open space. Detail is a generating-site budget, not the exact cutout count;
the preview footer reports the actual count.
Choosing a direction loads its fixed default under a stable seed such as
`whirl-start`; those defaults do not depend on the seed. Seeded variation comes
from **Surprise me** and the gallery.
Cell detail uses a small set of deliberate steps rather than dead intervals between
identical lattices. Archived/custom recipes retain off-step values unchanged.
Physical panel dimensions, reserved
wood width, and seed live in a separate collapsed group. Preview modes and
Focus studio do not change geometry. Desktop controls stay alongside the art;
on narrow screens the preview stays above the controls.

**Surprise me** chooses within these coherent families rather than independently
combining unrelated motifs, fields, and rhythms. Shapes share a focal field and
at most one size gradient. Candidates with very sparse openings or excessive
omissions are rejected with a bounded search that retries within the chosen
family. Each press moves to a different direction and skips compositions whose
detail, motion and open-space profile is close to one of the last six surprises
(kept in memory only). This is an authored procedural vocabulary, not an AI
artist or a guarantee of artistic quality.

## Saved recipes and compatibility

Favorites remain under `grain-studies-v1`; old taste records remain under
`grain-taste-v1`. Neither collection is reset, automatically upgraded, or
truncated. Unreadable collections are reported and not overwritten.

New geometry uses **version 4**. Versions 2 and 3, and first-draft ripple,
contour, flow, and botanical recipes, retain their original rendering and export
algorithms. Loading an archived/custom recipe does not force it into a new
family. **Upgrade a copy** explicitly adopts version 4; the stored original is
unchanged. A version-3 SVG fingerprint regression protects the earlier quilt.

Version 4 rounded cells use periodic cubic B-splines with continuous tangent
and curvature. Extra smoothing addresses pinched tips; unresolved or undersized
openings are omitted and reported, not silently replaced with unrelated ovals.
In rounded and oval fields, specks below 15% of the median opening area or 40%
of the median thickness (typically clipped edge slivers) are also omitted and
counted, so no isolated fragment sits among full-size neighbours.
Wave slots use local tangent-continuous rounding with an additional clearance
allowance along concave edges. Ellipses use precise SVG arcs. Facets stay angular.

The complete validated recipe, version, seed, dimensions, and parameters reproduce
the same SVG. The SVG description contains those settings. Export SVGs for
portable archives; browser storage is local to the browser and site origin.
Switching from a local file to GitHub Pages does not transfer browser storage.

## Four-panel evolution

**Build from current design** freezes the complete recipe, seed, and dimensions.
One parameter moves in four equal steps, including both endpoints; all other
settings stay fixed. No-effect parameters and invalid geometry are reported.
Endpoint edits affect the frozen study, not the main design.

Each **Export panel** button exports one panel at its stated physical size,
never an oversized combined sheet. **Export study recipes** saves all four
complete recipes as JSON.

## A broad taste gallery

The gallery offers up to twelve independent 10 x 8 in sketches: three per
family when enough distinct compositions remain. Mark any number as
**Favorite** or **Dislike**, leave others unmarked, or choose **None of these**.
Save choices once; request a new gallery when ready.

Records store the exact categorical choices and complete recipes. Unmarked
sketches and "none" are not converted to zero scores or inferred dislikes.
Earlier 0-10 ratings and pair comparisons still validate and export unchanged.
Automatic preference ranking is no longer offered; no broad taste claims are
made from repeated or weak ratings.

Novelty uses composition descriptors weighted toward detail, field strength,
and open space, with focal placement as a secondary distinction. It does not use
pixel differences as artistic judgment. Descriptors persist separately under
`grain-gallery-seen-v1`; each new gallery avoids profiles equivalent to those in
the last three galleries, so recent repeats are excluded without permanently
exhausting the vocabulary.
This conservative heuristic is not proof of artistic uniqueness. When the
finite vocabulary cannot provide enough fresh profiles, the app shows fewer
sketches instead of padding with near-duplicates.

**Undo last record** removes only the latest feedback record. Up to 500 records
are supported; a full collection reports an error rather than dropping records.
**Export taste notes** saves JSON locally for explicit discussion. The app never
uploads feedback or turns it into assistant memory.

## True-size SVG and laser workflow

- All geometry uses inches. SVG `width` and `height` have explicit `in` units;
  the viewBox uses the same coordinates. Verify imported dimensions in Glowforge.
- Downloaded cut paths are the same paths used in the preview. Preview masks,
  wood texture, backing, and colors are not included in laser exports.
- Red (`#ff0000`) denotes intended cuts, blue (`#0000ff`) legacy scores. Colors
  are organizational, **not machine settings**. Assign operations manually.
- Every SVG includes one rectangular boundary cut. Disable it when appropriate
  for an existing panel.
- New families have closed openings inside an intended connected panel.
  Reserved cell wood is 0.08-0.40 in before kerf. Convex cells inset each shared
  edge by half that width; wave slots reserve displacement/slope clearance.
- Openings below 0.012 square inches or 0.10 in bounding-box span are omitted.
  This does not guarantee minimum width everywhere within an opening.
- Legacy ripple preserves its original horizontal spacing rule. Contour/flow
  studies are score lines; botanical studies produce loose pieces.
- Panel limits are 2-19 in wide and 2-10.5 in high, **not universal machine-bed
  limits**. Check your model, material position, and usable area.
- Geometry checks are **not material-strength, kerf, fit, cut-time, ventilation,
  laser-setting, or cut-quality guarantees**. The 1/8 in plywood note is only a
  material reference. Two woods is an illustrative backing, not an inlay model.
- Use only laser-approved material; unknown glues, coatings, and treatments may
  be unsafe. Follow manufacturer guidance, verify ventilation, never leave a
  running laser unattended, and test a small scrap of the actual material.

## Checks

Open [tests.html](./tests.html). The dependency-free browser suite retains the
original geometry checks and adds version-3 archival compatibility, 100 seeds
per offered family, sampled actual SVG-path containment/separation, exported
path identity and dimensions, five-point slider-effect thresholds, semantic
gallery novelty, and categorical feedback round-trips.

The seed audits sample the browser's actual curves at 96 points per opening,
in addition to the existing polygon/curve-continuity checks. They do not prove
all possible seeds or material behavior. The slider occupancy threshold measures
observable change, not beauty or artistic diversity.

## GitHub Pages, only when explicitly authorized

Nothing is published by the app. Use a personal repository you are authorized
to publish to, and upload only [index.html](./index.html),
[styles.css](./styles.css), [generators.js](./generators.js),
[taste.js](./taste.js), and [app.js](./app.js). Do not include taste notes,
reference files, screenshots, credentials, or unrelated workspace contents.

In **Settings > Pages**, choose deployment from the intended branch and root.
Relative asset links support project-site paths. The app requires no API keys
or server. A public repository makes source public; follow applicable policies.
