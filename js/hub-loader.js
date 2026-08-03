/**
 * Hub-page chrome loader — v1
 *
 * Every SPORT'S HUB PAGE (never embed pages — they stay bare for
 * iframing, and never need this) includes this alongside loader.js:
 *
 *   <script src="https://captainkirk666.github.io/sports-tables/js/loader.js"></script>
 *   <script src="https://captainkirk666.github.io/sports-tables/js/hub-loader.js"></script>
 *
 * Same pattern, same reasoning as loader.js — this is the ONLY place
 * the hub chrome's version number lives (nav bar, Style & Theme
 * panel styling, hero layout). Bump HUB_VERSION below, once, and
 * every sport's hub page picks it up.
 *
 * Kept SEPARATE from loader.js deliberately: this CSS/JS is never
 * needed on embed pages, and a media site may embed the same table
 * many times on one page — no reason to make every one of those
 * instances also load chrome CSS it will never use.
 *
 * Same caching tradeoff as loader.js: no ?v= on this file itself, so
 * GitHub Pages' CDN can serve a stale copy of it for up to ~10
 * minutes after an edit (see PROJECT-HANDOFF.md gotcha #4).
 */
(function () {
  var HUB_VERSION = "1"; // <-- bump ONLY this number when site.css/hub.css/site-nav.js changes
  var BASE = "https://captainkirk666.github.io/sports-tables";

  document.write('<link rel="stylesheet" href="' + BASE + '/css/site.css?v=' + HUB_VERSION + '">');
  document.write('<link rel="stylesheet" href="' + BASE + '/css/hub.css?v=' + HUB_VERSION + '">');
  document.write('<script src="' + BASE + '/js/site-nav.js?v=' + HUB_VERSION + '"><' + '/script>');
})();
