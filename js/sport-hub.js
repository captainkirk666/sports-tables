/**
 * Sport hub page — one page per sport, with a tab bar across the top
 * to switch between that sport's tables (Standings, Results, etc).
 *
 * TEMPLATE ARCHITECTURE: this file generates the ENTIRE Style &
 * Theme panel and Live Preview panel — every heading, section, and
 * control — not just the swatch rows inside them. Each sport's hub
 * page (table/<sport>-dark.html) contains nothing but two empty
 * mount points:
 *
 *   <div class="panel" id="style-theme-panel"></div>
 *   <div class="panel" id="live-preview-panel"></div>
 *
 * This is deliberate: it's not enough for every sport's panel to
 * look the same (that's what hub.css guarantees) — it needs to BE
 * the same DOM, generated from one place, so it's structurally
 * impossible for a future sport's panel to quietly drift from this
 * one. If you ever want to add/remove/reorder a control, do it here
 * once — every sport picks it up.
 *
 * Usage — each sport's inline <script> just calls:
 *   initSportHub({
 *     sport: "F1",
 *     tables: [
 *       { key: "drivers", label: "Driver Standings", title: "F1 Driver Standings",
 *         tableLabel: "Driver Standings", sportLogo: "...",
 *         embedHref: "../embed/f1/drivers.html", sourceUrl: ..., adapter: ...,
 *         attribution: {...},
 *         // sizeColumns is per-TABLE (not a shared global whitelist)
 *         // deliberately — a global whitelist across every table in
 *         // every sport is exactly what caused a real bug earlier
 *         // (two different tables' columns sharing one key name,
 *         // "time", collided). Omit a size entirely (or omit
 *         // sizeColumns altogether) to show every column at that
 *         // size — that's the Full-width default.
 *         sizeColumns: { compact: ["pos","driver","points"], standard: [...] } },
 *       ...
 *     ]
 *     // cards: [...] is optional, same tab bar as tables — see
 *     // activeCard()/refreshActiveCard() below. A card can set
 *     // sizeRestricted: "full" or sizeRestricted: ["full","standard"]
 *     // to lock its tab to only those Size(s) and hide the rest, for
 *     // content that doesn't work at every width (e.g. a multi-row
 *     // weekend fixture list, which needs Full or Standard but not
 *     // Compact).
 *   });
 *
 * This file relies on renderTableShell()/renderRows() from
 * tables.js also being loaded on this page (see loader.js) — export
 * (PDF/PNG) builds the exact same .dt-widget markup the live embed
 * uses, driven by the same `hub` state, rather than maintaining a
 * second separately-styled copy that can drift out of sync.
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
 * STANDARD SIZE ARCHITECTURE — physical dimensions only, applies to
 * every sport identically. Which COLUMNS are visible at each size is
 * no longer decided here — that's each table's own `sizeColumns`
 * field in its config (see file header above). This keeps the
 * shared engine genuinely sport-agnostic: adding a new sport never
 * requires editing this file.
 */
const SIZE_PRESETS = {
  compact:  { label: "Compact (1 col)",  widthCm: 5 },
  standard: { label: "Standard (2 col)", widthCm: 10 },
  full:     { label: "Full width",       widthCm: 18 },
};

/** Which columns to show for a table at a given size. Returns null
 *  for "no restriction, show everything" — the default when a table
 *  doesn't define sizeColumns for that size (or at all). */
function columnsForSize(table, size) {
  if (size === 'full') return null;
  return (table.sizeColumns && table.sizeColumns[size]) || null;
}

