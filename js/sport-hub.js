/**
 * Sport hub page — one page per sport, with a tab bar across the top
 * to switch between that sport's tables (Standings, Results, etc).
 * Everything below (Style & Theme panel, live preview, embed code,
 * PDF/PNG export) is shared and just re-renders for whichever table
 * is active.
 *
 * Usage:
 *   initSportHub({
 *     sport: "F1",
 *     tables: [
 *       { key: "drivers", label: "Driver Standings", title: "F1 Driver Standings",
 *         embedHref: "../../embed/f1/drivers.html", sourceUrl: ..., adapter: ..., attribution: {...} },
 *       ...
 *     ]
 *   });
 *
 * This file relies on renderTableShell() and renderRows() from
 * tables.js also being loaded on this page (see f1-dark.html) —
 * export (PDF/PNG) builds the exact same .dt-widget markup the live
 * embed uses, driven by the same `hub` state, rather than
 * maintaining a second separately-styled copy that can drift out of
 * sync with the live look.
 */

/**
 * Palette used by the Title colour and Position & Points colour
 * pickers.
 */
const STYLE_PRESETS = [
  { key: "c1",  label: "Red",       accent: "E10600", swatch: "#E10600" },
  { key: "c2",  label: "Orange",    accent: "FF6A00", swatch: "#FF6A00" },
  { key: "c3",  label: "Yellow",    accent: "FFC700", swatch: "#FFC700" },
  { key: "c4",  label: "Lime",      accent: "A8E000", swatch: "#A8E000" },
  { key: "c5",  label: "Teal",      accent: "00B894", swatch: "#00B894" },
  { key: "c6",  label: "Sky Blue",  accent: "00BFFF", swatch: "#00BFFF" },
  { key: "c7",  label: "Blue",      accent: "0057FF", swatch: "#0057FF" },
  { key: "c8",  label: "Navy",      accent: "0A1D37", swatch: "#0A1D37" },
  { key: "c9",  label: "Green",     accent: "00C853", swatch: "#00C853" },
  { key: "c10", label: "Aqua",      accent: "00E5D2", swatch: "#00E5D2" },
  { key: "c11", label: "Indigo",    accent: "1A4DFF", swatch: "#1A4DFF" },
  { key: "c12", label: "Black",     accent: "0D0D0D", swatch: "#0D0D0D" },
];

/**
 * STANDARD SIZE ARCHITECTURE — applies to every sport, not just F1.
 */
const SIZE_PRESETS = {
  compact:  { label: "Compact (1 col)",  widthCm: 5,  maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "points", "pts", "round", "race", "date"] },
  standard: { label: "Standard (2 col)", widthCm: 10, maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "team", "nationality", "played", "points", "wins", "losses", "draws", "gd", "pct", "round", "race", "circuit", "location", "date", "time"] },
  full:     { label: "Full width",       widthCm: 18, maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "team", "nationality", "played", "laps", "time", "raceTime", "fastest", "points", "wins", "losses", "draws", "gd", "pct", "round", "race", "circuit", "location", "date"] },
};

const PREVIEW_SIZES = {
  full:     { label: "Full width", width: "100%" },
  standard: { label: "Standard",   width: "378px" },
  compact:  { label: "Compact",    width: "189px" },
};

let hub = {
  tables: [],
  activeKey: null,
  style: { titleColor: null, posColor: null, pointsColor: null },
  controls: { flags: true, logos: true, rowBg: true, podium: true },
  previewSize: "full",
  printSize: "full",
  rowLimit: null,
  rows: [],
};

function activeTable() {
  return hub.tables.find(t => t.key === hub.activeKey);
}

/* ---------- Table (top) tabs ---------- */

function renderTableTabs() {
  const mount = document.getElementById("table-tabs");
  if (!mount) return;
  mount.innerHTML = hub.tables.map(t => `
    <button class="table-tab${t.key === hub.activeKey ? ' active' : ''}" data-key="${t.key}" onclick="selectTableTab('${t.key}')">
      ${t.label}
    </button>
  `).join("");
}

function selectTableTab(key) {
  hub.activeKey = key;
  document.querySelectorAll(".table-tab").forEach(el =>
    el.classList.toggle("active", el.dataset.key === key));
  refreshActiveTable();
}

/* ---------- Live preview + embed code ---------- */

