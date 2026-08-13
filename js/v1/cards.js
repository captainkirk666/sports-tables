/**
 * Shared card engine — v1
 *
 * Renders a single event/result as a card, rather than a table of
 * many ranked rows — for "look-ahead" content (next race, upcoming
 * fixtures) and final-score results. Every embed page using this
 * includes it, then calls initCard(config).
 *
 * config = {
 *   containerSelector: "#dt-app",
 *   variant: "preview" | "fixture" | "fixture-list" | "result",
 *   eyebrow: "Next Race",           // small label above the content
 *   sourceUrl: "https://...",       // OR adapter.fetch() — see below
 *   sportLogo: "https://...",       // optional — shown alongside the eyebrow text, League Table's own .dt-title treatment (fixture-list variant only currently)
 *   adapter: {
 *     // Unlike tables.js, extract() returns ONE object (or null if
 *     // there's nothing to show — e.g. season over), not an array.
 *     extract(data) -> object | null,
 *     // OPTIONAL escape hatch for adapters that can't be expressed
 *     // as one plain GET (e.g. EPL_ADAPTERS.weekendFixtures()'s
 *     // two-step authenticated football-data.org sequence). If
 *     // present, this owns the entire fetch — sourceUrl is ignored
 *     // — and must return a Promise resolving to the raw parsed
 *     // JSON that extract() expects. See loadCardData() below.
 *     fetch: () => Promise<object>,
 *   },
 *   refreshSeconds: 60,             // 0/undefined = no auto refresh
 * }
 *
 * Size (compact/standard/full) is NOT part of config — same
 * convention as tables.js: it's read directly from the embed page's
 * own URL (?size=...) by applyCardSizeFromQueryParams(), so
 * sport-hub.js's existing Size buttons drive card embeds exactly the
 * same way they drive table embeds (see buildEmbedUrl() there).
 *
 * Preview variant expects extract() to return:
 *   { headline, logoLeft?, logoRight?, flag?, location, date, time }
 *   headline is a plain string — either an event name ("British
 *   Grand Prix") or a fixture ("Arsenal v Chelsea"), built by the
 *   adapter. logoLeft/logoRight are only relevant for genuine
 *   two-team fixtures; leave them out (or null) for single-event
 *   content like a Grand Prix.
 *
 * Result variant expects extract() to return:
 *   { leftName, rightName, leftScore, rightScore, leftLogo?, rightLogo?, detail? }
 */

/**
 * Fixture variant expects extract() to return:
 *   { homeName, awayName, homeCrest?, awayCrest?, date, dateShort?, venue?, venueShort? }
 * dateShort/venueShort are only used at Compact size (renderFixtureCard()
 * falls back to date/venue if they're absent). Distinct from the
 * Preview variant's single-headline shape — see cards.css's comment
 * on .card-fixture-widget for why this is a separate variant rather
 * than a branch inside renderPreviewCard.
 */

/**
 * Mirrors applyThemeFromQueryParams() in tables.js — same attribute
 * (data-dt-size), same param name (?size=), same three values
 * (compact/standard/full, full being the unset default). Kept as its
 * own small function here rather than importing tables.js's, since
 * card embed pages only load card-loader.js, not the table engine —
 * duplicating three lines is cheaper than adding a cross-engine
 * dependency for it.
 */
function applyCardSizeFromQueryParams() {
  const size = new URLSearchParams(window.location.search).get('size');
  if (size) {
    document.documentElement.setAttribute('data-dt-size', size);
  }
}

/**
 * Fixture card's colour + controls params — driven by sport-hub.js's
 * Style & Theme panel, same UI as the table engine but with card-
 * appropriate defaults (see hub.cardStyle/hub.cardControls there).
 * Deliberately its own param set, not reusing tables.js's posColor/
 * pointsColor/rowbg/rule names verbatim — cards never had any live
 * embeds before this, so there's no backward-compat reason to match
 * the table engine's exact wire format, and "secondaryColor" reads
 * clearer here than "posColor" (which only ever meant something
 * table-specific).
 *
 * rowbg/rule default direction depends on variant: fixture-list is a
 * genuine table-like list (many rows), so it defaults BOTH on —
 * absence of a param means on, explicit =off turns them off — same
 * direction tables.js itself uses. Every other variant (single-event
 * cards) keeps the opposite direction: both default off, preserving
 * their original plain-white look, 'on' opts them in. logos keeps
 * the same direction everywhere (default ON, 'off' opts out) since
 * crests being visible by default was never in question.
 */