let hub = {
  tables: [],
  cards: [],
  activeKey: null,
  activeType: "table", // "table" | "card"
  style: { titleColor: null, posColor: null, pointsColor: null },
  controls: { flags: false, logos: false, rowBg: true, podium: false, rule: true },
  /* Cards share the SAME UI (same checkboxes, same colour buttons —
     see renderStyleThemePanel()) but need their own state, since
     their sensible defaults are different from tables': logos
     default ON (crests are the whole point of a fixture card, unlike
     tables' small optional row icons), rowBg/rule default OFF
     (preserves the card's original plain-white look now that these
     are opt-in additions rather than part of the initial design).
     flags/podium are tracked here too even though they currently do
     nothing on cards — see cards.css, "in but unusable for now". */
  cardStyle: { titleColor: null, posColor: null, pointsColor: null },
  cardControls: { flags: false, logos: true, rowBg: false, podium: false, rule: false },
  /* The weekend fixture list is a genuine table-like list (many
     rows), not a single-event card — so unlike cardControls above,
     it defaults rowBg/rule BOTH on, same direction as tables. Kept
     as its own object rather than folded into cardControls, since
     that object is shared by every other card and changing ITS
     defaults would've silently changed the single Next Fixture
     card's look too. See currentControls() below for the dispatch. */
  weekendCardControls: { flags: false, logos: true, rowBg: true, rule: true, podium: false },
  previewSize: "full",
  printSize: "full",
  rowLimit: null,
  rows: [],
  cardData: null, // this tab's fetched+extracted card object — the card equivalent of hub.rows, needed now that PDF/PNG export renders cards on the hub page itself (see renderCardExportSurface())
  lastUpdated: null,
};

function activeTable() {
  return hub.tables.find(t => t.key === hub.activeKey);
}
function activeCard() {
  return hub.cards.find(c => c.key === hub.activeKey);
}
/* Which state object the Style & Theme panel's shared controls
   currently read from/write to — based on whichever tab is active,
   and for cards specifically, which CARD (not every card wants the
   same defaults — see weekendCardControls above). Every toggle/
   colour handler and buildEmbedUrl() goes through these rather than
   hub.controls/hub.style/hub.cardControls directly. */
function currentControls() {
  if (hub.activeType !== "card") return hub.controls;
  const card = activeCard();
  return (card && card.key === "weekend-fixtures") ? hub.weekendCardControls : hub.cardControls;
}
function currentStyle() {
  return hub.activeType === "card" ? hub.cardStyle : hub.style;
}

/* ---------- Panel generation — the template itself ----------
 * Every sport's hub page gets IDENTICAL markup here, not a
 * hand-copied version of it. */

function renderStyleThemePanel() {
  const mount = document.getElementById("style-theme-panel");
  if (!mount) return;
  mount.innerHTML = `
    <h2>Style &amp; Theme</h2>

    <div class="size-section" style="margin-top:0; padding-top:0; border-top:none;">
      <h3>Size</h3>
      <div id="preview-size-controls" class="preview-size-controls"></div>
    </div>

    <div class="size-section">
      <h3>Rows</h3>
      <div id="row-limit-controls" class="preview-size-controls"></div>
    </div>

    <div class="colour-section">
      <h3>Title colour</h3>
      <div id="title-colour-buttons" class="colour-buttons"></div>
    </div>

    <div class="colour-section">
      <h3>Secondary colour</h3>
      <div id="pospoints-colour-buttons" class="colour-buttons"></div>
    </div>

    <div class="controls-section">
      <h3>Controls</h3>
      <div class="control-row">
        <span>Row background</span>
        <label class="switch">
          <input type="checkbox" id="control-rowbg" checked>
          <span class="switch-track"></span>
        </label>
      </div>
      <div class="control-row" style="margin-top:0.75rem;">
        <span>Grey rule</span>
        <label class="switch">
          <input type="checkbox" id="control-rule" checked>
          <span class="switch-track"></span>
        </label>
      </div>
      <div class="control-row" style="margin-top:0.75rem;">
        <span>Top 3 highlight</span>
        <label class="switch">
          <input type="checkbox" id="control-podium">
          <span class="switch-track"></span>
        </label>
      </div>
      <div class="control-row" style="margin-top:0.75rem;">
        <span>Flags</span>
        <label class="switch">
          <input type="checkbox" id="control-flags">
          <span class="switch-track"></span>
        </label>
      </div>
      <div class="control-row" style="margin-top:0.75rem;">
        <span>Team logos</span>
        <label class="switch">
          <input type="checkbox" id="control-logos">
          <span class="switch-track"></span>
        </label>
      </div>
    </div>
  `;
}

