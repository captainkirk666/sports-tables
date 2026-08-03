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
 *   variant: "preview" | "result",
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