function applyCardStyleFromQueryParams(variant) {
  const params = new URLSearchParams(window.location.search);
  const titleColor = params.get('titleColor');         // hex without '#' — team name colour, default var(--card-text)
  const secondaryColor = params.get('secondaryColor');  // hex without '#' — the eyebrow word's colour, default var(--card-accent)
  const logos = params.get('logos');   // 'off' hides the crest images; default shown
  const rowbg = params.get('rowbg');
  const rule = params.get('rule');

  if (titleColor && /^[0-9a-fA-F]{6}$/.test(titleColor)) {
    document.documentElement.style.setProperty('--card-title-color', `#${titleColor}`);
  }
  if (secondaryColor && /^[0-9a-fA-F]{6}$/.test(secondaryColor)) {
    document.documentElement.style.setProperty('--card-secondary-color', `#${secondaryColor}`);
  }
  if (logos === 'off') {
    document.documentElement.setAttribute('data-card-logos', 'off');
  }
  if (variant === 'fixture-list') {
    if (rowbg !== 'off') document.documentElement.setAttribute('data-card-rowbg', 'on');
    if (rule !== 'off') document.documentElement.setAttribute('data-card-rule', 'on');
  } else {
    if (rowbg === 'on') {
      document.documentElement.setAttribute('data-card-rowbg', 'on');
    }
    if (rule === 'on') {
      document.documentElement.setAttribute('data-card-rule', 'on');
    }
  }
}

function renderPreviewCard(root, data, config) {
  root.innerHTML = `
    <div class="card-widget card-preview">
      <div class="card-eyebrow">${config.eyebrow || ''}</div>
      <div class="card-headline">
        ${data.logoLeft ? `<img class="card-logo-left" src="${data.logoLeft}" alt="">` : ''}
        <span>${data.headline}</span>
        ${data.logoRight ? `<img class="card-logo-right" src="${data.logoRight}" alt="">` : ''}
      </div>
      <div class="card-location">
        ${data.flag ? `<img class="card-flag" src="${data.flag}" alt="">` : ''}
        <span>${data.location}</span>
      </div>
      <div class="card-datetime">${data.date} · ${data.time}</div>
      <div class="card-footer">Source: KIKA MEDIA</div>
    </div>
  `;
}

function renderFixtureCard(root, data, config) {
  const size = document.documentElement.getAttribute('data-dt-size') || 'full';
  const isCompact = size === 'compact';
  const dateText = (isCompact && data.dateShort) ? data.dateShort : data.date;
  const venueText = (isCompact && data.venueShort) ? data.venueShort : data.venue;

  root.innerHTML = `
    <div class="card-widget card-fixture-widget">
      <div class="card-fixture-crests">
        ${data.homeCrest ? `<img class="card-crest card-crest-left" src="${data.homeCrest}" alt="">` : ''}
        ${data.awayCrest ? `<img class="card-crest card-crest-right" src="${data.awayCrest}" alt="">` : ''}
      </div>
      <div class="card-fixture-topline">
        <div class="card-eyebrow">${config.eyebrow || ''}</div>
        <div class="card-fixture-meta">
          <span class="card-datetime">${dateText}</span>
          ${venueText ? `<span class="card-venue">${venueText}</span>` : ''}
        </div>
      </div>
      <div class="card-fixture-teams">
        <span class="card-fixture-team-name">${data.homeName}</span>
        <span class="card-vs">vs</span>
        <span class="card-fixture-team-name">${data.awayName}</span>
      </div>
    </div>
  `;
}

function renderResultCard(root, data, config) {
  root.innerHTML = `
    <div class="card-widget card-result">
      <div class="card-eyebrow">${config.eyebrow || 'Full Time'}</div>
      <div class="card-scoreline">
        <div class="card-team card-team-left">
          ${data.leftLogo ? `<img class="card-logo" src="${data.leftLogo}" alt="">` : ''}
          <span class="card-team-name">${data.leftName}</span>
        </div>
        <div class="card-score">
          <span>${data.leftScore}</span><span class="card-score-sep">–</span><span>${data.rightScore}</span>
        </div>
        <div class="card-team card-team-right">
          ${data.rightLogo ? `<img class="card-logo" src="${data.rightLogo}" alt="">` : ''}
          <span class="card-team-name">${data.rightName}</span>
        </div>
      </div>
      ${data.detail ? `<div class="card-detail">${data.detail}</div>` : ''}
      <div class="card-footer">Source: KIKA MEDIA</div>
    </div>
  `;
}