function renderLivePreviewPanel() {
  const mount = document.getElementById("live-preview-panel");
  if (!mount) return;
  mount.innerHTML = `
    <div class="preview-header">
      <h2 id="live-preview-title">Live preview</h2>
      <div class="action-buttons">
        <button id="toggle-code-btn" class="action-btn">Get embed code</button>
        <button id="download-btn" class="action-btn">Download PDF</button>
        <button id="download-png-btn" class="action-btn">Download PNG</button>
        <button id="copy-btn" class="action-btn primary">Copy to clipboard</button>
      </div>
    </div>
    <div class="preview-surface">
      <div id="preview-surface-inner">
        <iframe id="preview-frame"></iframe>
      </div>
    </div>
    <code id="embed-code" class="hidden"></code>
  `;
}

/* ---------- Table (top) tabs ---------- */

function renderTableTabs() {
  const mount = document.getElementById("table-tabs");
  if (!mount) return;
  const tableTabs = hub.tables.map(t => tabButtonHtml(t.key, t.label, "table"));
  const cardTabs = hub.cards.map(c => tabButtonHtml(c.key, c.label, "card"));
  mount.innerHTML = tableTabs.concat(cardTabs).join("");
}
function tabButtonHtml(key, label, type) {
  const active = type === hub.activeType && key === hub.activeKey;
  return `
    <button class="table-tab${active ? ' active' : ''}" data-key="${key}" data-type="${type}" onclick="selectTab('${key}', '${type}')">
      ${label}
    </button>
  `;
}

function selectTab(key, type) {
  hub.activeKey = key;
  hub.activeType = type;
  document.querySelectorAll(".table-tab").forEach(el =>
    el.classList.toggle("active", el.dataset.key === key && el.dataset.type === type));
  if (type === "card") {
    refreshActiveCard();
  } else {
    refreshActiveTable();
  }
}

/* ---------- Live preview + embed code ---------- */

