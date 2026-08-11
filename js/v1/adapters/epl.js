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
 * Fixture card date format: "Saturday 6 August, 2026" — day-of-week
 * plus ordinal day plus full month, no time (the fixture card design
 * doesn't show kickoff time, only the date and venue). Mixed case
 * here deliberately, same convention as dt-title elsewhere on the
 * site — cards.css applies text-transform via CSS, not baked into
 * the string, so this stays reusable if a future context wants
 * normal case.
 */
function eplOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
function eplFormatFixtureDate(iso) {
  if (!iso) return "Date TBC";
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = d.toLocaleDateString('en-GB', { month: 'long' });
  const day = d.getDate();
  return `${weekday} ${day}${eplOrdinal(day)} ${month}, ${d.getFullYear()}`;
}
/**
 * Short form for the Compact card size only — "Sat, 22nd Aug", no
 * year. Full/Standard keep the long form above (renderFixtureCard()
 * in cards.js picks between the two based on the current
 * [data-dt-size]).
 */
function eplFormatFixtureDateShort(iso) {
  if (!iso) return "TBC";
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const day = d.getDate();
  return `${weekday}, ${day}${eplOrdinal(day)} ${month}`;
}

/**
 * ---------- Weekend fixture list — football-data.org, not ESPN ----------
 *
 * Deliberately a SEPARATE data source from everything above. ESPN's
 * hidden API has no round/matchday concept at all for soccer
 * (confirmed earlier) — so a "give me this whole round" query isn't
 * possible there without guessing a date window, which risks
 * missing rearranged fixtures or misattributing a stray postponed
 * game to the wrong round. football-data.org has a genuine
 * `matchday` integer, directly filterable, so this whole class of
 * bug is structurally avoided rather than mitigated.
 *
 * Tradeoffs that come with that switch, on the record here rather
 * than buried in a comment nobody reads:
 *   - Requires a registered API token (X-Auth-Token header). Since
 *     this is a fully static site with no backend, that token lives
 *     directly in this file, in plain view to anyone who looks at
 *     page source. Accepted deliberately, not an oversight.
 *   - The free tier's 10 requests/minute is shared across the
 *     ENTIRE account — i.e. across every visitor's browser hitting
 *     this card, not 10/min per visitor. This card makes 2 calls per
 *     load (see fetch() below) — 2 calls, not 1, because a
 *     single-call, status=SCHEDULED-only version would have excluded
 *     already-finished games from the current round, breaking the
 *     "scores fill in automatically as the weekend progresses"
 *     requirement. Correctness costs a call.
 */
const FD_API_BASE = "https://api.football-data.org/v4";
const FD_AUTH_TOKEN = "ad83c42b25014d53ae9f15f325dd1907";

function fdFetch(path) {
  return fetch(FD_API_BASE + path, { headers: { "X-Auth-Token": FD_AUTH_TOKEN } })
    .then(res => {
      // football-data.org's own onboarding docs specifically ask
      // API consumers to watch these two headers to self-throttle
      // rather than just hitting 429 blindly — logged, not acted on
      // yet (no backoff/retry loop here), but visible in devtools
      // for anyone debugging a "why did this stop updating" report.
      const remaining = res.headers.get("X-Requests-Available-Minute");
      const reset = res.headers.get("X-RequestCounter-Reset");
      if (remaining !== null) {
        console.log(`football-data.org: ${remaining} requests left this minute (resets in ${reset}s)`);
      }
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        throw new Error(`Rate limited — retry after ${retryAfter || "a few"}s`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
}

/**
 * event.goals[] entries: { minute, team: { id, name }, scorer: { name }, ... }
 * Grouped per team, joined "Kane '26, Rooney '43" — matches the
 * mockup's scorer-line format exactly. ownGoal/penalty aren't
 * called out separately; revisit if that distinction turns out to
 * matter visually.
 */
function fdScorerLine(match, teamId) {
  const goals = (match.goals || []).filter(g => g.team && g.team.id === teamId);
  if (!goals.length) return null;
  return goals.map(g => `${(g.scorer && g.scorer.name) || "?"} '${g.minute}`).join(", ");
}

function fdFormatKickoff(iso) {
  if (!iso) return "TBC";
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
     embed/epl/next-fixture-card.html via cards.js/initCard()'s
     "fixture" variant. Whole-league scope: whichever two teams kick
     off next, not any one team's fixture — see eplFindNextFixture()
     above for why. No round/matchweek number — ESPN's hidden API
     doesn't expose one for soccer (confirmed against the live
     endpoint and corroborated by other API consumers hitting the
     same gap), so the card's eyebrow is just the static "EPL" label,
     set in the embed page rather than computed here.

     dateShort/venueShort are ONLY used at Compact size (see
     renderFixtureCard() in cards.js) — Full/Standard use date/venue,
     the fuller forms. */
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
        homeName: home.team.shortDisplayName,
        awayName: away.team.shortDisplayName,
        homeCrest: home.team.logo || null,
        awayCrest: away.team.logo || null,
        date: eplFormatFixtureDate(event.date),
        dateShort: eplFormatFixtureDateShort(event.date),
        venue: city ? `${venue.fullName}, ${city}` : (venue.fullName || null),
        venueShort: venue.fullName || null,
      };
    },
  },

  /* Full-width-only weekend fixture list — see the big comment block
     above for why this is a different data source (football-data.org)
     from every other adapter in this file. Uses the fetch() escape
     hatch rather than a plain sourceUrl — see cards.js/sport-hub.js
     for how that's dispatched — because this needs two sequential
     authenticated calls, not one plain GET.

     Accepts an optional matchday number so a future "this week / next
     week" control can just pass a different value in rather than
     needing any rework here — see EPL_ADAPTERS.weekendFixtures(N)
     below; called with no argument, it resolves the CURRENT matchday
     itself via the Competition resource. */
  weekendFixtures(matchday) {
    return {
      fetch: () => {
        const resolveMatchday = matchday
          ? Promise.resolve(matchday)
          : fdFetch("/competitions/PL").then(comp => {
              const n = comp.currentSeason && comp.currentSeason.currentMatchday;
              if (!n) throw new Error("No current matchday available");
              return n;
            });
        return resolveMatchday.then(n =>
          fdFetch(`/competitions/PL/matches?matchday=${n}`).then(data => ({ ...data, matchday: n }))
        );
      },
      extract: data => {
        const matches = data.matches || [];
        if (!matches.length) return null;
        return {
          matchday: data.matchday,
          rows: matches.map(m => {
            const finished = m.status === "FINISHED";
            const live = m.status === "IN_PLAY" || m.status === "PAUSED";
            return {
              id: m.id,
              homeName: m.homeTeam.shortName || m.homeTeam.name,
              awayName: m.awayTeam.shortName || m.awayTeam.name,
              homeCrest: m.homeTeam.crest || null,
              awayCrest: m.awayTeam.crest || null,
              finished, live,
              homeScore: finished || live ? m.score.fullTime.home : null,
              awayScore: finished || live ? m.score.fullTime.away : null,
              homeScorers: finished ? fdScorerLine(m, m.homeTeam.id) : null,
              awayScorers: finished ? fdScorerLine(m, m.awayTeam.id) : null,
              kickoff: fdFormatKickoff(m.utcDate),
              venue: m.venue || null,
            };
          }),
        };
      },
    };
  },
};
