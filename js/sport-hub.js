/**
 * Sport hub page — one page per sport, with a tab bar across the top
 * to switch between that sport's tables (Standings, Results, etc).
 * Everything below (Style & Theme panel, live preview, embed code,
 * print export) is shared and just re-renders for whichever table
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
 */

/**
 * Palette used by the Title colour and Position & Points colour
 * pickers. Previously also drove a Basic/Dynamic/Custom style
 * switcher — that tier system was removed since the site now ships
 * one canonical table style always, so this is just a colour list
 * now, nothing more.
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
 * Every new sport's adapter should be built to work with these same
 * three tiers, so the whole site stays consistent:
 *
 *   compact  — exactly 3 fields: Pos/Rank, primary name, Points.
 *              No secondary/affiliation columns (e.g. team on a
 *              driver table), no logos-as-separate-column, no extra
 *              stats. If a table's own identity IS the "team" (e.g.
 *              Constructor Standings), that name stays — it's not
 *              secondary there, it's the row's whole identity.
 *   standard — a fuller view, most columns, still readable narrow.
 *   full     — everything the table has.
 *
 * When adding a new sport, give each table's columns stable `key`s
 * and list which ones belong in each tier below.
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

/* ---------- Independent Title / Position & Points colour pickers ----------
 * Position and Points used to be two separate pickers — merged into
 * one, since they were commonly set together anyway. One click now
 * sets both --dt-pos-color and --dt-points-color to the same value.
 * Falls back sensibly (via CSS var() chains in tables.css) whenever
 * left unset. */

function applyTitleColour(key) {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset) return;
  hub.style.titleColor = preset.accent;
  document.querySelectorAll(".title-colour-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  renderPrintSurface();
}

function applyPosPointsColour(key) {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset) return;
  hub.style.posColor = preset.accent;
  hub.style.pointsColor = preset.accent;
  document.querySelectorAll(".pospoints-colour-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  renderPrintSurface();
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
  renderPrintSurface();
}

function toggleLogos() {
  hub.controls.logos = document.getElementById("control-logos").checked;
  updateStylePreview();
  renderPrintSurface();
}

/* Row background / Top 3 highlight — live embed only for now (the
   PDF/print surface doesn't have row-background styling at all
   currently, so there's nothing there to toggle yet). */
function toggleRowBg() {
  hub.controls.rowBg = document.getElementById("control-rowbg").checked;
  updateStylePreview();
}

function togglePodium() {
  hub.controls.podium = document.getElementById("control-podium").checked;
  updateStylePreview();
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
  renderPrintSurface();
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

/* ---------- Print size picker + hidden print-only render ---------- */

function renderPrintSurface() {
  const preset = SIZE_PRESETS[hub.printSize];
  const table = activeTable();
  if (!table) return;
  const isCompact = hub.printSize === "compact";

  const activeColumns = preset.columns
    ? table.adapter.columns.filter(c => preset.columns.includes(c.key))
    : table.adapter.columns;

  const cellValue = (col, row) => (isCompact && col.compactGet) ? col.compactGet(row) : col.get(row);

  const rowsHtml = hub.rows.length
    ? hub.rows.map(row => {
        const cells = activeColumns.map(col => {
          const cls = col.numeric ? ' class="numeric"' : '';
          const logoUrl = (hub.controls.logos && col.logo) ? col.logo(row) : null;
          const logoHtml = logoUrl ? `<img class="export-logo" src="${logoUrl}" alt="" width="16" height="16">` : '';
          const flagUrl = (hub.controls.flags && col.flag) ? col.flag(row) : null;
          const flagHtml = flagUrl ? `<img class="export-flag" src="${flagUrl}" alt="" width="18" height="13">` : '';
          return `<td${cls} data-col="${col.key}">${flagHtml}${logoHtml}${cellValue(col, row)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('')
    : `<tr><td colspan="${activeColumns.length}">No data available.</td></tr>`;

  const surface = document.getElementById("print-surface");
  surface.innerHTML = `
    <div class="export-header">
      <h1>${table.title}</h1>
    </div>
    <table class="export-table">
      <thead><tr>${activeColumns.map(c =>
        `<th${c.numeric ? ' class="numeric"' : ''} data-col="${c.key}">${(isCompact && c.compactLabel) ? c.compactLabel : c.label}</th>`).join('')}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="export-footer">Source: KIKA MEDIA</div>
  `;

  surface.style.width = `${preset.widthCm}cm`;
  surface.style.fontFamily = "'Roboto Condensed', sans-serif";

  const heading = surface.querySelector('.export-header h1');
  if (heading) {
    heading.style.color = hub.style.titleColor ? `#${hub.style.titleColor}` : '';
  }
  if (hub.style.pointsColor) {
    surface.querySelectorAll('td[data-col="points"]').forEach(el => {
      el.style.color = `#${hub.style.pointsColor}`;
    });
  }

  let pageStyle = document.getElementById('page-size-style');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'page-size-style';
    document.head.appendChild(pageStyle);
  }
  pageStyle.textContent = `@page { size: ${preset.widthCm}cm 40cm; margin: 0; }`;
}

function selectSize(key) {
  hub.printSize = key;
  document.querySelectorAll('.size-option').forEach(el =>
    el.classList.toggle('selected', el.dataset.key === key));
  renderPrintSurface();
}

function renderSizeControls() {
  const mount = document.getElementById("size-controls");
  if (!mount) return;
  mount.innerHTML = Object.entries(SIZE_PRESETS).map(([key, preset]) => `
    <button class="size-option${key === hub.printSize ? ' selected' : ''}" data-key="${key}" onclick="selectSize('${key}')">
      ${preset.label}<br><span class="size-dim">${preset.widthCm}cm wide</span>
    </button>
  `).join('');
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
      renderPrintSurface();
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
  renderSizeControls();
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
  document.getElementById("download-btn").addEventListener("click", () => window.print());
}
