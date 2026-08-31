/**
 * NFL adapters — one export per table type.
 *
 * Data source: ESPN's undocumented "site" API
 * (site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard).
 * No key, no signup, confirmed CORS-friendly by wide community use
 * (see handoff doc — every guide/tutorial found calls it with a
 * plain browser fetch(), unlike football-data.org/API-Football which
 * are documented server-side-only). This is unofficial and
 * undocumented — it's what powers espn.com itself, not a published
 * developer API — so it can change shape without notice. Be a good
 * citizen: don't poll aggressively, cache what you can.
 *
 * NOTE: calling the scoreboard endpoint with no query params returns
 * only the CURRENT calendar week's games. Add ?dates=YYYYMMDD or
 * ?week=N to the sourceUrl below if a future table/card needs a
 * different week.
 *
 * Standings uses a separate endpoint —
 * site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3 —
 * confirmed live to return real inline team data (not $ref pointers,
 * an earlier concern before checking), same Conference -> Division
 * -> teams nesting as the NBA adapter already handles.
 *
 * scores is a fixture-list CARD (see cards.js), not a table — same
 * variant EPL's "EPL Matches" uses, since team-vs-team with a score
 * reads more naturally than a table for this kind of data.
 */


/**
 * ESPN's competitors array isn't guaranteed to be in [home, away]
 * order — each competitor object carries its own homeAway field.
 * This finds the correct one defensively rather than assuming
 * index 0/1, which is the same "don't trust positional assumptions"
 * lesson as F1's SprintResults handling.
 */
function nflCompetitor(event, side) {
  const competitors = event.competitions[0].competitors || [];
  return competitors.find(c => c.homeAway === side) || null;
}


/**
 * Score is only meaningful once the game has started. Pre-game,
 * ESPN still returns score: "0" for both sides, which would
 * misleadingly show "0 - 0" — so this checks status state first.
 */
function nflScoreDisplay(event) {
  const state = event.status.type.state; // "pre" | "in" | "post"
  if (state === "pre") return "–";
  const away = nflCompetitor(event, "away");
  const home = nflCompetitor(event, "home");
  return `${away ? away.score : "?"} - ${home ? home.score : "?"}`;
}


/**
 * ESPN already provides a human-readable, US-timezone-formatted
 * string for scheduled games (status.type.shortDetail, e.g.
 * "9/13 - 1:00 PM EDT") — using that directly rather than
 * reformatting event.date ourselves avoids a whole timezone-bug
 * category for a US-audience site. In-progress and finished games
 * get their own live/final description instead.
 */
function nflStatusDisplay(event) {
  const status = event.status;
  const state = status.type.state;
  if (state === "in") {
    return `Q${status.period} ${status.displayClock}`;
  }
  if (state === "post") {
    return status.type.completed ? status.type.description : status.type.detail; // handles "Final", "Final/OT", postponed, etc.
  }
  return status.type.shortDetail; // pre-game: ESPN's own formatted date/time string
}


/**
 * Same helper pattern as the NBA adapter's getStatValue/getStatDisplay,
 * prefixed nfl* to avoid any global-scope collision if a page ever
 * loads more than one sport's adapter at once (adapter-loader.js only
 * loads one per data-sport, but these are plain globals, not modules,
 * same as every other adapter file in this project).
 */
function nflStatValue(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.value : 0;
}
function nflStatDisplay(entry, name) {
  const stat = entry.stats.find(s => s.name === name);
  return stat ? stat.displayValue : "—";
}


/**
 * Weekday + day + month, e.g. "Sat 13 Sep" — no time, matching the
 * project-wide decision already applied to EPL's fixture list (time
 * is ambiguous to viewers unfamiliar with the displayed timezone,
 * even though it renders correctly per-visitor via toLocaleString).
 * NFL's own status.type.shortDetail (used for the table-shaped
 * status column above) already includes a US-timezone time, but
 * this card follows the site-wide no-time convention instead for
 * consistency with EPL's card.
 */
function nflFormatGameDate(iso) {
  if (!iso) return "TBC";
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday} ${day} ${month}`;
}


const NFL_ADAPTERS = {
  /**
   * Flattens Conference -> Division -> teams into one 32-team list,
   * ranked by win percentage — same approach as the NBA adapter.
   *
   * NOTE: real NFL standings are conventionally shown split by
   * division (AFC East, AFC North, etc.), since that's what actually
   * determines playoff seeding, not one flat league-wide ladder. This
   * flat version mirrors the proven NBA pattern as a safe starting
   * point. Grouping into per-division sections would need tables.js
   * to support that first — worth checking before investing in it.
   */
  standings: {
    sourceUrl: "https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3",
    extract: data => {
      const teams = [];
      (data.children || []).forEach(conference => {
        (conference.children || []).forEach(division => {
          (division.standings?.entries || []).forEach(entry => teams.push(entry));
        });
      });
      teams.sort((a, b) => nflStatValue(b, "winPercent") - nflStatValue(a, "winPercent"));
      teams.forEach((t, i) => { t._rank = i + 1; });
      return teams;
    },
    columns: [
      { key: "rank",   label: "Rank",   get: r => r._rank, emphasis: true },
      { key: "team",   label: "Team",   get: r => r.team.displayName, compactGet: r => r.team.shortDisplayName, logo: r => r.team.logos?.[0]?.href },
      { key: "wins",   label: "W",      get: r => nflStatDisplay(r, "wins"), numeric: true },
      { key: "losses", label: "L",      get: r => nflStatDisplay(r, "losses"), numeric: true },
      { key: "ties",   label: "T",      get: r => nflStatDisplay(r, "ties"), numeric: true },
      { key: "pct",    label: "Pct",    get: r => nflStatDisplay(r, "winPercent"), numeric: true },
    ],
  },

  /**
   * Fixture-list card — same variant/row shape as EPL's
   * weekendFixtures, but genuinely simpler to build: NFL's
   * scoreboard endpoint already scopes to "the current week" on its
   * own with zero query params (confirmed live earlier — a bare
   * call returned exactly that week's games), so none of EPL's
   * 5-fetch date-window workaround is needed here. One plain
   * sourceUrl + extract, same pattern as the standings adapter
   * above — no fetch() escape hatch required.
   *
   * Superseded the earlier table-shaped "scores" adapter (columns:
   * away/home/score/status) — that version is gone, not kept
   * alongside this one. embed/nfl/scores.html and table/nfl.html's
   * config both need updating to match (see chat) if not already.
   */
  scores: {
    sourceUrl: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    extract: data => {
      const events = data.events || [];
      if (!events.length) return null;
      return {
        rows: events.map(e => {
          const comp = e.competitions[0];
          const home = nflCompetitor(e, "home");
          const away = nflCompetitor(e, "away");
          const state = e.status.type.state; // "pre" | "in" | "post"
          const finished = state === "post";
          const live = state === "in";
          return {
            homeName: home ? home.team.displayName : "—",
            awayName: away ? away.team.displayName : "—",
            homeNameShort: home ? home.team.shortDisplayName : "—",
            awayNameShort: away ? away.team.shortDisplayName : "—",
            homeCrest: home ? home.team.logo : null,
            awayCrest: away ? away.team.logo : null,
            finished, live,
            homeScore: finished || live ? (home ? home.score : null) : null,
            awayScore: finished || live ? (away ? away.score : null) : null,
            kickoff: nflFormatGameDate(e.date),
            venue: (comp.venue && comp.venue.fullName) || null,
          };
        }),
      };
    },
  },
};
