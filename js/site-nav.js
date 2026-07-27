/**
 * Site navbar — single config, rendered on every site page (not embed pages).
 *
 * Usage: <div id="site-nav"></div> then <script src="js/site-nav.js"></script>
 * Pass the current page's key via a data attribute so the active link highlights:
 *   <div id="site-nav" data-active="home"></div>
 */

const SITE_BASE = "https://captainkirk666.github.io/sports-tables";

const NAV_LINKS = [
  { key: "home", label: "Home", href: `${SITE_BASE}/index.html` },
  { key: "style", label: "Style options", href: `${SITE_BASE}/style.html` },
  { key: "docs", label: "Embed guide", href: `${SITE_BASE}/docs.html` },
];

function renderSiteNav() {
  const mount = document.getElementById('site-nav');
  if (!mount) return;
  const active = mount.dataset.active || '';

  mount.outerHTML = `
    <nav class="site-nav">
      <a class="brand" href="${SITE_BASE}/index.html">Live<span>Tables</span></a>
      <ul>
        ${NAV_LINKS.map(link => `
          <li>
            <a class="nav-link${link.key === active ? ' active' : ''}" href="${link.href}">
              ${link.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </nav>
  `;
}

renderSiteNav();
