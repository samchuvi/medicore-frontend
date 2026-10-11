// The platform's own look — system name, colour, logo — set by the platform owner
// on the "Platform settings" screen and stored in the database. config.js holds the
// fallback shown until (or if) the saved settings can't be loaded.
import { useSyncExternalStore } from "react";
import { PLATFORM_NAME, PLATFORM_COLOR, PLATFORM_LOGO } from "./config";
import { applyBrand, isHex, setPlatformColor } from "./theme";
import { api } from "./shared";

const CACHE_KEY = "hms_platform_look";
const fallback = { name: PLATFORM_NAME, color: PLATFORM_COLOR, logo: PLATFORM_LOGO };
const merge = (p) => ({
  name: (p?.name || "").trim() || fallback.name,
  color: isHex(p?.color) ? p.color.toUpperCase() : fallback.color,
  logo: p?.logo || fallback.logo,
});

let state = (() => {
  try { return merge(JSON.parse(localStorage.getItem(CACHE_KEY))); } catch { return merge(null); } // cached copy → no flash on reload
})();
setPlatformColor(state.color);
const listeners = new Set();

export const getPlatform = () => state;
export function setPlatform(p) {
  state = merge(p);
  setPlatformColor(state.color);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch { /* storage unavailable — not critical */ }
  listeners.forEach((l) => l());
}
export const usePlatform = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getPlatform);

// Fetch the saved settings (public — works before login). Failure keeps what we have.
export function loadPlatform() {
  return api("/public/platform").then(setPlatform).catch(() => {});
}
export { applyBrand };
