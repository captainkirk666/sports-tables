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

/**
 * Whole-league "next kickoff" card — deliberately NOT scoped to any
 * one team. ESPN's scoreboard endpoint, called with no ?dates= param
 * at all, auto-advances to the next matchday that actually has
 * scheduled games (verified directly against the live endpoint —
 * during pre-season it returned the season's opening weekend rather
 * than an empty "today"). That self-advancing behaviour is exactly
 * what a single-fetch "next kickoff, any two teams" card needs, so
 * this reuses the bare scoreboard URL with no date filtering.
 *
 * A per-team version of this card (e.g. "Arsenal's next match")
 * would need the /teams/{id}/schedule endpoint instead — deliberately
 * not used here, since multiple reports elsewhere show that endpoint
 * going dead/changing shape without notice. Worth revisiting if a
 * team-scoped card is wanted later, but re-verify it's alive first.
 */
function eplFindNextFixture(data) {
  const events = data.events || [];
  return events.find(e => {
    const comp = e.competitions && e.competitions[0];
    return !!(comp && comp.status && comp.status.type && comp.status.type.state === "pre");
  }) || null;
}
function eplCompetitor(comp, homeAway) {
  return (comp.competitors || []).find(c => c.homeAway === homeAway) || null;
}
/**
 * event.date is a single full ISO datetime ("2026-08-21T19:00Z"),
 * unlike F1/Jolpica's separate date+time strings — one formatter
 * pair covers both, using the viewer's local timezone (soccer
 * kickoffs are widely reported in local time, unlike F1's UTC
 * convention on the timing sheets).
 */
function eplFormatMatchDate(iso) {
  if (!iso) return "TBC";
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function eplFormatMatchTime(iso) {
  if (!iso) return "TBC";
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
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

  /* Card-shaped version — a single object, used by
     embed/epl/next-fixture-card.html via cards.js/initCard(). Whole-
     league scope: whichever two teams kick off next, not any one
     team's fixture — see eplFindNextFixture() above for why. */
  nextFixtureCard: {
    sourceUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
    extract: data => {
      const event = eplFindNextFixture(data);
      if (!event) return null;
      const comp = event.competitions[0];
      const home = eplCompetitor(comp, "home");
      const away = eplCompetitor(comp, "away");
      if (!home || !away) return null;
      const venue = comp.venue || {};
      const city = venue.address && venue.address.city;
      return {
        headline: `${home.team.shortDisplayName} v ${away.team.shortDisplayName}`,
        logoLeft: home.team.logo || null,
        logoRight: away.team.logo || null,
        location: city ? `${venue.fullName}, ${city}` : (venue.fullName || "Venue TBC"),
        date: eplFormatMatchDate(event.date),
        time: eplFormatMatchTime(event.date),
      };
    },
  },
};