function buildEmbedUrl() {
  const controls = currentControls();
  const style = currentStyle();

  if (hub.activeType === "card") {
    const card = activeCard();
    const params = new URLSearchParams();
    if (style.titleColor) params.set("titleColor", style.titleColor);
    if (style.posColor) params.set("secondaryColor", style.posColor);
    if (!controls.logos) params.set("logos", "off");
    if (card.variant === "fixture-list") {
      // Defaults ON for this card — only send a param when turning
      // OFF from that default (see applyCardStyleFromQueryParams()
      // in cards.js for the matching embed-side logic).
      if (!controls.rowBg) params.set("rowbg", "off");
      if (!controls.rule) params.set("rule", "off");
    } else {
      // Every other card defaults OFF — opposite direction, only
      // send a param when turning ON.
      if (controls.rowBg) params.set("rowbg", "on");
      if (controls.rule) params.set("rule", "on");
    }
    if (hub.previewSize === "compact" || hub.previewSize === "standard") {
      params.set("size", hub.previewSize);
    }
    const qs = params.toString();
    return qs ? `${card.embedHref}?${qs}` : card.embedHref;
  }

  const table = activeTable();
  const params = new URLSearchParams();
  if (style.titleColor) params.set("titleColor", style.titleColor);
  if (style.posColor) params.set("posColor", style.posColor);
  if (style.pointsColor) params.set("pointsColor", style.pointsColor);
  if (!controls.flags) params.set("flags", "off");
  if (!controls.logos) params.set("logos", "off");
  if (!controls.rowBg) params.set("rowbg", "off");
  if (controls.podium) params.set("podium", "on");
  if (!controls.rule) params.set("rule", "off");
  if (hub.rowLimit) params.set("rows", hub.rowLimit);
  if (hub.previewSize === "compact" || hub.previewSize === "standard") {
    params.set("size", hub.previewSize);
    const cols = columnsForSize(table, hub.previewSize);
    if (cols) params.set("cols", cols.join(","));
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
  const preset = STYLE_PRESETS_LOOKUP(key);
  if (!preset) return;
  currentStyle().titleColor = preset.accent;
  document.querySelectorAll(".title-colour-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  refreshExportSurfaceForType();
}

function applyPosPointsColour(key) {
  const preset = STYLE_PRESETS_LOOKUP(key);
  if (!preset) return;
  const style = currentStyle();
  style.posColor = preset.accent;
  style.pointsColor = preset.accent;
  document.querySelectorAll(".pospoints-colour-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));
  updateStylePreview();
  refreshExportSurfaceForType();
}

function STYLE_PRESETS_LOOKUP(key) {
  return STYLE_PRESETS.find(p => p.key === key);
}

function renderTitleColourButtons() {
  const mount = document.getElementById("title-colour-buttons");
  if (!mount) return;
  const style = currentStyle();
  mount.innerHTML = STYLE_PRESETS.map(p => `
    <button class="colour-option title-colour-option${style.titleColor === p.accent ? ' selected' : ''}" data-key="${p.key}" title="${p.label}" style="background:${p.swatch};" onclick="applyTitleColour('${p.key}')"></button>
  `).join('');
}

function renderPosPointsColourButtons() {
  const mount = document.getElementById("pospoints-colour-buttons");
  if (!mount) return;
  const style = currentStyle();
  mount.innerHTML = STYLE_PRESETS.map(p => `
    <button class="colour-option pospoints-colour-option${style.posColor === p.accent ? ' selected' : ''}" data-key="${p.key}" title="${p.label}" style="background:${p.swatch};" onclick="applyPosPointsColour('${p.key}')"></button>
  `).join('');
}

function toggleFlags() {
  currentControls().flags = document.getElementById("control-flags").checked;
  updateStylePreview();
  refreshExportSurfaceForType();
}

function toggleLogos() {
  currentControls().logos = document.getElementById("control-logos").checked;
  updateStylePreview();
  refreshExportSurfaceForType();
}

function toggleRowBg() {
  currentControls().rowBg = document.getElementById("control-rowbg").checked;
  updateStylePreview();
  refreshExportSurfaceForType();
}

function togglePodium() {
  currentControls().podium = document.getElementById("control-podium").checked;
  updateStylePreview();
  refreshExportSurfaceForType();
}

function toggleRule() {
  currentControls().rule = document.getElementById("control-rule").checked;
  updateStylePreview();
  refreshExportSurfaceForType();
}

/* Rows — independent of Size. Limits how many rows render, from
   Top 3 / Top 10 / the full list. A no-op on single-row content
   like a "Next Race" style table (slicing a 1-item array just
   returns the 1 item). */
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
  refreshExportSurfaceForType();
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

function selectPreviewSize(key) {
  hub.previewSize = key;
  hub.printSize = key;
  const preset = SIZE_PRESETS[key];
  const surface = document.getElementById("preview-surface-inner");
  const widthPx = key === 'full' ? '100%' : key === 'standard' ? '378px' : '189px';
  if (surface) surface.style.width = widthPx;
  document.querySelectorAll(".preview-size-option:not(.row-limit-option)").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key));

  const flagsInput = document.getElementById("control-flags");
  const logosInput = document.getElementById("control-logos");
  const isCompact = key === "compact";
  const isTable = hub.activeType === "table";

  if (isTable) {
    if (flagsInput) {
      flagsInput.disabled = isCompact;
      if (isCompact) flagsInput.checked = false;
      else flagsInput.checked = hub.controls.flags;
    }
    if (logosInput) {
      logosInput.disabled = isCompact;
      if (isCompact) logosInput.checked = false;
      else logosInput.checked = hub.controls.logos;
    }
    if (isCompact) {
      hub.controls.flags = false;
      hub.controls.logos = false;
    }
  } else {
    // Cards: Compact doesn't force logos off — the opposite, in fact
    // (crests get bigger at Compact, see cards.css). Just make sure
    // nothing is left disabled from a previous table-tab visit.
    if (flagsInput) flagsInput.disabled = false;
    if (logosInput) logosInput.disabled = false;
  }

  updateStylePreview();
  refreshExportSurfaceForType();
}

function renderPreviewSizeControls() {
  const mount = document.getElementById("preview-size-controls");
  if (!mount) return;
  mount.innerHTML = ["full", "standard", "compact"].map(key => {
    const preset = SIZE_PRESETS[key];
    return `
      <button class="preview-size-option" data-key="${key}" onclick="selectPreviewSize('${key}')">
        ${preset.label}
      </button>`;
  }).join('');
  // set initial selected state to match hub.previewSize
  document.querySelectorAll("#preview-size-controls .preview-size-option").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === hub.previewSize));
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

