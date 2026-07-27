/**
 * NBA adapter — uses ESPN's free, undocumented endpoint, same pattern
 * as EPL. No API key or backend Worker needed.
 *
 * NBA's standings come nested as Conference -> Division -> teams,
 * so extract() flattens all of that into one list, sorted by win
 * percentage, and assigns each team a simple 1-30 rank for display.
 */

function getStatValue(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.value : 0;
}

function getStatDisplay(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.displayValue : "—";
}

const NBA_ADAPTERS = {
  standings: {
    sourceUrl: "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?level=3",
    extract: data => {
      const teams = [];
      (data.children || []).forEach(conference => {
        (conference.children || []).forEach(division => {
          (division.standings?.entries || []).forEach(entry => teams.push(entry));
        });
      });
      teams.sort((a, b) => getStatValue(b, "winPercent") - getStatValue(a, "winPercent"));
      teams.forEach((t, i) => { t._rank = i + 1; });
      return teams;
    },
    columns: [
      { key: "rank",   label: "Rank",   get: r => r._rank, emphasis: true },
      { key: "team",   label: "Team",   get: r => r.team.displayName, compactGet: r => r.team.shortDisplayName, logo: r => r.team.logos?.[0]?.href },
      { key: "wins",   label: "W",      get: r => getStatDisplay(r, "wins"), numeric: true },
      { key: "losses", label: "L",      get: r => getStatDisplay(r, "losses"), numeric: true },
      { key: "pct",    label: "Pct",    get: r => getStatDisplay(r, "winPercent"), numeric: true },
    ],
  },
};
