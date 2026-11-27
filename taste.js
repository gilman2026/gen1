(function () {
  "use strict";
  const G = window.Grain;
  function validate(input) {
    if (!input || input.version !== 1 || !Array.isArray(input.entries) || input.entries.length > 500) throw new Error("Invalid taste collection (maximum 500 records).");
    if (input.useFeedback !== undefined && typeof input.useFeedback !== "boolean") throw new Error("Invalid local ranking preference.");
    const entries = input.entries.map(entry => {
      if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 80 || typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt))) throw new Error("Invalid taste record.");
      const common = { id: entry.id, createdAt: entry.createdAt, kind: entry.kind };
      if (entry.kind === "rating") {
        if (!Number.isFinite(entry.rating) || entry.rating < 0 || entry.rating > 10) throw new Error("Ratings must be between 0 and 10.");
        return { ...common, study: G.validate(entry.study), rating: entry.rating };
      }
      if (entry.kind === "comparison") {
        if (!["left", "right", "tie", "neither"].includes(entry.choice)) throw new Error("Invalid comparison choice.");
        return { ...common, left: G.validate(entry.left), right: G.validate(entry.right), choice: entry.choice };
      }
      if (entry.kind === "gallery") {
        if (typeof entry.none !== "boolean" || !Array.isArray(entry.studies) || !entry.studies.length || entry.studies.length > 12) throw new Error("Invalid gallery record.");
        const studies = entry.studies.map(item => {
          if (!item || !["favorite", "dislike", "unrated"].includes(item.choice) || (entry.none && item.choice !== "unrated")) throw new Error("Invalid gallery choice.");
          return { study: G.validate(item.study), choice: item.choice };
        });
        return { ...common, none: entry.none, studies };
      }
      throw new Error("Unknown taste record type.");
    });
    if (new Set(entries.map(e => e.id)).size !== entries.length) throw new Error("Duplicate taste record identifiers.");
    return { version: 1, entries, useFeedback: input.useFeedback ?? false };
  }
  function similarity(a, b) {
    if (a.style !== b.style) return 0.05;
    if (a.style !== "explore") return 1;
    let distance = 0;
    for (const [key, weight] of [["layout", 0.3], ["motif", 0.3], ["field", 0.15], ["rhythm", 0.1]]) {
      if (a.recipe[key] !== b.recipe[key]) distance += weight;
    }
    distance += Math.abs(a.openness - b.openness) / 100 * 0.08;
    distance += Math.abs(a.movement - b.movement) / 200 * 0.07;
    for (const key of ["roundness", "shapeAspect", "traceHub", "traceWeb", "symmetry"]) {
      if (Number.isFinite(a.recipe[key]) && Number.isFinite(b.recipe[key])) distance += Math.abs(a.recipe[key] - b.recipe[key]) / (G.controls[key].max - G.controls[key].min) * 0.06;
    }
    return Math.exp(-distance * 5);
  }
  function score(study, collection) {
    let sum = 0, samples = 0;
    const add = (s, utility) => { sum += similarity(study, s) * utility; samples++; };
    for (const entry of collection.entries) {
      if (entry.kind === "rating") add(entry.study, (entry.rating - 5) / 5);
      else if (entry.kind === "comparison") {
        const value = entry.choice === "tie" ? 0.2 : entry.choice === "neither" ? -1 : 1;
        add(entry.left, entry.choice === "right" ? -1 : value);
        add(entry.right, entry.choice === "left" ? -1 : value);
      } else if (!entry.none) {
        for (const item of entry.studies) if (item.choice !== "unrated") add(item.study, item.choice === "favorite" ? 1 : -1);
      }
    }
    return samples ? sum / samples * Math.min(1, collection.entries.length / 5) : 0;
  }
  function exportJSON(collection) {
    return JSON.stringify({ ...validate(collection), app: "Grain taste lab", note: "Local art feedback, not automatic AI training. Each record includes its complete versioned recipe. Share this file explicitly for discussion." }, null, 2);
  }
  function visualDifference(left, right) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("This browser cannot measure comparison contrast.");
    const paths = [left, right].map(design => design.shapes.map(shape => new Path2D(shape.d)));
    let changed = 0;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 50; x++) {
      const px = (x + 0.5) * left.settings.width / 50, py = (y + 0.5) * left.settings.height / 40;
      const open = paths.map(side => side.some(path => context.isPointInPath(path, px, py)));
      if (open[0] !== open[1]) changed++;
    }
    return changed / 2000;
  }
  function pair(seed, index) {
    if (!Number.isInteger(index) || index < 0) throw new Error("Invalid comparison index.");
    const profiles = [
      { question: "Flowing organic cells or crisp crystalline facets?", left: { recipe: { layout: "scatter", motif: "soft", field: "vortex" } }, right: { movement: 0, recipe: { layout: "triangles", motif: "facets", field: "still", jitter: 0 } } },
      { question: "A measured lattice or a strongly flowing composition?", left: { movement: 0, recipe: { layout: "quilt", motif: "soft", jitter: 0 } }, right: { movement: 150, recipe: { layout: "quilt", motif: "soft", field: "vortex", twist: 3.5 } } },
      { question: "Substantial wood or generous negative space?", left: { density: 16, openness: 48, recipe: { layout: "quilt", motif: "soft", field: "waves" } }, right: { density: 16, openness: 100, recipe: { layout: "quilt", motif: "soft", field: "waves" } } },
      { question: "Cell-following contours or precise elliptical islands?", left: { recipe: { layout: "honeycomb", motif: "soft", field: "vortex" } }, right: { movement: 0, recipe: { layout: "quilt", motif: "ovals", field: "still", shapeAspect: 2.2 } } },
      { question: "Intricate tracery or large uninterrupted openings?", left: { density: 16, openness: 100, recipe: { layout: "scatter", motif: "tracery", symmetry: 4, traceHub: 5, traceWeb: 0.08 } }, right: { density: 16, openness: 100, recipe: { layout: "scatter", motif: "soft" } } },
      { question: "Radial star geometry or a golden-angle organic spiral?", left: { recipe: { layout: "radial", motif: "stars", field: "still", symmetry: 6, starInner: 0.48 } }, right: { recipe: { layout: "sunflower", motif: "soft", field: "vortex" } } }
    ];
    const profile = profiles[index % profiles.length], invention = G.invent(seed);
    const base = { ...G.defaults, seed, density: 20, openness: 94, recipe: { ...G.defaults.recipe, jitter: 0.12, phase: invention.recipe.phase, focusX: invention.recipe.focusX, focusY: invention.recipe.focusY, frequency: invention.recipe.frequency } };
    const designs = [profile.left, profile.right].map(overrides => G.generate({ ...base, ...overrides, recipe: { ...base.recipe, ...overrides.recipe } }));
    const difference = visualDifference(...designs);
    if (difference < 0.12) throw new G.GeometryError("These sketches are too similar to make a useful comparison.");
    return { question: profile.question, designs, difference };
  }
  function descriptor(s) {
    const family = G.familyOf(s);
    if (!family) return null;
    const axes = G.families[family].controls.map(([key, , min, max]) => ((key in s ? s[key] : s.recipe[key]) - min) / (max - min));
    return { family, axes: [...axes, (s.recipe.focusX - 0.32) / 0.36, (s.recipe.focusY - 0.32) / 0.36,
      s.recipe.phase / (Math.PI * 2), s.recipe.rhythm === "gradient" ? s.recipe.rhythmStrength : 0] };
  }
  function distinct(a, b) {
    if (a.family !== b.family) return true;
    const deltas = a.axes.map((value, i) => {
      const difference = Math.abs(value - b.axes[i]);
      return i === 5 ? Math.min(difference, 1 - difference) : difference;
    });
    // Count, field strength and negative space outweigh mere translations or rotations.
    return deltas[0] * 0.4 + deltas[1] * 0.35 + deltas[2] * 0.25 >= 0.22 ||
      (deltas[0] + deltas[1] + deltas[2] >= 0.4 && deltas[3] + deltas[4] >= 1);
  }
  function gallery(seed, seen = []) {
    const designs = [], descriptors = [];
    for (const family of Object.keys(G.families)) {
      let count = 0;
      for (let attempt = 0; attempt < 120 && count < 3; attempt++) {
        const s = G.curate(`${seed}-${family}-${attempt}`, family);
        const candidate = descriptor(s);
        if (![...seen, ...descriptors].every(previous => distinct(candidate, previous))) continue;
        try {
          const design = G.generate(s);
          if (design.metrics.openFraction < 0.18 || design.metrics.omitted / (design.metrics.count + design.metrics.omitted) > 0.55) continue;
          designs.push(design); descriptors.push(candidate); count++;
        } catch (error) { if (!(error instanceof G.GeometryError)) throw error; }
      }
    }
    return { designs, descriptors };
  }
  window.GrainTaste = { validate, score, exportJSON, pair, descriptor, distinct, gallery };
})();