/* ---------- Export (PDF via print, and PNG) ---------- */

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
  if (hub.controls.podium) el.setAttribute('data-dt-podium', 'on'); else el.removeAttribute('data-dt-podium');
  if (!hub.controls.rule) el.setAttribute('data-dt-rule', 'off'); else el.removeAttribute('data-dt-rule');
}

function renderExportSurface() {
  if (hub.activeType !== "table") return; // export machinery (renderTableShell/renderRows) is table-only
  const table = activeTable();
  if (!table) return;

  applyExportThemeAttributes();

  const preset = SIZE_PRESETS[hub.printSize];
  const cols = columnsForSize(table, hub.printSize);
  const activeColumns = cols
    ? table.adapter.columns.filter(c => cols.includes(c.key))
    : table.adapter.columns;

  const surface = document.getElementById("print-surface");
  const config = { title: table.tableLabel || table.title, sportLogo: table.sportLogo };
  const tbody = renderTableShell(surface, config, activeColumns);
  const limitedRows = hub.rowLimit ? hub.rows.slice(0, hub.rowLimit) : hub.rows;
  renderRows(tbody, activeColumns, limitedRows);
  const updatedEl = surface.querySelector('.dt-updated');
  if (updatedEl && hub.lastUpdated) {
    updatedEl.textContent = 'Updated ' + hub.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — ';
  }

  let pageStyle = document.getElementById('page-size-style');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'page-size-style';
    document.head.appendChild(pageStyle);
  }

  // #print-surface is display:none outside of @media print, so its
  // scrollHeight reads as 0 unless we briefly force it visible
  // (off-screen) to measure the real rendered height at the actual
  // print width.
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

/* Card equivalent of applyExportThemeAttributes() above — sets the
   SAME attributes/vars that applyCardStyleFromQueryParams() in
   cards.js sets from URL params, just sourced from JS state
   (currentStyle()/currentControls(), so this picks up whichever
   card's own state object is active — see weekendCardControls
   above) instead of the query string, mirroring exactly how
   applyExportThemeAttributes() relates to applyThemeFromQueryParams().
   data-dt-size is shared with the table engine deliberately — both
   should reflect the same selected Size. */
function applyCardExportThemeAttributes() {
  const el = document.documentElement;
  el.setAttribute('data-dt-size', hub.printSize);
  const style = currentStyle();
  const controls = currentControls();

  if (style.titleColor) el.style.setProperty('--card-title-color', `#${style.titleColor}`);
  else el.style.removeProperty('--card-title-color');
  if (style.posColor) el.style.setProperty('--card-secondary-color', `#${style.posColor}`);
  else el.style.removeProperty('--card-secondary-color');

  if (!controls.logos) el.setAttribute('data-card-logos', 'off'); else el.removeAttribute('data-card-logos');
  if (controls.rowBg) el.setAttribute('data-card-rowbg', 'on'); else el.removeAttribute('data-card-rowbg');
  if (controls.rule) el.setAttribute('data-card-rule', 'on'); else el.removeAttribute('data-card-rule');
}

