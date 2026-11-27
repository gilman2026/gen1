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
    layout: { honeycomb: "Honeycomb", quilt: "Quilt", scatter: "Cellular", radial: "Radial", triangles: "Triangular", ribbons: "Ribbons", sunflower: "Golden-angle spiral" },
    motif: { facets: "Facets", soft: "Rounded", ovals: "True ellipses", superellipse: "Lame curves", stars: "Stars", tracery: "Tracery", leaves: "Leaves" },
    field: { still: "Ordered", vortex: "Vortex", lens: "Lens", waves: "Waves", saddle: "Saddle" },
    rhythm: { even: "Even", gradient: "Gradient", alternating: "Alternating", bands: "Bands" }
  };
  const controls = {
    roundness: { label: "Corner rounding", min: 0, max: 100, step: 1, value: 100 },
    shapeAspect: { label: "Oval / leaf proportions", min: 0.3, max: 3, step: 0.05, value: 1 },
    exponent: { label: "Lame exponent", min: 1.2, max: 8, step: 0.1, value: 3 },
    starInner: { label: "Star fullness", min: 0.2, max: 0.95, step: 0.01, value: 0.7 },
    symmetry: { label: "Spokes / star points", min: 3, max: 16, step: 1, value: 8 },
    jitter: { label: "Lattice irregularity", min: 0, max: 100, step: 1, value: 0 },
    aspect: { label: "Lattice proportions", min: 0.4, max: 2.5, step: 0.05, value: 1 },
    twist: { label: "Twist / lens strength", min: -6, max: 6, step: 0.1, value: 1.8 },
    frequency: { label: "Wave frequency", min: 0.5, max: 5, step: 0.1, value: 1.4 },
    phase: { label: "Rotation / phase (degrees)", min: 0, max: 360, step: 1, value: 45, radians: true },
    focusX: { label: "Focal point X", min: 0.1, max: 0.9, step: 0.01, value: 0.5 },
    focusY: { label: "Focal point Y", min: 0.1, max: 0.9, step: 0.01, value: 0.5 },
    rhythmStrength: { label: "Rhythm contrast", min: 0, max: 1, step: 0.01, value: 0.25 },
    traceHub: { label: "Tracery hub (%)", min: 0, max: 65, step: 1, value: 15, group: "tracery" },
    traceWeb: { label: "Tracery spoke width / in", min: 0.08, max: 0.4, step: 0.01, value: 0.12, group: "tracery" },
    outlineSides: { label: "Outline polygon sides", min: 3, max: 12, step: 1, value: 6, group: "tracery" },
    islands: { label: "Solid islands", min: 0, max: 4, step: 1, value: 1, group: "ribbons" },
    islandSize: { label: "Island radius / panel span", min: 0, max: 0.3, step: 0.01, value: 0.1, group: "ribbons" }
  };
  const traceOutlines = { cell: "Follow the lattice cell", ellipse: "Ellipse", superellipse: "Lame curve", polygon: "Regular polygon" };
  const recipeDefaults = Object.fromEntries(Object.entries(controls).map(([key, c]) => [key, c.radians ? c.value * Math.PI / 180 : c.value]));
  styles.explore = { name: "Recipe explorer", operation: "cut", description: "", note: "" };
  const defaults = {
    version: 4, style: "explore", seed: "moss-study", width: 10, height: 8, density: 32, movement: 70,
    web: 0.12, openness: 84,
    recipe: { layout: "quilt", motif: "soft", field: "vortex", rhythm: "even", ...recipeDefaults, traceOutline: "cell" }
  };
  const fmt = n => Number(n.toFixed(5)).toString();
  const escapeXML = text => String(text).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
  class GeometryError extends Error {}
  function validateLegacy(s) {
    if (!s || !Object.hasOwn(styles, s.style)) throw new Error("Choose a valid art family.");
    if (typeof s.seed !== "string" || !s.seed.trim() || s.seed.length > 40) throw new Error("Enter a seed of 1 to 40 characters.");
    const modern = s.style === "explore" && s.version >= 3;
    for (const [key, min, max] of [["width", 2, 19], ["height", 2, 10.5], ["density", 8, modern ? 64 : 48], ["movement", 0, modern ? 200 : 100]]) {
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
    if (input.version !== undefined && ![2, 3, 4].includes(input.version)) throw new Error("Unsupported recipe version.");
    const s = validateLegacy(input);
    const modern = input.version >= 3;
    for (const [key, min, max] of [["web", modern ? 0.08 : 0.1, modern ? 0.4 : 0.3], ["openness", modern ? 15 : 35, modern ? 100 : 90]]) {
      if (!Number.isFinite(input[key]) || input[key] < min || input[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
    }
    const r = input.recipe;
    if (!r || typeof r !== "object") throw new Error("This study needs a complete recipe.");
    for (const key of Object.keys(recipeOptions)) {
      if (!Object.hasOwn(recipeOptions[key], r[key])) throw new Error(`Invalid recipe ${key}.`);
    }
    if (!modern && (r.layout === "sunflower" || ["ovals", "superellipse"].includes(r.motif))) throw new Error("Upgrade the recipe to use this mathematical model.");
    const limits = modern ? Object.entries(controls).map(([key, c]) => [key, c.radians ? 0 : c.min, c.radians ? Math.PI * 2 : c.max])
      : [["symmetry", 3, 12], ["frequency", 0.5, 3], ["twist", -3, 3], ["aspect", 0.6, 1.8], ["focusX", 0.25, 0.75], ["focusY", 0.25, 0.75], ["phase", 0, Math.PI * 2]];
    for (const [key, min, max] of limits) {
      if (!Number.isFinite(r[key]) || r[key] < min || r[key] > max) throw new Error(`Invalid recipe ${key}.`);
    }
    for (const key of modern ? ["symmetry", "outlineSides", "islands"] : ["symmetry"]) {
      if (!Number.isInteger(r[key])) throw new Error(`${key} must be a whole number.`);
    }
    if (modern) {
      if (!Object.hasOwn(traceOutlines, r.traceOutline)) throw new Error("Invalid tracery outline.");
      return { ...s, version: input.version, web: input.web, openness: input.openness, recipe: Object.fromEntries([...Object.keys(recipeOptions), ...Object.keys(controls), "traceOutline"].map(key => [key, r[key]])) };
    }
    return { ...s, web: input.web, openness: input.openness, recipe: Object.fromEntries([...Object.keys(recipeOptions), "symmetry", "frequency", "twist", "aspect", "focusX", "focusY", "phase"].map(key => [key, r[key]])) };
  }
  function upgrade(input) {
    const s = validate(input);
    if (s.style !== "explore") throw new Error("Only explorer recipes can be upgraded.");
    return validate({ ...s, version: 4, recipe: { ...defaults.recipe, ...s.recipe }, openness: Math.min(100, s.openness) });
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
      ...recipeDefaults, traceOutline: "cell",
      layout: choose(layouts), motif: choose(motifs), field: choose(Object.keys(recipeOptions.field)), rhythm: choose(Object.keys(recipeOptions.rhythm)),
      symmetry: choose([4, 5, 6, 8, 10, 12]), frequency: 0.5 + rng() * 2.5, twist: (rng() - 0.5) * 6,
      aspect: 0.6 + rng() * 1.2, focusX: 0.25 + rng() * 0.5, focusY: 0.25 + rng() * 0.5, phase: rng() * Math.PI * 2
    };
    recipe.jitter = recipe.layout === "scatter" ? 70 : 0;
    recipe.starInner = 0.65 + rng() * 0.25;
    recipe.traceOutline = choose(Object.keys(traceOutlines));
    recipe.symmetry = choose([4, 5, 6, 8, 10]);
    if (related && base.style === "explore") {
      recipe.layout = base.recipe.layout;
      recipe.motif = base.recipe.motif;
      recipe.symmetry = base.recipe.symmetry;
      recipe.aspect = base.recipe.aspect;
      if (base.version === 3) for (const key of ["roundness", "shapeAspect", "exponent", "starInner", "jitter", "traceOutline", "traceHub", "traceWeb", "outlineSides", "islands", "islandSize", "rhythmStrength"]) recipe[key] = base.recipe[key];
    }
    return validate({ ...base, version: 3, style: "explore", seed, recipe, web: base.web ?? defaults.web, openness: related ? (base.openness ?? defaults.openness) : 88 + Math.floor(rng() * 13), density: related ? base.density : 20 + Math.floor(rng() * 21), movement: 35 + Math.floor(rng() * 101) });
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
  function cleanPolygon(points) {
    const unique = points.filter((p, i) => Math.hypot(p[0] - points[(i + points.length - 1) % points.length][0], p[1] - points[(i + points.length - 1) % points.length][1]) > 1e-8);
    return unique.filter((p, i) => {
      const a = unique[(i + unique.length - 1) % unique.length], b = unique[(i + 1) % unique.length];
      return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-10;
    });
  }
  function organicContour(p, refined = false) {
    const count = 24, lengths = p.map((a, i) => Math.hypot(a[0] - p[(i + 1) % p.length][0], a[1] - p[(i + 1) % p.length][1]));
    const perimeter = lengths.reduce((sum, length) => sum + length, 0), uniform = [];
    let edge = 0, covered = 0;
    for (let i = 0; i < count; i++) {
      const distance = perimeter * i / count;
      while (edge < p.length - 1 && covered + lengths[edge] < distance) covered += lengths[edge++];
      const a = p[edge], b = p[(edge + 1) % p.length], t = (distance - covered) / lengths[edge];
      uniform.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    // Uniform boundary spacing prevents tiny polygon edges from creating pinched corners.
    let controls = uniform.map((_, i) => center([-2, -1, 0, 1, 2].map(k => uniform[(i + k + count) % count])));
    const combine = (a, b, c, weights) => [0, 1].map(axis => a[axis] * weights[0] + b[axis] * weights[1] + c[axis] * weights[2]);
    const minorSpan = Math.min(...p.map((a, i) => {
      const b = p[(i + 1) % p.length], length = lengths[i], projections = p.map(point => ((b[1] - a[1]) * point[0] - (b[0] - a[0]) * point[1]) / length);
      return Math.max(...projections) - Math.min(...projections);
    }));
    const targetRadius = Math.min(refined ? 0.06 : 0.08, minorSpan * (refined ? 0.1 : 0.16));
    let result;
    for (let pass = 0; pass < (refined ? 20 : 6); pass++) {
    const start = combine(controls[count - 1], controls[0], controls[1], [1 / 6, 4 / 6, 1 / 6]);
    let d = `M${fmt(start[0])},${fmt(start[1])}`;
    const samples = [start]; let minRadius = Infinity;
    for (let i = 0; i < count; i++) {
      const a = controls[i], b = controls[(i + 1) % count], c = controls[(i + 2) % count];
      const from = samples[samples.length - 1], first = combine(a, b, c, [2 / 3, 1 / 3, 0]), second = combine(a, b, c, [1 / 3, 2 / 3, 0]), to = combine(a, b, c, [1 / 6, 4 / 6, 1 / 6]);
      d += ` C${fmt(first[0])},${fmt(first[1])} ${fmt(second[0])},${fmt(second[1])} ${fmt(to[0])},${fmt(to[1])}`;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        const velocity = [0, 1].map(axis => 3 * (u * u * (first[axis] - from[axis]) + 2 * u * t * (second[axis] - first[axis]) + t * t * (to[axis] - second[axis])));
        const acceleration = [0, 1].map(axis => 6 * (u * (second[axis] - 2 * first[axis] + from[axis]) + t * (to[axis] - 2 * second[axis] + first[axis])));
        const speed = Math.hypot(...velocity), cross = Math.abs(velocity[0] * acceleration[1] - velocity[1] * acceleration[0]);
        minRadius = Math.min(minRadius, speed < 1e-10 ? 0 : cross < 1e-12 ? Infinity : speed ** 3 / cross);
      }
      for (let k = 1; k <= 3; k++) {
        const t = k / 3, u = 1 - t;
        samples.push([0, 1].map(axis => u ** 3 * from[axis] + 3 * u * u * t * first[axis] + 3 * u * t * t * second[axis] + t ** 3 * to[axis]));
      }
    }
    result = { d: d + " Z", points: samples.slice(0, -1), envelope: p, minRadius, targetRadius };
    if (minRadius >= targetRadius) return result;
    controls = controls.map((_, i) => center([-1, 0, 1].map(k => controls[(i + k + count) % count])));
    }
    if (refined) return { ...result, pinched: true };
    const xs = p.map(point => point[0]), ys = p.map(point => point[1]);
    let kernel = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]];
    const direction = Math.sign(area(p));
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], nx = (b[1] - a[1]) * direction, ny = (a[0] - b[0]) * direction;
      kernel = clip(kernel, nx, ny, nx * a[0] + ny * a[1]);
    }
    if (kernel.length < 3 || Math.abs(area(kernel)) < 0.001) return { ...result, pinched: true };
    const c = polygonCenter(kernel);
    let xx = 0, yy = 0, xy = 0;
    for (const point of kernel) { const x = point[0] - c[0], y = point[1] - c[1]; xx += x * x; yy += y * y; xy += x * y; }
    const ellipse = ellipseShape(kernel, c, 3, Math.atan2(2 * xy, xx - yy) / 2);
    return { ...ellipse, envelope: kernel, minRadius: ellipse.ellipse.ry ** 2 / ellipse.ellipse.rx, targetRadius: Math.min(0.08, ellipse.ellipse.ry * 0.32), reshaped: true };
  }
  function curvedShape(input, rounding = 100, local = false, refined = false) {
    const p = cleanPolygon(input);
    if (!rounding || p.length < 3) return { d: path(p, true), points: p };
    if (rounding === 100 && !local) return organicContour(p, refined);
    const fraction = rounding / 200, before = [], after = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length], b = p[(i + 1) % p.length], c = p[i];
      before.push([c[0] + (a[0] - c[0]) * fraction, c[1] + (a[1] - c[1]) * fraction]);
      after.push([c[0] + (b[0] - c[0]) * fraction, c[1] + (b[1] - c[1]) * fraction]);
    }
    let d = `M${fmt(before[0][0])},${fmt(before[0][1])}`;
    const samples = [];
    for (let i = 0; i < p.length; i++) {
      const a = before[i], c = p[i], b = after[i];
      d += ` Q${fmt(c[0])},${fmt(c[1])} ${fmt(b[0])},${fmt(b[1])}`;
      const samplesPerCurve = p.length > 32 ? 2 : 12;
      for (let k = 0; k < samplesPerCurve; k++) {
        const t = k / samplesPerCurve, u = 1 - t;
        samples.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
      }
      samples.push(b);
      if (rounding < 100) d += ` L${fmt(before[(i + 1) % p.length][0])},${fmt(before[(i + 1) % p.length][1])}`;
    }
    return { d: d + " Z", points: samples, envelope: p };
  }
  function polygonCenter(p) {
    const signedArea = area(p);
    if (Math.abs(signedArea) < 1e-9) return center(p);
    let x = 0, y = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], cross = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * cross; y += (a[1] + b[1]) * cross;
    }
    return [x / (6 * signedArea), y / (6 * signedArea)];
  }
  function ellipseShape(p, c, aspect, rotation) {
    const radius = Math.sqrt(Math.abs(area(p)) / Math.PI);
    let rx = radius * Math.sqrt(aspect), ry = radius / Math.sqrt(aspect), fit = 1;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], nx = b[1] - a[1], ny = a[0] - b[0];
      const support = Math.hypot(rx * (nx * cos + ny * sin), ry * (-nx * sin + ny * cos));
      if (support > 1e-10) fit = Math.min(fit, (nx * (a[0] - c[0]) + ny * (a[1] - c[1])) / support);
    }
    rx *= fit; ry *= fit;
    const points = [];
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      points.push([c[0] + x * cos - y * sin, c[1] + x * sin + y * cos]);
    }
    const precise = n => Number(n.toFixed(10)).toString(), start = points[0], angle = precise(rotation * 180 / Math.PI);
    let d = `M${precise(start[0])},${precise(start[1])}`;
    // Quarter arcs avoid the numerical center drift of rounded antipodal endpoints.
    for (const i of [16, 32, 48, 0]) d += ` A${precise(rx)},${precise(ry)} ${angle} 0 1 ${precise(points[i][0])},${precise(points[i][1])}`;
    return { d: d + " Z", points, analyticArea: Math.PI * rx * ry, ellipse: { cx: c[0], cy: c[1], rx, ry, rotation } };
  }
  function fittedOutline(p, c, recipe, kind) {
    if (kind === "cell") return p;
    if (kind === "ellipse") return ellipseShape(p, c, recipe.shapeAspect, recipe.phase).points;
    const points = [], count = kind === "polygon" ? recipe.outlineSides : 64;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const cos = Math.cos(a), sin = Math.sin(a);
      const x = (kind === "polygon" ? cos : Math.sign(cos) * Math.abs(cos) ** (2 / recipe.exponent)) * Math.sqrt(recipe.shapeAspect);
      const y = (kind === "polygon" ? sin : Math.sign(sin) * Math.abs(sin) ** (2 / recipe.exponent)) / Math.sqrt(recipe.shapeAspect);
      points.push([c[0] + x * Math.cos(recipe.phase) - y * Math.sin(recipe.phase), c[1] + x * Math.sin(recipe.phase) + y * Math.cos(recipe.phase)]);
    }
    let fit = Infinity;
    for (let i = 0; i < points.length; i++) {
      const angle = Math.atan2(points[i][1] - c[1], points[i][0] - c[0]), length = Math.hypot(points[i][0] - c[0], points[i][1] - c[1]);
      fit = Math.min(fit, rayRadius(p, c, angle) / length);
    }
    return scale(points, c, fit * 0.999);
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
      const influence = Math.exp(-(dx * dx + dy * dy) * 6);
      const factor = s.version >= 3 ? Math.exp(r.twist * 0.18 * power * influence) : 1 + r.twist * 0.24 * power * influence;
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
    if (r.layout === "sunflower") {
      const n = Math.max(8, Math.round(count)), goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const radius = 0.7 * Math.sqrt((i + 0.5) / n), a = i * goldenAngle + r.phase;
        sites.push(transform([r.focusX + radius * Math.cos(a), r.focusY + radius * Math.sin(a)]));
      }
    } else if (r.layout === "radial") {
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
      const rowCount = s.version >= 3 && r.layout === "honeycomb" ? Math.ceil(h / (w / cols * Math.sqrt(3) / 2 * r.aspect)) : rows;
      for (let y = -1; y <= rowCount; y++) for (let x = -1; x <= cols; x++) {
        const jitter = s.version >= 3 ? r.jitter / 100 : r.layout === "scatter" ? 0.7 : 0.05 * s.movement / 100;
        const px = (x + 0.5 + (r.layout === "honeycomb" && y % 2 ? 0.5 : 0) + (rng() - 0.5) * jitter) / cols;
        const py = s.version >= 3 && r.layout === "honeycomb" ? (y + 0.5 + (rng() - 0.5) * jitter) * w / cols * Math.sqrt(3) / 2 * r.aspect / h
          : (y + 0.5 + (rng() - 0.5) * jitter) / rows;
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
    const strength = s.version >= 3 ? r.rhythmStrength : r.rhythm === "gradient" ? 0.24 : 0.28;
    if (r.rhythm === "gradient") return 1 - strength + strength * Math.min(1, Math.hypot(x - r.focusX, y - r.focusY) * 1.6);
    if (r.rhythm === "bands") return 1 - strength + strength * Math.sin((x + y * 0.6) * r.frequency * Math.PI * 2 + r.phase) ** 2;
    if (r.rhythm === "alternating") return (Math.floor(x * 6) + Math.floor(y * 6)) % 2 ? 1 - strength : 1;
    return 1;
  }
  function generateExplorer(s) {
    const r = s.recipe, modern = s.version >= 3, shapes = [], margin = Math.max(modern ? 0.28 : 0.35, s.web * 1.5);
    let omitted = 0, reshaped = 0;
    const add = (points, rounding = 0, prepared = null, local = false) => {
      if (points.some(p => p.some(n => !Number.isFinite(n)))) throw new Error("Recipe produced a nonfinite coordinate. Export is blocked.");
      if (points.length < 3 || Math.abs(area(points)) < 0.012) { omitted++; return; }
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      if (Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 0.1) { omitted++; return; }
      const geometry = prepared || (modern && rounding ? curvedShape(points, rounding, local, s.version === 4) : { d: path(points, true), points });
      if (geometry.pinched) { omitted++; return; }
      if (Math.abs(area(geometry.points)) < 0.012) { omitted++; return; }
      if (geometry.reshaped) reshaped++;
      shapes.push({ ...geometry, closed: true, operation: "cut" });
    };
    if (r.layout === "ribbons") {
      makeRibbons(s, margin, add);
    } else {
      // Convex cells partition the panel; insetting before shaping leaves shared wood.
      for (const cell of makeCells(s, margin)) {
        const inner = inset(cell, s.web / 2);
        if (inner.length < 3) { omitted++; continue; }
        const c = modern ? polygonCenter(inner) : center(inner), amount = (modern ? s.openness / 100 : 0.6 + 0.4 * (s.openness - 35) / 55) * rhythmAt(c, s);
        const p = scale(inner, c, amount);
        if (r.motif === "tracery") {
          const outline = modern ? fittedOutline(p, c, r, r.traceOutline) : p;
          const sectors = r.symmetry;
          for (let k = 0; k < sectors; k++) {
            const a = k / sectors * Math.PI * 2 + r.phase, b = (k + 1) / sectors * Math.PI * 2 + r.phase;
            const ra = rayRadius(outline, c, a), rb = rayRadius(outline, c, b);
            // Intersect each angular wedge with its convex parent, then reserve a hub.
            let wedge = outline;
            wedge = clip(wedge, Math.sin(a), -Math.cos(a), Math.sin(a) * c[0] - Math.cos(a) * c[1]);
            wedge = clip(wedge, -Math.sin(b), Math.cos(b), -Math.sin(b) * c[0] + Math.cos(b) * c[1]);
            const mid = (a + b) / 2, hub = Math.min(ra, rb) * (modern ? r.traceHub / 100 : 0.2);
            wedge = clip(wedge, -Math.cos(mid), -Math.sin(mid), -Math.cos(mid) * c[0] - Math.sin(mid) * c[1] - hub);
            add(inset(wedge, (modern ? r.traceWeb : s.web) / 2), modern ? r.roundness : 0);
          }
        } else if (r.motif === "facets") {
          add(p);
        } else if (r.motif === "soft") {
          if (modern) add(p, r.roundness);
          else add(smooth(p));
        } else if (modern && r.motif === "ovals") {
          const ellipse = ellipseShape(p, c, r.shapeAspect, r.phase);
          add(ellipse.points, 0, ellipse);
        } else if (modern && r.motif === "superellipse") {
          add(fittedOutline(p, c, r, "superellipse"), 100);
        } else if (s.version === 4 && r.motif === "leaves") {
          const orientation = Math.atan2(c[1] / s.height - r.focusY, c[0] / s.width - r.focusX) + r.twist;
          const leaf = ellipseShape(p, c, 1 / (0.32 * r.shapeAspect), orientation);
          add(leaf.points, 0, leaf);
        } else {
          const n = r.motif === "stars" ? r.symmetry * 2 : 40, points = [];
          const orientation = r.motif === "leaves" ? Math.atan2(c[1] / s.height - r.focusY, c[0] / s.width - r.focusX) + r.twist : r.phase;
          for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2 + orientation;
            const factor = r.motif === "stars" ? (k % 2 ? (modern ? r.starInner : 0.43) : 0.97) : 0.94 / (Math.abs(Math.cos(a - orientation)) + Math.abs(Math.sin(a - orientation)) / (modern ? 0.32 * r.shapeAspect : 0.32));
            const radius = rayRadius(p, c, a) * factor;
            points.push([c[0] + Math.cos(a) * radius, c[1] + Math.sin(a) * radius]);
          }
          if (modern && r.motif === "leaves") add(points, 100);
          else add(r.motif === "leaves" ? smooth(points, 1) : points);
        }
      }
    }
    if (s.version === 4 && r.layout !== "ribbons" && (r.motif === "soft" || r.motif === "ovals") && shapes.length > 4) {
      // In organic fields, specks and slivers far smaller or thinner than their neighbours read as mistakes.
      const areas = shapes.map(shape => shape.analyticArea ?? Math.abs(area(shape.points)));
      const thickness = shapes.map((shape, i) => 2 * areas[i] / shape.points.reduce((sum, p, k, all) => sum + Math.hypot(p[0] - all[(k + 1) % all.length][0], p[1] - all[(k + 1) % all.length][1]), 0));
      const median = values => [...values].sort((a, b) => a - b)[values.length >> 1];
      for (let removed = true; removed && shapes.length > 4;) {
        removed = false;
        const areaFloor = median(areas) * 0.15, thicknessFloor = median(thickness) * 0.4;
        for (let i = shapes.length - 1; i >= 0; i--) {
          if (areas[i] < areaFloor || thickness[i] < thicknessFloor) { shapes.splice(i, 1); areas.splice(i, 1); thickness.splice(i, 1); omitted++; removed = true; }
        }
      }
    }
    if (!shapes.length) throw new GeometryError("No usable cutouts at this size and web width. Reduce detail or web width, or enlarge the panel.");
    const layoutName = recipeOptions.layout[r.layout], motifName = recipeOptions.motif[r.motif], fieldName = recipeOptions.field[r.field];
    const name = r.layout === "ribbons" ? `${fieldName} / interrupted ribbons` : `${fieldName} / ${motifName.toLowerCase()} ${layoutName.toLowerCase()}`;
    const openArea = shapes.reduce((sum, shape) => sum + (shape.analyticArea ?? Math.abs(area(shape.points))), 0);
    const reservedWeb = modern && r.motif === "tracery" ? Math.min(s.web, r.traceWeb) : s.web;
    return {
      settings: s, shapes, margin, name,
      description: `${layoutName} structure + ${r.layout === "ribbons" ? "solid focal islands" : motifName.toLowerCase() + " openings"} + ${recipeOptions.rhythm[r.rhythm].toLowerCase()} rhythm. Every opening is a closed cutout.`,
      note: `Red: cutouts + panel boundary. Cell webs ${s.web.toFixed(2)} in${modern && r.motif === "tracery" ? `; tracery spokes ${r.traceWeb.toFixed(2)} in` : ""}, before kerf. ${reshaped ? `${reshaped} pointed openings reshaped for organic edges. ` : ""}${omitted ? `${omitted} undersized or pinched openings omitted. ` : ""}Sharp tips in angular modes and plywood strength still need a scrap test. No kerf compensation.`,
      metrics: { count: shapes.length, omitted, reservedWeb, openFraction: openArea / ((s.width - 2 * margin) * (s.height - 2 * margin)) }
    };
  }
  function makeRibbons(s, margin, add) {
    const r = s.recipe, horizontal = r.aspect > 1.25, w = (horizontal ? s.height : s.width) - 2 * margin, h = (horizontal ? s.width : s.height) - 2 * margin;
    const amplitude = w * 0.1 * s.movement / 100;
    const frequency = r.field === "still" ? 0.5 : r.frequency;
    const slope = r.field === "still" ? 0 : amplitude * (frequency * Math.PI * 2 + Math.PI * 4 * 0.3 + 9) / h;
    const horizontalWeb = s.web * Math.sqrt(1 + slope * slope);
    const compression = s.version >= 3 ? 1 - Math.PI * 1.3 * amplitude / w : 0.58;
    const count = Math.max(1, Math.min(s.density, Math.floor(w * (s.version >= 3 ? compression * 0.97 : 0.57) / (horizontalWeb + 0.16 * (s.version >= 3 ? 100 : 90) / s.openness))));
    const pitch = w / count, half = Math.max(0.03, (pitch * compression - horizontalWeb) / 2) * s.openness / (s.version >= 3 ? 100 : 90);
    const islands = s.version >= 3 ? r.islands : r.symmetry % 3 + 1;
    const coords = (x, y) => horizontal ? [y, x] : [x, y];
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count, runs = []; let run = [];
      for (let k = 0; k <= 120; k++) {
        const t = k / 120;
        const wave = r.field === "still" ? 0
          : r.field === "vortex" ? Math.tanh((t - r.focusY) * 5) * Math.sin(Math.PI * t) * r.twist / (s.version >= 3 ? 6 : 3)
          : r.field === "lens" ? Math.exp(-(((t - r.focusY) * 4) ** 2)) * r.twist / (s.version >= 3 ? 6 : 3)
          : r.field === "saddle" ? (4 * (t - 0.5) ** 2 - 0.5) * r.twist / (s.version >= 3 ? 6 : 3)
          : Math.sin(t * frequency * Math.PI * 2 + r.phase) + 0.3 * Math.sin(t * Math.PI * 4 - r.phase);
        const offset = amplitude * wave * Math.sin(Math.PI * u);
        const x = margin + u * w + offset, y = margin + t * h;
        let blocked = false;
        for (let j = 0; j < islands; j++) {
          const cx = margin + w * (0.3 + 0.4 * ((r.focusX + j * 0.37) % 1));
          const cy = margin + h * (j + 1) / (islands + 1);
          const radius = Math.min(w, h) * (s.version >= 3 ? r.islandSize : 0.12 + 0.05 * Math.sin(r.phase + j));
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
        const envelope = [...side, ...other];
        if (s.version === 4 && r.roundness) {
          // Reserve room for smoothing concave wave edges, not only convex tips.
          const roundedWidth = Math.max(width * 0.8, width - 0.005);
          const innerSide = segment.map((p, k) => coords(p[0] - roundedWidth * taper(k), p[1]));
          const innerOther = segment.slice(1, -1).map((p, k) => coords(p[0] + roundedWidth * taper(k + 1), p[1])).reverse();
          const geometry = curvedShape([...innerSide, ...innerOther], r.roundness, true, true);
          add(envelope, 0, { ...geometry, envelope });
        } else add(envelope, s.version >= 3 ? r.roundness : 0, null, true);
      }
    }
  }
  function generate(input) {
    const s = validate(input);
    if (s.style === "explore") return generateExplorer(s);
    const design = generateLegacy(s);
    return { ...design, name: styles[s.style].name, description: styles[s.style].description, note: `Legacy study from the first draft. ${styles[s.style].note}` };
  }
  function compositionScore(design) {
    const m = design.metrics;
    if (!Number.isFinite(m.openFraction)) return 0;
    const sparsePenalty = m.openFraction < 0.28 ? (0.28 - m.openFraction) * 5 : 0;
    return 1 - Math.abs(m.openFraction - 0.48) * 2 - sparsePenalty - m.omitted / (m.omitted + m.count) * 0.3;
  }
  const families = {
    whirl: { name: "Soft current", description: "Rounded quilt cells turn together around one quiet focus.",
      recipe: { layout: "quilt", motif: "soft", field: "vortex", twist: 1.8 },
      controls: [["density", "Cell detail", 12, 48, 6], ["movement", "Swirl", 10, 130, 1], ["openness", "Open space", 65, 100, 1]] },
    crystal: { name: "Crystal field", description: "Crisp honeycomb facets expand around a shared center.",
      recipe: { layout: "honeycomb", motif: "facets", field: "lens", twist: 3 },
      controls: [["density", "Cell detail", 12, 48, 9], ["movement", "Center expansion", 0, 100, 1], ["openness", "Open space", 60, 100, 1]] },
    orbit: { name: "Orbital drift", description: "Golden-angle ellipses gather and spread without a repeating grid.",
      recipe: { layout: "sunflower", motif: "ovals", field: "lens", twist: -3, shapeAspect: 1.65 },
      controls: [["density", "Oval detail", 12, 48, 6], ["movement", "Center gathering", 0, 100, 1], ["openness", "Open space", 60, 100, 1]] },
    tide: { name: "Long tides", description: "Continuous wave slots move as one field around a solid island.",
      recipe: { layout: "ribbons", motif: "soft", field: "waves", frequency: 1.1, islands: 1, islandSize: 0.14 },
      controls: [["frequency", "Wave count", 0.6, 2.4, 0.1], ["movement", "Wave depth", 0, 60, 1], ["openness", "Open space", 55, 100, 1]] }
  };
  function familyOf(s) {
    if (s.version !== 4 || s.style !== "explore") return null;
    return Object.keys(families).find(key => {
      const r = families[key].recipe;
      return ["layout", "motif", "field"].every(k => s.recipe[k] === r[k]);
    }) || null;
  }
  function starting(family, seed = defaults.seed, base = defaults) {
    if (!Object.hasOwn(families, family)) throw new Error("Unknown starting direction.");
    return validate({ ...defaults, seed, width: base.width, height: base.height, web: base.web ?? defaults.web,
      density: family === "tide" ? 16 : 30, movement: family === "tide" ? 32 : 70, openness: family === "tide" ? 90 : 94,
      recipe: { ...defaults.recipe, ...families[family].recipe } });
  }
  function curate(seed, family, base = defaults) {
    const rng = random(seed), s = starting(family, seed, base);
    for (const [key, , min, max, step] of families[family].controls) {
      const value = min + Math.floor(rng() * ((max - min) / step + 1)) * step;
      if (key in s) s[key] = value; else s.recipe[key] = value;
    }
    s.recipe.focusX = 0.32 + rng() * 0.36;
    s.recipe.focusY = 0.32 + rng() * 0.36;
    s.recipe.phase = rng() * Math.PI * 2;
    // A shared field and a single size gradient preserve neighboring relationships.
    if (family !== "tide" && rng() > 0.5) {
      s.recipe.rhythm = "gradient";
      s.recipe.rhythmStrength = 0.1 + rng() * 0.25;
    }
    return validate(s);
  }
  function balance(input, target = 0.48) {
    const s = validate(input);
    if (s.version < 3 || s.style !== "explore") throw new Error("Upgrade this recipe before balancing it.");
    if (!Number.isFinite(target) || target < 0.2 || target > 0.75) throw new Error("Balance target must be between 20% and 75% open space.");
    let low = 15, high = 100, best = null;
    for (let i = 0; i < 14; i++) {
      const openness = i === 0 ? 100 : (low + high) / 2;
      const candidate = validate({ ...s, openness });
      let design;
      try { design = generate(candidate); }
      catch (error) { if (!(error instanceof GeometryError)) throw error; low = openness; continue; }
      const fraction = design.metrics.openFraction;
      if (!best || Math.abs(fraction - target) < Math.abs(best.achieved - target)) best = { settings: candidate, achieved: fraction };
      if (fraction > target) high = openness; else low = openness;
    }
    if (!best) throw new GeometryError("This recipe has no usable openings to balance.");
    return { ...best, target, reached: Math.abs(best.achieved - target) < 0.01 };
  }
  const evolutionOptions = {
    movement: { label: "Movement", min: 0, max: 200 },
    twist: controls.twist, phase: controls.phase, openness: { label: "Open space", min: 15, max: 100 },
    roundness: controls.roundness, traceHub: controls.traceHub
  };
  function evolve(input, parameter, from, to) {
    const s = validate(input), option = evolutionOptions[parameter];
    if (s.version < 3 || s.style !== "explore") throw new Error("Upgrade this recipe before making an evolution study.");
    if (!option || !Number.isFinite(from) || !Number.isFinite(to) || Math.min(from, to) < option.min || Math.max(from, to) > option.max) throw new Error("Evolution endpoints are outside the selected control's range.");
    const panels = Array.from({ length: 4 }, (_, i) => {
      const value = from + (to - from) * i / 3;
      const settings = { ...s, recipe: { ...s.recipe } };
      if (["movement", "openness"].includes(parameter)) settings[parameter] = value;
      else settings.recipe[parameter] = option.radians ? value * Math.PI / 180 : value;
      return { value, design: generate(settings) };
    });
    if (from !== to && new Set(panels.map(p => p.design.shapes.map(shape => shape.d).join(""))).size === 1) throw new Error("That control has no visible effect on this recipe. Choose a different evolution dimension.");
    return panels;
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
    const backing = mode === "contrast" ? `<rect width="${w}" height="${h}" fill="#493627"/>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.12 -0.12 ${fmt(s.width + 0.24)} ${fmt(s.height + 0.24)}">${title}<defs><pattern id="${grain}" patternUnits="userSpaceOnUse" width="${w}" height=".22"><rect width="${w}" height=".22" fill="#cba774"/><path d="M0 .04 Q${fmt(s.width * 0.4)} .09 ${w} .035 M0 .14 Q${fmt(s.width * 0.6)} .10 ${w} .16 M0 .20 L${w} .21" stroke="#a78352" stroke-width=".009" opacity=".015"/></pattern><mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white"/>${holes}</mask></defs>${backing}${pieces}${score}</svg>`;
  }
  window.Grain = { styles, recipeOptions, controls, traceOutlines, defaults, families, familyOf, starting, curate, GeometryError, invent, upgrade, validate, generate, balance, evolve, evolutionOptions, compositionScore, exportSVG, previewSVG };
})();