function buildEmbedUrl() {
  const table = activeTable();
  const params = new URLSearchParams();
  if (hub.style.titleColor) params.set("titleColor", hub.style.titleColor);
  if (hub.style.posColor) params.set("posColor", hub.style.posColor);
  if (hub.style.pointsColor) params.set("pointsColor", hub.style.pointsColor);
  if (!hub.controls.flags) params.set("flags", "off");
  if (!hub.controls.logos) params.set("logos", "off");
  if (!hub.controls.rowBg) params.set("rowbg", "off");
  if (!hub.controls.podium) params.set("podium", "off");
  if (hub.rowLimit) params.set("rows", hub.rowLimit);
  if (hub.previewSize === "compact") {
    params.set("size", "compact");
    params.set("cols", SIZE_PRESETS.compact.columns.join(","));
  } else if (hub.previewSize === "standard") {
    params.set("size", "standard");
    params.set("cols", SIZE_PRESETS.standard.columns.join(","));
  }
  const qs = params.toString();
  return qs ? `${table.embedHref}?${qs}` : table.embedHref;
}

function updateStylePreview() {
  const url = buildEmbedUrl();
  document.getElementById("preview-frame").src = url;
  const fullUrl = new URL(url, window.location.href).href;
  document.getElementById("embed-code").textContent =
    `<iframe class="dt-embed" src="${fullUrl}"></iframe>`;
  if (window.iFrameResize) {
    iFrameResize({ checkOrigin: false }, '#preview-frame');
  }
}

/* ---------- Independent Title / Position & Points colour pickers ---------- */

function applyTitleColour(key) {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset) return;
  hub.style.titleColor = preset.accent;
  document.querySelectorAll(".title-colour-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  renderExportSurface();
}

function applyPosPointsColour(key) {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset) return;
  hub.style.posColor = preset.accent;
  hub.style.pointsColor = preset.accent;
  document.querySelectorAll(".pospoints-colour-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  renderExportSurface();
}

function renderTitleColourButtons() {
  const mount = document.getElementById("title-colour-buttons");
  if (!mount) return;
  mount.innerHTML = STYLE_PRESETS.map(p => `
    <button class="colour-option title-colour-option${hub.style.titleColor === p.accent ? ' selected' : ''}" data-key="${p.key}" title="${p.label}" style="background:${p.swatch};" onclick="applyTitleColour('${p.key}')"></button>
  `).join('');
}

function renderPosPointsColourButtons() {
  const mount = document.getElementById("pospoints-colour-buttons");
  if (!mount) return;
  mount.innerHTML = STYLE_PRESETS.map(p => `
    <button class="colour-option pospoints-colour-option${hub.style.posColor === p.accent ? ' selected' : ''}" data-key="${p.key}" title="${p.label}" style="background:${p.swatch};" onclick="applyPosPointsColour('${p.key}')"></button>
  `).join('');
}

function toggleFlags() {
  hub.controls.flags = document.getElementById("control-flags").checked;
  updateStylePreview();
  renderExportSurface();
}

function toggleLogos() {
  hub.controls.logos = document.getElementById("control-logos").checked;
  updateStylePreview();
  renderExportSurface();
}

function toggleRowBg() {
  hub.controls.rowBg = document.getElementById("control-rowbg").checked;
  updateStylePreview();
  renderExportSurface();
}

function togglePodium() {
  hub.controls.podium = document.getElementById("control-podium").checked;
  updateStylePreview();
  renderExportSurface();
}