/**
 * Fixture-list variant expects extract() to return:
 *   { rows: [{ homeName, awayName, homeNameShort?, awayNameShort?,
 *     homeCrest?, awayCrest?, finished, live, homeScore?, awayScore?,
 *     kickoff, venue? }] }
 * Each ROW independently decides its own display — finished rows
 * show the score, still-upcoming rows show kickoff + venue. That's
 * the whole point: viewed mid-weekend, Friday/Saturday's results and
 * Sunday's still-upcoming kickoff sit in the same list, no separate
 * "mode" for the card as a whole. No goal-scorer detail — the data
 * source (ESPN) doesn't reliably expose it without a much heavier
 * per-match fetch, dropped rather than built on unconfirmed data.
 * homeNameShort/awayNameShort are only used at Compact size (falls
 * back to the full name if absent) — same pattern as the single
 * Fixture card's dateShort/venueShort. Compact also drops the
 * kickoff/venue sub-line entirely (handled in cards.css, not here —
 * a pure display:none, the data is still computed either way).
 * config.sportLogo, if set, shows a logo alongside the eyebrow text
 * — matches League Table's own .dt-title treatment (see cards.css).
 */
function fixtureListRowHtml(row) {
  const size = document.documentElement.getAttribute('data-dt-size') || 'full';
  const isCompact = size === 'compact';
  const homeName = (isCompact && row.homeNameShort) ? row.homeNameShort : row.homeName;
  const awayName = (isCompact && row.awayNameShort) ? row.awayNameShort : row.awayName;
  const isDecided = row.finished || row.live;
  const centerHtml = isDecided
    ? `<span class="card-list-score">${row.homeScore}\u2013${row.awayScore}</span>${row.live ? '<span class="card-list-live">LIVE</span>' : ''}`
    : `<span class="card-list-vs">vs</span>`;
  const homeSub = row.finished ? 'FT' : (row.live ? '' : row.kickoff);
  const awaySub = row.venue || '';
  return `
    <div class="card-list-row${row.live ? ' card-list-row-live' : ''}">
      ${row.homeCrest ? `<img class="card-list-crest" src="${row.homeCrest}" alt="">` : '<span class="card-list-crest"></span>'}
      <div class="card-list-home">
        <span class="card-list-team-name">${homeName}</span>
        ${homeSub ? `<span class="card-list-sub">${homeSub}</span>` : ''}
      </div>
      <div class="card-list-center">${centerHtml}</div>
      <div class="card-list-away">
        <span class="card-list-team-name">${awayName}</span>
        ${awaySub ? `<span class="card-list-sub">${awaySub}</span>` : ''}
      </div>
      ${row.awayCrest ? `<img class="card-list-crest" src="${row.awayCrest}" alt="">` : '<span class="card-list-crest"></span>'}
    </div>
  `;
}

function renderFixtureListCard(root, data, config) {
  const logoHtml = config.sportLogo ? `<img class="card-eyebrow-logo" src="${config.sportLogo}" alt="">` : '';
  root.innerHTML = `
    <div class="card-widget card-fixture-list-widget">
      <div class="card-eyebrow">${logoHtml}<span class="card-eyebrow-text">${config.eyebrow || ''}</span></div>
      <div class="card-list-rows">
        ${data.rows.map(fixtureListRowHtml).join('')}
      </div>
      <div class="card-footer">Source: KIKA MEDIA</div>
    </div>
  `;
}

/**
 * Escape hatch used by adapters that can't be expressed as a single
 * plain GET — currently just EPL_ADAPTERS.weekendFixtures(), whose
 * two-step authenticated football-data.org sequence doesn't fit the
 * sourceUrl+plain-fetch shape every other adapter in this codebase
 * uses. If adapter.fetch exists, it owns the entire fetch — must
 * return a Promise resolving to the raw parsed JSON, same shape
 * extract() would otherwise receive from a plain fetch(sourceUrl).
 */
function loadCardData(config) {
  if (typeof config.adapter.fetch === 'function') {
    return config.adapter.fetch();
  }
  return fetch(config.sourceUrl).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

function initCard(config) {
  applyCardSizeFromQueryParams();
  applyCardStyleFromQueryParams(config.variant);
  const root = document.querySelector(config.containerSelector);
  root.innerHTML = `<div class="card-widget"><p style="padding:1rem;">Loading…</p></div>`;

  function load() {
    loadCardData(config)
      .then(raw => {
        const data = config.adapter.extract(raw);
        if (!data) {
          root.innerHTML = `<div class="card-widget"><p style="padding:1rem;">No data available.</p></div>`;
          return;
        }
        if (config.variant === 'result') {
          renderResultCard(root, data, config);
        } else if (config.variant === 'fixture') {
          renderFixtureCard(root, data, config);
        } else if (config.variant === 'fixture-list') {
          renderFixtureListCard(root, data, config);
        } else {
          renderPreviewCard(root, data, config);
        }
      })
      .catch(err => {
        root.innerHTML = `<div class="card-widget"><p style="padding:1rem;">Failed to load: ${err.message}</p></div>`;
      });
  }

  load();
  if (config.refreshSeconds) {
    setInterval(load, config.refreshSeconds * 1000);
  }
}
