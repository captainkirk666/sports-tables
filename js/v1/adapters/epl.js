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
 * Finds the chronologically-next unplayed fixture from a bare (no
 * ?dates=) scoreboard response — ESPN's endpoint self-advances to
 * the next matchday with any scheduled games when called with no
 * date filter at all (verified directly against the live endpoint).
 * Originally powered a standalone "next kickoff" card; that card's
 * been retired (superseded by the weekend fixture list) but this
 * function is still needed internally, as the anchor point
 * eplFetchWeekendEvents() uses to work out which Friday–Monday
 * window to fetch.
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
 * ---------- Weekend fixture list — back on ESPN ----------
 *
 * Was briefly built on football-data.org for its genuine `matchday`
 * grouping — reverted after discovering its free tier restricts
 * direct-browser CORS to localhost only, which a static site with no
 * backend can't work around without a paid plan. Back on ESPN,
 * which has proven reliably CORS-open all session, at the cost of
 * the correctness tradeoff already discussed at length: no round/
 * matchday field, so "this weekend's games" means a date-window
 * heuristic rather than an authoritative boundary. Also means no
 * "EPL RD XX" round label.
 *
 * Approach: fetch the bare scoreboard (no ?dates=) to find the next
 * unplayed fixture, same trick eplFindNextFixture() above already
 * uses — its date anchors a Friday–Monday window. Each of those 4
 * dates gets its own ?dates=YYYYMMDD fetch (the single-date query is
 * the one part of ESPN's date handling that's been reliable all
 * session), results merged and deduped by event id. 5 fetches total
 * per page load — more than football-data.org's 2, but ESPN has no
 * personal account quota to protect, so that's a non-issue here.
 *
 * Known residual risk, unchanged from the original discussion: a
 * rearranged fixture sitting outside Fri–Mon (a Tuesday cup-clash
 * reschedule, say) can still be missed, or — if IT happens to be the
 * chronologically-next unplayed fixture — can skew the anchor and
 * pull in the wrong week's window. Accepted, not solved.
 *
 * weekOffset (0 = this weekend, 1 = next, -1 = last, etc.) is wired
 * through now even though no UI drives it yet, same "future nav
 * costs one param, not a rewrite" reasoning as before — just shifted
 * from a matchday number to a week offset, since ESPN has no round
 * number to offset instead.
 */
function eplFormatDateParam(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}
function eplWeekendWindowDates(anchorDate) {
  const day = anchorDate.getDay(); // 0=Sun..6=Sat
  const daysSinceFriday = (day + 2) % 7;
  const friday = new Date(anchorDate);
  friday.setDate(anchorDate.getDate() - daysSinceFriday);
  const dates = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(friday);
    d.setDate(friday.getDate() + i);
    dates.push(eplFormatDateParam(d));
  }
  return dates;
}
/**
 * Weekday + day + month + time, e.g. "Sat 23 Aug, 15:00" — the
 * previous version was weekday + time only ("Sat 15:00"), which had
 * no actual calendar date at all, just which day-of-week — genuinely
 * ambiguous once a list spans several different weeks, not just
 * different days. Time itself needs no separate handling for viewer
 * timezone: toLocaleTimeString() without an explicit timeZone
 * already renders in whatever timezone the visitor's own browser is
 * set to — that was already correct, just not obviously so.
 */
function eplFormatKickoffDateTime(iso) {
  if (!iso) return "TBC";
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${day} ${month}, ${time}`;
}
function eplFetchWeekendEvents(weekOffset) {
  const base = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard";
  return fetch(base)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(anchorData => {
      const anchorEvent = eplFindNextFixture(anchorData);
      const anchor = anchorEvent ? new Date(anchorEvent.date) : new Date();
      if (weekOffset) anchor.setDate(anchor.getDate() + weekOffset * 7);
      const dates = eplWeekendWindowDates(anchor);
      return Promise.all(dates.map(d =>
        fetch(`${base}?dates=${d}`).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
      ));
    })
    .then(responses => {
      const seen = new Set();
      const events = [];
      responses.forEach(data => {
        (data.events || []).forEach(e => {
          if (!seen.has(e.id)) {
            seen.add(e.id);
            events.push(e);
          }
        });
      });
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      return events;
    });
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

  /* Card-shaped "next kickoff" adapter used to live here
     (nextFixtureCard) — removed, superseded by weekendFixtures
     below, which shows the same information (and more) as part of
     the full weekend list. embed/epl/next-fixture-card.html and its
     "Next Fixture" tab in table/epl.html were removed alongside it. */

  /* Full-width-only weekend fixture list — see the big comment block
     above for the ESPN day-window approach and its known limits.
     Uses the fetch() escape hatch (see cards.js/sport-hub.js) since
     this needs 5 sequential calls, not one plain GET. weekOffset:
     0 = this weekend (default), 1 = next, -1 = last, etc. — not
     wired to any UI control yet, see the comment above for why it's
     here anyway. */
  weekendFixtures(weekOffset) {
    return {
      fetch: () => eplFetchWeekendEvents(weekOffset),
      extract: events => {
        if (!events.length) return null;
        return {
          rows: events.map(e => {
            const comp = e.competitions[0];
            const home = eplCompetitor(comp, "home");
            const away = eplCompetitor(comp, "away");
            const state = comp.status.type.state; // "pre" | "in" | "post"
            const finished = state === "post";
            const live = state === "in";
            return {
              homeName: home.team.displayName,
              awayName: away.team.displayName,
              homeNameShort: home.team.shortDisplayName,
              awayNameShort: away.team.shortDisplayName,
              homeCrest: home.team.logo || null,
              awayCrest: away.team.logo || null,
              finished, live,
              homeScore: finished || live ? home.score : null,
              awayScore: finished || live ? away.score : null,
              kickoff: eplFormatKickoffDateTime(e.date),
              venue: (comp.venue && comp.venue.fullName) || null,
            };
          }),
        };
      },
    };
  },
};