/* Card equivalent of renderExportSurface() — reuses cards.js's own
   renderPreviewCard()/renderFixtureCard()/renderResultCard()
   directly (available here because table/epl.html now also loads
   card-loader.js), same principle as the table engine reusing
   renderTableShell()/renderRows() for its export path: one shared
   render function, so PDF/PNG can never drift from what the live
   embed actually shows. Needs hub.cardData already fetched — see
   refreshActiveCard(), which now fetches it itself (previously only
   the embed iframe fetched its own copy; the hub page had no reason
   to know the data until export needed it too). */
function renderCardExportSurface() {
  if (hub.activeType !== "card") return;
  const card = activeCard();
  if (!card || !hub.cardData) return;

  applyCardExportThemeAttributes();

  const surface = document.getElementById("print-surface");
  const config = { eyebrow: card.eyebrow || '' };
  if (card.variant === 'result') {
    renderResultCard(surface, hub.cardData, config);
  } else if (card.variant === 'fixture') {
    renderFixtureCard(surface, hub.cardData, config);
  } else if (card.variant === 'fixture-list') {
    renderFixtureListCard(surface, hub.cardData, config);
  } else {
    renderPreviewCard(surface, hub.cardData, config);
  }

  const preset = SIZE_PRESETS[hub.printSize];
  let pageStyle = document.getElementById('page-size-style');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'page-size-style';
    document.head.appendChild(pageStyle);
  }

  // Same off-screen-measure trick as renderExportSurface() — see the
  // comment there for why.
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

/* Dispatcher used by the toggle/colour handlers above (and
   selectPreviewSize()/selectRowLimit() below) so a single call site
   refreshes whichever export surface — table's or card's — is
   actually relevant to the active tab. */
function refreshExportSurfaceForType() {
  if (hub.activeType === "card") {
    renderCardExportSurface();
  } else {
    renderExportSurface();
  }
}

function downloadPdf() {
  if (hub.activeType === "card") {
    renderCardExportSurface();
  } else {
    renderExportSurface();
  }
  window.print();
}

