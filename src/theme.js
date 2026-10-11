// Runtime colour theme. Every screen uses CSS variables (--brand, --brand-dark, …)
// instead of fixed greens, so one call re-colours the whole app — used for the
// platform colour, a hospital's own colour, and each hospital's login page.
import { PLATFORM_COLOR } from "./config";

// The platform colour currently in force (platform.js keeps this up to date).
let platformColor = PLATFORM_COLOR;
export const setPlatformColor = (c) => { platformColor = isHex(c) ? c.toUpperCase() : PLATFORM_COLOR; };

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || "");

// ── Light / dark mode ────────────────────────────────────────────────────────
// Every user can pick light or dark (remembered on their device). First visit follows
// the device's own setting.
const MODE_KEY = "hms_theme";
const systemDark = () => { try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; } };
let mode = (() => { try { const m = localStorage.getItem(MODE_KEY); if (m === "dark" || m === "light") return m; } catch { /* not critical */ } return systemDark() ? "dark" : "light"; })();
let lastBrand = null;
const modeListeners = new Set();
export const getMode = () => mode;
export function setMode(m) {
  mode = m === "dark" ? "dark" : "light";
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* not critical */ }
  applyBrand(lastBrand);
  modeListeners.forEach((l) => l());
}
export const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");
export const subscribeMode = (cb) => { modeListeners.add(cb); return () => modeListeners.delete(cb); };

// One main colour in, the whole family of shades out (for the current mode).
export function buildPalette(hex, m = mode) {
  const base = isHex(hex) ? hex.toUpperCase() : platformColor;
  const [h, s, l] = rgbToHsl(...hexToRgb(base));
  const light = m !== "dark";
  const t = Math.min(0.45, s);
  const common = {
    "--brand": base,
    "--brand-dark": hslToHex(h, Math.min(1, s * 0.9), l * 0.62),
    "--brand-accent": hslToHex(h, s, Math.min(0.62, l + 0.08)),
  };
  if (light) return {
    ...common,
    "--brand-tint": hslToHex(h, t, 0.86),
    "--brand-tint-light": hslToHex(h, t, 0.94),
    "--brand-tint-faint": hslToHex(h, t, 0.96),
    "--brand-text": base,
    "--brand-text-strong": common["--brand-dark"],
    "--page-bg": hslToHex(h, t, 0.94),
    "--surface": "#FFFFFF",
    "--text": "#263238", "--text-muted": "#546E7A", "--text-faint": "#90A4AE",
    "--danger": "#C62828", "--danger-bg": "#FFEBEE", "--danger-border": "#FFCDD2",
    "--info": "#1976D2", "--info-bg": "#E3F2FD", "--info-border": "#BBDEFB",
    "--warn": "#D97706", "--warn-bg": "#FFF8E1", "--warn-border": "#FFE082", "--warn-text": "#8D6E00",
    "--purple": "#6A1B9A", "--purple-bg": "#F3E5F5", "--teal": "#00838F", "--teal-bg": "#E0F7FA",
    "--neutral-bg": "#ECEFF1",
  };
  const ds = Math.min(0.3, s);
  return {
    ...common,
    "--brand-tint": hslToHex(h, ds, 0.27),
    "--brand-tint-light": hslToHex(h, ds, 0.2),
    "--brand-tint-faint": hslToHex(h, ds, 0.17),
    "--brand-text": hslToHex(h, Math.min(0.6, s), 0.68),
    "--brand-text-strong": hslToHex(h, Math.min(0.6, s), 0.8),
    "--page-bg": hslToHex(h, ds, 0.09),
    "--surface": hslToHex(h, Math.min(0.2, s), 0.135),
    "--text": "#E6ECEF", "--text-muted": "#AAB7BE", "--text-faint": "#7F8E96",
    "--danger": "#EF7B7B", "--danger-bg": "rgba(239,123,123,0.16)", "--danger-border": "rgba(239,123,123,0.35)",
    "--info": "#64B5F6", "--info-bg": "rgba(100,181,246,0.16)", "--info-border": "rgba(100,181,246,0.35)",
    "--warn": "#FFB74D", "--warn-bg": "rgba(255,183,77,0.16)", "--warn-border": "rgba(255,183,77,0.35)", "--warn-text": "#FFD54F",
    "--purple": "#CE93D8", "--purple-bg": "rgba(206,147,216,0.16)", "--teal": "#4DD0E1", "--teal-bg": "rgba(77,208,225,0.16)",
    "--neutral-bg": "rgba(255,255,255,0.08)",
  };
}

export function applyBrand(hex) {
  lastBrand = hex;
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  for (const [k, v] of Object.entries(buildPalette(hex))) root.style.setProperty(k, v);
}

// A hospital's saved colour, or the platform colour when it has none. (Hospitals
// created before colours were editable carry the old default green; treat it as "not set".)
export const effectiveColor = (c) => (isHex(c) && c.toUpperCase() !== "#2E7D32" ? c.toUpperCase() : platformColor);
