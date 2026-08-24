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
 * Loads: cards.css, cards.js, and flags.js IF NOT ALREADY PRESENT.
 * flags.js has only ever shipped bundled with the table engine
 * (loader.js) — this is the first time a card has needed a flag
 * lookup (F1's Next Race card). Rather than duplicate flags.js's
 * loading into every card embed page unconditionally (which would
 * double-inject it — and throw the exact "already declared"
 * SyntaxError this project has hit before — on any page that loads
 * BOTH loader.js and card-loader.js, like a sport's hub page), this
 * checks for flagUrlByIso already existing as a global before
 * injecting it. A pure card-embed page (only card-loader.js) gets it
 * loaded here; a hub page (loader.js already loaded it first) skips
 * the duplicate.
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
  var CARD_VERSION = "29"; // <-- bump ONLY this number when cards.css/cards.js changes
  var BASE = "https://captainkirk666.github.io/sports-tables";

  document.write('<link rel="stylesheet" href="' + BASE + '/css/v1/cards.css?v=' + CARD_VERSION + '">');
  if (typeof flagUrlByIso === 'undefined') {
    document.write('<script src="' + BASE + '/js/v1/flags.js?v=' + CARD_VERSION + '"><' + '/script>');
  }
  document.write('<script src="' + BASE + '/js/v1/cards.js?v=' + CARD_VERSION + '"><' + '/script>');
})();
