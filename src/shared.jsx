// Shared building blocks used by App.jsx and every feature module under
// src/modules/. Import from here instead of copying — one look-and-feel,
// one API helper, one translation helper.
import { useState, useSyncExternalStore } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { getMode, toggleMode, subscribeMode } from "./theme";
import { LANGUAGES } from "./i18n"; // also guarantees i18n is initialised before any module registers text

// Feature modules call this to ship their own English / French / Arabic text
// without touching the big i18n.js file:
//   addTranslations({ en:{ lab:{ title:"Lab" } }, fr:{...}, ar:{...} })
export function addTranslations(bundles) {
  Object.entries(bundles).forEach(([lng, resources]) =>
    i18n.addResourceBundle(lng, "translation", resources, true, false));
}
const API = import.meta.env.VITE_API_URL || 'https://medicore-backend-6q33.onrender.com/api';

// Registered by <App/> so any 401 from an expired/invalid token drops the user
// back to the login screen instead of leaving them on empty tables.
let onAuthError = null;
export function setAuthErrorHandler(fn) { onAuthError = fn; }

// ─── THEME ───────────────────────────────────────────────────────────────────
export const T = {
  green:      "var(--brand)",
  greenDark:  "var(--brand-dark)",
  greenLight: "var(--brand-tint-light)",
  greenMid:   "var(--brand-accent)",
  blue:       "var(--info)",
  blueDark:   "var(--info)",
  blueLight:  "var(--info-bg)",
  white:      "var(--surface)",
  bg:         "var(--page-bg)",
  text:       "var(--text)",
  textLight:  "var(--text-muted)",
  border:     "var(--brand-tint)",
  amber:      "var(--warn)",
  red:        "var(--danger)",
  redLight:   "var(--danger-bg)",
  shadow:     "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)",
};

