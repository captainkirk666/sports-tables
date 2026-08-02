/**
 * Sport hub page — one page per sport, with a tab bar across the top
 * to switch between that sport's tables (Standings, Results, etc).
 * Everything below (style tabs, live preview, embed code, print
 * export) is shared and just re-renders for whichever table is active.
 *
 * Usage:
 *   initSportHub({
 *     sport: "F1",
 *     tables: [
 *       { key: "drivers", label: "Driver Standings", title: "F1 Driver Standings",
 *         embedHref: "../../embed/f1/drivers.html", sourceUrl: ..., adapter: ..., attribution: {...} },
 *       ...
 *     ]
 *   });
 */

const STYLE_PRESETS = [
  { key: "c1",  label: "Red",       theme: null, accent: "E10600", swatch: "#E10600" },
  { key: "c2",  label: "Orange",    theme: null, accent: "FF6A00", swatch: "#FF6A00" },
  { key: "c3",  label: "Yellow",    theme: null, accent: "FFC700", swatch: "#FFC700" },
  { key: "c4",  label: "Lime",      theme: null, accent: "A8E000", swatch: "#A8E000" },
  { key: "c5",  label: "Teal",      theme: null, accent: "00B894", swatch: "#00B894" },
  { key: "c6",  label: "Sky Blue",  theme: null, accent: "00BFFF", swatch: "#00BFFF" },
  { key: "c7",  label: "Blue",      theme: null, accent: "0057FF", swatch: "#0057FF" },
  { key: "c8",  label: "Navy",      theme: null, accent: "0A1D37", swatch: "#0A1D37" },
  { key: "c9",  label: "Green",     theme: null, accent: "00C853", swatch: "#00C853" },
  { key: "c10", label: "Aqua",      theme: null, accent: "00E5D2", swatch: "#00E5D2" },
  { key: "c11", label: "Indigo",    theme: null, accent: "1A4DFF", swatch: "#1A4DFF" },
  { key: "c12", label: "Black",     theme: null, accent: "0D0D0D", swatch: "#0D0D0D" },
];

/**
 * STANDARD SIZE ARCHITECTURE — applies to every sport, not just F1.
 * Every new sport's adapter should be built to work with these same
 * three tiers, so the whole site stays consistent:
 *
 *   compact  — exactly 3 fields: Pos/Rank, primary name, Points.
 *              No secondary/affiliation columns (e.g. team on a
 *              driver table), no logos-as-separate-column, no extra
 *              stats. If a table's own identity IS the "team" (e.g.
 *              Constructor Standings), that name stays — it's not
 *              secondary there, it's the row's whole identity.
 *   standard — a fuller view, most columns, still readable narrow.
 *   full     — everything the table has.
 *
 * When adding a new sport, give each table's columns stable `key`s
 * and list which ones belong in each tier below.
 */
const SIZE_PRESETS = {
  compact:  { label: "Compact (1 col)",  widthCm: 5,  maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "points", "pts"] },
  standard: { label: "Standard (2 col)", widthCm: 12, maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "team", "nationality", "played", "laps", "time", "fastest", "points", "wins", "losses", "draws", "gd", "pct"] },
  full:     { label: "Full width",       widthCm: 18, maxRows: null,
    columns: ["pos", "rank", "driver", "constructor", "team", "nationality", "played", "laps", "time", "fastest", "points", "wins", "losses", "draws", "gd", "pct"] },
};

co
