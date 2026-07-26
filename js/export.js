/**
 * Renders a print-ready table for export pages.
 * Not related to the embed engine (js/v1/tables.js) — this is a
 * one-shot static render meant for "Save as PDF", not a live iframe.
 */

/**
 * Size presets for newspaper production.
 * widthCm: physical width the table renders at, matching a typical
 *          column measure — also becomes the @page width for the PDF.
 * maxRows: how many rows to show at that size (null = show all).
 * Adjust these to match your actual publication's column grid.
 */
const SIZE_PRESETS = {
  compact:  { label: "Compact (1 col)",  widthCm: 8,  maxRows: 8 },
  standard: { label: "Standard (2 col)", widthCm: 12, maxRows: 15 },
  full:     { label: "Full width",       widthCm: 18, maxRows: null },
};

let exportState = { rows: [], config: null, size: "standard" };

function renderExportTable() {
  const { rows, config, size } = exportState;
  const preset = SIZE_PRESETS[size];
  const tbody = document.getElementById('export-body');
  const colspan = config.adapter.columns.length;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colspan}">No data available.</td></tr>`;
    return;
  }

  const visibleRows = preset.maxRows ? rows.slice(0, preset.maxRows) : rows;
  tbody.innerHTML = visibleRows.map(row => {
    const cells = config.adapter.columns.map(col => {
      const cls = col.numeric ? ' class="numeric"' : '';
      return `<td${cls}>${col.get(row)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  if (preset.maxRows && rows.length > preset.maxRows) {
    document.getElementById('export-truncated').textContent =
      `Showing top ${preset.maxRows} of ${rows.length}`;
  } else {
    document.getElementById('export-truncated').textContent = '';
  }

  // Physical width on screen, and as the actual PDF page width
  document.getElementById('print-surface').style.width = `${preset.widthCm}cm`;
  let pageStyle = document.getElementById('page-size-style');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'page-size-style';
    document.head.appendChild(pageStyle);
  }
  // Height is generous/fixed since content height varies with font
  // rendering; trim any extra white space in your layout tool after export.
  pageStyle.textContent = `@page { size: ${preset.widthCm}cm 40cm; margin: 0; }`;
}

function selectSize(key) {
  exportState.size = key;
  document.querySelectorAll('.size-option').forEach(el =>
    el.classList.toggle('selected', el.dataset.key === key)
  );
  renderExportTable();
}

function renderSizeControls() {
  const mount = document.getElementById('size-controls');
  mount.innerHTML = Object.entries(SIZE_PRESETS).map(([key, preset]) => `
    <button class="size-option${key === exportState.size ? ' selected' : ''}" data-key="${key}" onclick="selectSize('${key}')">
      ${preset.label}<br><span class="size-dim">${preset.widthCm}cm wide</span>
    </button>
  `).join('');
}

function initExportTable(config) {
  exportState.config = config;
  const root = document.getElementById('export-app');
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString();

  root.innerHTML = `
    <div class="export-actions">
      <div class="size-label">Size for print:</div>
      <div id="size-controls" class="size-controls"></div>
      <button id="download-btn" onclick="window.print()">Download PDF</button>
    </div>
    <div id="print-surface">
      <div class="export-header">
        <h1>${config.title}</h1>
        <div class="export-meta">${dateStr}<br>${timeStr}</div>
      </div>
      <table class="export-table">
        <thead><tr>${config.adapter.columns.map(c =>
          `<th${c.numeric ? ' class="numeric"' : ''}>${c.label}</th>`).join('')}</tr></thead>
        <tbody id="export-body">
          <tr><td colspan="${config.adapter.columns.length}">Loading…</td></tr>
        </tbody>
      </table>
      <div id="export-truncated" class="export-truncated"></div>
      ${config.attribution ? `
      <div class="export-footer">
        Data: ${config.attribution.label} · Generated ${dateStr}, ${timeStr}
      </div>` : ''}
    </div>
  `;

  renderSizeControls();

  fetch(config.sourceUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      exportState.rows = config.adapter.extract(data) || [];
      renderExportTable();
    })
    .catch(err => {
      const colspan = config.adapter.columns.length;
      document.getElementById('export-body').innerHTML =
        `<tr><td colspan="${colspan}">Failed to load: ${err.message}</td></tr>`;
    });
}

