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

/**
 * Jolpica/Ergast's race schedule uses its own country-name format
 * for each circuit (e.g. "UK", "USA", "UAE") which doesn't match the
 * full-country-name map in the shared flags.js (which expects
 * "United Kingdom", "United States", etc.) — so, same pattern as
 * F1_NATIONALITY_TO_ISO above, that translation lives here rather
 * than editing the shared file. Add to this as new circuits appear
 * on the calendar that aren't listed yet.
 */
const F1_CIRCUIT_COUNTRY_TO_ISO = {
  "Bahrain": "bh",
  "Saudi Arabia": "sa",
  "Australia": "au",
  "Japan": "jp",
  "China": "cn",
  "USA": "us",
  "Italy": "it",
  "Monaco": "mc",
  "Canada": "ca",
  "Spain": "es",
  "Austria": "at",
  "UK": "gb",
  "Hungary": "hu",
  "Belgium": "be",
  "Netherlands": "nl",
  "Azerbaijan": "az",
  "Singapore": "sg",
  "Mexico": "mx",
  "Brazil": "br",
  "Qatar": "qa",
  "UAE": "ae",
  "Portugal": "pt",
  "France": "fr",
  "Germany": "de",
  "Turkey": "tr",
  "Russia": "ru",
  "Malaysia": "my",
  "India": "in",
  "South Korea": "kr",
  "South Africa": "za",
};

function f1CircuitFlagUrl(country) {
  return flagUrlByIso(F1_CIRCUIT_COUNTRY_TO_ISO[country]);
}

/**
 * Jolpica/Ergast returns schedule dates/times as separate ISO-ish
 * strings ("2026-09-14" and "14:00:00Z") — these format them into
 * something readable. Times are always UTC per the API, so labelled
 * as such rather than silently showing a UTC time with no
 * indication of the timezone.
 */
function formatRaceDate(dateStr) {
  if (!dateStr) return "TBC";
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function formatRaceTime(timeStr) {
  if (!timeStr) return "TBC";
  return `${timeStr.slice(0, 5)} UTC`;
}

/**
 * Shared by both nextRace (table) and nextRaceCard (card) below —
 * Jolpica has no dedicated "next race" endpoint, so this finds the
 * first race in the season schedule whose date/time hasn't passed
 * yet. Kept as one function so the date-comparison logic only
 * exists in one place, used by two different presentation adapters.
 */
function f1FindNextRace(data) {
  const races = data.MRData.RaceTable.Races || [];
  const now = new Date();
  return races.find(r => {
    const raceDateTime = new Date(`${r.date}T${r.time || '00:00:00Z'}`);
    return raceDateTime >= now;
  }) || null;
}

const F1_ADAPTERS = {
  drivers: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].DriverStandings,
    columns: [
      { key: "pos",    label: "Pos", compactLabel: "#", get: d => d.position, emphasis: true },
      { key: "driver", label: "Driver", get: d => `${d.Driver.givenName} ${d.Driver.familyName}`, compactGet: d => d.Driver.familyName, shortenAt: ["compact", "standard"], flag: d => flagUrl(d.Driver.nationality) },
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

  /* Table-shaped version — a single-row table, used by
     embed/f1/next-race.html via tables.js/initTable(). */
  nextRace: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current.json",
    extract: data => {
      const r = f1FindNextRace(data);
      return r ? [r] : [];
    },
    columns: [
      { key: "round",    label: "Round", compactLabel: "#", get: r => r.round, emphasis: true },
      { key: "race",     label: "Race",  get: r => r.raceName },
      { key: "circuit",  label: "Circuit", get: r => r.Circuit.circuitName },
      { key: "location", label: "Location", get: r => `${r.Circuit.Location.locality}, ${r.Circuit.Location.country}`, flag: r => f1CircuitFlagUrl(r.Circuit.Location.country) },
      { key: "date",     label: "Date",  get: r => formatRaceDate(r.date) },
      { key: "time",     label: "Time",  get: r => formatRaceTime(r.time) },
    ],
  },

  /* Card-shaped version — a single object, used by
     embed/f1/next-race-card.html via cards.js/initCard(). Same
     underlying data (f1FindNextRace) as nextRace above, just
     reshaped for the Preview card's expected field names instead of
     a columns array. F1 has no second "team", so logoLeft/logoRight
     are left out — the card handles that gracefully. */
  nextRaceCard: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current.json",
    extract: data => {
      const r = f1FindNextRace(data);
      if (!r) return null;
      return {
        headline: r.raceName,
        flag: f1CircuitFlagUrl(r.Circuit.Location.country),
        location: `${r.Circuit.Location.locality}, ${r.Circuit.Location.country}`,
        date: formatRaceDate(r.date),
        time: formatRaceTime(r.time),
      };
    },
  },
};
