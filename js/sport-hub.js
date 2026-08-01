/**
 * Sport hub page — one page per sport, with a tab bar across the top
 * to switch between that sport's tables (Standings, Results, etc).
 * Everything below (style tabs, live preview, embed code, print
 * export) is shared and just re-renders for whichever table is active.
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

const STYLE_PRESETS = [
  { key: "red",   label: "Red",   theme: null, accent: "C4151C", swatch: "#C4151C" },
  { key: "green", label: "Green", theme: null, accent: "004225", swatch: "#004225" },
  { key: "blue",  label: "Blue",  theme: null, accent: "0156B2", swatch: "#0156B2" },
];

const SIZE_PRESETS = {
  compact:  { label: "Compact (1 col)",  widthCm: 8,  maxRows: 8,
    columns: ["pos", "rank", "driver", "constructor", "team", "wins", "points", "pts"] },
  standard: { label: "Standard (2 col)", widthCm: 12, maxRows: 15,
    columns: ["pos", "rank", "driver", "constructor", "team", "nationality", "played", "laps", "time", "fastest", "points", "wins", "losses", "draws", "gd", "pct"] },
  full:     { label: "Full width",       widthCm: 18, maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "team", "nationality", "played", "laps", "time", "fastest", "points", "wins", "losses", "draws", "gd", "pct"] },
};

const PREVIEW_SIZES = {
  full:     { label: "Full width", width: "100%" },
  standard: { label: "Standard",   width: "480px" },
  compact:  { label: "Compact",    width: "320px" },
};

let hub = {
  tables: [],
  activeKey: null,
  style: { theme: null, accent: null },
  controls: { flags: true, logos: true },
  previewSize: "full",
  printSize: "standard",
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

/* ---------- Style tabs + live preview + embed code ---------- */

function buildEmbedUrl() {
  const table = activeTable();
  const params = new URLSearchParams();
  if (hub.style.theme) params.set("theme", hub.style.theme);
  if (hub.style.accent) params.set("accent", hub.style.accent);
  if (hub.style.bg) params.set("bg", hub.style.bg);
  if (!hub.controls.flags) params.set("flags", "off");
  if (!hub.controls.logos) params.set("logos", "off");
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

function selectTab(tab) {
  document.querySelectorAll(".tier-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tier-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`panel-${tab}`).classList.add("active");
  document.getElementById(`tab-${tab}`).classList.add("active");
}

function applyDefault() {
  hub.style = { theme: null, accent: null };
  document.querySelectorAll(".default-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === "classic"));
  updateStylePreview();
}

function applyReverse() {
  hub.style = { theme: "dark", accent: null };
  document.querySelectorAll(".default-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === "reverse"));
  updateStylePreview();
}

function applyPreset(key) {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset) return;
  hub.style = { theme: preset.theme, accent: preset.accent };
  document.querySelectorAll(".preset-swatch").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
}

function applyCustom() {
  const isDark = document.getElementById("custom-dark").checked;
  const color = document.getElementById("custom-color").value.replace("#", "");
  const bgPicker = document.getElementById("custom-bg");
  if (bgPicker) {
    bgPicker.closest(".custom-bg-row").style.display = isDark ? "flex" : "none";
  }
  const bg = (isDark && bgPicker) ? bgPicker.value.replace("#", "") : null;
  hub.style = { theme: isDark ? "dark" : null, accent: color, bg: bg };
  updateStylePreview();
}

function toggleFlags() {
  hub.controls.flags = document.getElementById("control-flags").checked;
  updateStylePreview();
}

function toggleLogos() {
  hub.controls.logos = document.getElementById("control-logos").checked;
  updateStylePreview();
}

function selectPreviewSize(key) {
  hub.previewSize = key;
  const preset = PREVIEW_SIZES[key];
  const surface = document.getElementById("preview-surface-inner");
  if (surface) surface.style.width = preset.width;
  document.querySelectorAll(".preview-size-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  if (window.iFrameResize) {
    setTimeout(() => iFrameResize({ checkOrigin: false }, '#preview-frame'), 50);
  }
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

function renderPresetSwatches() {
  const mount = document.getElementById("preset-swatches");
  if (!mount) return;
  mount.innerHTML = STYLE_PRESETS.map(p => `
    <button class="preset-swatch" data-key="${p.key}" style="--swatch-color:${p.swatch}" onclick="applyPreset('${p.key}')">
      <span class="swatch-dot"></span><span>${p.label}</span>
    </button>
  `).join("");
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
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString();
  const visibleRows = preset.maxRows ? hub.rows.slice(0, preset.maxRows) : hub.rows;
  const isCompact = hub.printSize === "compact";

  const activeColumns = preset.columns
    ? table.adapter.columns.filter(c => preset.columns.includes(c.key))
    : table.adapter.columns;

  const cellValue = (col, row) => (isCompact && col.compactGet) ? col.compactGet(row) : col.get(row);

  const rowsHtml = visibleRows.length
    ? visibleRows.map(row => {
        const cells = activeColumns.map(col => {
          const cls = col.numeric ? ' class="numeric"' : '';
          return `<td${cls}>${cellValue(col, row)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('')
    : `<tr><td colspan="${activeColumns.length}">No data available.</td></tr>`;

  document.getElementById("print-surface").innerHTML = `
    <div class="export-header">
      <h1>${table.title}</h1>
      <div class="export-meta">${dateStr}<br>${timeStr}</div>
    </div>
    <table class="export-table">
      <thead><tr>${activeColumns.map(c =>
        `<th${c.numeric ? ' class="numeric"' : ''}>${c.label}</th>`).join('')}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${preset.maxRows && hub.rows.length > preset.maxRows
      ? `<div class="export-truncated">Showing top ${preset.maxRows} of ${hub.rows.length}</div>` : ''}
    ${table.attribution ? `<div class="export-footer">Data: ${table.attribution.label} · Generated ${dateStr}, ${timeStr}</div>` : ''}
  `;

  document.getElementById("print-surface").style.width = `${preset.widthCm}cm`;

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
  document.getElementById("page-title").textContent = table.title;
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
  renderPresetSwatches();
  renderPreviewSizeControls();
  renderSizeControls();
  applyDefault();
  refreshActiveTable();

  document.getElementById("custom-dark").addEventListener("change", applyCustom);
  document.getElementById("custom-color").addEventListener("input", applyCustom);
  const customBg = document.getElementById("custom-bg");
  if (customBg) customBg.addEventListener("input", applyCustom);
  const controlFlags = document.getElementById("control-flags");
  if (controlFlags) controlFlags.addEventListener("change", toggleFlags);
  const controlLogos = document.getElementById("control-logos");
  if (controlLogos) controlLogos.addEventListener("change", toggleLogos);
  document.getElementById("copy-btn").addEventListener("click", copyEmbedCode);
  document.getElementById("toggle-code-btn").addEventListener("click", toggleCodeVisible);
  document.getElementById("download-btn").addEventListener("click", () => window.print());
}