function selectPreviewSize(key) {
  hub.previewSize = key;
  hub.printSize = key;
  const preset = PREVIEW_SIZES[key];
  const surface = document.getElementById("preview-surface-inner");
  if (surface) surface.style.width = preset.width;
  document.querySelectorAll(".preview-size-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));

  const flagsInput = document.getElementById("control-flags");
  const logosInput = document.getElementById("control-logos");
  const isCompact = key === "compact";

  if (flagsInput) {
    flagsInput.disabled = isCompact;
    if (isCompact) flagsInput.checked = false;
    else flagsInput.checked = true;
  }
  if (logosInput) {
    logosInput.disabled = isCompact;
    if (isCompact) logosInput.checked = false;
    else logosInput.checked = true;
  }
  hub.controls.flags = !isCompact;
  hub.controls.logos = !isCompact;

  updateStylePreview();
  renderExportSurface();
}

function renderPreviewSizeControls() {
  const mount = document.getElementById("preview-size-controls");
  if (!mount) return;
  mount.innerHTML = ["full", "standard", "compact"].map(key => {
    const preset = PREVIEW_SIZES[key];
    return `
      <button class="preview-size-option${key === hub.previewSize ? ' selected' : ''}" data-key="${key}" onclick="selectPreviewSize('${key}')">
        ${preset.label}
      </button>`;
  }).join('');
}

/* Rows — independent of Size (Compact/Standard/Full); limits how
   many rows render, from Top 3 / Top 10 / the full list. Works the
   same way at any size, and is a no-op on single-row content like
   Next Race (slicing a 1-item array to 3 or 10 just returns the 1
   item, so no special-casing is needed there). */
const ROW_LIMIT_OPTIONS = [
  { key: "3",    label: "Top 3",    value: 3 },
  { key: "10",   label: "Top 10",   value: 10 },
  { key: "full", label: "Full list", value: null },
];

function selectRowLimit(key) {
  const option = ROW_LIMIT_OPTIONS.find(o => o.key === key);
  if (!option) return;
  hub.rowLimit = option.value;
  document.querySelectorAll(".row-limit-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  renderExportSurface();
}

function renderRowLimitControls() {
  const mount = document.getElementById("row-limit-controls");
  if (!mount) return;
  const activeKey = hub.rowLimit === 3 ? "3" : hub.rowLimit === 10 ? "10" : "full";
  mount.innerHTML = ROW_LIMIT_OPTIONS.map(o => `
    <button class="preview-size-option row-limit-option${o.key === activeKey ? ' selected' : ''}" data-key="${o.key}" onclick="selectRowLimit('${o.key}')">
      ${o.label}
    </button>`).join('');
}

function copyEmbedCode() {
  const text = document.getElementById("embed-code").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copy-btn");
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

function toggleCodeVisible() {
  const code = document.getElementById("embed-code");
  const btn = document.getElementById("toggle-code-btn");
  const hidden = code.classList.toggle("hidden");
  btn.textContent = hidden ? "Show code" : "Hide code";
}

/* ---------- Export (PDF via print, and PNG) ----------
 * Both reuse renderTableShell()/renderRows() from tables.js, and
 * mirror the current style state onto THIS page's own <html>
 * element the same way tables.js's applyThemeFromQueryParams()
 * does inside the embed iframe — so the export surface always
 * matches the live preview exactly, by construction, rather than
 * needing separate CSS kept manually in sync. */

function applyExportThemeAttributes() {
  const el = document.documentElement;
  el.setAttribute('data-dt-font', 'robotocondensed');
  el.setAttribute('data-dt-size', hub.printSize);

  if (hub.style.titleColor) el.style.setProperty('--dt-title-color', `#${hub.style.titleColor}`);
  else el.style.removeProperty('--dt-title-color');
  if (hub.style.posColor) el.style.setProperty('--dt-pos-color', `#${hub.style.posColor}`);
  else el.style.removeProperty('--dt-pos-color');
  if (hub.style.pointsColor) el.style.setProperty('--dt-points-color', `#${hub.style.pointsColor}`);
  else el.style.removeProperty('--dt-points-color');

  if (!hub.controls.flags) el.setAttribute('data-dt-flags', 'off'); else el.removeAttribute('data-dt-flags');
  if (!hub.controls.logos) el.setAttribute('data-dt-logos', 'off'); else el.removeAttribute('data-dt-logos');
  if (!hub.controls.rowBg) el.setAttribute('data-dt-rowbg', 'off'); else el.removeAttribute('data-dt-rowbg');
  if (!hub.controls.podium) el.setAttribute('data-dt-podium', 'off'); else el.removeAttribute('data-dt-podium');
}

function renderExportSurface() {
  const table = activeTable();
  if (!table) return;

  applyExportThemeAttributes();

  const preset = SIZE_PRESETS[hub.printSize];
  const activeColumns = preset.columns
    ? table.adapter.columns.filter(c => preset.columns.includes(c.key))
    : table.adapter.columns;

  const surface = document.getElementById("print-surface");
  const config = { title: table.tableLabel || table.title, sportLogo: table.sportLogo };
  const tbody = renderTableShell(surface, config, activeColumns);
  const limitedRows = hub.rowLimit ? hub.rows.slice(0, hub.rowLimit) : hub.rows;
  renderRows(tbody, activeColumns, limitedRows);

  let pageStyle = document.getElementById('page-size-style');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'page-size-style';
    document.head.appendChild(pageStyle);
  }

  // #print-surface is display:none outside of @media print, so its
  // scrollHeight reads as 0 unless we briefly force it visible
  // (off-screen, so nothing flashes) to measure the real rendered
  // height at the actual print width. This was the root cause of a
  // one-row-per-page pagination bug — the calculated page height was
  // effectively zero, forcing a page break after nearly every row.
  surface.style.display = 'block';
  surface.style.position = 'fixed';
  surface.style.left = '-9999px';
  surface.style.top = '0';
  surface.style.width = `${preset.widthCm}cm`;

  const contentHeightCm = (surface.scrollHeight / 96 * 2.54) + 1;
  pageStyle.textContent = `@page { size: ${preset.widthCm}cm ${contentHeightCm}cm; margin: 0; }`;

  surface.style.display = '';
  surface.style.position = '';
  surface.style.left = '';
  surface.style.top = '';
  surface.style.width = '';
}

function downloadPdf() {
  renderExportSurface();
  window.print();
}

function downloadPng() {
  const table = activeTable();
  if (!table || typeof html2canvas === 'undefined') return;

  renderExportSurface();
  const surface = document.getElementById("print-surface");

  // Give the raster capture a real, generous width rather than the
  // paper-constrained cm width used for PDF — there's no "page" to
  // fit onto for a flat image, and overflow-x:auto (fine for an
  // interactive iframe) makes no sense once flattened to a PNG.
  const widthPx = hub.printSize === 'full' ? '1100px' : PREVIEW_SIZES[hub.printSize].width;
  surface.style.width = widthPx;
  surface.style.display = 'block';
  surface.style.position = 'fixed';
  surface.style.left = '-9999px';
  surface.style.top = '0';
  const scrollEl = surface.querySelector('.dt-table-scroll');
  if (scrollEl) scrollEl.style.overflow = 'visible';

  html2canvas(surface, { backgroundColor: '#ffffff', scale: 2 }).then(canvas => {
    surface.style.display = 'none';
    surface.style.position = '';
    surface.style.left = '';
    surface.style.top = '';
    surface.style.width = '';

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${table.key}-${hub.printSize}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  });
}

/* ---------- Switching / loading the active table ---------- */

function refreshActiveTable() {
  const table = activeTable();
  const heroLogo = table.sportLogo ? `<img class="hero-logo" src="${table.sportLogo}" alt="">` : '';
  document.getElementById("page-title").innerHTML = `${heroLogo}<span class="hero-title-text">${table.tableLabel || table.title}</span>`;
  document.title = `${table.title} — Live sports data tables`;
  updateStylePreview();

  hub.rows = [];
  document.getElementById("print-surface").innerHTML = `<p style="padding:1rem;">Loading…</p>`;

  fetch(table.sourceUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      hub.rows = table.adapter.extract(data) || [];
      renderExportSurface();
    })
    .catch(err => {
      document.getElementById("print-surface").innerHTML = `<p style="padding:1rem;">Failed to load: ${err.message}</p>`;
    });
}

function initSportHub(config) {
  hub.tables = config.tables;
  hub.activeKey = config.tables[0].key;

  renderTableTabs();
  renderTitleColourButtons();
  renderPosPointsColourButtons();
  renderPreviewSizeControls();
  renderRowLimitControls();
  refreshActiveTable();

  const controlFlags = document.getElementById("control-flags");
  if (controlFlags) controlFlags.addEventListener("change", toggleFlags);
  const controlLogos = document.getElementById("control-logos");
  if (controlLogos) controlLogos.addEventListener("change", toggleLogos);
  const controlRowBg = document.getElementById("control-rowbg");
  if (controlRowBg) controlRowBg.addEventListener("change", toggleRowBg);
  const controlPodium = document.getElementById("control-podium");
  if (controlPodium) controlPodium.addEventListener("change", togglePodium);
  document.getElementById("copy-btn").addEventListener("click", copyEmbedCode);
  document.getElementById("toggle-code-btn").addEventListener("click", toggleCodeVisible);
  document.getElementById("download-btn").addEventListener("click", downloadPdf);
  const downloadPngBtn = document.getElementById("download-png-btn");
  if (downloadPngBtn) downloadPngBtn.addEventListener("click", downloadPng);
}
