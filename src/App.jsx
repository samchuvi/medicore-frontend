import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "./i18n";

const API = import.meta.env.VITE_API_URL || 'https://medicore-backend-6q33.onrender.com/api';

// Registered by <App/> so any 401 from an expired/invalid token drops the user
// back to the login screen instead of leaving them on empty tables.
let onAuthError = null;

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  green:      "#2E7D32",
  greenDark:  "#1B5E20",
  greenLight: "#E8F5E9",
  greenMid:   "#43A047",
  blue:       "#1976D2",
  blueDark:   "#0D47A1",
  blueLight:  "#E3F2FD",
  white:      "#FFFFFF",
  bg:         "#E8F5E9",
  text:       "#263238",
  textLight:  "#546E7A",
  border:     "#C8E6C9",
  amber:      "#F9A825",
  red:        "#C62828",
  redLight:   "#FFEBEE",
  shadow:     "0 2px 12px rgba(46,125,50,0.08)",
};

async function api(path, method = "GET", body = null, token = null) {
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
function apiErrorMessage(e, fallback = "Something went wrong") {
  try { return JSON.parse(e.message)?.error || fallback; } catch { return fallback; }
}

// Run a mutation, surfacing any failure to the user instead of letting it become
// an unhandled promise rejection. Returns true on success.
async function withErr(fn) {
  try { await fn(); return true; }
  catch (e) { if (apiErrorMessage(e) !== "Session expired") alert(apiErrorMessage(e)); return false; }
}

// Format a date in the currently active language.
const formatDate = (v, lng) =>
  v ? new Date(v).toLocaleDateString(lng || "en", { year: "numeric", month: "short", day: "numeric" }) : "—";

// Format a full timestamp (audit log) in the currently active language.
const formatDateTime = (v, lng) =>
  v ? new Date(v).toLocaleString(lng || "en", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

const MODULES_BY_ROLE = {
  superadmin:   ["overview", "people", "audit", "dashboard", "patients", "doctors", "staff", "users", "appointments", "records", "pharmacy", "billing", "transactions"],
  admin:        ["dashboard", "patients", "doctors", "staff", "users", "appointments", "records", "pharmacy", "billing", "transactions"],
  doctor:       ["dashboard", "appointments", "records", "pharmacy"],
  receptionist: ["dashboard", "patients", "appointments", "records", "billing", "transactions"],
  pharmacist:   ["dashboard", "pharmacy"],
};

const Icon = ({ name, size = 18 }) => {
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
    shield:       "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    activity:     "M22 12h-4l-3 9L9 3l-3 9H2",
    key:          "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    ban:          "M12 2a10 10 0 100 20 10 10 0 000-20z M4.93 4.93l14.14 14.14",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

// ─── LANGUAGE SWITCHER ───────────────────────────────────────────────────────
function LanguageSwitcher({ variant = "light" }) {
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
          background: dark ? "rgba(255,255,255,0.15)" : "#E8F5E9",
          color: dark ? "#FFFFFF" : "#2E7D32",
          border: `1px solid ${dark ? "rgba(255,255,255,0.3)" : "#C8E6C9"}`,
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
            background: "#fff", border: "1px solid #C8E6C9", borderRadius: 10,
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
                  fontSize: 13, fontWeight: l.code === current.code ? 700 : 500, color: "#263238",
                  background: l.code === current.code ? "#E8F5E9" : "#fff",
                }}
              >
                <span>{l.nativeLabel}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#90A4AE", fontSize: 11 }}>
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

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px", borderBottom:"1px solid #C8E6C9" }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"#1B5E20" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#E8F5E9", border:"1px solid #C8E6C9", borderRadius:8, padding:8, cursor:"pointer" }}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#546E7A", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width:"100%", padding:"10px 12px", border:"1.5px solid #C8E6C9", borderRadius:8, fontSize:14, color:"#263238", outline:"none", boxSizing:"border-box", background:"#FFFFFF", fontFamily:"inherit" };
const btnP = { background:"linear-gradient(135deg,#2E7D32,#1B5E20)", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 };
const btnD = { background:"#FFEBEE", color:"#C62828", border:"1px solid #FFCDD2", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
const btnE = { background:"#E3F2FD", color:"#1976D2", border:"1px solid #BBDEFB", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
const btnG = { background:"#E8F5E9", color:"#2E7D32", border:"1px solid #C8E6C9", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };

// Translate a status / role value coming from the backend.
function useLabels() {
  const { t } = useTranslation();
  return {
    status: (s) => t(`status.${s}`, { defaultValue: t(`roles.${s}`, { defaultValue: s ?? "" }) }),
  };
}

function Badge({ status }) {
  const { status: label } = useLabels();
  const map = { scheduled:["#1976D2","#E3F2FD"], completed:["#2E7D32","#E8F5E9"], cancelled:["#e53e3e","#fff5f5"], pending:["#d97706","#fffbeb"], partial:["#d97706","#fffbeb"], paid:["#2E7D32","#E8F5E9"], active:["#2E7D32","#E8F5E9"], inactive:["#e53e3e","#fff5f5"], superadmin:["#b91c1c","#fef2f2"], admin:["#7c3aed","#f5f3ff"], doctor:["#1976D2","#E3F2FD"], receptionist:["#d97706","#fffbeb"], pharmacist:["#2E7D32","#E8F5E9"] };
  const [color,bg] = map[status] || ["#888","#f5f5f5"];
  return <span style={{ background:bg, color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{label(status)}</span>;
}

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"22px 24px", boxShadow:"0 2px 12px rgba(46,125,50,0.08)", borderInlineStart:`4px solid ${color}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:13, color:"#546E7A", fontWeight:500, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color:"#263238" }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:"#90A4AE", marginTop:4 }}>{sub}</div>}
      </div>
      <div style={{ background:color+"18", borderRadius:12, padding:14, color }}><Icon name={icon} size={22} /></div>
    </div>
  );
}

function Table({ columns, data, actions }) {
  const { t } = useTranslation();
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
        <thead>
          <tr style={{ background:"#F1F8E9" }}>
            {columns.map(c => <th key={c.key} style={{ padding:"12px 16px", textAlign:"start", fontWeight:600, color:"#546E7A", fontSize:12, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #C8E6C9" }}>{c.label}</th>)}
            {actions && <th style={{ padding:"12px 16px", textAlign:"end", color:"#546E7A", fontSize:12, textTransform:"uppercase", borderBottom:"2px solid #C8E6C9" }}>{t("common.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length+(actions?1:0)} style={{ textAlign:"center", padding:40, color:"#90A4AE" }}>{t("common.noRecords")}</td></tr>
            : data.map((row,i) => (
              <tr key={row.id||i} style={{ borderBottom:"1px solid #C8E6C9" }}>
                {columns.map(c => <td key={c.key} style={{ padding:"13px 16px", color:"#263238", verticalAlign:"middle" }}>{c.render ? c.render(row[c.key],row) : (row[c.key]??"—")}</td>)}
                {actions && <td style={{ padding:"10px 16px", textAlign:"end" }}><div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>{actions(row)}</div></td>}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    setLoading(true); setError("");
    try { const data = await api("/login","POST",form); onLogin(data.token,data.user); }
    catch { setError(t("login.error")); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1B5E20 0%,#2E7D32 50%,#1976D2 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <div style={{ position:"absolute", top:20, insetInlineEnd:20 }}><LanguageSwitcher variant="dark" /></div>
      <div style={{ background:"#fff", borderRadius:24, padding:40, width:"100%", maxWidth:400, boxShadow:"0 32px 100px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, background:"linear-gradient(135deg,#2E7D32,#1976D2)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>🏥</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:"#263238" }}>{t("app.name")}</h1>
          <p style={{ margin:"6px 0 0", color:"#546E7A", fontSize:14 }}>{t("login.subtitle")}</p>
        </div>
        {error && <div style={{ background:"#fff5f5", border:"1px solid #ffd0d0", borderRadius:8, padding:"10px 14px", color:"#e53e3e", fontSize:13, marginBottom:16 }}>{error}</div>}
        <Field label={t("common.username")}><input style={inp} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></Field>
        <Field label={t("common.password")}><input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></Field>
        <button onClick={handleSubmit} disabled={loading} style={{ ...btnP, width:"100%", justifyContent:"center", marginTop:8, padding:"13px 24px", fontSize:15 }}>{loading?t("login.signingIn"):t("login.signIn")}</button>
      </div>
    </div>
  );
}

function Dashboard({ token, user }) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  useEffect(()=>{ api("/stats","GET",null,token).then(setStats).catch(()=>{}); },[token]);
  if (!stats) return <div style={{ padding:40, color:"#546E7A" }}>{t("common.loading")}</div>;
  const role = user.role;
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("dashboard.welcome",{name:user.name})}</h2>
        <p style={{ margin:"4px 0 0", color:"#546E7A", fontSize:14 }}><Badge status={role} /></p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16, marginBottom:32 }}>
        {role==="admin" && <>
          <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="#1976D2" icon="patients" />
          <StatCard label={t("dashboard.doctors")} value={stats.totalDoctors} color="#2E7D32" icon="doctors" />
          <StatCard label={t("dashboard.staff")} value={stats.totalStaff} color="#6A1B9A" icon="staff" />
          <StatCard label={t("dashboard.systemUsers")} value={stats.totalUsers} color="#43A047" icon="users" />
          <StatCard label={t("dashboard.todayAppointments")} value={stats.todayAppointments} color="#F9A825" icon="appointments" />
          <StatCard label={t("dashboard.pendingBills")} value={stats.pendingBills} color="#C62828" icon="billing" />
          <StatCard label={t("dashboard.totalRevenue")} value={`UGX ${(stats.totalRevenue||0).toLocaleString()}`} color="#1976D2" icon="transactions" />
          <StatCard label={t("dashboard.lowStock")} value={stats.lowStockItems} color="#C62828" icon="pharmacy" />
        </>}
        {role==="doctor" && <>
          <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="#1976D2" icon="patients" />
          <StatCard label={t("dashboard.myAppointments")} value={stats.myAppointments} color="#F9A825" icon="appointments" />
          <StatCard label={t("dashboard.todayAppointments")} value={stats.todayAppointments} color="#2E7D32" icon="appointments" />
          <StatCard label={t("dashboard.myRecords")} value={stats.myRecords} color="#6A1B9A" icon="records" />
          <StatCard label={t("dashboard.lowStockMedicines")} value={stats.lowStockItems} color="#C62828" icon="pharmacy" />
        </>}
        {role==="receptionist" && <>
          <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="#1976D2" icon="patients" />
          <StatCard label={t("dashboard.todayAppointments")} value={stats.todayAppointments} color="#F9A825" icon="appointments" />
          <StatCard label={t("dashboard.pendingBills")} value={stats.pendingBills} color="#C62828" icon="billing" />
          <StatCard label={t("dashboard.revenueCollected")} value={`UGX ${(stats.totalRevenue||0).toLocaleString()}`} color="#2E7D32" icon="transactions" />
        </>}
        {role==="pharmacist" && <>
          <StatCard label={t("dashboard.totalItems")} value={stats.totalItems} color="#1976D2" icon="pharmacy" />
          <StatCard label={t("dashboard.lowStock")} value={stats.lowStockItems} color="#C62828" icon="alert" sub={t("dashboard.qtyBelow")} />
          <StatCard label={t("dashboard.expiringSoon")} value={stats.expiringSoon} color="#F9A825" icon="alert" sub={t("dashboard.within30Days")} />
          <StatCard label={t("dashboard.outOfStock")} value={stats.outOfStock} color="#C62828" icon="alert" />
        </>}
      </div>
      {stats.recentPatients && (
        <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(46,125,50,0.08)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>{t("dashboard.recentPatients")}</h3>
          <Table columns={[{key:"name",label:t("fields.name")},{key:"age",label:t("fields.age")},{key:"gender",label:t("fields.gender"),render:v=>v?t(`gender.${String(v).toLowerCase()}`,v):"—"},{key:"phone",label:t("fields.phone")},{key:"createdAt",label:t("fields.registered"),render:v=>formatDate(v,i18n.language)}]} data={stats.recentPatients} />
        </div>
      )}
    </div>
  );
}

// Shared "create / edit user" form — the same form is reached from User
// Management and from a staff profile in the Super Admin area.
function UserFormModal({ token, initial, allowSuperadmin = false, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || {});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const editing = Boolean(form.id);

  const save = async () => {
    setBusy(true); setErr("");
    try {
      if (editing) await api(`/users/${form.id}`, "PUT", form, token);
      else await api("/users", "POST", form, token);
      onSaved?.();
    } catch (e) {
      try { setErr(JSON.parse(e.message)?.error || t("common.error")); } catch { setErr(t("common.error")); }
    } finally { setBusy(false); }
  };

  return (
    <Modal title={editing ? t("users.editTitle") : t("users.createTitle")} onClose={onClose}>
      {err && <div style={{ background:"#fff5f5", border:"1px solid #ffd0d0", borderRadius:8, padding:"10px 14px", color:"#e53e3e", fontSize:13, marginBottom:16 }}>{err}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label={t("fields.fullName")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
        <Field label={t("common.username")}><input style={inp} value={form.username||""} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/></Field>
        <Field label={t("fields.password")}><input style={inp} type="password" placeholder={editing?t("users.passwordKeepBlank"):t("users.passwordSet")} value={form.password||""} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></Field>
        <Field label={t("fields.role")}>
          <select style={inp} value={form.role||""} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
            <option value="">{t("common.select")}</option>
            {allowSuperadmin && <option value="superadmin">{t("roles.superadmin")}</option>}
            <option value="admin">{t("roles.admin")}</option>
            <option value="doctor">{t("roles.doctor")}</option>
            <option value="receptionist">{t("roles.receptionist")}</option>
            <option value="pharmacist">{t("roles.pharmacist")}</option>
          </select>
        </Field>
      </div>
      <button style={{ ...btnP, marginTop:8, opacity:busy?0.7:1 }} disabled={busy} onClick={save}><Icon name="check" size={16}/> {editing?t("users.updateBtn"):t("users.createBtn")}</button>
    </Modal>
  );
}

// Reset a staff member's password — type a new one, or generate a temporary
// password that is shown once.
function ResetPasswordModal({ token, user, onClose, onDone }) {
  const { t } = useTranslation();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [generated, setGenerated] = useState(null);

  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api(`/users/${user.id}/password`, "PUT", pw ? { password: pw } : {}, token);
      if (r.generated && r.password) setGenerated(r.password);
      else { onDone?.(); }
    } catch (e) {
      try { setErr(JSON.parse(e.message)?.error || t("common.error")); } catch { setErr(t("common.error")); }
    } finally { setBusy(false); }
  };

  return (
    <Modal title={t("resetPassword.title", { name: user.name })} onClose={onClose}>
      {err && <div style={{ background:"#fff5f5", border:"1px solid #ffd0d0", borderRadius:8, padding:"10px 14px", color:"#e53e3e", fontSize:13, marginBottom:16 }}>{err}</div>}
      {generated ? (
        <>
          <p style={{ fontSize:14, color:"#546E7A", marginTop:0 }}>{t("resetPassword.generatedNotice")}</p>
          <div style={{ background:"#F1F8E9", border:"1px solid #C8E6C9", borderRadius:8, padding:"14px 16px", fontSize:18, fontWeight:700, letterSpacing:1, textAlign:"center", fontFamily:"monospace" }}>{generated}</div>
          <button style={{ ...btnP, marginTop:16, justifyContent:"center", width:"100%" }} onClick={onDone}><Icon name="check" size={16}/> {t("common.done")}</button>
        </>
      ) : (
        <>
          <Field label={t("resetPassword.newPassword")}>
            <input style={inp} type="text" placeholder={t("resetPassword.leaveBlankGenerate")} value={pw} onChange={e=>setPw(e.target.value)}/>
          </Field>
          <button style={{ ...btnP, marginTop:8, opacity:busy?0.7:1 }} disabled={busy} onClick={submit}>
            <Icon name="key" size={16}/> {pw ? t("resetPassword.submit") : t("resetPassword.generateSubmit")}
          </button>
        </>
      )}
    </Modal>
  );
}

function UserManagement({ token, user }) {
  const { t, i18n } = useTranslation();
  const allowSuperadmin = user?.role === "superadmin";
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [editing,setEditing]=useState(null);
  const load=useCallback(()=>api("/users","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const del=async(id)=>{ if(confirm(t("users.deleteConfirm"))){ await withErr(()=>api(`/users/${id}`,"DELETE",null,token)); load(); } };
  const toggle=async(u)=>{ if(await withErr(()=>api(`/users/${u.id}`,"PUT",{status:u.status==="active"?"inactive":"active"},token))) load(); };
  const done=()=>{ setModal(null); setEditing(null); load(); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("users.title")}</h2>
        <button style={btnP} onClick={()=>{setEditing({});setModal("form");}}><Icon name="plus" size={16}/> {t("users.add")}</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:t("fields.name")},{key:"username",label:t("common.username")},{key:"role",label:t("fields.role"),render:v=><Badge status={v}/>},{key:"status",label:t("fields.status"),render:v=><Badge status={v}/>},{key:"createdAt",label:t("fields.created"),render:v=>formatDate(v,i18n.language)}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setEditing({...row,password:""});setModal("form");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            <button key="t" style={row.status==="active"?btnD:btnG} onClick={()=>toggle(row)}>{row.status==="active"?t("users.deactivate"):t("users.activate")}</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]}
        />
      </div>
      {modal==="form" && <UserFormModal token={token} initial={editing} allowSuperadmin={allowSuperadmin} onClose={()=>{setModal(null);setEditing(null);}} onSaved={done}/>}
    </div>
  );
}

function Patients({ token, user }) {
  const { t, i18n } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({}); const [search,setSearch]=useState("");
  const canEdit=["admin","receptionist"].includes(user.role);
  const load=useCallback(()=>api("/patients","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>form.id?api(`/patients/${form.id}`,"PUT",form,token):api("/patients","POST",form,token))){ setModal(null);setForm({});load(); } };
  const del=async(id)=>{ if(confirm(t("patients.deleteConfirm"))){ await withErr(()=>api(`/patients/${id}`,"DELETE",null,token)); load(); } };
  const filtered=data.filter(p=>p.name?.toLowerCase().includes(search.toLowerCase())||p.phone?.includes(search));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("patients.title")}</h2>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:"#90A4AE" }}><Icon name="search" size={15}/></span>
            <input style={{ ...inp, paddingInlineStart:34, width:220 }} placeholder={t("common.search")} value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {canEdit && <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("patients.add")}</button>}
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:t("fields.fullName")},{key:"age",label:t("fields.age")},{key:"gender",label:t("fields.gender"),render:v=>v?t(`gender.${String(v).toLowerCase()}`,v):"—"},{key:"phone",label:t("fields.phone")},{key:"bloodGroup",label:t("fields.bloodGroup")},{key:"address",label:t("fields.address")},{key:"createdAt",label:t("fields.registered"),render:v=>formatDate(v,i18n.language)}]} data={filtered}
          actions={canEdit?row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            user.role==="admin"&&<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ].filter(Boolean):null}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?t("patients.editTitle"):t("patients.registerTitle")} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.fullName")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label={t("fields.age")}><input style={inp} type="number" value={form.age||""} onChange={e=>setForm(f=>({...f,age:e.target.value}))}/></Field>
            <Field label={t("fields.gender")}><select style={inp} value={form.gender||""} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}><option value="">{t("common.select")}</option><option value="Male">{t("gender.male")}</option><option value="Female">{t("gender.female")}</option><option value="Other">{t("gender.other")}</option></select></Field>
            <Field label={t("fields.bloodGroup")}><select style={inp} value={form.bloodGroup||""} onChange={e=>setForm(f=>({...f,bloodGroup:e.target.value}))}><option value="">{t("common.select")}</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></Field>
            <Field label={t("fields.phone")}><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label={t("fields.email")}><input style={inp} value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></Field>
          </div>
          <Field label={t("fields.address")}><input style={inp} value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></Field>
          <Field label={t("fields.emergencyContact")}><input style={inp} value={form.emergencyContact||""} onChange={e=>setForm(f=>({...f,emergencyContact:e.target.value}))}/></Field>
          <Field label={t("fields.notesAllergies")}><textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?t("patients.updateBtn"):t("patients.registerBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function Doctors({ token }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const load=useCallback(()=>api("/doctors","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>form.id?api(`/doctors/${form.id}`,"PUT",form,token):api("/doctors","POST",form,token))){ setModal(null);setForm({});load(); } };
  const del=async(id)=>{ if(confirm(t("doctors.deleteConfirm"))){ await withErr(()=>api(`/doctors/${id}`,"DELETE",null,token)); load(); } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("doctors.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("doctors.add")}</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:t("fields.name")},{key:"specialization",label:t("fields.specialization")},{key:"qualification",label:t("fields.qualification")},{key:"department",label:t("fields.department")},{key:"phone",label:t("fields.phone")},{key:"status",label:t("fields.status"),render:v=><Badge status={v||"active"}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?t("doctors.editTitle"):t("doctors.addTitle")} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.fullName")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label={t("fields.specialization")}><input style={inp} value={form.specialization||""} onChange={e=>setForm(f=>({...f,specialization:e.target.value}))}/></Field>
            <Field label={t("fields.qualification")}><input style={inp} value={form.qualification||""} onChange={e=>setForm(f=>({...f,qualification:e.target.value}))}/></Field>
            <Field label={t("fields.department")}><input style={inp} value={form.department||""} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/></Field>
            <Field label={t("fields.phone")}><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label={t("fields.status")}><select style={inp} value={form.status||"active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">{t("status.active")}</option><option value="inactive">{t("status.inactive")}</option></select></Field>
          </div>
          <Field label={t("fields.linkedUserId")}><input style={inp} value={form.linkedUserId||""} placeholder={t("doctors.linkedUserIdPlaceholder")} onChange={e=>setForm(f=>({...f,linkedUserId:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?t("doctors.updateBtn"):t("doctors.addBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function Staff({ token }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const load=useCallback(()=>api("/staff","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>form.id?api(`/staff/${form.id}`,"PUT",form,token):api("/staff","POST",form,token))){ setModal(null);setForm({});load(); } };
  const del=async(id)=>{ if(confirm(t("staff.deleteConfirm"))){ await withErr(()=>api(`/staff/${id}`,"DELETE",null,token)); load(); } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("staff.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("staff.add")}</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:t("fields.name")},{key:"role",label:t("fields.role")},{key:"department",label:t("fields.department")},{key:"phone",label:t("fields.phone")},{key:"salary",label:t("fields.salary"),render:v=>v?`UGX ${parseInt(v).toLocaleString()}`:"—"},{key:"status",label:t("fields.status"),render:v=><Badge status={v||"active"}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?t("staff.editTitle"):t("staff.addTitle")} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.fullName")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label={t("fields.role")}><input style={inp} value={form.role||""} placeholder={t("staff.rolePlaceholder")} onChange={e=>setForm(f=>({...f,role:e.target.value}))}/></Field>
            <Field label={t("fields.department")}><input style={inp} value={form.department||""} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/></Field>
            <Field label={t("fields.phone")}><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label={t("fields.salaryUgx")}><input style={inp} type="number" value={form.salary||""} onChange={e=>setForm(f=>({...f,salary:e.target.value}))}/></Field>
            <Field label={t("fields.status")}><select style={inp} value={form.status||"active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">{t("status.active")}</option><option value="inactive">{t("status.inactive")}</option></select></Field>
          </div>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?t("staff.updateBtn"):t("staff.addBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function Appointments({ token, user }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [patients,setPatients]=useState([]); const [doctors,setDoctors]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const canEdit=["admin","receptionist"].includes(user.role);
  const load=useCallback(async()=>{ try{ const [a,p,d]=await Promise.all([api("/appointments","GET",null,token),api("/patients","GET",null,token),api("/doctors","GET",null,token)]); setData(a);setPatients(p);setDoctors(d); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>form.id?api(`/appointments/${form.id}`,"PUT",form,token):api("/appointments","POST",form,token))){ setModal(null);setForm({});load(); } };
  const del=async(id)=>{ if(confirm(t("appointments.deleteConfirm"))){ await withErr(()=>api(`/appointments/${id}`,"DELETE",null,token)); load(); } };
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const dName=id=>doctors.find(d=>d.id===id)?.name||id;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("appointments.title")}</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("appointments.schedule")}</button>}
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"patientId",label:t("fields.patient"),render:v=>pName(v)},{key:"doctorId",label:t("fields.doctor"),render:v=>"Dr. "+dName(v)},{key:"date",label:t("fields.date")},{key:"time",label:t("fields.time")},{key:"reason",label:t("fields.reason")},{key:"status",label:t("fields.status"),render:v=><Badge status={v}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            canEdit&&<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ].filter(Boolean)}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?t("appointments.editTitle"):t("appointments.scheduleTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">{t("appointments.selectPatient")}</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label={t("fields.doctor")}><select style={inp} value={form.doctorId||""} onChange={e=>setForm(f=>({...f,doctorId:e.target.value}))}><option value="">{t("appointments.selectDoctor")}</option>{doctors.map(d=><option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization})</option>)}</select></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.date")}><input style={inp} type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
            <Field label={t("fields.time")}><input style={inp} type="time" value={form.time||""} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></Field>
          </div>
          <Field label={t("fields.reason")}><input style={inp} value={form.reason||""} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}/></Field>
          <Field label={t("fields.status")}><select style={inp} value={form.status||"scheduled"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="scheduled">{t("status.scheduled")}</option><option value="completed">{t("status.completed")}</option><option value="cancelled">{t("status.cancelled")}</option></select></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?t("appointments.updateBtn"):t("appointments.scheduleBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function MedicalRecords({ token, user }) {
  const { t, i18n } = useTranslation();
  const [data,setData]=useState([]); const [patients,setPatients]=useState([]); const [doctors,setDoctors]=useState([]); const [inventory,setInventory]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({medicinesUsed:[]});
  const canEdit=["admin","doctor"].includes(user.role);
  const load=useCallback(async()=>{ try{ const [r,p,d,inv]=await Promise.all([api("/records","GET",null,token),api("/patients","GET",null,token),api("/doctors","GET",null,token),api("/inventory","GET",null,token).catch(()=>[])]); setData(r);setPatients(p);setDoctors(d);setInventory(inv); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>form.id?api(`/records/${form.id}`,"PUT",form,token):api("/records","POST",form,token))){ setModal(null);setForm({medicinesUsed:[]});load(); } };
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const dName=id=>doctors.find(d=>d.id===id)?.name||id;
  const toggleMed=id=>{ const cur=form.medicinesUsed||[]; setForm(f=>({...f,medicinesUsed:cur.includes(id)?cur.filter(m=>m!==id):[...cur,id]})); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("records.title")}</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({medicinesUsed:[]});setModal("add");}}><Icon name="plus" size={16}/> {t("records.add")}</button>}
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"patientId",label:t("fields.patient"),render:v=>pName(v)},{key:"doctorId",label:t("fields.doctor"),render:v=>"Dr. "+dName(v)},{key:"diagnosis",label:t("fields.diagnosis")},{key:"treatment",label:t("fields.treatment")},{key:"medicinesUsed",label:t("fields.medicinesUsed"),render:v=>v&&v.length?v.map(id=>inventory.find(i=>i.id===id)?.name||id).join(", "):"—"},{key:"createdAt",label:t("fields.date"),render:v=>formatDate(v,i18n.language)}]} data={data}
          actions={canEdit?row=>[<button key="e" style={btnE} onClick={()=>{setForm({...row,medicinesUsed:row.medicinesUsed||[]});setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>]:null}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?t("records.editTitle"):t("records.addTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">{t("common.select")}</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label={t("fields.doctor")}><select style={inp} value={form.doctorId||""} onChange={e=>setForm(f=>({...f,doctorId:e.target.value}))}><option value="">{t("common.select")}</option>{doctors.map(d=><option key={d.id} value={d.id}>Dr. {d.name}</option>)}</select></Field>
          <Field label={t("fields.diagnosis")}><input style={inp} value={form.diagnosis||""} onChange={e=>setForm(f=>({...f,diagnosis:e.target.value}))}/></Field>
          <Field label={t("fields.treatment")}><textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.treatment||""} onChange={e=>setForm(f=>({...f,treatment:e.target.value}))}/></Field>
          <Field label={t("fields.prescription")}><textarea style={{ ...inp, height:60, resize:"vertical" }} value={form.prescription||""} onChange={e=>setForm(f=>({...f,prescription:e.target.value}))}/></Field>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#546E7A", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{t("records.medicinesUsedLabel")}</label>
            {inventory.filter(i=>!i.category||i.category==="Medicine").length===0
              ? <p style={{ color:"#90A4AE", fontSize:13 }}>{t("records.noMedicines")}</p>
              : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:160, overflowY:"auto", border:"1.5px solid #C8E6C9", borderRadius:8, padding:10 }}>
                  {inventory.filter(i=>!i.category||i.category==="Medicine").map(med=>(
                    <label key={med.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                      <input type="checkbox" checked={(form.medicinesUsed||[]).includes(med.id)} onChange={()=>toggleMed(med.id)}/>
                      {med.name} <span style={{ color:"#90A4AE", fontSize:11 }}>({med.quantity} {med.unit})</span>
                    </label>
                  ))}
                </div>
            }
          </div>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?t("records.updateBtn"):t("records.saveBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function Pharmacy({ token, user }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const canEdit=["admin","pharmacist"].includes(user.role);
  const load=useCallback(()=>api("/inventory","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>form.id?api(`/inventory/${form.id}`,"PUT",form,token):api("/inventory","POST",form,token))){ setModal(null);setForm({});load(); } };
  const del=async(id)=>{ if(confirm(t("pharmacy.removeConfirm"))){ await withErr(()=>api(`/inventory/${id}`,"DELETE",null,token)); load(); } };
  const CATEGORIES=[["Medicine",t("pharmacy.categories.medicine")],["Equipment",t("pharmacy.categories.equipment")],["Supplies",t("pharmacy.categories.supplies")],["Lab Reagent",t("pharmacy.categories.labReagent")]];
  const catLabel=v=>CATEGORIES.find(c=>c[0]===v)?.[1]||v;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("pharmacy.title")}</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("pharmacy.add")}</button>}
      </div>
      {user.role==="doctor"&&<div style={{ background:"#E3F2FD", border:"1px solid #BBDEFB", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#1976D2" }}>{t("pharmacy.doctorViewNote")}</div>}
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:t("fields.item")},{key:"category",label:t("fields.category"),render:v=>catLabel(v)},{key:"quantity",label:t("fields.stock"),render:(v,row)=><span style={{ color:parseInt(v)<10?"#e53e3e":"#333", fontWeight:parseInt(v)<10?700:400 }}>{v} {row.unit}</span>},{key:"unitPrice",label:t("fields.unitPrice"),render:v=>`UGX ${parseInt(v||0).toLocaleString()}`},{key:"expiryDate",label:t("fields.expiry")},{key:"supplier",label:t("fields.supplier")}]} data={data}
          actions={canEdit?row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]:null}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?t("pharmacy.editTitle"):t("pharmacy.addTitle")} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.item")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label={t("fields.category")}><select style={inp} value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}><option value="">{t("common.select")}</option>{CATEGORIES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label={t("fields.quantity")}><input style={inp} type="number" value={form.quantity||""} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}/></Field>
            <Field label={t("fields.unit")}><input style={inp} value={form.unit||""} placeholder={t("pharmacy.unitPlaceholder")} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}/></Field>
            <Field label={t("fields.unitPriceUgx")}><input style={inp} type="number" value={form.unitPrice||""} onChange={e=>setForm(f=>({...f,unitPrice:e.target.value}))}/></Field>
            <Field label={t("fields.expiryDate")}><input style={inp} type="date" value={form.expiryDate||""} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))}/></Field>
          </div>
          <Field label={t("fields.supplier")}><input style={inp} value={form.supplier||""} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?t("pharmacy.updateBtn"):t("pharmacy.addBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function Billing({ token }) {
  const { t, i18n } = useTranslation();
  const [bills,setBills]=useState([]); const [patients,setPatients]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({items:[]});
  const load=useCallback(async()=>{ try{ const [b,p]=await Promise.all([api("/bills","GET",null,token),api("/patients","GET",null,token)]); setBills(b);setPatients(p); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const addItem=()=>setForm(f=>({...f,items:[...(f.items||[]),{desc:"",amount:""}]}));
  const updItem=(i,k,v)=>setForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const total=(form.items||[]).reduce((s,it)=>s+(parseFloat(it.amount)||0),0);
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const save=async()=>{
    try{ await api("/bills","POST",{...form,totalAmount:total},token); setModal(null);setForm({items:[]}); load(); }
    catch(e){ alert(apiErrorMessage(e)); }
  };
  const markPaid=async(bill)=>{
    const due=bill.remainingAmount ?? bill.totalAmount ?? 0;
    try{ await api("/transactions","POST",{billId:bill.id,amount:due,patientId:bill.patientId,method:"Cash",note:t("billing.manualPayment")},token); load(); }
    catch(e){ alert(apiErrorMessage(e)); }
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("billing.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({items:[]});setModal("add");}}><Icon name="plus" size={16}/> {t("billing.create")}</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"billNumber",label:t("fields.billNumber")},{key:"patientId",label:t("fields.patient"),render:v=>pName(v)},{key:"totalAmount",label:t("fields.total"),render:v=>`UGX ${parseFloat(v||0).toLocaleString()}`},{key:"status",label:t("fields.status"),render:v=><Badge status={v}/>},{key:"createdAt",label:t("fields.date"),render:v=>formatDate(v,i18n.language)}]} data={bills}
          actions={row=>[row.status!=="paid"&&<button key="p" style={btnG} onClick={()=>markPaid(row)}><Icon name="check" size={13}/> {t("billing.markPaid")}</button>].filter(Boolean)}
        />
      </div>
      {modal==="add"&&(
        <Modal title={t("billing.createTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">{t("common.select")}</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#546E7A", textTransform:"uppercase", letterSpacing:0.5 }}>{t("billing.billItems")}</label>
            {(form.items||[]).map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginTop:8 }}>
                <input style={{ ...inp, flex:2 }} placeholder={t("billing.description")} value={item.desc} onChange={e=>updItem(i,"desc",e.target.value)}/>
                <input style={{ ...inp, flex:1 }} type="number" placeholder="UGX" value={item.amount} onChange={e=>updItem(i,"amount",e.target.value)}/>
              </div>
            ))}
            <button onClick={addItem} style={{ marginTop:10, background:"#E8F5E9", border:"1px solid #C8E6C9", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer" }}>+ {t("billing.addItem")}</button>
          </div>
          <div style={{ background:"#F1F8E9", borderRadius:8, padding:"12px 16px", marginBottom:16, fontWeight:700, fontSize:16 }}>{t("billing.totalLabel",{amount:total.toLocaleString()})}</div>
          <Field label={t("fields.notes")}><textarea style={{ ...inp, height:60 }} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {t("billing.generateBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

function Transactions({ token }) {
  const { t, i18n } = useTranslation();
  const [data,setData]=useState([]); const [patients,setPatients]=useState([]); const [bills,setBills]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const load=useCallback(async()=>{ try{ const [tx,p,b]=await Promise.all([api("/transactions","GET",null,token),api("/patients","GET",null,token),api("/bills","GET",null,token)]); setData(tx);setPatients(p);setBills(b); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(await withErr(()=>api("/transactions","POST",form,token))){ setModal(null);setForm({});load(); } };
  const del=async(id)=>{ if(confirm(t("transactions.deleteConfirm"))){ await withErr(()=>api(`/transactions/${id}`,"DELETE",null,token)); load(); } };
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const total=data.reduce((s,tx)=>s+(parseFloat(tx.amount)||0),0);
  const METHODS=[["Cash",t("transactions.methods.cash")],["Mobile Money",t("transactions.methods.mobileMoney")],["Bank Transfer",t("transactions.methods.bankTransfer")],["Insurance",t("transactions.methods.insurance")],["Card",t("transactions.methods.card")]];
  const methodLabel=v=>METHODS.find(m=>m[0]===v)?.[1]||v;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("transactions.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("transactions.record")}</button>
      </div>
      <div style={{ background:"linear-gradient(135deg,#2E7D32,#1976D2)", borderRadius:16, padding:"20px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ fontSize:13, opacity:0.7 }}>{t("transactions.totalRevenueCollected")}</div>
        <div style={{ fontSize:32, fontWeight:800, marginTop:4 }}>UGX {total.toLocaleString()}</div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[{key:"txRef",label:t("fields.refNumber")},{key:"patientId",label:t("fields.patient"),render:v=>pName(v)},{key:"amount",label:t("fields.amount"),render:v=>`UGX ${parseFloat(v||0).toLocaleString()}`},{key:"method",label:t("fields.method"),render:v=>methodLabel(v)},{key:"recordedBy",label:t("fields.recordedBy")},{key:"note",label:t("fields.note")},{key:"createdAt",label:t("fields.date"),render:v=>formatDate(v,i18n.language)}]} data={data}
          actions={row=>[<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>]}
        />
      </div>
      {modal==="add"&&(
        <Modal title={t("transactions.recordTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">{t("common.select")}</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label={t("transactions.linkToBill")}><select style={inp} value={form.billId||""} onChange={e=>setForm(f=>({...f,billId:e.target.value}))}><option value="">{t("common.none")}</option>{bills.filter(b=>b.status!=="paid").map(b=><option key={b.id} value={b.id}>{b.billNumber} — UGX {parseFloat(b.remainingAmount ?? b.totalAmount ?? 0).toLocaleString()}</option>)}</select></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.amountUgx")}><input style={inp} type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></Field>
            <Field label={t("fields.method")}><select style={inp} value={form.method||""} onChange={e=>setForm(f=>({...f,method:e.target.value}))}><option value="">{t("common.select")}</option>{METHODS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <Field label={t("fields.note")}><input style={inp} value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {t("transactions.recordBtn")}</button>
        </Modal>
      )}
    </div>
  );
}

// ─── SUPER ADMIN AREA ────────────────────────────────────────────────────────

function Overview({ token }) {
  const { t, i18n } = useTranslation();
  const [stats,setStats]=useState(null);
  useEffect(()=>{ api("/stats","GET",null,token).then(setStats).catch(()=>{}); },[token]);
  if(!stats) return <div style={{ padding:40, color:"#546E7A" }}>{t("common.loading")}</div>;
  const byRole=stats.usersByRole||{};
  return (
    <div>
      <h2 style={{ margin:"0 0 24px", fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("overview.title")}</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16, marginBottom:28 }}>
        <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="#1976D2" icon="patients" />
        <StatCard label={t("dashboard.doctors")} value={stats.totalDoctors} color="#2E7D32" icon="doctors" />
        <StatCard label={t("dashboard.staff")} value={stats.totalStaff} color="#6A1B9A" icon="staff" />
        <StatCard label={t("dashboard.systemUsers")} value={stats.totalUsers} color="#43A047" icon="users" sub={t("overview.activeDisabled",{active:stats.activeUsers,disabled:stats.disabledUsers})} />
        <StatCard label={t("overview.totalAppointments")} value={stats.totalAppointments} color="#F9A825" icon="appointments" />
        <StatCard label={t("overview.totalRecords")} value={stats.totalRecords} color="#0D47A1" icon="records" />
        <StatCard label={t("dashboard.pendingBills")} value={stats.pendingBills} color="#C62828" icon="billing" />
        <StatCard label={t("dashboard.totalRevenue")} value={`UGX ${(stats.totalRevenue||0).toLocaleString()}`} color="#1976D2" icon="transactions" />
        <StatCard label={t("dashboard.lowStock")} value={stats.lowStockItems} color="#C62828" icon="pharmacy" />
        <StatCard label={t("overview.auditToday")} value={stats.auditToday} color="#6A1B9A" icon="activity" />
        <StatCard label={t("overview.auditTotal")} value={stats.auditTotal} color="#546E7A" icon="activity" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(46,125,50,0.08)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>{t("overview.usersByRole")}</h3>
          {Object.keys(byRole).length===0 ? <p style={{ color:"#90A4AE", fontSize:13 }}>{t("common.noRecords")}</p> :
            Object.entries(byRole).map(([r,c])=>(
              <div key={r} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #ECEFF1" }}>
                <Badge status={r}/><span style={{ fontWeight:800, fontSize:16 }}>{c}</span>
              </div>
            ))}
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(46,125,50,0.08)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>{t("overview.recentActivity")}</h3>
          <Table columns={[
            {key:"timestamp",label:t("audit.col.time"),render:v=>formatDateTime(v,i18n.language)},
            {key:"actorName",label:t("audit.col.actor")},
            {key:"action",label:t("audit.col.action"),render:v=><AuditActionTag action={v}/>},
          ]} data={stats.recentAudit||[]} />
        </div>
      </div>
    </div>
  );
}

function AuditActionTag({ action }) {
  const { t } = useTranslation();
  const map={ CREATE:["#2E7D32","#E8F5E9"], UPDATE:["#1976D2","#E3F2FD"], DELETE:["#C62828","#FFEBEE"], LOGIN:["#2E7D32","#E8F5E9"], LOGIN_FAILED:["#C62828","#FFEBEE"], PASSWORD_RESET:["#6A1B9A","#F3E5F5"], ACCOUNT_DISABLED:["#C62828","#FFEBEE"], ACCOUNT_ENABLED:["#2E7D32","#E8F5E9"] };
  const [c,bg]=map[action]||["#546E7A","#ECEFF1"];
  return <span style={{ background:bg, color:c, padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{t(`audit.actions.${action}`,action)}</span>;
}

function AuditLogs({ token }) {
  const { t, i18n } = useTranslation();
  const EMPTY={ action:"all", actor:"all", entity:"all", from:"", to:"" };
  const [logs,setLogs]=useState([]); const [meta,setMeta]=useState({actions:[],entities:[],actors:[]});
  const [filters,setFilters]=useState(EMPTY); const [loading,setLoading]=useState(false);
  useEffect(()=>{ api("/audit-logs/meta","GET",null,token).then(setMeta).catch(()=>{}); },[token]);
  const load=useCallback(async()=>{
    setLoading(true);
    const qs=new URLSearchParams();
    Object.entries(filters).forEach(([k,v])=>{ if(v && v!=="all") qs.append(k,v); });
    try{ setLogs(await api(`/audit-logs?${qs.toString()}`,"GET",null,token)); }catch{ setLogs([]); }
    setLoading(false);
  },[token,filters]);
  useEffect(()=>{ load(); },[load]);
  const set=(k,v)=>setFilters(f=>({...f,[k]:v}));
  const fSel={ ...inp, width:"auto", minWidth:150, padding:"8px 10px" };
  const fLbl={ display:"flex", flexDirection:"column", gap:4, fontSize:11, fontWeight:600, color:"#546E7A", textTransform:"uppercase", letterSpacing:0.5 };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("audit.title")}</h2>
        <span style={{ fontSize:13, color:"#546E7A" }}>{loading?t("common.loading"):t("audit.count",{count:logs.length})}</span>
      </div>
      <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 12px rgba(46,125,50,0.08)", marginBottom:16, display:"flex", flexWrap:"wrap", gap:14, alignItems:"flex-end" }}>
        <label style={fLbl}>{t("audit.filters.action")}
          <select style={fSel} value={filters.action} onChange={e=>set("action",e.target.value)}>
            <option value="all">{t("audit.filters.all")}</option>
            {meta.actions.map(a=><option key={a} value={a}>{t(`audit.actions.${a}`,a)}</option>)}
          </select>
        </label>
        <label style={fLbl}>{t("audit.filters.person")}
          <select style={fSel} value={filters.actor} onChange={e=>set("actor",e.target.value)}>
            <option value="all">{t("audit.filters.all")}</option>
            {meta.actors.map(a=><option key={a.id||"guest"} value={a.id||""}>{a.name} — {t(`roles.${a.role}`,a.role||"guest")}</option>)}
          </select>
        </label>
        <label style={fLbl}>{t("audit.filters.entity")}
          <select style={fSel} value={filters.entity} onChange={e=>set("entity",e.target.value)}>
            <option value="all">{t("audit.filters.all")}</option>
            {meta.entities.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label style={fLbl}>{t("audit.filters.from")}
          <input style={fSel} type="date" value={filters.from} onChange={e=>set("from",e.target.value)}/>
        </label>
        <label style={fLbl}>{t("audit.filters.to")}
          <input style={fSel} type="date" value={filters.to} onChange={e=>set("to",e.target.value)}/>
        </label>
        <button style={btnG} onClick={()=>setFilters(EMPTY)}><Icon name="close" size={13}/> {t("audit.filters.reset")}</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        <Table columns={[
          {key:"timestamp",label:t("audit.col.time"),render:v=>formatDateTime(v,i18n.language)},
          {key:"actorName",label:t("audit.col.actor"),render:(v,r)=><span style={{ display:"inline-flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{v||"—"} <Badge status={r.actorRole}/></span>},
          {key:"action",label:t("audit.col.action"),render:v=><AuditActionTag action={v}/>},
          {key:"entity",label:t("audit.col.target"),render:(v,r)=>r.entityId?`${v} · ${String(r.entityId).slice(0,8)}`:(v||"—")},
          {key:"status",label:t("audit.col.result"),render:v=><span style={{ color:v>=400?"#C62828":"#2E7D32", fontWeight:700 }}>{v||"—"}</span>},
          {key:"ip",label:t("audit.col.ip"),render:v=>v||"—"},
        ]} data={logs} />
      </div>
    </div>
  );
}

function StaffProfileModal({ token, member, onClose, onChanged }) {
  const { t, i18n } = useTranslation();
  const [sub,setSub]=useState(null);
  const [err,setErr]=useState("");
  const disabled=member.status==="inactive";
  const toggle=async()=>{
    if(!confirm(disabled?t("staffProfile.enableConfirm"):t("staffProfile.disableConfirm"))) return;
    try{ await api(`/users/${member.id}`,"PUT",{status:disabled?"active":"inactive"},token); onChanged(); }
    catch(e){ try{ setErr(JSON.parse(e.message)?.error||t("common.error")); }catch{ setErr(t("common.error")); } }
  };
  const del=async()=>{
    if(!confirm(t("staffProfile.deleteConfirm",{name:member.name}))) return;
    try{ await api(`/users/${member.id}`,"DELETE",null,token); onChanged(true); }
    catch(e){ try{ setErr(JSON.parse(e.message)?.error||t("common.error")); }catch{ setErr(t("common.error")); } }
  };
  if(sub==="edit") return <UserFormModal token={token} initial={{...member,password:""}} onClose={()=>setSub(null)} onSaved={()=>{setSub(null);onChanged();}}/>;
  if(sub==="reset") return <ResetPasswordModal token={token} user={member} onClose={()=>setSub(null)} onDone={()=>{setSub(null);onChanged();}}/>;
  const row=(label,value)=>(
    <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"9px 0", borderBottom:"1px solid #ECEFF1", fontSize:14 }}>
      <span style={{ color:"#546E7A" }}>{label}</span><span style={{ fontWeight:600, textAlign:"end" }}>{value}</span>
    </div>
  );
  return (
    <Modal title={t("staffProfile.title",{name:member.name})} onClose={onClose}>
      {err && <div style={{ background:"#fff5f5", border:"1px solid #ffd0d0", borderRadius:8, padding:"10px 14px", color:"#e53e3e", fontSize:13, marginBottom:16 }}>{err}</div>}
      {row(t("common.username"),member.username)}
      {row(t("fields.role"),<Badge status={member.role}/>)}
      {row(t("fields.status"),<Badge status={member.status||"active"}/>)}
      {row(t("fields.created"),formatDate(member.createdAt,i18n.language))}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:18 }}>
        <button style={btnE} onClick={()=>setSub("edit")}><Icon name="edit" size={14}/> {t("staffProfile.edit")}</button>
        <button style={btnG} onClick={()=>setSub("reset")}><Icon name="key" size={14}/> {t("staffProfile.resetPassword")}</button>
        <button style={disabled?btnG:btnD} onClick={toggle}><Icon name="ban" size={14}/> {disabled?t("staffProfile.enable"):t("staffProfile.disable")}</button>
        <button style={btnD} onClick={del}><Icon name="trash" size={14}/> {t("staffProfile.delete")}</button>
      </div>
    </Modal>
  );
}

function People({ token }) {
  const { t, i18n } = useTranslation();
  const [tab,setTab]=useState("staff");
  const [staff,setStaff]=useState([]); const [patients,setPatients]=useState([]);
  const [selected,setSelected]=useState(null); const [search,setSearch]=useState("");
  const load=useCallback(async()=>{
    const [u,p]=await Promise.all([api("/users","GET",null,token).catch(()=>[]),api("/patients","GET",null,token).catch(()=>[])]);
    setStaff(u); setPatients(p);
  },[token]);
  useEffect(()=>{ load(); },[load]);
  const changed=()=>{ setSelected(null); load(); };
  const q=search.toLowerCase();
  const sFiltered=staff.filter(s=>[s.name,s.username,s.role].filter(Boolean).join(" ").toLowerCase().includes(q));
  const pFiltered=patients.filter(p=>[p.name,p.phone].filter(Boolean).join(" ").toLowerCase().includes(q));
  const tabBtn=(key,label,count)=>(
    <button onClick={()=>setSearch("")||setTab(key)} style={{ background:tab===key?"#2E7D32":"#E8F5E9", color:tab===key?"#fff":"#2E7D32", border:"1px solid #C8E6C9", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{label} ({count})</button>
  );
  return (
    <div>
      <h2 style={{ margin:"0 0 20px", fontSize:22, fontWeight:800, color:"#1B5E20" }}>{t("people.title")}</h2>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {tabBtn("staff",t("people.tabStaff"),staff.length)}
        {tabBtn("patients",t("people.tabPatients"),patients.length)}
        <div style={{ position:"relative", marginInlineStart:"auto" }}>
          <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:"#90A4AE" }}><Icon name="search" size={15}/></span>
          <input style={{ ...inp, paddingInlineStart:34, width:220 }} placeholder={t("common.search")} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(46,125,50,0.08)", overflow:"hidden" }}>
        {tab==="staff" ? (
          <Table columns={[
            {key:"name",label:t("fields.name")},
            {key:"username",label:t("common.username")},
            {key:"role",label:t("fields.role"),render:v=><Badge status={v}/>},
            {key:"status",label:t("fields.status"),render:v=><Badge status={v||"active"}/>},
            {key:"createdAt",label:t("fields.created"),render:v=>formatDate(v,i18n.language)},
          ]} data={sFiltered}
            actions={row=>[<button key="p" style={btnE} onClick={()=>setSelected(row)}><Icon name="search" size={13}/> {t("people.openProfile")}</button>]}
          />
        ) : (
          <Table columns={[
            {key:"name",label:t("fields.fullName")},
            {key:"gender",label:t("fields.gender"),render:v=>v?t(`gender.${String(v).toLowerCase()}`,v):"—"},
            {key:"age",label:t("fields.age")},
            {key:"phone",label:t("fields.phone")},
            {key:"bloodGroup",label:t("fields.bloodGroup")},
            {key:"createdAt",label:t("fields.registered"),render:v=>formatDate(v,i18n.language)},
          ]} data={pFiltered} />
        )}
      </div>
      {selected && <StaffProfileModal token={token} member={selected} onClose={()=>setSelected(null)} onChanged={changed}/>}
    </div>
  );
}

const ALL_MODULES = [
  { key:"overview",     navKey:"overview",     icon:"shield",       Component:Overview },
  { key:"people",       navKey:"people",       icon:"users",        Component:People },
  { key:"audit",        navKey:"audit",        icon:"activity",     Component:AuditLogs },
  { key:"dashboard",    navKey:"dashboard",    icon:"dashboard",    Component:Dashboard },
  { key:"patients",     navKey:"patients",     icon:"patients",     Component:Patients },
  { key:"doctors",      navKey:"doctors",      icon:"doctors",      Component:Doctors },
  { key:"staff",        navKey:"staff",        icon:"staff",        Component:Staff },
  { key:"users",        navKey:"users",        icon:"users",        Component:UserManagement },
  { key:"appointments", navKey:"appointments", icon:"appointments", Component:Appointments },
  { key:"records",      navKey:"records",      icon:"records",      Component:MedicalRecords },
  { key:"pharmacy",     navKey:"pharmacy",     icon:"pharmacy",     Component:Pharmacy },
  { key:"billing",      navKey:"billing",      icon:"billing",      Component:Billing },
  { key:"transactions", navKey:"transactions", icon:"transactions", Component:Transactions },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [token,setToken]=useState(()=>localStorage.getItem("hms_token"));
  const [user,setUser]=useState(()=>{ try{return JSON.parse(localStorage.getItem("hms_user"));}catch{return null;} });
  const [active,setActive]=useState("dashboard");
  const [sidebarOpen,setSidebarOpen]=useState(true);

  const handleLogin=(tok,u)=>{ localStorage.setItem("hms_token",tok); localStorage.setItem("hms_user",JSON.stringify(u)); setToken(tok);setUser(u);setActive("dashboard"); };
  const handleLogout=useCallback(()=>{ localStorage.removeItem("hms_token"); localStorage.removeItem("hms_user"); setToken(null);setUser(null); },[]);

  useEffect(()=>{ onAuthError = handleLogout; return ()=>{ onAuthError = null; }; },[handleLogout]);

  if(!token||!user) return <LoginPage onLogin={handleLogin}/>;

  const allowed=MODULES_BY_ROLE[user.role]||["dashboard"];
  const modules=ALL_MODULES.filter(m=>allowed.includes(m.key));
  const ActiveModule=modules.find(m=>m.key===active)||modules[0];
  const ActiveComponent=ActiveModule.Component;
  const activeLabel=t(`nav.${ActiveModule.navKey}`);
  const roleColors={ superadmin:"#b91c1c", admin:"#2E7D32", doctor:"#1976D2", receptionist:"#F9A825", pharmacist:"#43A047" };
  const roleColor=roleColors[user.role]||"#3b6fd4";

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#E8F5E9" }}>
      <div style={{ width:sidebarOpen?240:68, background:"linear-gradient(180deg,#1B5E20 0%,#2E7D32 100%)", color:"#fff", display:"flex", flexDirection:"column", transition:"width 0.2s", overflow:"hidden", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"20px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width:36, height:36, background:"rgba(255,255,255,0.2)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏥</div>
          {sidebarOpen&&<div><div style={{ fontWeight:800, fontSize:15 }}>{t("app.name")}</div><div style={{ fontSize:11, opacity:0.6 }}>{t("app.version")}</div></div>}
        </div>
        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {modules.map(m=>(
            <button key={m.key} onClick={()=>setActive(m.key)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 12px", borderRadius:10, border:"none", cursor:"pointer", marginBottom:4, background:active===m.key?"rgba(255,255,255,0.2)":"transparent", color:active===m.key?"#ffffff":"rgba(255,255,255,0.7)", fontWeight:active===m.key?700:400, fontSize:14, textAlign:"start" }}>
              <span style={{ flexShrink:0 }}><Icon name={m.icon} size={18}/></span>
              {sidebarOpen&&<span style={{ whiteSpace:"nowrap" }}>{t(`nav.${m.navKey}`)}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          {sidebarOpen&&<div style={{ padding:"8px 12px", marginBottom:8 }}>
            <div style={{ fontSize:12, opacity:0.7 }}>{t("app.signedInAs")}</div>
            <div style={{ fontSize:13, fontWeight:700 }}>{user.name}</div>
            <div style={{ marginTop:4 }}><Badge status={user.role}/></div>
          </div>}
          <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:"rgba(198,40,40,0.2)", color:"#FFCDD2", fontWeight:600, fontSize:13 }}>
            <Icon name="logout" size={16}/>{sidebarOpen&&t("app.signOut")}
          </button>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #C8E6C9", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>setSidebarOpen(s=>!s)} style={{ background:"#E8F5E9", border:"none", borderRadius:8, padding:8, cursor:"pointer", color:"#2E7D32" }}><Icon name="dashboard" size={16}/></button>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1B5E20" }}>{activeLabel}</h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <LanguageSwitcher />
            <span style={{ fontSize:13, color:"#546E7A" }}>{new Date().toLocaleDateString(i18n.language,{weekday:"short",year:"numeric",month:"short",day:"numeric"})}</span>
            <div style={{ width:34, height:34, background:roleColor, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>{user.name?.charAt(0).toUpperCase()}</div>
          </div>
        </div>
        <div style={{ flex:1, padding:28, overflowY:"auto" }}>
          <ActiveComponent token={token} user={user}/>
        </div>
      </div>
    </div>
  );
}
