/**
 * Global nav bar — v2
 *
 * Renders into <div id="site-nav" data-active="..."> — reads the
 * data-active attribute to know which item (a sport, or a site
 * page) should show as highlighted, then REPLACES that div entirely
 * via outerHTML (so the final element is <nav class="site-nav">,
 * no wrapper div, no id — this matches an existing documented
 * behaviour, see PROJECT-HANDOFF.md gotcha #6 re: @media print
 * rules needing to target .site-nav, not #site-nav, for exactly
 * this reason).
 *
 * SPORTS below is the ONE place a new sport gets added to the
 * global nav — every hub page picks it up automatically via
 * hub-loader.js, with no per-page editing needed.
 *
 * Loaded unversioned (no ?v=) as its own separate script tag on
 * each hub page — kept OUT of hub-loader.js deliberately, since it
 * needs to run after the DOM has the #site-nav div, and
 * hub-loader.js runs earlier, in <head>.
 */
(function () {
  var BASE = "https://captainkirk666.github.io/sports-tables";

  var SPORTS = [
    { key: "f1",  label: "F1",  href: BASE + "/table/f1.html" },
    { key: "epl", label: "EPL", href: BASE + "/table/epl-dark.html" }
  ];

  var PAGES = [
    { key: "home",  label: "Home",          href: BASE + "/index.html" },
    { key: "style", label: "Style options", href: BASE + "/style.html" },
    { key: "embed", label: "Embed guide",   href: BASE + "/docs.html" }
  ];

  var mount = document.getElementById("site-nav");
  if (!mount) return;
  var active = mount.getAttribute("data-active") || "";

  var sportLinksHtml = SPORTS.map(function (s) {
    var cls = "sport-link" + (s.key === active ? " active" : "");
    return '<a href="' + s.href + '" class="' + cls + '">' + s.label + '</a>';
  }).join("");

  var pageLinksHtml = PAGES.map(function (p) {
    var cls = "nav-link" + (p.key === active ? " active" : "");
    return '<li><a href="' + p.href + '" class="' + cls + '">' + p.label + '</a></li>';
  }).join("");

  mount.outerHTML =
    '<nav class="site-nav" data-active="' + active + '">' +
      '<a href="' + BASE + '/index.html" class="brand">Live<span>Tables</span></a>' +
      '<div class="sport-links">' + sportLinksHtml + '</div>' +
      '<ul>' + pageLinksHtml + '</ul>' +
    '</nav>';
})();
