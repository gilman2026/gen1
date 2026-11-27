(function () {
  "use strict";
  const G = window.Grain, T = window.GrainTaste, $ = id => document.getElementById(id);
  let settings = G.validate(G.defaults), mode = "wood", current, favorites = [], renderId = 0, storageReadable = true;
  const storageKey = "grain-studies-v1";
  const tasteKey = "grain-taste-v1";
  let taste = { version: 1, entries: [] }, tasteReadable = true, tastePair = null;
  let galleryChoices = [], seen = [], seenReadable = true;
  const seenKey = "grain-gallery-seen-v1";
  let seriesBase = null, series = [], seriesParameter = "movement";
  let studioScroll = 0;
  function focusStudio(active) {
    if (active) studioScroll = window.scrollY;
    document.body.classList.toggle("studio-focus", active);
    $("focus-studio").setAttribute("aria-pressed", String(active));
    $("focus-studio").textContent = active ? "Leave focus / Esc" : "Focus studio";
    window.scrollTo(0, active ? 0 : studioScroll);
  }
  function status(message, error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
  }
  function newSeed() {
    const words = ["river", "fern", "tidal", "moss", "dune", "grove", "drift", "flora"];
    const values = crypto.getRandomValues(new Uint32Array(2));
    return `${words[values[0] % words.length]}-${values[1].toString(36)}`;
  }
  function readSettings() {
    const input = { ...settings, seed: $("seed").value, width: Number($("width").value), height: Number($("height").value), density: Number($("density").value), movement: Number($("movement").value) };
    if (settings.style === "explore") {
      input.recipe = { ...settings.recipe };
      for (const key of Object.keys(G.recipeOptions)) input.recipe[key] = $(key).value;
      input.web = Number($("web").value); input.openness = Number($("openness").value);
      if (settings.version >= 3) {
        for (const [key, control] of Object.entries(G.controls)) input.recipe[key] = Number($(`control-${key}`).value) * (control.radians ? Math.PI / 180 : 1);
        input.recipe.traceOutline = $("trace-outline").value;
      }
    }
    return G.validate(input);
  }
  function render() {
    try {
      settings = readSettings();
      current = G.generate(settings);
      $("preview").innerHTML = G.previewSVG(current, mode, `main-${++renderId}`);
      $("preview").className = `preview ${mode}`;
      $("preview").setAttribute("aria-label", `${current.name} ${mode} preview. ${settings.width} by ${settings.height} inches.`);
      $("density-value").textContent = settings.density;
      $("movement-value").textContent = `${Number(settings.movement.toFixed(1))}%`;
      $("study-seed").textContent = settings.seed;
      $("dimensions-label").textContent = `${settings.width.toFixed(2)} x ${settings.height.toFixed(2)} in`;
      $("path-count").textContent = `${current.shapes.length} ${G.styles[settings.style].operation === "cut" ? "cutouts" : "score lines"}${Number.isFinite(current.metrics.openFraction) ? ` / ~${Math.round(current.metrics.openFraction * 100)}% open` : ""} + boundary`;
      $("design-name").textContent = current.name;
      $("design-description").textContent = current.description;
      $("production-note").textContent = current.note;
      const explorer = settings.style === "explore";
      const modern = settings.version >= 3;
      for (const option of $("layout").options) option.disabled = explorer && !modern && option.value === "sunflower";
      for (const option of $("motif").options) option.disabled = explorer && !modern && ["ovals", "superellipse"].includes(option.value);
      $("recipe-controls").hidden = !explorer;
      $("cut-controls").hidden = !explorer;
      $("legacy-note").hidden = settings.version === 4;
      $("upgrade").hidden = !explorer || settings.version === 4;
      $("evolve").disabled = !explorer;
      $("balance").disabled = !modern;
      $("advanced-controls").hidden = !modern;
      $("tracery-controls").hidden = !modern || settings.recipe?.motif !== "tracery";
      $("ribbon-controls").hidden = !modern || settings.recipe?.layout !== "ribbons";
      $("build-series").disabled = !modern;
      $("recipe-summary").replaceChildren();
      if (explorer) {
        $("openness-value").textContent = `${Number(settings.openness.toFixed(1))}%`;
        $("web-value").textContent = settings.web.toFixed(2);
        $("motif").disabled = settings.recipe.layout === "ribbons";
        $("motif").title = $("motif").disabled ? "Ribbons use continuous slots with solid focal islands." : "";
        const labels = Object.keys(G.recipeOptions).map(key => key === "motif" && settings.recipe.layout === "ribbons" ? "Interrupted slots" : G.recipeOptions[key][settings.recipe[key]]);
        if (settings.recipe.layout === "radial") labels.push(`${settings.recipe.symmetry}-sector basis`);
        else if (settings.recipe.layout !== "ribbons" && ["stars", "tracery"].includes(settings.recipe.motif)) labels.push(`${settings.recipe.symmetry}-point motif`);
        for (const text of labels) { const chip = document.createElement("span"); chip.textContent = text; $("recipe-summary").append(chip); }
        if (modern) {
          for (const [key, control] of Object.entries(G.controls)) {
            const value = settings.recipe[key] * (control.radians ? 180 / Math.PI : 1);
            $(`value-${key}`).textContent = Number(value.toFixed(control.step === 1 ? 0 : 2));
          }
          const motif = settings.recipe.motif;
          for (const [key, enabled] of Object.entries({
            roundness: ["soft", "tracery"].includes(motif) || settings.recipe.layout === "ribbons",
            shapeAspect: ["ovals", "superellipse", "leaves", "tracery"].includes(motif),
            exponent: motif === "superellipse" || (motif === "tracery" && settings.recipe.traceOutline === "superellipse"),
            starInner: motif === "stars",
            symmetry: ["stars", "tracery"].includes(motif) || settings.recipe.layout === "radial",
            jitter: !["radial", "sunflower", "ribbons"].includes(settings.recipe.layout)
          })) $(`control-${key}`).disabled = !enabled;
        }
      }
      $("export").disabled = false;
      $("favorite").disabled = false;
      document.querySelectorAll("#quick-controls output").forEach(output => {
        const key = output.dataset.key;
        output.textContent = Number((key in settings ? settings[key] : settings.recipe[key]).toFixed(1));
      });
      status("");
      return true;
    } catch (error) {
      $("export").disabled = true;
      $("favorite").disabled = true;
      status(`${error.message} Preview remains the previous valid study; export is disabled.`, true);
      return false;
    }
  }
  function loadStudy(study) {
    settings = G.validate(study);
    const modern = settings.version >= 3;
    $("density").max = modern ? 64 : 48;
    $("movement").max = modern ? 200 : 100;
    $("openness").min = modern ? 15 : 35;
    $("openness").max = modern ? 100 : 90;
    $("web").min = modern ? 0.08 : 0.1;
    $("web").max = modern ? 0.4 : 0.3;
    for (const key of ["seed", "width", "height", "density", "movement"]) $(key).value = settings[key];
    if (settings.style === "explore") {
      for (const key of Object.keys(G.recipeOptions)) $(key).value = settings.recipe[key];
      for (const key of ["web", "openness"]) $(key).value = settings[key];
      if (modern) {
        for (const [key, control] of Object.entries(G.controls)) $(`control-${key}`).value = settings.recipe[key] * (control.radians ? 180 / Math.PI : 1);
        $("trace-outline").value = settings.recipe.traceOutline;
      }
    }
    $("panel-web").value = settings.web ?? G.defaults.web;
    $("panel-web").disabled = settings.style !== "explore";
    const family = G.familyOf(settings);
    $("starting-design").value = family || "";
    $("direction-note").textContent = family ? G.families[family].description : "Archived or custom recipe. Its hidden settings are retained, not replaced by a preset.";
    $("quick-controls").replaceChildren();
    if (family) for (const [key, name, min, max, step] of G.families[family].controls) {
      const field = document.createElement("div"); field.className = "field";
      const label = document.createElement("label"); label.htmlFor = `quick-${key}`; label.textContent = name;
      const output = document.createElement("output"); output.dataset.key = key; label.append(output);
      const input = document.createElement("input"); input.id = `quick-${key}`; input.type = "range";
      const value = key in settings ? settings[key] : settings.recipe[key];
      input.min = Math.min(min, value); input.max = Math.max(max, value);
      input.step = key === "density" && (value - min) % step !== 0 ? 1 : step; input.value = value;
      input.addEventListener("input", () => {
        $(key in settings ? key : `control-${key}`).value = input.value;
        render();
      });
      field.append(label, input); $("quick-controls").append(field);
    }
    render();
  }
  function makeCard(study, index, saved = false, design = G.generate(study)) {
    const card = document.createElement("div"), button = document.createElement("button");
    card.className = "variation-card"; button.className = "variation-button";
    button.setAttribute("aria-label", `Open ${design.name}, seed ${study.seed}`);
    const mini = document.createElement("span"); mini.className = "mini-preview";
    mini.innerHTML = G.previewSVG(design, "wood", `card-${++renderId}`);
    const title = document.createElement("span"); title.className = "variation-title";
    const name = document.createElement("span"); name.textContent = design.name;
    const number = document.createElement("span"); number.textContent = String(index + 1).padStart(2, "0");
    title.append(name, number);
    const sub = document.createElement("span"); sub.className = "variation-subtitle"; sub.textContent = study.style === "explore" ? `${G.recipeOptions.layout[study.recipe.layout]} / ${G.recipeOptions.rhythm[study.recipe.rhythm]} / ${study.seed}` : study.seed;
    button.append(mini, title, sub); button.addEventListener("click", () => loadStudy(study)); card.append(button);
    if (saved) {
      const remove = document.createElement("button"); remove.className = "remove-saved"; remove.textContent = "\u00d7";
      remove.setAttribute("aria-label", `Remove saved study ${study.seed}`);
      remove.addEventListener("click", () => {
        const next = favorites.filter((_, i) => i !== index);
        if (persist(next)) { favorites = next; renderFavorites(); status("Study removed."); }
      });
      card.append(remove);
    }
    return card;
  }
  function variations() {
    $("variations").replaceChildren();
    for (const [i, family] of Object.keys(G.families).entries()) {
      const study = G.starting(family);
      const card = makeCard(study, i);
      card.querySelector(".variation-title span").textContent = G.families[family].name;
      card.querySelector(".variation-subtitle").textContent = G.families[family].description;
      $("variations").append(card);
    }
    return true;
  }
  function persist(next) {
    if (!storageReadable) { status("Saved data could not be read. It will not be overwritten; export SVGs instead.", true); return false; }
    try { localStorage.setItem(storageKey, JSON.stringify(next)); return true; }
    catch (error) { status(`Couldn't save in this browser (${error.message}). SVG export still works.`, true); return false; }
  }
  function renderFavorites() {
    $("saved-section").hidden = favorites.length === 0;
    $("saved").replaceChildren(...favorites.map((s, i) => makeCard(s, i, true)));
  }
  function download(text, type, filename) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    try {
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.append(a); a.click(); a.remove();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 10000); }
  }
  function filename(study, prefix = "grain") {
    return `${prefix}-${study.style}-${study.seed.replace(/[^a-z0-9_-]/gi, "_")}-${study.width}x${study.height}in.svg`;
  }
  function panelPreview(design, id) {
    const preview = document.createElement("div"); preview.className = "mini-preview";
    preview.innerHTML = G.previewSVG(design, mode === "paths" ? "wood" : mode, id);
    preview.setAttribute("role", "img"); preview.setAttribute("aria-label", design.name);
    return preview;
  }
  function displaySeries() {
    $("series").replaceChildren();
    series.forEach((panel, i) => {
      const card = document.createElement("div");
      card.append(panelPreview(panel.design, `series-${++renderId}`));
      const actions = document.createElement("div"); actions.className = "series-actions";
      const title = document.createElement("span"); title.className = "variation-title";
      title.textContent = `${String(i + 1).padStart(2, "0")} / ${Number(panel.value.toFixed(2))}`;
      const button = document.createElement("button"); button.className = "text-button"; button.textContent = `Export panel ${i + 1}`;
      button.addEventListener("click", () => {
        try { download(G.exportSVG(panel.design.settings), "image/svg+xml", filename(panel.design.settings, `grain-panel-${i + 1}`)); $("series-status").textContent = `Panel ${i + 1} SVG download requested. Check dimensions in Glowforge.`; }
        catch (error) { $("series-status").textContent = `Panel export failed: ${error.message}`; $("series-status").classList.add("error"); }
      });
      actions.append(title, button); card.append(actions); $("series").append(card);
    });
    $("export-series").disabled = !series.length;
  }
  function updateSeries() {
    if (!seriesBase) return;
    try {
      if (!$("series-from").value.trim() || !$("series-to").value.trim()) throw new Error("Enter both evolution endpoints.");
      seriesParameter = $("series-parameter").value;
      series = G.evolve(seriesBase, seriesParameter, Number($("series-from").value), Number($("series-to").value));
      $("series-note").textContent = `Frozen study: ${seriesBase.seed}, ${seriesBase.width} x ${seriesBase.height} in per panel. ${G.evolutionOptions[seriesParameter].label} evolves; all other settings stay fixed. Rebuild to use changes from the main studio.`;
      $("series-status").textContent = ""; $("series-status").classList.remove("error");
    } catch (error) {
      series = [];
      $("series-status").textContent = `Study not built: ${error.message}`;
      $("series-status").classList.add("error");
    }
    displaySeries();
  }
  function buildSeries() {
    if (!render()) return;
    seriesBase = G.validate(settings);
    updateSeries();
  }
  function tasteStatus(message, error = false) {
    $("taste-status").textContent = message; $("taste-status").classList.toggle("error", error);
  }
  function updateTasteCount() {
    $("taste-count").textContent = `${taste.entries.length} records saved locally`;
    $("undo-taste").disabled = !taste.entries.length;
    $("export-taste").disabled = !taste.entries.length;
  }
  function persistTaste(next) {
    if (!tasteReadable) { tasteStatus("Existing taste data could not be read and will not be overwritten.", true); return false; }
    try {
      const validated = T.validate(next); localStorage.setItem(tasteKey, JSON.stringify(validated)); taste = validated; updateTasteCount(); return true;
    } catch (error) { tasteStatus(`Taste feedback not saved: ${error.message}`, true); return false; }
  }
  function showTastePair() {
    tastePair = null;
    try {
      if (!seenReadable) throw new Error("Gallery history is unreadable and will not be overwritten.");
      // Compare against the last three galleries: recent repeats are excluded without exhausting the vocabulary forever.
      const gallery = T.gallery(newSeed(), seen.slice(-36));
      if (!gallery.designs.length) throw new Error("No sufficiently different compositions remain in this vocabulary. Earlier choices are preserved.");
      const next = [...seen, ...gallery.descriptors].slice(-10000);
      localStorage.setItem(seenKey, JSON.stringify(next));
      seen = next;
      tastePair = gallery.designs;
      galleryChoices = tastePair.map(() => "unrated");
      $("taste-cards").replaceChildren();
      tastePair.forEach((design, i) => {
        const card = document.createElement("div"); card.append(panelPreview(design, `taste-${++renderId}`));
        const description = document.createElement("p"); description.className = "taste-description";
        description.textContent = `${i + 1} / ${G.families[G.familyOf(design.settings)].name} / ~${Math.round(design.metrics.openFraction * 100)}% open`;
        const row = document.createElement("div"); row.className = "taste-choice";
        for (const [choice, name] of [["favorite", "Favorite"], ["dislike", "Dislike"]]) {
          const button = document.createElement("button"); button.textContent = name;
          button.setAttribute("aria-label", `${name} gallery sketch ${i + 1}`); button.setAttribute("aria-pressed", "false");
          button.addEventListener("click", () => {
            galleryChoices[i] = galleryChoices[i] === choice ? "unrated" : choice;
            for (const child of row.children) child.setAttribute("aria-pressed", String(child === button && galleryChoices[i] === choice));
          });
          row.append(button);
        }
        card.append(description, row); $("taste-cards").append(card);
      });
      $("taste-question").textContent = `${tastePair.length} new compositions. Select as many or as few as you like.`;
      if (tastePair.length < 12) tasteStatus(`Only ${tastePair.length} sufficiently different sketches remain; no near-duplicates were added to fill the grid.`);
      else tasteStatus("");
    } catch (error) {
      $("taste-cards").replaceChildren();
      tasteStatus(`Gallery unavailable: ${error.message}`, true);
    }
    $("save-ratings").disabled = !tastePair;
    $("none-taste").disabled = !tastePair;
    return Boolean(tastePair);
  }
  function saveTaste(entries) {
    const next = { ...taste, entries: [...taste.entries, ...entries] };
    if (persistTaste(next)) {
      $("save-ratings").disabled = true; $("none-taste").disabled = true;
      document.querySelectorAll(".taste-choice button").forEach(button => { button.disabled = true; });
      tasteStatus("Choices saved locally. Unmarked sketches imply no preference. Use New gallery when ready.");
    }
  }
  function record(kind) { return { id: `${kind}-${newSeed()}-${Date.now()}`, kind, createdAt: new Date().toISOString() }; }
  for (const [key, control] of Object.entries(G.controls)) {
    const field = document.createElement("div"); field.className = "field";
    const label = document.createElement("label"); label.htmlFor = `control-${key}`; label.textContent = control.label;
    const output = document.createElement("output"); output.id = `value-${key}`; label.append(output);
    const input = document.createElement("input"); input.id = `control-${key}`; input.type = "range"; input.min = control.min; input.max = control.max;
    input.step = ["symmetry", "outlineSides", "islands"].includes(key) ? 1 : "any"; input.value = control.value;
    input.addEventListener("input", render); field.append(label, input);
    $(control.group === "tracery" ? "trace-sliders" : control.group === "ribbons" ? "ribbon-sliders" : "math-controls").append(field);
  }
  for (const [value, label] of Object.entries(G.traceOutlines)) { const option = document.createElement("option"); option.value = value; option.textContent = label; $("trace-outline").append(option); }
  $("trace-outline").addEventListener("change", render);
  $("focus-studio").addEventListener("click", () => focusStudio(!document.body.classList.contains("studio-focus")));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.body.classList.contains("studio-focus")) focusStudio(false);
  });
  for (const [value, config] of Object.entries(G.evolutionOptions)) { const option = document.createElement("option"); option.value = value; option.textContent = config.label; $("series-parameter").append(option); }
  $("series-parameter").addEventListener("change", () => {
    const parameter = $("series-parameter").value, config = G.evolutionOptions[parameter];
    const ends = parameter === "movement" ? [0, 140] : parameter === "twist" ? [-2, 2] : parameter === "phase" ? [0, 180] : [config.min, config.max];
    $("series-from").value = ends[0]; $("series-to").value = ends[1];
    updateSeries();
  });
  for (const id of ["series-from", "series-to"]) $(id).addEventListener("change", updateSeries);
  $("build-series").addEventListener("click", buildSeries);
  $("export-series").addEventListener("click", () => {
    try {
      if (!series.length) throw new Error("Build a valid study first.");
      download(JSON.stringify({ version: 1, kind: "four-panel-evolution", parameter: seriesParameter, panels: series.map(panel => ({ value: panel.value, settings: panel.design.settings })) }, null, 2), "application/json", "grain-four-panel-study.json");
      $("series-status").textContent = "Study recipes download requested. SVG panels export individually.";
    } catch (error) { $("series-status").textContent = error.message; $("series-status").classList.add("error"); }
  });
  $("new-comparison").addEventListener("click", showTastePair);
  $("save-ratings").addEventListener("click", () => {
    if (!tastePair) return;
    if (galleryChoices.every(choice => choice === "unrated")) { tasteStatus("Mark a favorite or dislike, or choose None of these.", true); return; }
    saveTaste([{ ...record("gallery"), none: false, studies: tastePair.map((design, i) => ({ study: design.settings, choice: galleryChoices[i] })) }]);
  });
  $("none-taste").addEventListener("click", () => {
    if (tastePair) saveTaste([{ ...record("gallery"), none: true, studies: tastePair.map(design => ({ study: design.settings, choice: "unrated" })) }]);
  });
  $("use-taste").addEventListener("change", () => {
    if (persistTaste({ ...taste, useFeedback: $("use-taste").checked })) variations();
    else $("use-taste").checked = Boolean(taste.useFeedback);
  });
  $("undo-taste").addEventListener("click", () => {
    if (persistTaste({ ...taste, entries: taste.entries.slice(0, -1) })) tasteStatus("Last record removed. Earlier feedback is unchanged.");
  });
  $("export-taste").addEventListener("click", () => {
    try { download(T.exportJSON(taste), "application/json", "grain-taste-notes.json"); tasteStatus("Taste notes download requested. Attach the file in our chat when you want to discuss it."); }
    catch (error) { tasteStatus(`Feedback export failed: ${error.message}`, true); }
  });
  for (const [key, options] of Object.entries(G.recipeOptions)) {
    for (const [value, label] of Object.entries(options)) { const option = document.createElement("option"); option.value = value; option.textContent = label; $(key).append(option); }
    $(key).value = settings.recipe[key];
    $(key).addEventListener("change", render);
  }
  for (const key of ["seed", "width", "height", "density", "movement", "web", "openness"]) $(key).addEventListener("input", render);
  const archived = document.createElement("option"); archived.value = ""; archived.textContent = "Archived / custom recipe"; archived.disabled = true; $("starting-design").append(archived);
  for (const [family, config] of Object.entries(G.families)) {
    const option = document.createElement("option"); option.value = family; option.textContent = config.name; $("starting-design").append(option);
  }
  $("starting-design").addEventListener("change", () => {
    // Starting directions are fixed, seed-independent defaults; Surprise me supplies seeded variation.
    try { loadStudy(G.starting($("starting-design").value, `${$("starting-design").value}-start`, readSettings())); }
    catch (error) { status(`Cannot change direction: ${error.message}`, true); }
  });
  $("panel-web").addEventListener("input", () => { $("web").value = $("panel-web").value; render(); });
  $("new-seed").addEventListener("click", () => { $("seed").value = newSeed(); render(); });
  // Session-only memory so consecutive surprises avoid near-repeats; nothing is stored.
  const recentSurprises = [];
  $("shuffle").addEventListener("click", () => {
    try {
      const base = readSettings(), current = G.familyOf(base);
      const order = Object.keys(G.families).filter(family => family !== current);
      const picks = crypto.getRandomValues(new Uint32Array(order.length));
      for (let i = order.length - 1; i > 0; i--) { const j = picks[i] % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
      if (current) order.push(current);
      // Retry within the chosen direction so a strict family does not hand its turn to the next one.
      for (const family of order) for (let attempt = 0; attempt < 16; attempt++) {
        const study = G.curate(newSeed(), family, base), profile = T.descriptor(study);
        if (!recentSurprises.every(previous => T.distinct(profile, previous))) continue;
        try {
          const design = G.generate(study);
          if (design.metrics.openFraction < (family === "orbit" || family === "tide" ? 0.22 : 0.3) ||
              design.metrics.omitted / (design.metrics.count + design.metrics.omitted) > 0.55) continue;
          recentSurprises.push(profile);
          if (recentSurprises.length > 6) recentSurprises.shift();
          loadStudy(study); return;
        } catch (error) { if (!(error instanceof G.GeometryError)) throw error; }
      }
      throw new G.GeometryError("No usable composition at this panel size and wood spacing. Enlarge the panel or reduce spacing.");
    } catch (error) { status(`Surprise unavailable: ${error.message}`, true); }
  });
  $("reset").addEventListener("click", () => { loadStudy(G.starting("whirl")); variations(); });
  $("upgrade").addEventListener("click", () => {
    try { loadStudy(G.upgrade(readSettings())); status("Upgraded a copy. Existing favorites retain their earlier geometry."); }
    catch (error) { status(`Upgrade failed: ${error.message}`, true); }
  });
  $("balance").addEventListener("click", () => {
    try {
      const result = G.balance(readSettings(), Number($("balance-target").value) / 100);
      loadStudy(result.settings);
      status(`${result.reached ? "Balanced" : "Closest available at these settings"}: ~${Math.round(result.achieved * 100)}% open area.${result.reached ? "" : " Change motif fullness, detail, or wood spacing to reach the target."}`);
    } catch (error) { status(`Couldn't balance this design: ${error.message}`, true); }
  });
  $("refresh-variations").addEventListener("click", () => variations());
  $("evolve").addEventListener("click", () => variations(true));
  for (const view of ["wood", "contrast", "paths"]) $(`${view}-view`).addEventListener("click", () => {
    mode = view;
    for (const v of ["wood", "contrast", "paths"]) { $(`${v}-view`).classList.toggle("selected", v === view); $(`${v}-view`).setAttribute("aria-pressed", v === view); }
    render();
    displaySeries();
    if (tastePair) document.querySelectorAll("#taste-cards .mini-preview").forEach((preview, i) => { preview.innerHTML = G.previewSVG(tastePair[i], mode === "paths" ? "wood" : mode, `taste-${++renderId}`); });
  });
  $("favorite").addEventListener("click", () => {
    if (!render()) return;
    if (favorites.some(s => JSON.stringify(s) === JSON.stringify(settings))) { status("This study is already in your collection."); return; }
    if (favorites.length >= 24) { status("Collection full (24 studies). Remove a study to make room.", true); return; }
    const next = [...favorites, { ...settings }];
    if (persist(next)) { favorites = next; renderFavorites(); status("Study saved in this browser. Export its SVG for a portable copy."); }
  });
  $("export").addEventListener("click", () => {
    if (!render()) return;
    try {
      download(G.exportSVG(settings), "image/svg+xml;charset=utf-8", filename(settings));
      status("SVG download requested. In Glowforge: check size, assign red to cut and blue to score, then test on a scrap.");
    } catch (error) { status(`Export failed: ${error.message}`, true); }
  });
  let tasteLoadError = "";
  try {
    const raw = localStorage.getItem(tasteKey);
    if (raw) taste = T.validate(JSON.parse(raw));
    $("use-taste").checked = Boolean(taste.useFeedback);
  } catch (error) { tasteReadable = false; tasteLoadError = `Couldn't load taste notes: ${error.message}. Stored data has not been changed.`; }
  updateTasteCount();
  try {
    const raw = localStorage.getItem(seenKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length > 10000 || parsed.some(d => !Object.hasOwn(G.families, d.family) || !Array.isArray(d.axes) || d.axes.length !== 7 || d.axes.some(n => !Number.isFinite(n) || n < 0 || n > 1))) throw new Error("Invalid gallery history.");
      seen = parsed;
    }
  } catch (error) { seenReadable = false; tasteLoadError += ` Gallery history: ${error.message}. Existing history is unchanged.`; }
  loadStudy(G.starting("whirl"));
  variations();
  buildSeries();
  showTastePair();
  if (tasteLoadError) tasteStatus(tasteLoadError, true);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length > 24) throw new Error("Invalid saved collection.");
      favorites = parsed.map(G.validate);
      renderFavorites();
    }
  } catch (error) {
    storageReadable = false;
    status(`Couldn't load saved studies: ${error.message}. Existing stored data has not been changed.`, true);
  }
})();