function downloadPng() {
  if (hub.activeType === "card") {
    const card = activeCard();
    if (!card || typeof html2canvas === 'undefined') return;

    renderCardExportSurface();
    const surface = document.getElementById("print-surface");
    const widthPx = hub.printSize === 'full' ? '1100px'
      : hub.printSize === 'standard' ? '378px' : '189px';
    surface.style.width = widthPx;
    surface.style.display = 'block';
    surface.style.position = 'fixed';
    surface.style.left = '-9999px';
    surface.style.top = '0';

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
        a.download = `${card.key}-${hub.printSize}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    });
    return;
  }

  const table = activeTable();
  if (!table || typeof html2canvas === 'undefined') return;

  renderExportSurface();
  const surface = document.getElementById("print-surface");

  const widthPx = hub.printSize === 'full' ? '1100px'
    : hub.printSize === 'standard' ? '378px' : '189px';
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

/* ---------- Switching / loading the active table or card ----------
 * Cards share the table engine's Size system (Full/Standard/Compact
 * — see cards.css/cards.js for how ?size= drives three distinct
 * layouts there), so that control stays visible for card tabs, as do
 * Colour + Controls and — now — PDF/PNG export (see
 * renderCardExportSurface() above, which reuses cards.js's own
 * render functions the same way the table engine reuses
 * renderTableShell/renderRows). Only Rows stays table-only. */

/* Colour + Controls now apply to cards too (see hub.cardStyle/
 * hub.cardControls above), so they're no longer hidden for card
 * tabs — only Rows stays table-only (a single fixture has nothing
 * to limit). Two of the five Controls (Top 3 highlight, Flags)
 * currently have no visual effect on a card — left visible and
 * toggleable rather than hidden, since disabling them individually
 * would need per-control visibility logic for no real benefit; they
 * simply don't do anything on a card yet. */
function refreshStyleThemePanelForType() {
  const mount = document.getElementById("style-theme-panel");
  if (!mount) return;
  const isCard = hub.activeType === "card";

  const rowsSection = document.getElementById("row-limit-controls");
  const rowsSectionWrap = rowsSection && rowsSection.closest(".size-section");
  if (rowsSectionWrap) rowsSectionWrap.style.display = isCard ? "none" : "";

  syncControlsUI();
}

/* Syncs the shared checkboxes/colour-button .selected states to
 * whichever state object (hub.controls/hub.style vs hub.cardControls/
 * hub.cardStyle) is relevant for the currently active tab — needed
 * because the panel's DOM is generated once, not once per tab, so
 * switching tabs doesn't naturally update it on its own. */
function syncControlsUI() {
  const controls = currentControls();
  const style = currentStyle();

  const flagsInput = document.getElementById("control-flags");
  if (flagsInput) flagsInput.checked = controls.flags;
  const logosInput = document.getElementById("control-logos");
  if (logosInput) logosInput.checked = controls.logos;
  const rowbgInput = document.getElementById("control-rowbg");
  if (rowbgInput) rowbgInput.checked = controls.rowBg;
  const podiumInput = document.getElementById("control-podium");
  if (podiumInput) podiumInput.checked = controls.podium;
  const ruleInput = document.getElementById("control-rule");
  if (ruleInput) ruleInput.checked = controls.rule;

  document.querySelectorAll(".title-colour-option").forEach(el => {
    const preset = STYLE_PRESETS_LOOKUP(el.dataset.key);
    el.classList.toggle("selected", !!preset && preset.accent === style.titleColor);
  });
  document.querySelectorAll(".pospoints-colour-option").forEach(el => {
    const preset = STYLE_PRESETS_LOOKUP(el.dataset.key);
    el.classList.toggle("selected", !!preset && preset.accent === style.posColor);
  });
}

/* Live Preview panel's heading — "Live preview" for tables, but the
 * card panel got a more specific name per request. If more card
 * types are added later with meaningfully different content (e.g. a
 * live/result scorecard), this may want to become per-card rather
 * than a single fixed string — worth revisiting then. */
/* Was a single hardcoded "Upcoming Matches" string for ANY card tab
 * — meaning the single Next Fixture card's panel incorrectly said
 * "Upcoming Matches" too, a latent bug from before a second card
 * existed to expose it. Now reads each card's own liveTitle field
 * instead, falling back to "Live preview" if a card doesn't set one. */
function refreshLivePreviewTitle() {
  const el = document.getElementById("live-preview-title");
  if (!el) return;
  if (hub.activeType === "card") {
    const card = activeCard();
    el.textContent = (card && card.liveTitle) || "Live preview";
  } else {
    el.textContent = "Live preview";
  }
}

/* Some cards only make sense at certain sizes — the weekend fixture
 * list's mirrored-column row layout has nowhere sensible to go at
 * Compact width, so a card can set sizeRestricted: ["full","standard"]
 * (an array — a single size still works too, e.g. "full") in its hub
 * config and any size NOT in that list hides its button for that
 * tab, forcing hub.previewSize back to the first allowed value if it
 * wasn't already one of them. Tables and unrestricted cards (the
 * single Next Fixture card) see all three buttons as normal. */
function refreshSizeControlsForActiveTab() {
  const card = hub.activeType === "card" ? activeCard() : null;
  const restricted = card && card.sizeRestricted;
  const allowed = restricted ? (Array.isArray(restricted) ? restricted : [restricted]) : null;
  document.querySelectorAll("#preview-size-controls .preview-size-option").forEach(el => {
    el.style.display = (!allowed || allowed.includes(el.dataset.key)) ? "" : "none";
  });
  if (allowed && !allowed.includes(hub.previewSize)) {
    selectPreviewSize(allowed[0]);
  }
}

function refreshActiveCard() {
  const card = activeCard();
  const heroLogo = card.sportLogo ? `<img class="hero-logo" src="${card.sportLogo}" alt="">` : '';
  document.getElementById("page-title").innerHTML = `${heroLogo}<span class="hero-title-text">${card.tableLabel || card.title}</span>`;
  document.title = `${card.title} — Live sports data cards`;

  refreshStyleThemePanelForType();
  refreshSizeControlsForActiveTab();
  refreshLivePreviewTitle();
  updateStylePreview();

  // The hub page now fetches the card's data itself too, not just the
  // live-preview iframe — needed so Download PDF/PNG has something to
  // render (see renderCardExportSurface()). loadCardData() (defined
  // in cards.js, loaded here via card-loader.js) is the SAME loader
  // the live embed iframe uses — handles adapter.fetch() escape-hatch
  // adapters (e.g. weekendFixtures()) exactly like a plain sourceUrl
  // one, so this doesn't need its own duplicate branching.
  hub.cardData = null;
  document.getElementById("print-surface").innerHTML = `<p style="padding:1rem;">Loading…</p>`;

  loadCardData(card)
    .then(raw => {
      hub.cardData = card.adapter.extract(raw);
      if (!hub.cardData) {
        document.getElementById("print-surface").innerHTML = `<p style="padding:1rem;">No data available.</p>`;
        return;
      }
      renderCardExportSurface();
    })
    .catch(err => {
      document.getElementById("print-surface").innerHTML = `<p style="padding:1rem;">Failed to load: ${err.message}</p>`;
    });
}

function refreshActiveTable() {
  refreshStyleThemePanelForType();
  refreshSizeControlsForActiveTab();
  refreshLivePreviewTitle();

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
      hub.lastUpdated = new Date();
      renderExportSurface();
    })
    .catch(err => {
      document.getElementById("print-surface").innerHTML = `<p style="padding:1rem;">Failed to load: ${err.message}</p>`;
    });
}

function initSportHub(config) {
  hub.tables = config.tables || [];
  hub.cards = config.cards || [];

  const firstTable = hub.tables[0];
  const firstCard = hub.cards[0];
  if (firstTable) {
    hub.activeKey = firstTable.key;
    hub.activeType = "table";
  } else if (firstCard) {
    hub.activeKey = firstCard.key;
    hub.activeType = "card";
  }

  renderStyleThemePanel();
  renderLivePreviewPanel();

  renderTableTabs();
  renderTitleColourButtons();
  renderPosPointsColourButtons();
  renderPreviewSizeControls();
  renderRowLimitControls();

  if (hub.activeType === "card") {
    refreshActiveCard();
  } else {
    refreshActiveTable();
  }

  const controlFlags = document.getElementById("control-flags");
  if (controlFlags) controlFlags.addEventListener("change", toggleFlags);
  const controlLogos = document.getElementById("control-logos");
  if (controlLogos) controlLogos.addEventListener("change", toggleLogos);
  const controlRowBg = document.getElementById("control-rowbg");
  if (controlRowBg) controlRowBg.addEventListener("change", toggleRowBg);
  const controlPodium = document.getElementById("control-podium");
  if (controlPodium) controlPodium.addEventListener("change", togglePodium);
  const controlRule = document.getElementById("control-rule");
  if (controlRule) controlRule.addEventListener("change", toggleRule);
  document.getElementById("copy-btn").addEventListener("click", copyEmbedCode);
  document.getElementById("toggle-code-btn").addEventListener("click", toggleCodeVisible);
  document.getElementById("download-btn").addEventListener("click", downloadPdf);
  const downloadPngBtn = document.getElementById("download-png-btn");
  if (downloadPngBtn) downloadPngBtn.addEventListener("click", downloadPng);
}
