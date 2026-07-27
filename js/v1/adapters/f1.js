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
  rb: `${F1_SITE_BASE}/assets/logos/f1/teams/rb.png`,
  sauber: `${F1_SITE_BASE}/assets/logos/f1/teams/sauber.png`,
  haas: `${F1_SITE_BASE}/assets/logos/f1/teams/haas.png`,
};

function f1TeamLogo(constructor) {
  return F1_TEAM_LOGOS[constructor.constructorId] || null;
}

const F1_ADAPTERS = {
  drivers: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].DriverStandings,
    columns: [
      { key: "pos",    label: "Pos",    get: d => d.position, emphasis: true },
      { key: "driver", label: "Driver", get: d => `${d.Driver.givenName} ${d.Driver.familyName}`, compactGet: d => d.Driver.familyName },
      { key: "team",   label: "Team",   get: d => d.Constructors[0].name, logo: d => f1TeamLogo(d.Constructors[0]) },
      { key: "points", label: "Points", get: d => d.points, numeric: true },
      { key: "wins",   label: "Wins",   get: d => d.wins, numeric: true },
    ],
  },

  constructors: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings,
    columns: [
      { key: "pos",         label: "Pos",          get: c => c.position, emphasis: true },
      { key: "constructor", label: "Constructor",  get: c => c.Constructor.name, logo: c => f1TeamLogo(c.Constructor) },
      { key: "nationality", label: "Nationality",  get: c => c.Constructor.nationality },
      { key: "points",      label: "Points",       get: c => c.points, numeric: true },
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
      { key: "pos",      label: "Pos",      get: r => r.position, emphasis: true },
      { key: "driver",   label: "Driver",   get: r => `${r.Driver.givenName} ${r.Driver.familyName}`, compactGet: r => r.Driver.familyName },
      { key: "team",     label: "Team",     get: r => r.Constructor.name, logo: r => f1TeamLogo(r.Constructor) },
      { key: "laps",     label: "Laps",     get: r => r.laps, numeric: true },
      { key: "time",     label: "Time / Status", get: r => r.Time ? r.Time.time : r.status },
      { key: "fastest",  label: "Fastest Lap", get: r => r.FastestLap ? r.FastestLap.Time.time : "—" },
      { key: "points",   label: "Points",   get: r => r.points, numeric: true },
    ],
  },
};
