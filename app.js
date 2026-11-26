(function () {
  "use strict";
  const G = window.Grain, $ = id => document.getElementById(id);
  let settings = G.validate(G.defaults), mode = "wood", current, favorites = [], renderId = 0, direction = "all", storageReadable = true;
  const storageKey = "grain-studies-v1";
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
      $("movement-value").textContent = `${settings.movement}%`;
      $("study-seed").textContent = settings.seed;
      $("dimensions-label").textContent = `${settings.width.toFixed(2)} x ${settings.height.toFixed(2)} in`;
      $("path-count").textContent = `${current.shapes.length} ${G.styles[settings.style].operation === "cut" ? "cutouts" : "score lines"} + boundary`;
      $("design-name").textContent = current.name;
      $("design-description").textContent = current.description;
      $("production-note").textContent = current.note;
      const explorer = settings.style === "explore";
      $("recipe-controls").hidden = !explorer;
      $("cut-controls").hidden = !explorer;
      $("legacy-note").hidden = explorer;
      $("evolve").disabled = !explorer;
      $("recipe-summary").replaceChildren();
      if (explorer) {
        $("openness-value").textContent = `${settings.openness}%`;
        $("web-value").textContent = settings.web.toFixed(2);
        $("motif").disabled = settings.recipe.layout === "ribbons";
        $("motif").title = $("motif").disabled ? "Ribbons use continuous slots with solid focal islands." : "";
        const labels = Object.keys(G.recipeOptions).map(key => key === "motif" && settings.recipe.layout === "ribbons" ? "Interrupted slots" : G.recipeOptions[key][settings.recipe[key]]);
        if (settings.recipe.layout === "radial") labels.push(`${settings.recipe.symmetry}-sector basis`);
        else if (settings.recipe.layout !== "ribbons" && ["stars", "tracery"].includes(settings.recipe.motif)) labels.push(`${settings.recipe.symmetry}-point motif`);
        for (const text of labels) { const chip = document.createElement("span"); chip.textContent = text; $("recipe-summary").append(chip); }
      }
      $("export").disabled = false;
      $("favorite").disabled = false;
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
    for (const key of ["seed", "width", "height", "density", "movement"]) $(key).value = settings[key];
    if (settings.style === "explore") {
      for (const key of Object.keys(G.recipeOptions)) $(key).value = settings.recipe[key];
      for (const key of ["web", "openness"]) $(key).value = settings[key];
    }
    render();
  }
  function makeCard(study, index, saved = false) {
    const card = document.createElement("div"), button = document.createElement("button");
    card.className = "variation-card"; button.className = "variation-button";
    const design = G.generate(study);
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
  function variations(related = false) {
    try { settings = readSettings(); }
    catch (error) { render(); return false; }
    const currentValid = render();
    const fragment = document.createDocumentFragment(), signatures = new Set(), layouts = new Set();
    let skipped = 0, count = 0;
    for (let attempt = 0; attempt < 80 && count < 6; attempt++) {
      const study = G.invent(newSeed(), settings, direction, related);
      if (!related && layouts.size < (direction === "all" ? 6 : 4) && layouts.has(study.recipe.layout)) continue;
      const signature = ["layout", "motif", "field", "rhythm"].map(key => key === "motif" && study.recipe.layout === "ribbons" ? "slots" : study.recipe[key]).join("/");
      if (signatures.has(signature)) continue;
      try {
        fragment.append(makeCard(study, count)); signatures.add(signature); layouts.add(study.recipe.layout); count++;
      } catch (error) {
        if (!(error instanceof G.GeometryError)) throw error;
        skipped++;
      }
    }
    $("variations").replaceChildren(fragment);
    $("ideas-heading").textContent = related ? "Same roots. Different possibilities." : "Different worlds, not just variations.";
    $("ideas-note").textContent = related ? "Structure and opening type stay. Distortion, rhythm, focal points, and movement evolve." : "Each card has a different recipe. Select one, then make it yours.";
    if (skipped || count < 6) status(`${skipped} recipes had no usable openings at this size and web width. Showing ${count} ideas; enlarge the panel or reduce web width for more.${currentValid ? "" : " Select an idea below to replace the current unusable recipe."}`, count === 0 || !currentValid);
    return count > 0;
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
  for (const [key, options] of Object.entries(G.recipeOptions)) {
    for (const [value, label] of Object.entries(options)) { const option = document.createElement("option"); option.value = value; option.textContent = label; $(key).append(option); }
    $(key).value = settings.recipe[key];
    $(key).addEventListener("change", render);
  }
  for (const key of ["seed", "width", "height", "density", "movement", "web", "openness"]) $(key).addEventListener("input", render);
  document.querySelectorAll("[data-direction]").forEach(button => button.addEventListener("click", () => {
    direction = button.dataset.direction;
    document.querySelectorAll("[data-direction]").forEach(b => { const active = b === button; b.classList.toggle("active", active); b.setAttribute("aria-pressed", active); });
    variations();
  }));
  $("new-seed").addEventListener("click", () => { $("seed").value = newSeed(); render(); });
  $("shuffle").addEventListener("click", () => {
    if (!variations()) return;
    const cards = $("variations").querySelectorAll(".variation-button");
    cards[crypto.getRandomValues(new Uint32Array(1))[0] % cards.length].click();
    variations();
  });
  $("reset").addEventListener("click", () => { loadStudy(G.defaults); variations(); });
  $("refresh-variations").addEventListener("click", () => variations());
  $("evolve").addEventListener("click", () => variations(true));
  for (const view of ["wood", "paths"]) $(`${view}-view`).addEventListener("click", () => {
    mode = view;
    for (const v of ["wood", "paths"]) { $(`${v}-view`).classList.toggle("selected", v === view); $(`${v}-view`).setAttribute("aria-pressed", v === view); }
    loadStudy(G.defaults);
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
    let url;
    try {
      const svg = G.exportSVG(settings), blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `grain-${settings.style}-${settings.seed.replace(/[^a-z0-9_-]/gi, "_")}-${settings.width}x${settings.height}in.svg`;
      document.body.append(a); a.click(); a.remove();
      status("SVG download requested. In Glowforge: check size, assign red to cut and blue to score, then test on a scrap.");
    } catch (error) { status(`Export failed: ${error.message}`, true); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 10000); }
  });
  render();
  variations();
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
