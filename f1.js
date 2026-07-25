/**
 * F1 adapters — one export per table type.
 * In production these would point at YOUR cached API
 * (e.g. api.yoursite.com/f1/drivers), not the upstream
 * directly. Using the upstream here for demo purposes only.
 */

const F1_ADAPTERS = {
  drivers: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/driverStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].DriverStandings,
    columns: [
      { label: "Pos", get: d => d.position },
      { label: "Driver", get: d => `${d.Driver.givenName} ${d.Driver.familyName}` },
      { label: "Team", get: d => d.Constructors[0].name },
      { label: "Points", get: d => d.points, numeric: true },
      { label: "Wins", get: d => d.wins, numeric: true },
    ],
  },

  constructors: {
    sourceUrl: "https://api.jolpi.ca/ergast/f1/current/constructorStandings.json",
    extract: data => data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings,
    columns: [
      { label: "Pos", get: c => c.position },
      { label: "Constructor", get: c => c.Constructor.name },
      { label: "Nationality", get: c => c.Constructor.nationality },
      { label: "Points", get: c => c.points, numeric: true },
      { label: "Wins", get: c => c.wins, numeric: true },
    ],
  },
};
