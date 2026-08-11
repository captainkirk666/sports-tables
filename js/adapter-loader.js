/**
 * Sport adapter loader — v1
 *
 * Every page that needs a sport's adapter (a hub page, or any of
 * its embed pages) includes ONE line instead of writing the
 * adapters/<sport>.js path and version number directly:
 *
 *   <script data-sport="epl" src="https://captainkirk666.github.io/sports-tables/js/adapter-loader.js"></script>
 *
 * Each sport's adapter version lives in ONE place — ADAPTER_VERSIONS
 * below. Bump it once there, and every page referencing that sport
 * (hub page + however many embed pages) picks it up automatically —
 * same reasoning as loader.js/hub-loader.js for the shared engine,
 * just scoped per-sport instead of site-wide, since each sport's
 * adapter is genuinely independent of every other sport's.
 *
 * data-sport must match both a key below AND the actual filename in
 * js/v1/adapters/ (e.g. data-sport="epl" -> adapters/epl.js).
 *
 * Same caching tradeoff as the other loaders: no ?v= on this file
 * itself, so GitHub Pages' CDN can serve a stale copy of it for up
 * to ~10 minutes after an edit.
 */
(function () {
  var ADAPTER_VERSIONS = {
    f1: "7",
    epl: "5"
  };
  var BASE = "https://captainkirk666.github.io/sports-tables";
  var sport = document.currentScript.getAttribute('data-sport');
  var version = ADAPTER_VERSIONS[sport];

  if (!sport || !version) {
    console.error('adapter-loader.js: unknown or missing data-sport="' + sport + '"');
    return;
  }

  document.write('<script src="' + BASE + '/js/v1/adapters/' + sport + '.js?v=' + version + '"><' + '/script>');
})();
