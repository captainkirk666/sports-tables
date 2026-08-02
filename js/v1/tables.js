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
 *     columns: [{ label, get(row), numeric?, emphasis?, logo?(row) }]
 *              // logo(row) is optional — return an image URL and it
 *              // renders as a small icon before the cell's text.
 *   },
 *   attribution: { label: "Data: Jolpica F1", href: "https://..." }
 * }
 */

function applyThemeFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');       // 'light' | 'dark'
  const accent = params.get('accent');     // hex without '#', e.g. '1d9e75'
  const bg = params.get('bg');             // hex without '#' — custom background override
  const flags = params.get('flags');       // 'off' hides flag icons; default shown
  const logos = params.get('logos');       // 'off' hides team logo icons; default shown
  const font = params.get('font');         // e.g. 'oswald' — Dynamic-tier font, see tables.css

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-dt-theme', 'dark');
  }
  if (accent && /^[0-9a-fA-F]{6}$/.test(accent)) {
    document.documentElement.style.setProperty('--dt-accent', `#${accent}`);
  }
  if (bg && /^[0-9a-fA-F]{6}$/.test(bg)) {
    document.documentElement.style.setProperty('--dt-bg', `#${bg}`);
    document.documentElement.style.setProperty('--dt-header-bg', `#${bg}`);
  }
  if (flags === 'off') {
    document.documentElement.setAttribute('data-dt-flags', 'off');
  }
  if (logos === 'off') {
    document.documentElement.setAttribute('data-dt-logos', 'off');
  }
  if (font) {
    document.documentElement.setAttribute('data-dt-font', font);
  }
  const size = params.get('size');        // 'compact' switches to compactGet where available
  if (size) {
    document.documentElement.setAttribute('data-dt-size', size);
  }
  return params.get('cols');               // comma-separated column keys to show, or null for all
}

function renderRows(container, columns, rows) {
  const colspan = columns.length;
  if (!rows || !rows.length) {
    container.innerHTML = `<tr><td colspan="${colspan}">No data available.</td></tr>`;
    return;
  }
  const isCompact = document.documentElement.getAttribute('data-dt-size') === 'compact';
  container.innerHTML = rows.map(row => {
    const cells = columns.map(col => {
      const classes = [col.numeric ? 'numeric' : '', col.emphasis ? 'dt-emphasis' : ''].filter(Boolean).join(' ');
      const cls = classes ? ` class="${classes}"` : '';
      const logoUrl = col.logo ? col.logo(row) : null;
      const logoHtml = logoUrl ? `<img class="dt-logo" src="${logoUrl}" alt="">` : '';
      const flagUrl = col.flag ? col.flag(row) : null;
      const flagHtml = flagUrl ? `<img class="dt-flag" src="${flagUrl}" alt="">` : '';
      const text = (isCompact && col.compactGet) ? col.compactGet(row) : col.get(row);
      return `<td${cls}>${flagHtml}${logoHtml}${text}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}

function initTable(config) {
  const colsParam = applyThemeFromQueryParams();
  const activeColumns = colsParam
    ? config.adapter.columns.filter(c => colsParam.split(',').includes(c.key))
    : config.adapter.columns;

  const isCompactHeader = document.documentElement.getAttribute('data-dt-size') === 'compact';
  const root = document.querySelector(config.containerSelector);
  root.innerHTML = `
    <div class="dt-widget">
      <div class="dt-header">
        <p class="dt-title">${config.title}</p>
      </div>
      <div class="dt-table-scroll">
        <table class="data-table">
          <thead><tr>${activeColumns.map(c =>
            `<th${c.numeric ? ' class="numeric"' : ''}>${(isCompactHeader && c.compactLabel) ? c.compactLabel : c.label}</th>`).join('')}</tr></thead>
          <tbody id="dt-body">
            <tr><td colspan="${activeColumns.length}">Loading…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="dt-footer">Source: KIKA MEDIA</div>
    </div>
  `;

  const tbody = document.getElementById('dt-body');
  const colspan = activeColumns.length;

  function load() {
    fetch(config.sourceUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const rows = config.adapter.extract(data);
        renderRows(tbody, activeColumns, rows);
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
