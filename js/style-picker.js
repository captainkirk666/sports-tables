/**
 * Style picker for style.html
 *
 * Three tiers:
 *   1. Default   — no query params, black on white (the engine's baseline)
 *   2. Presets   — curated theme+accent combos we define
 *   3. Custom    — user picks light/dark + their own accent color
 *
 * All three ultimately just produce a query string
 * (?theme=dark&accent=RRGGBB) appended to the embed URL —
 * the engine (tables.js) already knows how to read that.
 */

const EMBED_BASE = "embed/f1/drivers.html";

const PRESETS = [
  { key: "red",   label: "Red",   theme: null, accent: "C4151C", swatch: "#C4151C" },
  { key: "green", label: "Green", theme: null, accent: "004225", swatch: "#004225" },
  { key: "blue",  label: "Blue",  theme: null, accent: "0156B2", swatch: "#0156B2" },
];

let state = { theme: null, accent: null };

function buildUrl() {
  const params = new URLSearchParams();
  if (state.theme) params.set("theme", state.theme);
  if (state.accent) params.set("accent", state.accent);
  const qs = params.toString();
  return qs ? `${EMBED_BASE}?${qs}` : EMBED_BASE;
}

function updatePreview() {
  const url = buildUrl();
  document.getElementById("preview-frame").src = url;

  const fullUrl = new URL(url, window.location.href).href;
  const code = `<iframe class="dt-embed" src="${fullUrl}"></iframe>`;
  document.getElementById("embed-code").textContent = code;
}

function selectTab(tab) {
  document.querySelectorAll(".tier-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tier-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`panel-${tab}`).classList.add("active");
  document.getElementById(`tab-${tab}`).classList.add("active");
}

function applyDefault() {
  state = { theme: null, accent: null };
  updatePreview();
}

function applyPreset(key) {
  const preset = PRESETS.find(p => p.key === key);
  if (!preset) return;
  state = { theme: preset.theme, accent: preset.accent };
  document.querySelectorAll(".preset-swatch").forEach(el =>
    el.classList.toggle("selected", el.dataset.key === key)
  );
  updatePreview();
}

function applyCustom() {
  const isDark = document.getElementById("custom-dark").checked;
  const color = document.getElementById("custom-color").value.replace("#", "");
  state = { theme: isDark ? "dark" : null, accent: color };
  updatePreview();
}

function renderPresetSwatches() {
  const mount = document.getElementById("preset-swatches");
  mount.innerHTML = PRESETS.map(p => `
    <button class="preset-swatch" data-key="${p.key}" style="--swatch-color:${p.swatch}" onclick="applyPreset('${p.key}')">
      <span class="swatch-dot"></span>
      <span>${p.label}</span>
    </button>
  `).join("");
}

function copyEmbedCode() {
  const text = document.getElementById("embed-code").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copy-btn");
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPresetSwatches();
  applyDefault();

  document.getElementById("custom-dark").addEventListener("change", applyCustom);
  document.getElementById("custom-color").addEventListener("input", applyCustom);
  document.getElementById("copy-btn").addEventListener("click", copyEmbedCode);
});