export async function api(path, method = "GET", body = null, token = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const r = await fetch(`${API}${path}`, opts);
  if (r.status === 401 && path !== "/login") { onAuthError?.(); throw new Error('{"error":"Session expired"}'); }
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Pull a human-readable message out of whatever api() threw.
export function apiErrorMessage(e, fallback = "Something went wrong") {
  try { return JSON.parse(e.message)?.error || fallback; } catch { return fallback; }
}

// Run a mutation, surfacing any failure to the user instead of letting it become
// an unhandled promise rejection. Returns true on success.
export async function withErr(fn) {
  try { await fn(); return true; }
  catch (e) { if (apiErrorMessage(e) !== "Session expired") alert(apiErrorMessage(e)); return false; }
}

// Format a date in the currently active language.
export const formatDate = (v, lng) =>
  v ? new Date(v).toLocaleDateString(lng || "en", { year: "numeric", month: "short", day: "numeric" }) : "—";

// Format a full timestamp (audit log) in the currently active language.
export const formatDateTime = (v, lng) =>
  v ? new Date(v).toLocaleString(lng || "en", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";


export const Icon = ({ name, size = 18 }) => {
  const icons = {
    dashboard:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    patients:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    doctors:      "M22 12h-4l-3 9L9 3l-3 9H2",
    appointments: "M8 2v4 M16 2v4 M3 10h18 M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z",
    records:      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    pharmacy:     "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
    billing:      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2",
    transactions: "M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    staff:        "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    users:        "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8",
    logout:       "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
    plus:         "M12 5v14 M5 12h14",
    edit:         "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:        "M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
    close:        "M18 6L6 18 M6 6l12 12",
    check:        "M20 6L9 17l-5-5",
    search:       "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
    alert:        "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
    globe:        "M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2c2.6 2.7 4 6.3 4 10s-1.4 7.3-4 10c-2.6-2.7-4-6.3-4-10s1.4-7.3 4-10z",
    sun:          "M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4",
    moon:         "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
    shield:       "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    settings:     "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
    activity:     "M22 12h-4l-3 9L9 3l-3 9H2",
    key:          "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    ban:          "M12 2a10 10 0 100 20 10 10 0 000-20z M4.93 4.93l14.14 14.14",
    lab:          "M9 3h6 M10 3v6.5L4.5 19a2 2 0 001.7 3h11.6a2 2 0 001.7-3L14 9.5V3 M7.5 15h9",
    bed:          "M2 18v-8a2 2 0 012-2h16a2 2 0 012 2v8 M2 15h20 M2 18v2 M22 18v2 M6 8V6a2 2 0 012-2h3a2 2 0 012 2v2",
    plan:         "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    referral:     "M5 12h14 M13 6l6 6-6 6",
    building:     "M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4 M9 9v.01 M9 13v.01 M9 17v.01",
    pause:        "M6 4h4v16H6z M14 4h4v16h-4z",
    play:         "M5 3l14 9-14 9V3z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

// ─── LANGUAGE SWITCHER ───────────────────────────────────────────────────────
// Light / dark switch, available to everyone. The choice is remembered on this device.
export function ThemeToggle({ variant = "light" }) {
  const { t } = useTranslation();
  const mode = useSyncExternalStore(subscribeMode, getMode);
  const dark = variant === "dark";
  const toDark = mode !== "dark";
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={t(toDark ? "theme.toDark" : "theme.toLight")}
      title={t(toDark ? "theme.toDark" : "theme.toLight")}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 8, padding: 8,
        background: dark ? "rgba(255,255,255,0.15)" : "var(--brand-tint-light)",
        color: dark ? "#FFFFFF" : "var(--brand-text)",
        border: `1px solid ${dark ? "rgba(255,255,255,0.3)" : "var(--brand-tint)"}`,
      }}
    >
      <Icon name={toDark ? "moon" : "sun"} size={17} />
    </button>
  );
}

export function LanguageSwitcher({ variant = "light" }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const base = (i18n.language || "en").split("-")[0];
  const current = LANGUAGES.find(l => l.code === base) || LANGUAGES[0];
  const dark = variant === "dark";

  const change = (code) => { i18n.changeLanguage(code); setOpen(false); };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={t("language.select")}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit",
          borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600,
          background: dark ? "rgba(255,255,255,0.15)" : "var(--brand-tint-light)",
          color: dark ? "#FFFFFF" : "var(--brand-text)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.3)" : "var(--brand-tint)"}`,
        }}
      >
        <Icon name="globe" size={15} />
        <span>{current.nativeLabel}</span>
        <span style={{ fontSize: 9 }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2000 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0, zIndex: 2001,
            background: "var(--surface)", border: "1px solid var(--brand-tint)", borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.16)", minWidth: 170, overflow: "hidden",
          }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => change(l.code)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%",
                  padding: "10px 14px", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                  fontSize: 13, fontWeight: l.code === current.code ? 700 : 500, color: "var(--text)",
                  background: l.code === current.code ? "var(--brand-tint-light)" : "var(--surface)",
                }}
              >
                <span>{l.nativeLabel}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-faint)", fontSize: 11 }}>
                  {t(`language.${l.code}`, l.label)}
                  {l.code === current.code && <Icon name="check" size={13} />}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"var(--surface)", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px", borderBottom:"1px solid var(--brand-tint)" }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"var(--brand-text-strong)" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"var(--brand-tint-light)", border:"1px solid var(--brand-tint)", borderRadius:8, padding:8, cursor:"pointer" }}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
      {children}
    </div>
  );
}

export const inp = { width:"100%", padding:"10px 12px", border:"1.5px solid var(--brand-tint)", borderRadius:8, fontSize:14, color:"var(--text)", outline:"none", boxSizing:"border-box", background:"var(--surface)", fontFamily:"inherit" };
export const btnP = { background:"linear-gradient(135deg,var(--brand),var(--brand-dark))", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 };
export const btnD = { background:"var(--danger-bg)", color:"var(--danger)", border:"1px solid var(--danger-border)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
export const btnE = { background:"var(--info-bg)", color:"var(--info)", border:"1px solid var(--info-border)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
export const btnG = { background:"var(--brand-tint-light)", color:"var(--brand-text)", border:"1px solid var(--brand-tint)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };

// Translate a status / role value coming from the backend.
export function useLabels() {
  const { t } = useTranslation();
  return {
    status: (s) => t(`status.${s}`, { defaultValue: t(`roles.${s}`, { defaultValue: s ?? "" }) }),
  };
}

export function Badge({ status }) {
  const { status: label } = useLabels();
  const map = { scheduled:["var(--info)","var(--info-bg)"], completed:["var(--brand)","var(--brand-tint-light)"], cancelled:["var(--danger)","var(--danger-bg)"], pending:["var(--warn)","var(--warn-bg)"], partial:["var(--warn)","var(--warn-bg)"], paid:["var(--brand)","var(--brand-tint-light)"], active:["var(--brand)","var(--brand-tint-light)"], inactive:["var(--danger)","var(--danger-bg)"], superadmin:["var(--danger)","var(--danger-bg)"], admin:["var(--purple)","var(--purple-bg)"], doctor:["var(--info)","var(--info-bg)"], receptionist:["var(--warn)","var(--warn-bg)"], pharmacist:["var(--brand)","var(--brand-tint-light)"], labstaff:["var(--teal)","var(--teal-bg)"], in_progress:["var(--info)","var(--info-bg)"], urgent:["var(--danger)","var(--danger-bg)"], routine:["var(--text-muted)","var(--neutral-bg)"], admitted:["var(--info)","var(--info-bg)"], discharged:["var(--brand)","var(--brand-tint-light)"], suspended:["var(--danger)","var(--danger-bg)"], occupied:["var(--danger)","var(--danger-bg)"], available:["var(--brand)","var(--brand-tint-light)"], maintenance:["var(--warn)","var(--warn-bg)"], referred:["var(--purple)","var(--purple-bg)"], accepted:["var(--brand)","var(--brand-tint-light)"], declined:["var(--danger)","var(--danger-bg)"], discontinued:["var(--text-muted)","var(--neutral-bg)"] };
  const [color,bg] = map[status] || ["#888","var(--neutral-bg)"];
  return <span style={{ background:bg, color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{label(status)}</span>;
}

export function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ background:"var(--surface)", borderRadius:16, padding:"22px 24px", boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", borderInlineStart:`4px solid ${color}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:13, color:"var(--text-muted)", fontWeight:500, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color:"var(--text)" }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:4 }}>{sub}</div>}
      </div>
      <div style={{ background:`color-mix(in srgb, ${color} 10%, transparent)`, borderRadius:12, padding:14, color }}><Icon name={icon} size={22} /></div>
    </div>
  );
}

