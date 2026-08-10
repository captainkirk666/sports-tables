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
 *   variant: "preview" | "fixture" | "result",
 *   eyebrow: "Next Race",           // small label above the content
 *   sourceUrl: "https://...",
 *   adapter: {
 *     // Unlike tables.js, extract() returns ONE object (or null if
 *     // there's nothing to show — e.g. season over), not an array.
 *     extract(data) -> object | null,
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
 *   { eyebrow?, homeName, awayName, homeCrest?, awayCrest?, date, venue? }
 * Distinct from the Preview variant's single-headline shape — see
 * cards.css's comment on .card-fixture for why this is a separate
 * variant rather than a branch inside renderPreviewCard.
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
  root.innerHTML = `
    <div class="card-widget card-fixture-widget">
      <div class="card-fixture-crests">
        ${data.homeCrest ? `<img class="card-crest card-crest-left" src="${data.homeCrest}" alt="">` : ''}
        ${data.awayCrest ? `<img class="card-crest card-crest-right" src="${data.awayCrest}" alt="">` : ''}
      </div>
      <div class="card-eyebrow">${config.eyebrow || ''}</div>
      <div class="card-fixture-teams">
        <span class="card-fixture-team-name">${data.homeName}</span>
        <span class="card-vs">vs</span>
        <span class="card-fixture-team-name">${data.awayName}</span>
      </div>
      <div class="card-fixture-meta">
        <span class="card-datetime">${data.date}</span>
        ${data.venue ? `<span class="card-venue">${data.venue}</span>` : ''}
      </div>
      <div class="card-footer">Source: KIKA MEDIA</div>
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

function initCard(config) {
  applyCardSizeFromQueryParams();
  const root = document.querySelector(config.containerSelector);
  root.innerHTML = `<div class="card-widget"><p style="padding:1rem;">Loading…</p></div>`;

  function load() {
    fetch(config.sourceUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
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
