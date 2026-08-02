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
  return F1_TEAM_SHORT_NAMES[constructor.constructorId] || constructor.name;
}

/**
 * F1/Ergast returns nationality as a demonym ("British", "Dutch"),
 * a format specific to this API — so that translation lives here,
 * not in the shared flags.js. It resolves to an ISO code, then hands
 * off to the shared flagUrlByIso() builder in js/v1/flags.js.
 */
const F1_NATIONALITY_TO_ISO = {
  "British": "gb",
  "German": "de",
  "Dutch": "nl",
  "Spanish": "es",
  "Monegasque": "mc",
  "Mexican": "mx",
  "Finnish": "fi",
  "Australian": "au",
  "French": "fr",
  "Canadian": "ca",
  "Japanese": "jp",
  "Thai": "th",
  "Danish": "dk",
  "Argentine": "ar",
  "Argentinian": "ar",
  "Brazilian": "br",
  "Italian": "it",
  "New Zealander": "nz",
  "Austrian": "at",
  "Belgian": "be",
  "Swiss": "ch",
  "Polish": "pl",
  "Russian": "ru",
  "Chinese": "cn",
  "Indian": "in",
  "American": "us",
  "Portuguese": "pt",
  "Swedish": "se",
  "Indonesian": "id",
  "Malaysian": "my",
  "South African": "za",
  "Irish": "ie",
  "Hungarian": "hu",
  "Colombian": "co",
  "Venezuelan": "ve",
  "Uruguayan": "uy",
  "Chilean": "cl",
  "Czech": "cz",
  "Norwegian": "no",
};

function flagUrl(nationality) {
  return flagUrlByIso(F1_NATIONALITY_TO_ISO[nationality]);
}

const F1_ADAPTERS = {
  drivers: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].DriverStandings,
    columns: [
      { key: "pos",    label: "Pos", compactLabel: "#", get: d => d.position, emphasis: true },
      // shortenAt: which sizes should use compactGet instead of get().
      // Driver shortens (family name only) at both Compact and
      // Standard — Standard needs the extra room to hit its target
      // width. Defaults to ["compact"] if omitted (see Team below).
      { key: "driver", label: "Driver", get: d => `${d.Driver.givenName} ${d.Driver.familyName}`, compactGet: d => d.Driver.familyName, shortenAt: ["compact", "standard"], flag: d => flagUrl(d.Driver.nationality) },
      // Team's compactGet blanks the cell entirely — that's a
      // Compact-only behaviour (Compact drops secondary columns),
      // so shortenAt stays at the default ["compact"] rather than
      // also blanking Team at Standard.
      { key: "team",   label: "Team",   get: d => f1ShortTeamName(d.Constructors[0]), compactGet: () => "", shortenAt: ["compact"], logo: d => f1TeamLogo(d.Constructors[0]) },
      { key: "points", label: "PTS", get: d => d.points, numeric: true },
      { key: "wins",   label: "Wins",   get: d => d.wins, numeric: true },
    ],
  },

  constructors: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings,
    columns: [
      { key: "pos",         label: "Pos", compactLabel: "#", get: c => c.position, emphasis: true },
      { key: "constructor", label: "Team",  get: c => f1ShortTeamName(c.Constructor), logo: c => f1TeamLogo(c.Constructor) },
      { key: "nationality", label: "Nationality",  get: c => c.Constructor.nationality, flag: c => flagUrl(c.Constructor.nationality) },
      { key: "points",      label: "PTS",       get: c => c.points, numeric: true },
      { key: "wins",        label: "Wins",         get: c => c.wins, numeric: true },
    ],
  },
  raceResults: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/last/results.json",
    extract: data => {
      const races = data.MRData.RaceTable.Races;
      return races && races.length ? races[0].Results : [];
    },
    columns: [
      { key: "pos",      label: "Pos", compactLabel: "#", get: r => r.position, emphasis: true },
      { key: "driver",   label: "Driver",   get: r => `${r.Driver.givenName} ${r.Driver.familyName}`, compactGet: r => r.Driver.familyName, shortenAt: ["compact", "standard"], flag: r => flagUrl(r.Driver.nationality) },
      { key: "team",     label: "Team",     get: r => f1ShortTeamName(r.Constructor), compactGet: () => "", shortenAt: ["compact"], logo: r => f1TeamLogo(r.Constructor) },
      { key: "laps",     label: "Laps",     get: r => r.laps, numeric: true },
      { key: "time",     label: "Time / Status", get: r => r.Time ? r.Time.time : r.status },
      { key: "fastest",  label: "Fastest Lap", get: r => r.FastestLap ? r.FastestLap.Time.time : "—" },
      { key: "points",   label: "PTS",   get: r => r.points, numeric: true },
    ],
  },
};
