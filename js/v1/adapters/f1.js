/**
 * F1 adapters — one export per table type.
 * In production these would point at YOUR cached API
 * (e.g. api.yoursite.com/f1/drivers), not the upstream
 * directly. Using the upstream here for demo purposes only.
 */

/**
 * Jolpica/Ergast provides no team logos at all, so this is a manual
 * mapping from constructor ID -> a local file you supply yourself.
 * See assets/logos/README.md for what to name each file.
 * Add an entry here for any constructor not yet listed.
 */
const F1_SITE_BASE = "https://captainkirk666.github.io/sports-tables";

const F1_TEAM_LOGOS = {
  mercedes: `${F1_SITE_BASE}/assets/logos/f1/teams/mercedes.png`,
  ferrari: `${F1_SITE_BASE}/assets/logos/f1/teams/ferrari.png`,
  red_bull: `${F1_SITE_BASE}/assets/logos/f1/teams/red-bull.png`,
  mclaren: `${F1_SITE_BASE}/assets/logos/f1/teams/mclaren.png`,
  aston_martin: `${F1_SITE_BASE}/assets/logos/f1/teams/aston-martin.png`,
  alpine: `${F1_SITE_BASE}/assets/logos/f1/teams/alpine.png`,
  williams: `${F1_SITE_BASE}/assets/logos/f1/teams/williams.png`,
  rb: `${F1_SITE_BASE}/assets/logos/f1/teams/racing-bulls.png`,
  audi: `${F1_SITE_BASE}/assets/logos/f1/teams/audi.png`,
  cadillac: `${F1_SITE_BASE}/assets/logos/f1/teams/cadillac.png`,
  haas: `${F1_SITE_BASE}/assets/logos/f1/teams/haas.png`,
};

function f1TeamLogo(constructor) {
  return F1_TEAM_LOGOS[constructor.constructorId] || null;
}

/**
 * Jolpica/Ergast returns each constructor's full sponsor-laden name
 * (e.g. "Cadillac F1 Team", "Oracle Red Bull Racing"), which is too
 * long for the table at any size — it wraps or overflows the layout,
 * especially in Constructor Standings where this IS the row's
 * identity column. This maps constructor ID -> a short display name.
 * Same key set as F1_TEAM_LOGOS above. Falls back to the raw API
 * name if a constructor isn't listed yet, so new teams degrade
 * gracefully instead of erroring.
 */
const F1_TEAM_SHORT_NAMES = {
  mercedes: "Mercedes",
  ferrari: "Ferrari",
  red_bull: "Red Bull",
  mclaren: "McLaren",
  aston_martin: "Aston Martin",
  alpine: "Alpine",
  williams: "Williams",
  rb: "RB",
  audi: "Audi",
  cadillac: "Cadillac",
  haas: "Haas",
};

function f1ShortTeamName(constructor) {
  return F1_TEAM_SHORT_NAMES
