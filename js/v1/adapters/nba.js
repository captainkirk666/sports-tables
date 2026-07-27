/**
 * NBA adapter — calls YOUR Worker proxy, not the API-Sports endpoint
 * directly. The Worker holds the secret key server-side; this file
 * only ever talks to your own domain.
 *
 * IMPORTANT: update WORKER_BASE below once your Worker is deployed.
 *
 * NOTE ON FIELD NAMES: api-sports' NBA standings response shape can
 * vary by season/endpoint version. The field paths below (win.total,
 * conference.rank, etc.) reflect their typical v2 standings schema —
 * once your Worker is live, fetch it once and confirm these paths
 * match the real response before relying on this in production.
 */

const WORKER_BASE = "https://sports-proxy.captainkirk666.workers.dev";

const NBA_ADAPTERS = {
  standings: {
    sourceUrl: `${WORKER_BASE}/nba/standings`,
    extract: data => data.response || [],
    columns: [
      { key: "rank",   label: "Rank",   get: r => r.conference?.rank ?? "—", emphasis: true },
      { key: "team",   label: "Team",   get: r => r.team?.name ?? "—", compactGet: r => r.team?.code ?? r.team?.name, logo: r => r.team?.logo },
      { key: "wins",   label: "W",      get: r => r.win?.total ?? 0, numeric: true },
      { key: "losses", label: "L",      get: r => r.loss?.total ?? 0, numeric: true },
      { key: "pct",    label: "Pct",    get: r => r.win?.percentage ?? "—", numeric: true },
    ],
  },
};
