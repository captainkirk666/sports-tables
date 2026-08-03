/**
 * Hub-page chrome loader — v1
 *
 * Every SPORT'S HUB PAGE (never embed pages — they stay bare for
 * iframing, and never need this) includes this alongside loader.js:
 *
 *   <script src="https://captainkirk666.github.io/sports-tables/js/loader.js"></script>
 *   <script src="https://captainkirk666.github.io/sports-tables/js/hub-loader.js"></script>
 *
 * Loads site.css + hub.css only. site-nav.js is deliberately NOT
 * bundled here — it renders into a <div id="site-nav"> that doesn't
 * exist yet at <head>-parse time (this loader runs in <head>, for
 * the CSS early-load benefit), so it needs its own separate script
 * tag positioned after that div in the body, same as before this
 * loader existed. It was never version-numbered to begin with, so
 * there was nothing to gain by bundling it in anyway.
 *
 * Same version-bump pattern as loader.js — bump HUB_VERSION below,
 * once, whenever site.css or hub.css changes.
 *
 * Same caching tradeoff as loader.js: no ?v= on this file itself, so
 * GitHub Pages' CDN can serve a stale copy of it for up to ~10
 * minutes after an edit (see PROJECT-HANDOFF.md gotcha #4).
 */
(function () {
  var HUB_VERSION = "2"; // <-- bump ONLY this number when site.css/hub.css changes
  var BASE = "https://captainkirk666.github.io/sports-tables";

  document.write('<link rel="stylesheet" href="' + BASE + '/css/site.css?v=' + HUB_VERSION + '">');
  document.write('<link rel="stylesheet" href="' + BASE + '/css/hub.css?v=' + HUB_VERSION + '">');
})();
