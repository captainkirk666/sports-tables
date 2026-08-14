/**
 * Shared card engine loader — v1
 *
 * Cards (single-event "coming up" / "scorecard" widgets) are a
 * separate rendering engine from the ranked-standings tables engine
 * (loader.js) — different content shape, different lifecycle, so
 * they get their own loader and their own version number rather
 * than being folded into ENGINE_VERSION. Typography/colour tokens
 * are still deliberately aligned to tables.css (see cards.css) —
 * only the version numbers are independent.
 *
 * Every card embed page includes ONLY this one script tag, with NO
 * ?v= of its own:
 *
 *   <script src="https://captainkirk666.github.io/sports-tables/js/card-loader.js"></script>
 *
 * Bump CARD_VERSION below, once, and every card embed page — current
 * and future, any sport — picks up the change.
 *
 * Loads: cards.css, cards.js.
 * NOT loaded here (deliberately per-sport, not shared):
 *   - adapters/<sport>.js — still loaded separately via
 *     adapter-loader.js, same as table embed pages. A card embed
 *     page needs BOTH card-loader.js (engine) AND adapter-loader.js
 *     (data), same two-tag pattern as table embeds.
 *
 * Same caching tradeoff as the other loaders: no ?v= on this file
 * itself, so GitHub Pages' CDN can serve a stale copy of it for up
 * to ~10 minutes after an edit.
 */
(function () {
  var CARD_VERSION = "21"; // <-- bump ONLY this number when cards.css/cards.js changes
  var BASE = "https://captainkirk666.github.io/sports-tables";

  document.write('<link rel="stylesheet" href="' + BASE + '/css/v1/cards.css?v=' + CARD_VERSION + '">');
  document.write('<script src="' + BASE + '/js/v1/cards.js?v=' + CARD_VERSION + '"><' + '/script>');
})();
