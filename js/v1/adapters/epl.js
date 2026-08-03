/**
 * EPL adapter — Premier League table, via ESPN's free undocumented
 * standings endpoint (no key required):
 *   https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings
 * (must be /apis/v2/, not /apis/site/v2/ — the latter returns an
 * empty object for this endpoint).
 *
 * Unlike F1's Jolpica API, ESPN DOES provide team crest URLs
 * directly (team.logos[0].href, hosted on ESPN's own CDN) — no
 * self-hosted logo files needed here, same pattern as flagcdn.com
 * for nationality flags elsewhere on this site: hotlinked directly,
 * not downloaded/stored locally.
 */

/**
 * ESPN returns each team's stats as an array of { name, value,
 * displayValue, ... } objects rather than a flat object — these
 * pull a specific stat out by its `name`. displayValue is used for
 * pointDifferential specifically since ESPN already formats it with
 * a +/- sign ("+44", "-37"), which value (a plain number) doesn't.
 */
function eplStat(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.value : null;
}
function eplStatDisplay(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.displayValue : null;
}
function eplCrest(entry) {
  return (entry.team.logos && entry.team.logos[0]) ? entry.team.logos[0].href : null;
}

const EPL_ADAPTERS = {
  table: {
    sourceUrl: "https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings",
    extract: data => {
      const group = data.children && data.children[0];
      return (group && group.standings && group.standings.entries) || [];
    },
    columns: [
      { key: "pos",     label: "Pos", compactLabel: "#", get: e => eplStat(e, "rank"), emphasis: true },
      { key: "team",    label: "Team", get: e => e.team.displayName, compactGet: e => e.team.shortDisplayName, shortenAt: ["compact", "standard"], logo: e => eplCrest(e) },
      { key: "played",  label: "P",   get: e => eplStat(e, "gamesPlayed"), numeric: true },
      { key: "won",     label: "W",   get: e => eplStat(e, "wins"), numeric: true },
      { key: "drawn",   label: "D",   get: e => eplStat(e, "ties"), numeric: true },
      { key: "lost",    label: "L",   get: e => eplStat(e, "losses"), numeric: true },
      { key: "for",     label: "F",   get: e => eplStat(e, "pointsFor"), numeric: true },
      { key: "against", label: "A",   get: e => eplStat(e, "pointsAgainst"), numeric: true },
      { key: "gd",      label: "GD",  get: e => eplStatDisplay(e, "pointDifferential"), numeric: true },
      { key: "points",  label: "Pts", get: e => eplStat(e, "points"), numeric: true },
    ],
  },
};