export function Table({ columns, data, actions }) {
  const { t } = useTranslation();
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
        <thead>
          <tr style={{ background:"var(--brand-tint-faint)" }}>
            {columns.map(c => <th key={c.key} style={{ padding:"12px 16px", textAlign:"start", fontWeight:600, color:"var(--text-muted)", fontSize:12, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid var(--brand-tint)" }}>{c.label}</th>)}
            {actions && <th style={{ padding:"12px 16px", textAlign:"end", color:"var(--text-muted)", fontSize:12, textTransform:"uppercase", borderBottom:"2px solid var(--brand-tint)" }}>{t("common.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length+(actions?1:0)} style={{ textAlign:"center", padding:40, color:"var(--text-faint)" }}>{t("common.noRecords")}</td></tr>
            : data.map((row,i) => (
              <tr key={row.id||i} style={{ borderBottom:"1px solid var(--brand-tint)" }}>
                {columns.map(c => <td key={c.key} style={{ padding:"13px 16px", color:"var(--text)", verticalAlign:"middle" }}>{c.render ? c.render(row[c.key],row) : (row[c.key]??"—")}</td>)}
                {actions && <td style={{ padding:"10px 16px", textAlign:"end" }}><div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>{actions(row)}</div></td>}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// Shrinks a picked image to a small data-URL so it can live on the hospital record
// (no file hosting needed). PNG keeps transparency; falls back to JPEG if still big.
const MAX_LOGO_BYTES = 70 * 1024;
export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      for (const [size, type, q] of [[256, "image/png"], [192, "image/png"], [128, "image/png"], [256, "image/jpeg", 0.85], [160, "image/jpeg", 0.8]]) {
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
        const ctx = c.getContext("2d");
        if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL(type, q);
        if (out.length <= MAX_LOGO_BYTES * 1.37) return resolve(out);
      }
      reject(new Error("too big"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

