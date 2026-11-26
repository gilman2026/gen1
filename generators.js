/* Geometry uses inches throughout; preview styling never enters the laser SVG. */
(function () {
  "use strict";
  const styles = {
    ripple: { name: "Ripple screen", description: "A continuous panel with a little river running through it.", operation: "cut",
      note: "Red paths: boundary + closed slots. A connected frame remains. Slot spacing reserves at least 0.08 in horizontally before kerf; this is not a strength guarantee. Use a backing for contrast." },
    contour: { name: "Topographies", description: "Contours from a landscape that only exists here.", operation: "score",
      note: "Blue paths: score the contours. Red path: cut the panel boundary. Cutting all the contours would release nested loose rings, not a connected panel." },
    flow: { name: "Flow field", description: "An invisible current, made visible in precise linework.", operation: "score",
      note: "Blue paths: score the flowing lines. Red path: cut the panel boundary. These open lines are not designed as through-cut slots." },
    bloom: { name: "Botanical study", description: "A collection of organic pieces, ready to find their place.", operation: "cut",
      note: "Red paths: separate closed pieces + boundary. This is a loose-piece layout, not a connected screen. Arrange on a backing after cutting; the surrounding panel becomes scrap." }
  };
  const recipeOptions = {
    layout: { honeycomb: "Honeycomb", quilt: "Quilt", scatter: "Cellular", radial: "Radial", triangles: "Triangular", ribbons: "Ribbons" },
    motif: { facets: "Facets", soft: "Rounded", stars: "Stars", tracery: "Tracery", leaves: "Leaves" },
    field: { still: "Ordered", vortex: "Vortex", lens: "Lens", waves: "Waves", saddle: "Saddle" },
    rhythm: { even: "Even", gradient: "Gradient", alternating: "Alternating", bands: "Bands" }
  };
  styles.explore = { name: "Recipe explorer", operation: "cut", description: "", note: "" };
  const defaults = {
    style: "explore", seed: "courtyard-008", width: 10, height: 8, density: 26, movement: 62,
    web: 0.14, openness: 86,
    recipe: { layout: "quilt", motif: "tracery", field: "vortex", rhythm: "gradient", symmetry: 8, frequency: 1.4, twist: 1.8, aspect: 1, focusX: 0.5, focusY: 0.5, phase: 0.8 }
  };
  const fmt = n => Number(n.toFixed(5)).toString();
  const escapeXML = text => String(text).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
  class GeometryError extends Error {}
  function validateLegacy(s) {
    if (!s || !Object.hasOwn(styles, s.style)) throw new Error("Choose a valid art family.");
    if (typeof s.seed !== "string" || !s.seed.trim() || s.seed.length > 40) throw new Error("Enter a seed of 1 to 40 characters.");
    for (const [key, min, max] of [["width", 2, 19], ["height", 2, 10.5], ["density", 8, 48], ["movement", 0, 100]]) {
      if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max) throw new Error(`${key[0].toUpperCase() + key.slice(1)} must be between ${min} and ${max}.`);
    }
    if (!Number.isInteger(s.density)) throw new Error("Detail must be a whole number.");
    return { style: s.style, seed: s.seed, width: s.width, height: s.height, density: s.density, movement: s.movement };
  }
  function random(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h += 0x6D2B79F5;
      let t = Math.imul(h ^ h >>> 15, 1 | h);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function path(points, closed) {
    return points.map((p, i) => `${i ? "L" : "M"}${fmt(p[0])},${fmt(p[1])}`).join(" ") + (closed ? " Z" : "");
  }
  function generateLegacy(input) {
    const s = validateLegacy(input), rng = random(s.seed), shapes = [];
    const w = s.width, h = s.height, margin = Math.min(0.4, Math.min(w, h) * 0.12);
    const add = (points, closed, operation) => shapes.push({ d: path(points, closed), points, closed, operation });
    let metrics = {};
    if (s.style === "ripple") {
      const usable = w - 2 * margin;
      const amplitude = Math.min(usable * 0.14, 0.85) * s.movement / 100;
      const span = usable - 2 * amplitude;
      const count = Math.max(2, Math.min(s.density, Math.floor(span / 0.15)));
      const pitch = span / count, slotWidth = Math.min(pitch * 0.48, pitch - 0.08);
      const phase = rng() * Math.PI * 2, turns = 0.7 + rng() * 1.1;
      const offset = t => amplitude * (Math.sin(t * Math.PI * 2 * turns + phase) * 0.72 + Math.sin(t * Math.PI * 4 + phase * 2) * 0.28) * Math.sin(Math.PI * t);
      const halfWidth = t => slotWidth / 2 * Math.min(1, Math.sqrt(Math.max(0, Math.sin(Math.PI * t))) * 3);
      for (let i = 0; i < count; i++) {
        const x = margin + amplitude + pitch * (i + 0.5), pts = [];
        for (let k = 0; k <= 100; k++) { const t = k / 100; pts.push([x + offset(t) - halfWidth(t), margin + t * (h - 2 * margin)]); }
        for (let k = 99; k >= 1; k--) { const t = k / 100; pts.push([x + offset(t) + halfWidth(t), margin + t * (h - 2 * margin)]); }
        add(pts, true, "cut");
      }
      metrics = { minimumHorizontalWeb: pitch - slotWidth, slotWidth, count };
    } else if (s.style === "contour") {
      const phase = rng() * Math.PI * 2, phase2 = rng() * Math.PI * 2;
      const lobes = 3 + Math.floor(rng() * 4), strength = s.movement / 100;
      const cx = w * (0.47 + rng() * 0.06), cy = h * (0.47 + rng() * 0.06);
      const rx = Math.min(cx - margin, w - margin - cx) / 1.24;
      const ry = Math.min(cy - margin, h - margin - cy) / 1.24;
      for (let j = 1; j <= s.density; j++) {
        const scale = 0.09 + 0.91 * j / s.density, pts = [];
        for (let k = 0; k < 240; k++) {
          const a = k / 240 * Math.PI * 2;
          const r = 1 + strength * (0.15 * Math.sin(lobes * a + phase) + 0.07 * Math.sin((lobes + 2) * a + phase2));
          pts.push([cx + Math.cos(a) * rx * scale * r, cy + Math.sin(a) * ry * scale * r]);
        }
        add(pts, true, "score");
      }
    } else if (s.style === "flow") {
      const phase = rng() * Math.PI * 2, phase2 = rng() * Math.PI * 2;
      const turns = 0.55 + rng(), strength = s.movement / 100;
      for (let i = 0; i < s.density; i++) {
        const base = (i + 0.5) / s.density, pts = [];
        for (let k = 0; k <= 180; k++) {
          const t = k / 180, envelope = Math.sin(Math.PI * t);
          // A monotone warp preserves ordering and keeps lines inside the panel.
          const warp = base + strength * 0.12 * Math.sin(Math.PI * base) * envelope * Math.sin(t * Math.PI * 2 * turns + phase)
            + strength * 0.04 * Math.sin(2 * Math.PI * base) * envelope * Math.sin(t * Math.PI * 4 + phase2);
          pts.push([margin + t * (w - 2 * margin), margin + warp * (h - 2 * margin)]);
        }
        add(pts, false, "score");
      }
    } else {
      const count = Math.max(4, Math.round(s.density / 2)), aspect = (w - 2 * margin) / (h - 2 * margin);
      const cols = Math.ceil(Math.sqrt(count * aspect)), rows = Math.ceil(count / cols);
      const cellW = (w - 2 * margin) / cols, cellH = (h - 2 * margin) / rows;
      for (let i = 0; i < count; i++) {
        const cx = margin + (i % cols + 0.5) * cellW, cy = margin + (Math.floor(i / cols) + 0.5) * cellH;
        const angle = rng() * Math.PI * 2, asymmetry = rng() * 0.35, lobes = 2 + Math.floor(rng() * 3);
        const pts = [], radius = Math.min(cellW, cellH) * (0.31 + rng() * 0.05), strength = s.movement / 100;
        for (let k = 0; k < 120; k++) {
          const a = k / 120 * Math.PI * 2, r = radius * (1 + strength * (0.17 * Math.sin(lobes * a + angle) + asymmetry * 0.25 * Math.sin(a)));
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (0.7 + rngFixed(angle) * 0.18)]);
        }
        add(pts, true, "cut");
      }
      metrics = { count, layout: "loose pieces" };
    }
    return { settings: s, shapes, metrics, margin };
  }
  function rngFixed(angle) { return (Math.sin(angle) + 1) / 2; }
  function validate(input) {
    if (input?.style !== "explore") return validateLegacy(input);
    const s = validateLegacy(input);
    for (const [key, min, max] of [["web", 0.1, 0.3], ["openness", 35, 90]]) {
      if (!Number.isFinite(input[key]) || input[key] < min || input[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
    }
    const r = input.recipe;
    if (!r || typeof r !== "object") throw new Error("This study needs a complete recipe.");
    for (const key of Object.keys(recipeOptions)) {
      if (!Object.hasOwn(recipeOptions[key], r[key])) throw new Error(`Invalid recipe ${key}.`);
    }
    for (const [key, min, max] of [["symmetry", 3, 12], ["frequency", 0.5, 3], ["twist", -3, 3], ["aspect", 0.6, 1.8], ["focusX", 0.25, 0.75], ["focusY", 0.25, 0.75], ["phase", 0, Math.PI * 2]]) {
      if (!Number.isFinite(r[key]) || r[key] < min || r[key] > max) throw new Error(`Invalid recipe ${key}.`);
    }
    if (!Number.isInteger(r.symmetry)) throw new Error("Symmetry must be a whole number.");
    return { ...s, web: input.web, openness: input.openness, recipe: Object.fromEntries([...Object.keys(recipeOptions), "symmetry", "frequency", "twist", "aspect", "focusX", "focusY", "phase"].map(key => [key, r[key]])) };
  }
  function invent(seed, base = defaults, direction = "all", related = false) {
    if (!["all", "geometry", "organic", "optical"].includes(direction)) throw new Error("Invalid inspiration direction.");
    const rng = random(seed), choose = values => values[Math.floor(rng() * values.length)];
    const layouts = direction === "geometry" ? ["honeycomb", "quilt", "triangles", "radial"]
      : direction === "organic" ? ["scatter", "radial", "honeycomb", "ribbons"]
      : direction === "optical" ? ["radial", "ribbons", "honeycomb", "quilt"] : Object.keys(recipeOptions.layout);
    const motifs = direction === "geometry" ? ["stars", "tracery", "facets"]
      : direction === "organic" ? ["soft", "leaves", "tracery"] : Object.keys(recipeOptions.motif);
    const recipe = {
      layout: choose(layouts), motif: choose(motifs), field: choose(Object.keys(recipeOptions.field)), rhythm: choose(Object.keys(recipeOptions.rhythm)),
      symmetry: choose([4, 5, 6, 8, 10, 12]), frequency: 0.5 + rng() * 2.5, twist: (rng() - 0.5) * 6,
      aspect: 0.6 + rng() * 1.2, focusX: 0.25 + rng() * 0.5, focusY: 0.25 + rng() * 0.5, phase: rng() * Math.PI * 2
    };
    if (related && base.style === "explore") {
      recipe.layout = base.recipe.layout;
      recipe.motif = base.recipe.motif;
      recipe.symmetry = base.recipe.symmetry;
      recipe.aspect = base.recipe.aspect;
    }
    return validate({ ...base, style: "explore", seed, recipe, web: base.web ?? defaults.web, openness: related ? (base.openness ?? defaults.openness) : 55 + Math.floor(rng() * 31), density: related ? base.density : 16 + Math.floor(rng() * 25), movement: 35 + Math.floor(rng() * 66) });
  }
  const area = points => points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  function clip(points, nx, ny, limit) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const da = a[0] * nx + a[1] * ny - limit, db = b[0] * nx + b[1] * ny - limit;
      if (da <= 1e-9) result.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db); result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    return result;
  }
  function inset(points, distance) {
    const p = area(points) < 0 ? [...points].reverse() : points;
    let result = p;
    for (let i = 0; i < p.length && result.length >= 3; i++) {
      const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
      if (length < 1e-8) continue;
      result = clip(result, dy / length, -dx / length, (dy * a[0] - dx * a[1]) / length - distance);
    }
    return result.length >= 3 && Math.abs(area(result)) > 0.001 ? result : [];
  }
  const center = points => points.reduce((c, p) => [c[0] + p[0] / points.length, c[1] + p[1] / points.length], [0, 0]);
  function scale(points, c, amount) { return points.map(p => [c[0] + (p[0] - c[0]) * amount, c[1] + (p[1] - c[1]) * amount]); }
  function smooth(points, rounds = 2) {
    for (let j = 0; j < rounds; j++) {
      const next = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      points = next;
    }
    return points;
  }
  function rayRadius(points, c, angle) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let radius = Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], nx = b[1] - a[1], ny = a[0] - b[0];
      const dot = nx * dx + ny * dy;
      if (dot > 1e-9) radius = Math.min(radius, (nx * (a[0] - c[0]) + ny * (a[1] - c[1])) / dot);
    }
    return radius;
  }
  function fieldPoint(x, y, s) {
    const r = s.recipe, power = s.movement / 100;
    let dx = x - r.focusX, dy = y - r.focusY;
    if (r.field === "vortex") {
      const a = r.twist * power * Math.exp(-(dx * dx + dy * dy) * 3);
      [dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
    } else if (r.field === "lens") {
      const factor = 1 + r.twist * 0.24 * power * Math.exp(-(dx * dx + dy * dy) * 6);
      dx *= factor; dy *= factor;
    } else if (r.field === "waves") {
      dx += 0.13 * power * Math.sin(y * r.frequency * Math.PI * 2 + r.phase);
      dy += 0.09 * power * Math.sin(x * r.frequency * Math.PI * 2 - r.phase);
    } else if (r.field === "saddle") {
      dx += 0.4 * power * dy * dx;
      dy += 0.2 * power * (dx * dx - dy * dy);
    }
    return [r.focusX + dx, r.focusY + dy];
  }
  function makeCells(s, margin) {
    const r = s.recipe, rng = random(s.seed), w = s.width - 2 * margin, h = s.height - 2 * margin;
    const intricate = r.motif === "tracery";
    const count = Math.min(s.density * (intricate ? 4 / r.symmetry : 1.5), Math.max(4, Math.floor(w * h / (s.web * (intricate ? 11 : 5)) ** 2)));
    const cols = Math.max(2, Math.round(Math.sqrt(count * w / h * r.aspect))), rows = Math.max(2, Math.round(count / cols));
    const transform = p => { const q = fieldPoint(p[0], p[1], s); return [margin + q[0] * w, margin + q[1] * h]; };
    const box = [[margin, margin], [s.width - margin, margin], [s.width - margin, s.height - margin], [margin, s.height - margin]];
    const sites = [];
    if (r.layout === "radial") {
      const rings = Math.max(2, Math.round(Math.sqrt(count / r.symmetry))), cx = r.focusX, cy = r.focusY;
      sites.push(transform([cx, cy]));
      for (let ring = 1; ring <= rings; ring++) {
        const n = r.symmetry * ring, radius = ring / rings * 0.65;
        for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2 + r.phase + (ring % 2) * Math.PI / n;
          sites.push(transform([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]));
        }
      }
    } else {
      for (let y = -1; y <= rows; y++) for (let x = -1; x <= cols; x++) {
        const jitter = r.layout === "scatter" ? 0.7 : 0.05 * s.movement / 100;
        const px = (x + 0.5 + (r.layout === "honeycomb" && y % 2 ? 0.5 : 0) + (rng() - 0.5) * jitter) / cols;
        const py = (y + 0.5 + (rng() - 0.5) * jitter) / rows;
        sites.push(transform([px, py]));
      }
    }
    const cells = sites.map((site, i) => {
      let cell = box;
      for (let j = 0; j < sites.length && cell.length >= 3; j++) {
        if (i === j) continue;
        const q = sites[j], nx = q[0] - site[0], ny = q[1] - site[1];
        if (Math.hypot(nx, ny) < 1e-8) throw new Error("Recipe produced coincident sites. Try a different seed.");
        cell = clip(cell, nx, ny, (q[0] ** 2 + q[1] ** 2 - site[0] ** 2 - site[1] ** 2) / 2);
      }
      return cell;
    }).filter(p => p.length >= 3 && Math.abs(area(p)) > 0.001);
    return r.layout === "triangles" ? cells.flatMap(cell => {
      const c = center(cell);
      return cell.map((p, i) => [c, p, cell[(i + 1) % cell.length]]);
    }) : cells;
  }
  function rhythmAt(c, s) {
    const r = s.recipe, x = c[0] / s.width, y = c[1] / s.height;
    if (r.rhythm === "gradient") return 0.76 + 0.24 * Math.min(1, Math.hypot(x - r.focusX, y - r.focusY) * 1.6);
    if (r.rhythm === "bands") return 0.72 + 0.28 * Math.sin((x + y * 0.6) * r.frequency * Math.PI * 2 + r.phase) ** 2;
    if (r.rhythm === "alternating") return (Math.floor(x * 6) + Math.floor(y * 6)) % 2 ? 0.72 : 1;
    return 1;
  }
  function generateExplorer(s) {
    const r = s.recipe, shapes = [], margin = Math.max(0.35, s.web * 1.5);
    let omitted = 0;
    const add = points => {
      if (points.some(p => p.some(n => !Number.isFinite(n)))) throw new Error("Recipe produced a nonfinite coordinate. Export is blocked.");
      if (points.length < 3 || Math.abs(area(points)) < 0.012) { omitted++; return; }
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      if (Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 0.1) { omitted++; return; }
      shapes.push({ d: path(points, true), points, closed: true, operation: "cut" });
    };
    if (r.layout === "ribbons") {
      makeRibbons(s, margin, add);
    } else {
      // Convex cells partition the panel; insetting before shaping leaves shared wood.
      for (const cell of makeCells(s, margin)) {
        const inner = inset(cell, s.web / 2);
        if (inner.length < 3) { omitted++; continue; }
        const c = center(inner), amount = (0.6 + 0.4 * (s.openness - 35) / 55) * rhythmAt(c, s);
        const p = scale(inner, c, amount);
        if (r.motif === "tracery") {
          const sectors = r.symmetry;
          for (let k = 0; k < sectors; k++) {
            const a = k / sectors * Math.PI * 2 + r.phase, b = (k + 1) / sectors * Math.PI * 2 + r.phase;
            const ra = rayRadius(p, c, a), rb = rayRadius(p, c, b);
            // Intersect each angular wedge with its convex parent, then reserve a hub.
            let wedge = p;
            wedge = clip(wedge, Math.sin(a), -Math.cos(a), Math.sin(a) * c[0] - Math.cos(a) * c[1]);
            wedge = clip(wedge, -Math.sin(b), Math.cos(b), -Math.sin(b) * c[0] + Math.cos(b) * c[1]);
            const mid = (a + b) / 2, hub = Math.min(ra, rb) * 0.2;
            wedge = clip(wedge, -Math.cos(mid), -Math.sin(mid), -Math.cos(mid) * c[0] - Math.sin(mid) * c[1] - hub);
            add(inset(wedge, s.web / 2));
          }
        } else if (r.motif === "facets") {
          add(p);
        } else if (r.motif === "soft") {
          add(smooth(p));
        } else {
          const n = r.motif === "stars" ? r.symmetry * 2 : 40, points = [];
          const orientation = r.motif === "leaves" ? Math.atan2(c[1] / s.height - r.focusY, c[0] / s.width - r.focusX) + r.twist : r.phase;
          for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2 + orientation;
            const factor = r.motif === "stars" ? (k % 2 ? 0.43 : 0.97) : 0.94 / (Math.abs(Math.cos(a - orientation)) + Math.abs(Math.sin(a - orientation)) / 0.32);
            const radius = rayRadius(p, c, a) * factor;
            points.push([c[0] + Math.cos(a) * radius, c[1] + Math.sin(a) * radius]);
          }
          add(r.motif === "leaves" ? smooth(points, 1) : points);
        }
      }
    }
    if (!shapes.length) throw new GeometryError("No usable cutouts at this size and web width. Reduce detail or web width, or enlarge the panel.");
    const layoutName = recipeOptions.layout[r.layout], motifName = recipeOptions.motif[r.motif], fieldName = recipeOptions.field[r.field];
    const name = r.layout === "ribbons" ? `${fieldName} / interrupted ribbons` : `${fieldName} / ${motifName.toLowerCase()} ${layoutName.toLowerCase()}`;
    return {
      settings: s, shapes, margin, name,
      description: `${layoutName} structure + ${r.layout === "ribbons" ? "solid focal islands" : motifName.toLowerCase() + " openings"} + ${recipeOptions.rhythm[r.rhythm].toLowerCase()} rhythm. Every opening is a closed cutout.`,
      note: `Red: cutouts + panel boundary. A connected panel is intended, with ${s.web.toFixed(2)} in reserved webs before kerf. ${omitted ? `${omitted} undersized openings omitted. ` : ""}Sharp tips and plywood strength still need a scrap test. No kerf compensation.`,
      metrics: { count: shapes.length, omitted, reservedWeb: s.web }
    };
  }
  function makeRibbons(s, margin, add) {
    const r = s.recipe, horizontal = r.aspect > 1.25, w = (horizontal ? s.height : s.width) - 2 * margin, h = (horizontal ? s.width : s.height) - 2 * margin;
    const amplitude = w * 0.1 * s.movement / 100;
    const frequency = r.field === "still" ? 0.5 : r.frequency;
    const slope = r.field === "still" ? 0 : amplitude * (frequency * Math.PI * 2 + Math.PI * 4 * 0.3 + 9) / h;
    const horizontalWeb = s.web * Math.sqrt(1 + slope * slope);
    const count = Math.max(1, Math.min(s.density, Math.floor(w * 0.57 / (horizontalWeb + 0.16 * 90 / s.openness))));
    const pitch = w / count, half = Math.max(0.03, (pitch * 0.58 - horizontalWeb) / 2) * s.openness / 90;
    const islands = r.symmetry % 3 + 1;
    const coords = (x, y) => horizontal ? [y, x] : [x, y];
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count, runs = []; let run = [];
      for (let k = 0; k <= 120; k++) {
        const t = k / 120;
        const wave = r.field === "still" ? 0
          : r.field === "vortex" ? Math.tanh((t - r.focusY) * 5) * Math.sin(Math.PI * t) * r.twist / 3
          : r.field === "lens" ? Math.exp(-(((t - r.focusY) * 4) ** 2)) * r.twist / 3
          : r.field === "saddle" ? (4 * (t - 0.5) ** 2 - 0.5) * r.twist / 3
          : Math.sin(t * frequency * Math.PI * 2 + r.phase) + 0.3 * Math.sin(t * Math.PI * 4 - r.phase);
        const offset = amplitude * wave * Math.sin(Math.PI * u);
        const x = margin + u * w + offset, y = margin + t * h;
        let blocked = false;
        for (let j = 0; j < islands; j++) {
          const cx = margin + w * (0.3 + 0.4 * ((r.focusX + j * 0.37) % 1));
          const cy = margin + h * (j + 1) / (islands + 1);
          const radius = Math.min(w, h) * (0.12 + 0.05 * Math.sin(r.phase + j));
          if (Math.hypot(x - cx, y - cy) < radius + half + s.web / 2) blocked = true;
        }
        if (r.rhythm === "bands" && Math.sin(t * Math.PI * 2 * frequency + r.phase) > 0.91) blocked = true;
        if (blocked) { if (run.length) runs.push(run); run = []; } else run.push([x, y]);
      }
      if (run.length) runs.push(run);
      const trim = Math.ceil(s.web / 2 / (h / 120));
      for (const run of runs) {
        const segment = run.slice(trim, -trim);
        if (segment.length < 5) continue;
        const width = half * rhythmAt(coords(segment[Math.floor(segment.length / 2)][0], segment[Math.floor(segment.length / 2)][1]), s);
        const taper = k => Math.max(0, Math.sin(Math.PI * k / (segment.length - 1))) ** 0.3;
        const side = segment.map((p, k) => coords(p[0] - width * taper(k), p[1]));
        const other = segment.slice(1, -1).map((p, k) => coords(p[0] + width * taper(k + 1), p[1])).reverse();
        add([...side, ...other]);
      }
    }
  }
  function generate(input) {
    const s = validate(input);
    if (s.style === "explore") return generateExplorer(s);
    const design = generateLegacy(s);
    return { ...design, name: styles[s.style].name, description: styles[s.style].description, note: `Legacy study from the first draft. ${styles[s.style].note}` };
  }
  function exportSVG(input) {
    const design = generate(input), s = design.settings;
    const groups = ["cut", "score"].map(operation => {
      const paths = design.shapes.filter(shape => shape.operation === operation).map(shape => `<path d="${shape.d}"/>`).join("\n");
      const boundary = operation === "cut" ? `<rect x="0" y="0" width="${fmt(s.width)}" height="${fmt(s.height)}"/>` : "";
      return paths || boundary ? `<g id="${operation}" fill="none" stroke="${operation === "cut" ? "#ff0000" : "#0000ff"}" stroke-width="0.01" stroke-linejoin="round" stroke-linecap="round">\n${boundary}\n${paths}\n</g>` : "";
    }).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(s.width)}in" height="${fmt(s.height)}in" viewBox="0 0 ${fmt(s.width)} ${fmt(s.height)}">\n<title>Grain - ${escapeXML(design.name)}</title>\n<desc>${escapeXML(JSON.stringify(s))}. Red: cut; blue: score. Assign operations and verify dimensions in the laser software. No kerf compensation.</desc>\n${groups}\n</svg>`;
  }
  function previewSVG(design, mode, id) {
    const s = design.settings, w = fmt(s.width), h = fmt(s.height);
    const title = `<title>${escapeXML(design.name || styles[s.style].name)}, ${w} by ${h} inches</title>`;
    if (mode === "paths") {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.12 -0.12 ${fmt(s.width + 0.24)} ${fmt(s.height + 0.24)}">${title}<rect width="${w}" height="${h}" fill="#fffefa" stroke="#ed6355" stroke-width=".018"/>${design.shapes.map(shape => `<path d="${shape.d}" fill="none" stroke="${shape.operation === "cut" ? "#ed6355" : "#527fba"}" stroke-width=".015"/>`).join("")}</svg>`;
    }
    const mask = `mask-${id}`, grain = `grain-${id}`;
    const holes = design.shapes.filter(shape => shape.operation === "cut").map(shape => `<path d="${shape.d}" fill="black"/>`).join("");
    const woodRect = `<rect width="${w}" height="${h}" fill="url(#${grain})"/>`;
    const pieces = s.style === "bloom"
      ? design.shapes.map(shape => `<path d="${shape.d}" fill="url(#${grain})" stroke="#a27a48" stroke-width=".012"/>`).join("")
      : `<g mask="url(#${mask})">${woodRect}<rect width="${w}" height="${h}" fill="none" stroke="#ad824e" stroke-width=".025"/></g>`;
    const score = design.shapes.filter(shape => shape.operation === "score").map(shape => `<path d="${shape.d}" fill="none" stroke="#795535" stroke-width=".021" opacity=".85"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.12 -0.12 ${fmt(s.width + 0.24)} ${fmt(s.height + 0.24)}">${title}<defs><pattern id="${grain}" patternUnits="userSpaceOnUse" width="${w}" height=".22"><rect width="${w}" height=".22" fill="#cba774"/><path d="M0 .04 Q${fmt(s.width * 0.4)} .09 ${w} .035 M0 .14 Q${fmt(s.width * 0.6)} .10 ${w} .16 M0 .20 L${w} .21" stroke="#a78352" stroke-width=".009" opacity=".3"/></pattern><mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white"/>${holes}</mask></defs>${pieces}${score}</svg>`;
  }
  window.Grain = { styles, recipeOptions, defaults, GeometryError, invent, validate, generate, exportSVG, previewSVG };
})();
