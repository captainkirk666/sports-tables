/**
 * Shared table engine — v1
 *
 * Every embed page includes this, then calls initTable(config).
 * This file owns: theme params, fetching, rendering, auto-refresh,
 * error states, and reporting height to the parent page (iframe-resizer).
 *
 * config = {
 *   containerSelector: "#dt-app",   // where to mount
 *   title: "F1 driver standings",
 *   sourceUrl: "https://...",       // your own cached API, not the raw upstream
 *   refreshSeconds: 30,             // 0/undefined = no auto refresh
 *   adapter: {
 *     extract(data) -> array of rows,
 *     columns: [{ label, get(row), numeric?, emphasis? }]
 *   },
 *   attribution: { label: "Data: Jolpica F1", href: "https://..." }
 * }
 */

function applyThemeFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');       // 'light' | 'dark'
  const accent = params.get('accent');     // hex without '#', e.g. '1d9e75'

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-dt-theme', 'dark');
  }
  if (accent && /^[0-9a-fA-F]{6}$/.test(accent)) {
    document.documentElement.style.setProperty('--dt-accent', `#${accent}`);
  }
}

function renderRows(container, columns, rows) {
  const colspan = columns.length;
  if (!rows || !rows.length) {
    container.innerHTML = `<tr><td colspan="${colspan}">No data available.</td></tr>`;
    return;
  }
  container.innerHTML = rows.map(row => {
    const cells = columns.map(col => {
      const classes = [col.numeric ? 'numeric' : '', col.emphasis ? 'dt-emphasis' : ''].filter(Boolean).join(' ');
      const cls = classes ? ` class="${classes}"` : '';
      return `<td${cls}>${col.get(row)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}

function initTable(config) {
  applyThemeFromQueryParams();

  const root = document.querySelector(config.containerSelector);
  root.innerHTML = `
    <div class="dt-widget">
      <div class="dt-header">
        <p class="dt-title">${config.title}</p>
        <span class="dt-updated" id="dt-updated"></span>
      </div>
      <table class="data-table">
        <thead><tr>${config.adapter.columns.map(c =>
          `<th${c.numeric ? ' class="numeric"' : ''}>${c.label}</th>`).join('')}</tr></thead>
        <tbody id="dt-body">
          <tr><td colspan="${config.adapter.columns.length}">Loading…</td></tr>
        </tbody>
      </table>
      ${config.attribution ? `
      <div class="dt-footer">
        <a href="${config.attribution.href}" target="_blank" rel="noopener">${config.attribution.label}</a>
      </div>` : ''}
    </div>
  `;

  const tbody = document.getElementById('dt-body');
  const updatedEl = document.getElementById('dt-updated');
  const colspan = config.adapter.columns.length;

  function load() {
    fetch(config.sourceUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const rows = config.adapter.extract(data);
        renderRows(tbody, config.adapter.columns, rows);
        updatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
      })
      .catch(err => {
        tbody.innerHTML = `<tr><td colspan="${colspan}">Failed to load: ${err.message}</td></tr>`;
      });
  }

  load();
  if (config.refreshSeconds) {
    setInterval(load, config.refreshSeconds * 1000);
  }
}
