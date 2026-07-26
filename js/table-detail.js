/**
 * Table detail page — combines styling (from style-picker.js) and
 * print export (from export.js) into one page per table.
 *
 * Usage: initTableDetail({
 *   title, embedHref, sourceUrl, adapter, attribution
 * });
 */

const STYLE_PRESETS = [
  { key: "red",   label: "Red",   theme: null, accent: "C4151C", swatch: "#C4151C" },
  { key: "green", label: "Green", theme: null, accent: "004225", swatch: "#004225" },
  { key: "blue",  label: "Blue",  theme: null, accent: "0156B2", swatch: "#0156B2" },
];

const SIZE_PRESETS = {
  compact:  { label: "Compact (1 col)",  widthCm: 8,  maxRows: 8,    columns: ["pos", "driver", "constructor", "team", "points"] },
  standard: { label: "Standard (2 col)", widthCm: 12, maxRows: 15,   columns: ["pos", "driver", "constructor", "team", "nationality", "points", "wins"] },
  full:     { label: "Full width",       widthCm: 18, maxRows: null, columns: ["pos", "driver", "constructor", "team", "nationality", "points", "wins"] },
};

let td = {
  config: null,
  style: { theme: null, accent: null },
  printSize: "standard",
  rows: [],
};

/* ---------- Style tabs + live preview + embed code ---------- */

function buildEmbedUrl() {
  const params = new URLSearchParams();
  if (td.style.theme) params.set("theme", td.style.theme);
  if (td.style.accent) params.set("accent", td.style.accent);
  const qs = params.toString();
  return qs ? `${td.config.embedHref}?${qs}` : td.config.embedHref;
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
  td.style = { theme: null, accent: null };
  document.querySelectorAll(".default-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === "classic"));
  updateStylePreview();
}

function applyReverse() {
  td.style = { theme: "dark", accent: null };
  document.querySelectorAll(".default-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === "reverse"));
  updateStylePreview();
}

function applyPreset(key) {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset) return;
  td.style = { theme: preset.theme, accent: preset.accent };
  document.querySelectorAll(".preset-swatch").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
}

function applyCustom() {
  const isDark = document.getElementById("custom-dark").checked;
  const color = document.getElementById("custom-color").value.replace("#", "");
  td.style = { theme: isDark ? "dark" : null, accent: color };
  updateStylePreview();
}

function renderPresetSwatches() {
  const mount = document.getElementById("preset-swatches");
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
  const box = document.getElementById("embed-code");
  const btn = document.getElementById("toggle-code-btn");
  const isHidden = box.classList.toggle("hidden");
  btn.textContent = isHidden ? "Show code" : "Hide code";
}

/* ---------- Print size picker + hidden print-only render ---------- */

function renderPrintSurface() {
  const preset = SIZE_PRESETS[td.printSize];
  const config = td.config;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString();
  const visibleRows = preset.maxRows ? td.rows.slice(0, preset.maxRows) : td.rows;
  const isCompact = td.printSize === "compact";

  const activeColumns = preset.columns
    ? config.adapter.columns.filter(c => preset.columns.includes(c.key))
    : config.adapter.columns;

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
      <h1>${config.title}</h1>
      <div class="export-meta">${dateStr}<br>${timeStr}</div>
    </div>
    <table class="export-table">
      <thead><tr>${activeColumns.map(c =>
        `<th${c.numeric ? ' class="numeric"' : ''}>${c.label}</th>`).join('')}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${preset.maxRows && td.rows.length > preset.maxRows
      ? `<div class="export-truncated">Showing top ${preset.maxRows} of ${td.rows.length}</div>` : ''}
    ${config.attribution ? `<div class="export-footer">Data: ${config.attribution.label} · Generated ${dateStr}, ${timeStr}</div>` : ''}
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

function selectPrintSize(key) {
  td.printSize = key;
  document.querySelectorAll('.size-option').forEach(el =>
    el.classList.toggle('selected', el.dataset.key === key));
  renderPrintSurface();
}

function renderSizeControls() {
  const mount = document.getElementById("size-controls");
  mount.innerHTML = Object.entries(SIZE_PRESETS).map(([key, preset]) => `
    <button class="size-option${key === td.printSize ? ' selected' : ''}" data-key="${key}" onclick="selectPrintSize('${key}')">
      ${preset.label}<br><span class="size-dim">${preset.widthCm}cm wide</span>
    </button>
  `).join('');
}

/* ---------- Init ---------- */

function initTableDetail(config) {
  td.config = config;
  document.getElementById("page-title").textContent = config.title;
  document.title = `${config.title} — Live sports data tables`;

  renderPresetSwatches();
  renderSizeControls();
  applyDefault();
  renderPrintSurface();

  document.getElementById("custom-dark").addEventListener("change", applyCustom);
  document.getElementById("custom-color").addEventListener("input", applyCustom);
  document.getElementById("copy-btn").addEventListener("click", copyEmbedCode);
  document.getElementById("toggle-code-btn").addEventListener("click", toggleCodeVisible);
  document.getElementById("download-btn").addEventListener("click", () => window.print());

  fetch(config.sourceUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      td.rows = config.adapter.extract(data) || [];
      renderPrintSurface();
    })
    .catch(err => {
      document.getElementById("print-surface").innerHTML = `<p>Failed to load: ${err.message}</p>`;
    });
}
