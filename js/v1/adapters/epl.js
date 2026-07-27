/**
 * EPL adapter — uses ESPN's free, undocumented endpoint.
 * No API key required. Unofficial/unsupported by ESPN, so treat
 * as free-tier-quality: fine for now, worth a paid provider later
 * if this becomes business-critical.
 */

function getStat(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.displayValue : "—";
}

const EPL_ADAPTERS = {
  standings: {
    sourceUrl: "https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings",
    extract: data => data.children?.[0]?.standings?.entries || [],
    columns: [
      { key: "pos",     label: "Pos",    get: e => getStat(e, "rank"), emphasis: true },
      { key: "team",    label: "Team",   get: e => e.team.displayName, compactGet: e => e.team.shortDisplayName },
      { key: "played",  label: "P",      get: e => getStat(e, "gamesPlayed"), numeric: true },
      { key: "wins",    label: "W",      get: e => getStat(e, "wins"), numeric: true },
      { key: "draws",   label: "D",      get: e => getStat(e, "ties"), numeric: true },
      { key: "losses",  label: "L",      get: e => getStat(e, "losses"), numeric: true },
      { key: "gd",      label: "GD",     get: e => getStat(e, "pointDifferential"), numeric: true },
      { key: "points",  label: "Pts",    get: e => getStat(e, "points"), numeric: true },
    ],
  },
};

