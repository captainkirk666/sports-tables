/**
 * Shared engine loader — v1
 *
 * Every page (every embed page, every sport's hub page) includes
 * ONLY this one script tag, with NO ?v= of its own:
 *
 *   <script src="https://captainkirk666.github.io/sports-tables/js/loader.js"></script>
 *
 * This file is the ONLY place the shared engine's version number
 * lives. Bump ENGINE_VERSION below, once, and every page across
 * every sport — current and future — picks up the change. No more
 * hunting through dozens of embed pages to keep matching ?v=
 * numbers in sync by hand.
 *
 * Loads: tables.css, flags.js, tables.js, sport-hub.js.
 * NOT loaded here (deliberately per-sport, not shared):
 *   - adapters/<sport>.js — each sport keeps its own version number,
 *     bumped only when that sport's own adapter changes.
 *   - site.css / site-nav.js — hub-page chrome only, embed pages
 *     stay bare for iframing (see PROJECT-HANDOFF.md).
 *
 * This file itself is NOT cache-busted with a ?v= — that's the one
 * deliberate tradeoff. GitHub Pages' CDN can serve a stale cached
 * copy of loader.js itself for up to ~10 minutes after you edit it
 * (Cache-Control: max-age=600, same as every other file on this
 * site — see PROJECT-HANDOFF.md gotcha #4). That's a short wait, not
 * a file you need to remember to touch anywhere else. For instant
 * testing while you're actively working on the engine, use Chrome
 * DevTools' Network tab "Disable cache" option, or Empty
 * Cache and Hard Reload.
 */
(function () {
  var ENGINE_VERSION = "5"; // <-- bump ONLY this number when tables.css/flags.js/tables.js/sport-hub.js changes
  var BASE = "https://captainkirk666.github.io/sports-tables";

  document.write('<link rel="stylesheet" href="' + BASE + '/css/v1/tables.css?v=' + ENGINE_VERSION + '">');
  document.write('<script src="' + BASE + '/js/v1/flags.js?v=' + ENGINE_VERSION + '"><' + '/script>');
  document.write('<script src="' + BASE + '/js/v1/tables.js?v=' + ENGINE_VERSION + '"><' + '/script>');
  document.write('<script src="' + BASE + '/js/sport-hub.js?v=' + ENGINE_VERSION + '"><' + '/script>');
})();
