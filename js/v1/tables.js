/**
 * Shared table engine — v1
 *
 * Every embed page includes this, then calls initTable(config).
 * This file owns: theme params, fetching, rendering, auto-refresh,
 * error states, and reporting height to the parent page (iframe-resizer).
 *
 * config = {
 *   containerSelector: "#dt-app",   // where to mount
 *   title: "Driver Standings",      // does NOT include the sport name — see sportLogo
 *   sportLogo: "https://...",       // optional — shown inline before the title text
 *   sourceUrl: "https://...",       // your own cached API, not the raw upstream
 *   refreshSeconds: 30,             // 0/undefined = no auto refresh
 *   adapter: {
 *     extract(data) -> array of rows,
 *     columns: [{ label, get(row), numeric?, emphasis?, logo?(row),
 *                 compactGet?, shortenAt? }]
 *              // logo(row) is optional — return an image URL and it
 *              // renders as a small icon before the cell's text.
 *              // shortenAt: array of size names ('compact','standard')
 *              // at which compactGet should be used instead of get().
 *              // Defaults to ['compact'] if omitted.
 *   },
 *   attribution: { label: "Data: Jolpica F1", href: "https://..." }
 * }
 */

function applyThemeFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const accent = params.get('accent');           // hex without '#' — still supported, rarely used now that Title/Position/Points colour cover most cases
  const bg = params.get('bg');                   // hex without '#' — custom background override
  const flags = params.get('flags');             // 'off' hides flag icons; default shown
  const logos = params.get('logos');             // 'off' hides team logo icons; default shown
  const titleColor = params.get('titleColor');   // hex without '#' — overrides the .dt-title colour
  const posColor = params.get('posColor');       // hex without '#' — overrides the Pos-column number colour
  const pointsColor = params.get('pointsColor'); // hex without '#' — overrides the PTS-column colour
  const rowbg = params.get('rowbg');             // 'off' removes the grey row background (and, via the shared fallback, the podium tint too)
  const rowLimit = params.get('rows');           // '3' | '10' — limits how many rows render; absent/anything else = full list
  const podium = params.get('podium');           // 'on' shows the gold/silver/bronze top-3 highlight (default off), independent of rowbg
  const rule = params.get('rule');                // 'off' removes the thin grey divider line between rows (default on), independent of rowbg/podium

  // The site's one canonical table style (Roboto Condensed, black
  // header, bold identity column, etc.) is now always applied — no
  // longer conditional on a ?font= param, since Basic/Custom were
  // removed and this is the only look anymore.
  document.documentElement.setAttribute('data-dt-font', 'robotocondensed');

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
  if (titleColor && /^[0-9a-fA-F]{6}$/.test(titleColor)) {
    document.documentElement.style.setProperty('--dt-title-color', `#${titleColor}`);
  }
  if (posColor && /^[0-9a-fA-F]{6}$/.test(posColor)) {
    document.documentElement.style.setProperty('--dt-pos-color', `#${posColor}`);
  }
  if (pointsColor && /^[0-9a-fA-F]{6}$/.test(pointsColor)) {
    document.documentElement.style.setProperty('--dt-points-color', `#${pointsColor}`);
  }
  if (rowbg === 'off') {
    document.documentElement.setAttribute('data-dt-rowbg', 'off');
  }
  if (podium === 'on') {
    document.documentElement.setAttribute('data-dt-podium', 'on');
  }
  if (rule === 'off') {
    document.documentElement.setAttribute('data-dt-rule', 'off');
  }
  const size = params.get('size');        // 'compact' | 'standard' — switches to compactGet where a column opts in via shortenAt
  if (size) {
    document.documentElement.setAttribute('data-dt-size', size);
  }
  return { cols: params.get('cols'), rowLimit: rowLimit ? parseInt(rowLimit, 10) : null };
}

function renderRows(container, columns, rows) {
  const colspan = columns.length;
  if (!rows || !rows.length) {
    container.innerHTML = `<tr><td colspan="${colspan}">No data available.</td></tr>`;
    return;
  }
  const size = document.documentElement.getAttribute('data-dt-size') || 'full';
  const isCompact = size === 'compact';
  container.innerHTML = rows.map(row => {
    const cells = columns.map(col => {
      const classes = [col.numeric ? 'numeric' : '', col.emphasis ? 'dt-emphasis' : ''].filter(Boolean).join(' ');
      const cls = classes ? ` class="${classes}"` : '';
      const logoUrl = col.logo ? col.logo(row) : null;
      const logoHtml = logoUrl ? `<img class="dt-logo" src="${logoUrl}" alt="" width="18" height="18">` : '';
      const flagUrl = col.flag ? col.flag(row) : null;
      const flagHtml = flagUrl ? `<img class="dt-flag" src="${flagUrl}" alt="" width="20" height="14">` : '';
      const shortenAt = col.shortenAt || ['compact'];
      const shouldShorten = col.compactGet && shortenAt.includes(size);
      const text = shouldShorten ? col.compactGet(row) : col.get(row);
      return `<td${cls} data-col="${col.key}">${flagHtml}${logoHtml}${text}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}

/**
 * Builds the title/header/table skeleton and returns the empty
 * tbody, ready for renderRows() to fill in. Shared by initTable()
 * (live embed, fetches its own data) and sport-hub.js's export path
 * (already has the data in `hub.rows`) — this is what guarantees
 * PDF/PNG export always matches the live preview's actual markup,
 * rather than maintaining a second, separately-styled copy that can
 * drift out of sync.
 *
 * The .dt-updated span in the footer shows when THIS WIDGET last
 * successfully fetched fresh data — not when the source API itself
 * last refreshed its underlying data, since neither Jolpica (F1) nor
 * ESPN (EPL) expose a genuine data-freshness timestamp in their
 * responses. This is the closest honest proxy available.
 */
function renderTableShell(root, config, activeColumns) {
  const isCompactHeader = document.documentElement.getAttribute('data-dt-size') === 'compact';
  const logoHtml = config.sportLogo ? `<img class="dt-title-logo" src="${config.sportLogo}" alt="">` : '';
  root.innerHTML = `
    <div class="dt-widget">
      <div class="dt-header">
        <p class="dt-title">${logoHtml}<span class="dt-title-text">${config.title}</span></p>
      </div>
      <div class="dt-table-scroll">
        <table class="data-table">
          <thead><tr>${activeColumns.map(c =>
            `<th${c.numeric ? ' class="numeric"' : ''} data-col="${c.key}">${(isCompactHeader && c.compactLabel) ? c.compactLabel : c.label}</th>`).join('')}</tr></thead>
          <tbody>
            <tr><td colspan="${activeColumns.length}">Loading…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="dt-footer"><span class="dt-updated"></span>Source: KIKA MEDIA</div>
    </div>
  `;
  return root.querySelector('tbody');
}

function initTable(config) {
  const { cols: colsParam, rowLimit } = applyThemeFromQueryParams();
  const activeColumns = colsParam
    ? config.adapter.columns.filter(c => colsParam.split(',').includes(c.key))
    : config.adapter.columns;

  const root = document.querySelector(config.containerSelector);
  const tbody = renderTableShell(root, config, activeColumns);
  const colspan = activeColumns.length;

  function load() {
    fetch(config.sourceUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const rows = config.adapter.extract(data);
        const limitedRows = rowLimit ? rows.slice(0, rowLimit) : rows;
        renderRows(tbody, activeColumns, limitedRows);
        const updatedEl = root.querySelector('.dt-updated');
        if (updatedEl) {
          const now = new Date();
          updatedEl.textContent = 'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — ';
        }
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
