import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { REMEMBER_HOSPITAL_CODE } from "./config";
import { usePlatform } from "./platform";
import { applyBrand, effectiveColor } from "./theme";
import { MODULES } from "./modules";
import {
  api, apiErrorMessage, withErr, formatDate, formatDateTime, setAuthErrorHandler,
  Icon, LanguageSwitcher, ThemeToggle, Modal, Field, inp, btnP, btnD, btnE, btnG,
  Badge, StatCard, Table,
  LoadingButton, SearchSelect, patientFetcher, formatMoney, setCurrency, setPayCurrencies, getAcceptedCurrencies, getPayRates, rateView, getCurrency, toast, apiErrorCode, useAction, useOptions, onWaking, warmUp, warmOfflineCache, clearSavedCopy,
} from "./shared";
import OfflineBar from "./modules/offlineBar";

const MODULES_BY_ROLE = {
  superadmin:   ["overview", "people", "audit", "dashboard", "patients", "doctors", "staff", "users", "appointments", "records", "pharmacy", "billing", "transactions"],
  admin:        ["dashboard", "patients", "doctors", "staff", "users", "appointments", "records", "pharmacy", "billing", "transactions"],
  doctor:       ["dashboard", "appointments", "records", "pharmacy"],
  receptionist: ["dashboard", "patients", "appointments", "records", "billing", "transactions"],
  pharmacist:   ["dashboard", "pharmacy"],
  labstaff:     ["dashboard"], // the Laboratory screen is added by the module list (needs the hospital's laboratory feature)
};

// Older built-in screens that depend on a hospital feature flag.
const LEGACY_FEATURE = { pharmacy: "pharmacy", billing: "billing", transactions: "billing" };

// Darken a #rrggbb colour (used to build the sidebar gradient from a hospital's theme colour).
const shade = (hex, amt) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * (1 - amt))));
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c).map(v => v.toString(16).padStart(2, "0")).join("");
};

function initialHospitalCode() {
  try {
    const fromLink = new URLSearchParams(window.location.search).get("hospital");
    if (fromLink) return fromLink.trim().toLowerCase();
    return REMEMBER_HOSPITAL_CODE ? (localStorage.getItem("hms_hospital_code") || "") : "";
  } catch { return ""; }
}

function LoginPage({ onLogin }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  // The hospital code comes from the hospital's own link (?hospital=code) or, if
  // REMEMBER_HOSPITAL_CODE is on in config.js, the last code used on this device.
  // Otherwise it starts empty. A blank code is only accepted for the platform owner.
  const [form, setForm] = useState({ hospitalSlug:initialHospitalCode(), username:"", password:"" });
  const [error, setError] = useState("");
  const [waking, setWaking] = useState(0);
  const [run, loading] = useAction();
  // Free hosting sleeps when idle: wake it as soon as the sign-in page opens, and tell people while it does.
  useEffect(()=>{ warmUp(); return onWaking(setWaking); },[]);

  // Show the hospital's own logo, name and colour as soon as its code is known
  // (from its link or typed in). Unknown code / offline = the platform's look.
  const [look, setLook] = useState(null);
  useEffect(()=>{
    const slug=form.hospitalSlug.trim().toLowerCase();
    if(!slug){ setLook(null); return; }
    let live=true;
    const timer=setTimeout(()=>{
      api(`/public/branding?hospital=${encodeURIComponent(slug)}`)
        .then(b=>{ if(live) setLook(b); })
        .catch(()=>{ if(live) setLook(null); });
    },400);
    return ()=>{ live=false; clearTimeout(timer); };
  },[form.hospitalSlug]);
  useEffect(()=>{ applyBrand(effectiveColor(look?.primaryColor)); },[look,platform.color]);
  const logo=look?.logo||platform.logo;

  const handleSubmit = () => run(async () => {
    setError("");
    if (!form.username.trim() || !form.password) { setError(t("login.fillAll")); return false; }
    try {
      const payload = { ...form, username: form.username.trim(), hospitalSlug: form.hospitalSlug.trim().toLowerCase() };
      const data = await api("/login","POST",payload);
      if (REMEMBER_HOSPITAL_CODE) { try { localStorage.setItem("hms_hospital_code", payload.hospitalSlug); } catch { /* storage unavailable — not critical */ } }
      onLogin(data.token,data.user,data.hospital);
    }
    catch (e) {
      // Say what actually went wrong: no connection, server waking up, too many tries, or wrong details.
      const code = apiErrorCode(e);
      if (code === "NETWORK") setError(t("login.unreachable"));
      else if (code === "SERVER_DOWN" || code === "SERVER_ERROR") setError(t("login.serverBusy"));
      else if (code === "RATE_LIMITED") setError(t("login.tooMany"));
      else if (code === "MISSING_FIELDS") setError(t("login.fillAll"));
      else setError(t("login.error"));
      return false;
    }
  });
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,var(--brand-dark) 0%,var(--brand) 50%,var(--info) 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <div style={{ position:"absolute", top:20, insetInlineEnd:20, display:"flex", gap:8 }}><ThemeToggle variant="dark" /><LanguageSwitcher variant="dark" /></div>
      <div style={{ background:"var(--surface)", borderRadius:24, padding:40, width:"100%", maxWidth:400, boxShadow:"0 32px 100px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:logo?88:64, height:logo?88:64, background:logo?"transparent":"linear-gradient(135deg,var(--brand),var(--info))", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28, overflow:"hidden" }}>{logo?<img src={logo} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>:"🏥"}</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:"var(--text)" }}>{look?.name||platform.name}</h1>
          {look?.name&&<div style={{ fontSize:11, color:"var(--text-faint)", marginTop:4 }}>{t("login.poweredBy",{name:platform.name})}</div>}
          <p style={{ margin:"6px 0 0", color:"var(--text-muted)", fontSize:14 }}>{t("login.subtitle")}</p>
        </div>
        {waking>0 && <div role="status" data-testid="login-waking" style={{ background:"var(--brand-tint-light)", border:"1px solid var(--brand-tint)", borderRadius:8, padding:"10px 14px", color:"var(--brand-text-strong)", fontSize:13, marginBottom:16 }}>{t("login.waking")}</div>}
        {error && <div role="alert" data-testid="login-error" style={{ background:"var(--danger-bg)", border:"1px solid var(--danger-border)", borderRadius:8, padding:"10px 14px", color:"var(--danger)", fontSize:13, marginBottom:16 }}>{error}</div>}
        <Field label={t("login.hospitalCode")}>
          <input style={inp} value={form.hospitalSlug} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={e=>setForm(f=>({...f,hospitalSlug:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:4 }}>{t("login.hospitalCodeHint")}</div>
        </Field>
        <Field label={t("common.username")}><input style={inp} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></Field>
        <Field label={t("common.password")}><input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></Field>
        <button onClick={handleSubmit} disabled={loading} aria-busy={loading} style={{ ...btnP, width:"100%", justifyContent:"center", marginTop:8, padding:"13px 24px", fontSize:15, opacity:loading?0.7:1 }}>{loading&&<span className="spin" aria-hidden="true"/>}{loading?t("login.signingIn"):t("login.signIn")}</button>
      </div>
    </div>
  );
}

function Dashboard({ token, user, hospital }) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  useEffect(()=>{ api("/stats","GET",null,token).then(setStats).catch(()=>{}); },[token]);
  if (!stats) return <div style={{ padding:40, color:"var(--text-muted)" }}>{t("common.loading")}</div>;
  const role = user.role;
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("dashboard.welcome",{name:user.name})}</h2>
        <p style={{ margin:"4px 0 0", color:"var(--text-muted)", fontSize:14 }}><Badge status={role} /></p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16, marginBottom:32 }}>
        {role==="admin" && <>
          <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="var(--info)" icon="patients" />
          <StatCard label={t("dashboard.doctors")} value={stats.totalDoctors} color="var(--brand)" icon="doctors" />
          <StatCard label={t("dashboard.staff")} value={stats.totalStaff} color="var(--purple)" icon="staff" />
          <StatCard label={t("dashboard.systemUsers")} value={stats.totalUsers} color="var(--brand-accent)" icon="users" />
          <StatCard label={t("dashboard.todayAppointments")} value={stats.todayAppointments} color="var(--warn)" icon="appointments" />
          <StatCard label={t("dashboard.pendingBills")} value={stats.pendingBills} color="var(--danger)" icon="billing" />
          <StatCard label={t("dashboard.totalRevenue")} value={formatMoney(stats.totalRevenue)} color="var(--info)" icon="transactions" />
          <StatCard label={t("dashboard.lowStock")} value={stats.lowStockItems} color="var(--danger)" icon="pharmacy" />
        </>}
        {role==="doctor" && <>
          <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="var(--info)" icon="patients" />
          <StatCard label={t("dashboard.myAppointments")} value={stats.myAppointments} color="var(--warn)" icon="appointments" />
          <StatCard label={t("dashboard.todayAppointments")} value={stats.todayAppointments} color="var(--brand)" icon="appointments" />
          <StatCard label={t("dashboard.myRecords")} value={stats.myRecords} color="var(--purple)" icon="records" />
          <StatCard label={t("dashboard.lowStockMedicines")} value={stats.lowStockItems} color="var(--danger)" icon="pharmacy" />
        </>}
        {role==="receptionist" && <>
          <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="var(--info)" icon="patients" />
          <StatCard label={t("dashboard.todayAppointments")} value={stats.todayAppointments} color="var(--warn)" icon="appointments" />
          <StatCard label={t("dashboard.pendingBills")} value={stats.pendingBills} color="var(--danger)" icon="billing" />
          <StatCard label={t("dashboard.revenueCollected")} value={formatMoney(stats.totalRevenue)} color="var(--brand)" icon="transactions" />
        </>}
        {role==="pharmacist" && <>
          <StatCard label={t("dashboard.totalItems")} value={stats.totalItems} color="var(--info)" icon="pharmacy" />
          <StatCard label={t("dashboard.lowStock")} value={stats.lowStockItems} color="var(--danger)" icon="alert" sub={t("dashboard.qtyBelow")} />
          <StatCard label={t("dashboard.expiringSoon")} value={stats.expiringSoon} color="var(--warn)" icon="alert" sub={t("dashboard.within30Days")} />
          <StatCard label={t("dashboard.outOfStock")} value={stats.outOfStock} color="var(--danger)" icon="alert" />
          {stats.todaySalesCount!==undefined && <StatCard label={t("dashboard.todaySalesCount")} value={stats.todaySalesCount} color="var(--brand)" icon="pharmacy" />}
          {stats.todaySalesRevenue!==undefined && <StatCard label={t("dashboard.todaySalesRevenue")} value={formatMoney(stats.todaySalesRevenue)} color="var(--info)" icon="transactions" />}
        </>}
        {role==="labstaff" && hospital && hospital.features && !hospital.features.laboratory && (
          <div role="alert" style={{ gridColumn:"1 / -1", background:"var(--warn-bg)", border:"1px solid var(--warn-border)", color:"var(--text)", borderRadius:12, padding:"14px 18px", fontSize:14 }}>{t("dashboard.labOff")}</div>
        )}
        {role==="labstaff" && <>
          <StatCard label={t("dashboard.pendingOrders")} value={stats.pendingOrders} color="var(--warn)" icon="lab" />
          <StatCard label={t("dashboard.inProgressOrders")} value={stats.inProgressOrders} color="var(--info)" icon="lab" />
          <StatCard label={t("dashboard.urgentOpenOrders")} value={stats.urgentOpenOrders} color="var(--danger)" icon="alert" />
          <StatCard label={t("dashboard.completedToday")} value={stats.completedToday} color="var(--brand)" icon="check" />
        </>}
      </div>
      {stats.recentPatients && (
        <div style={{ background:"var(--surface)", borderRadius:16, padding:24, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)" }}>
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
  const editing = Boolean(form.id);
  const opts = useOptions(token);

  const save = async () => {
    setErr("");
    if (!String(form.name||"").trim()) { setErr(t("users.errName")); return false; }
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(form.username||"")) { setErr(t("users.errUsername")); return false; }
    if (!editing && String(form.password||"").length < 8) { setErr(t("users.errPassword")); return false; }
    if (editing && form.password && form.password.length < 8) { setErr(t("users.errPassword")); return false; }
    if (!form.role) { setErr(t("users.errRole")); return false; }
    try {
      if (editing) await api(`/users/${form.id}`, "PUT", form, token);
      else await api("/users", "POST", form, token);
      toast.success(t("users.saved"));
      onSaved?.();
    } catch (e) { setErr(apiErrorMessage(e, t("common.error"))); return false; }
  };
  // Roles offered: only ones this user may assign (never super admin unless allowed; admin only for the platform owner).
  const roleList = [...(opts?.assignableRoles || ["doctor","receptionist","pharmacist","labstaff"])];
  if (allowSuperadmin && !roleList.includes("superadmin")) roleList.unshift("superadmin");
  if (form.role && !roleList.includes(form.role)) roleList.unshift(form.role); // keep showing the current role when editing an existing account

  return (
    <Modal title={editing ? t("users.editTitle") : t("users.createTitle")} onClose={onClose}>
      {err && <div style={{ background:"var(--danger-bg)", border:"1px solid var(--danger-border)", borderRadius:8, padding:"10px 14px", color:"var(--danger)", fontSize:13, marginBottom:16 }}>{err}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label={t("fields.fullName")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
        <Field label={t("common.username")}><input style={inp} value={form.username||""} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/></Field>
        <Field label={t("fields.password")}><input style={inp} type="password" autoComplete="new-password" placeholder={editing?t("users.passwordKeepBlank"):t("users.passwordHint")} value={form.password||""} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></Field>
        <Field label={t("fields.role")}>
          <select style={inp} value={form.role||""} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
            <option value="">{t("common.select")}</option>
            {roleList.map(r=><option key={r} value={r} disabled={r==="admin"&&!(opts?.assignableRoles||[]).includes("admin")&&form.role!=="admin"}>{t(`roles.${r}`)}</option>)}
          </select>
        </Field>
      </div>
      <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {editing?t("users.updateBtn"):t("users.createBtn")}</LoadingButton>
    </Modal>
  );
}

// Reset a staff member's password — type a new one, or generate a temporary
// password that is shown once.
function ResetPasswordModal({ token, user, onClose, onDone }) {
  const { t } = useTranslation();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [generated, setGenerated] = useState(null);

  const submit = async () => {
    setErr("");
    if (pw && pw.length < 8) { setErr(t("users.errPassword")); return false; }
    try {
      const r = await api(`/users/${user.id}/password`, "PUT", pw ? { password: pw } : {}, token);
      if (r.generated && r.password) setGenerated(r.password);
      else { toast.success(t("users.saved")); onDone?.(); }
    } catch (e) { setErr(apiErrorMessage(e, t("common.error"))); return false; }
  };

  return (
    <Modal title={t("resetPassword.title", { name: user.name })} onClose={onClose}>
      {err && <div style={{ background:"var(--danger-bg)", border:"1px solid var(--danger-border)", borderRadius:8, padding:"10px 14px", color:"var(--danger)", fontSize:13, marginBottom:16 }}>{err}</div>}
      {generated ? (
        <>
          <p style={{ fontSize:14, color:"var(--text-muted)", marginTop:0 }}>{t("resetPassword.generatedNotice")}</p>
          <div style={{ background:"var(--brand-tint-faint)", border:"1px solid var(--brand-tint)", borderRadius:8, padding:"14px 16px", fontSize:18, fontWeight:700, letterSpacing:1, textAlign:"center", fontFamily:"monospace" }}>{generated}</div>
          <button style={{ ...btnP, marginTop:16, justifyContent:"center", width:"100%" }} onClick={onDone}><Icon name="check" size={16}/> {t("common.done")}</button>
        </>
      ) : (
        <>
          <Field label={t("resetPassword.newPassword")}>
            <input style={inp} type="text" placeholder={t("resetPassword.leaveBlankGenerate")} value={pw} onChange={e=>setPw(e.target.value)}/>
          </Field>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={submit}>
            <Icon name="key" size={16}/> {pw ? t("resetPassword.submit") : t("resetPassword.generateSubmit")}
          </LoadingButton>
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
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("users.title")}</h2>
        <button style={btnP} onClick={()=>{setEditing({});setModal("form");}}><Icon name="plus" size={16}/> {t("users.add")}</button>
      </div>
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
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

const panel={ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" };
const pageHead={ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 };
const h2s={ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" };

function Patients({ token, user }) {
  const { t, i18n } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({}); const [search,setSearch]=useState("");
  const canEdit=["admin","receptionist"].includes(user.role);
  // The search runs on the server (name, patient number or phone), so a big register stays fast.
  const load=useCallback(()=>api(`/patients?limit=200${search.trim()?`&q=${encodeURIComponent(search.trim())}`:""}`,"GET",null,token).then(setData).catch(()=>{}),[token,search]);
  useEffect(()=>{ const id=setTimeout(load,search?300:0); return ()=>clearTimeout(id); },[load,search]);
  const save=async()=>{
    if(!String(form.name||"").trim()){ toast.error(t("patients.errName")); return false; }
    const ok=await withErr(()=>form.id?api(`/patients/${form.id}`,"PUT",form,token):api("/patients","POST",form,token),t("patients.saved"));
    if(ok){ setModal(null);setForm({});load(); } else return false;
  };
  const del=async(id)=>{ if(confirm(t("patients.deleteConfirm"))){ await withErr(()=>api(`/patients/${id}`,"DELETE",null,token)); load(); } };
  return (
    <div>
      <div style={pageHead}>
        <h2 style={h2s}>{t("patients.title")}</h2>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-faint)" }}><Icon name="search" size={15}/></span>
            <input style={{ ...inp, paddingInlineStart:34, width:260 }} placeholder={t("patients.searchHint")} aria-label={t("common.search")} value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {canEdit && <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("patients.add")}</button>}
        </div>
      </div>
      <div style={panel}>
        <Table columns={[{key:"patientNumber",label:t("patients.number"),render:v=>v||"—"},{key:"name",label:t("fields.fullName")},{key:"age",label:t("fields.age")},{key:"gender",label:t("fields.gender"),render:v=>v?t(`gender.${String(v).toLowerCase()}`,v):"—"},{key:"phone",label:t("fields.phone")},{key:"bloodGroup",label:t("fields.bloodGroup")},{key:"address",label:t("fields.address")},{key:"createdAt",label:t("fields.registered"),render:v=>formatDate(v,i18n.language)}]} data={data}
          actions={canEdit?row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            user.role==="admin"&&<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ].filter(Boolean):null}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?t("patients.editTitle"):t("patients.registerTitle")} onClose={()=>setModal(null)}>
          {form.patientNumber && <div style={{ marginBottom:12, fontSize:13, color:"var(--text-muted)" }}>{t("patients.number")}: <b>{form.patientNumber}</b></div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.fullName")}><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label={t("fields.age")}><input style={inp} type="number" min="0" value={form.age||""} onChange={e=>setForm(f=>({...f,age:e.target.value}))}/></Field>
            <Field label={t("fields.gender")}><select style={inp} value={form.gender||""} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}><option value="">{t("common.select")}</option><option value="Male">{t("gender.male")}</option><option value="Female">{t("gender.female")}</option><option value="Other">{t("gender.other")}</option></select></Field>
            <Field label={t("fields.bloodGroup")}><select style={inp} value={form.bloodGroup||""} onChange={e=>setForm(f=>({...f,bloodGroup:e.target.value}))}><option value="">{t("common.select")}</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></Field>
            <Field label={t("fields.phone")}><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label={t("fields.email")}><input style={inp} value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></Field>
          </div>
          <Field label={t("fields.address")}><input style={inp} value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></Field>
          <Field label={t("fields.emergencyContact")}><input style={inp} value={form.emergencyContact||""} onChange={e=>setForm(f=>({...f,emergencyContact:e.target.value}))}/></Field>
          <Field label={t("fields.notesAllergies")}><textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {form.id?t("patients.updateBtn"):t("patients.registerBtn")}</LoadingButton>
        </Modal>
      )}
    </div>
  );
}

function Doctors({ token }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({}); const [doctorUsers,setDoctorUsers]=useState([]);
  const opts=useOptions(token);
  const load=useCallback(()=>api("/doctors","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  // Login accounts with the Doctor role, so a doctor profile can be linked to one by name instead of an ID.
  useEffect(()=>{ api("/users","GET",null,token).then(u=>setDoctorUsers(u.filter(x=>x.role==="doctor"))).catch(()=>{}); },[token,modal]);
  const save=async()=>{
    if(!String(form.name||"").trim()){ toast.error(t("doctors.errName")); return false; }
    const ok=await withErr(()=>form.id?api(`/doctors/${form.id}`,"PUT",form,token):api("/doctors","POST",form,token),t("doctors.saved"));
    if(ok){ setModal(null);setForm({});load(); } else return false;
  };
  const del=async(id)=>{ if(confirm(t("doctors.deleteConfirm"))){ await withErr(()=>api(`/doctors/${id}`,"DELETE",null,token)); load(); } };
  return (
    <div>
      <div style={pageHead}>
        <h2 style={h2s}>{t("doctors.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("doctors.add")}</button>
      </div>
      <div style={panel}>
        <Table columns={[{key:"name",label:t("fields.name")},{key:"specialization",label:t("fields.specialization")},{key:"qualification",label:t("fields.qualification")},{key:"department",label:t("fields.department")},{key:"phone",label:t("fields.phone")},{key:"consultationFee",label:t("doctors.fee"),render:v=>Number(v)>0?formatMoney(Number(v)):"—"},{key:"status",label:t("fields.status"),render:v=><Badge status={v||"active"}/>}]} data={data}
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
            <Field label={t("fields.qualification")}><SearchSelect value={form.qualification||""} valueLabel={form.qualification||""} options={opts?.qualifications||[]} placeholder={t("doctors.chooseQual")} noResults={t("common.noMatches")} ariaLabel={t("fields.qualification")} onChange={v=>setForm(f=>({...f,qualification:v}))}/></Field>
            <Field label={t("fields.department")}><SearchSelect value={form.department||""} valueLabel={form.department||""} options={opts?.departments||[]} placeholder={t("doctors.chooseDept")} noResults={t("common.noMatches")} ariaLabel={t("fields.department")} onChange={v=>setForm(f=>({...f,department:v}))}/></Field>
            <Field label={t("fields.phone")}><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label={t("doctors.fee")}><input style={inp} type="number" min="0" step="any" value={form.consultationFee??""} aria-label={t("doctors.fee")} onChange={e=>setForm(f=>({...f,consultationFee:e.target.value}))}/><div style={{ fontSize:12, color:"var(--text-faint)", marginTop:4 }}>{t("doctors.feeHint")}</div></Field>
            <Field label={t("fields.status")}><select style={inp} value={form.status||"active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">{t("status.active")}</option><option value="inactive">{t("status.inactive")}</option></select></Field>
          </div>
          <Field label={t("doctors.linkedUser")}>
            <select style={inp} value={form.linkedUserId||""} onChange={e=>setForm(f=>({...f,linkedUserId:e.target.value}))}>
              <option value="">{t("doctors.noLinked")}</option>
              {doctorUsers.map(u=><option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
            </select>
          </Field>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {form.id?t("doctors.updateBtn"):t("doctors.addBtn")}</LoadingButton>
        </Modal>
      )}
    </div>
  );
}

function Staff({ token }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const opts=useOptions(token);
  const load=useCallback(()=>api("/staff","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{
    if(!String(form.name||"").trim()){ toast.error(t("staff.errName")); return false; }
    if(!form.role){ toast.error(t("staff.errRole")); return false; }
    const ok=await withErr(()=>form.id?api(`/staff/${form.id}`,"PUT",form,token):api("/staff","POST",form,token),t("staff.saved"));
    if(ok){ setModal(null);setForm({});load(); } else return false;
  };
  const del=async(id)=>{ if(confirm(t("staff.deleteConfirm"))){ await withErr(()=>api(`/staff/${id}`,"DELETE",null,token)); load(); } };
  const roleOptions=[...(opts?.staffRoles||[])]; if(form.role&&!roleOptions.includes(form.role)) roleOptions.unshift(form.role);
  return (
    <div>
      <div style={pageHead}>
        <h2 style={h2s}>{t("staff.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("staff.add")}</button>
      </div>
      <div style={panel}>
        <Table columns={[{key:"name",label:t("fields.name")},{key:"role",label:t("fields.role")},{key:"department",label:t("fields.department")},{key:"phone",label:t("fields.phone")},{key:"salary",label:t("fields.salary"),render:v=>v?formatMoney(v):"—"},{key:"status",label:t("fields.status"),render:v=><Badge status={v||"active"}/>}]} data={data}
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
            <Field label={t("fields.role")}>
              <select style={inp} value={form.role||""} aria-label={t("fields.role")} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="">{t("staff.chooseRole")}</option>
                {roleOptions.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={t("fields.department")}><SearchSelect value={form.department||""} valueLabel={form.department||""} options={opts?.departments||[]} placeholder={t("staff.chooseDept")} noResults={t("common.noMatches")} ariaLabel={t("fields.department")} onChange={v=>setForm(f=>({...f,department:v}))}/></Field>
            <Field label={t("fields.phone")}><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label={t("fields.salaryUgx")}><input style={inp} type="number" min="0" value={form.salary||""} onChange={e=>setForm(f=>({...f,salary:e.target.value}))}/></Field>
            <Field label={t("fields.status")}><select style={inp} value={form.status||"active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">{t("status.active")}</option><option value="inactive">{t("status.inactive")}</option></select></Field>
          </div>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {form.id?t("staff.updateBtn"):t("staff.addBtn")}</LoadingButton>
        </Modal>
      )}
    </div>
  );
}

function Appointments({ token, user }) {
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [doctors,setDoctors]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const canEdit=["admin","receptionist"].includes(user.role);
  const fetchPatients=useMemo(()=>patientFetcher(token),[token]);
  const load=useCallback(async()=>{ try{ const [a,d]=await Promise.all([api("/appointments","GET",null,token),api("/doctors","GET",null,token)]); setData(a);setDoctors(d); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{
    if(!form.patientId){ toast.error(t("appointments.errPatient")); return false; }
    if(!form.date){ toast.error(t("appointments.errDate")); return false; }
    const ok=await withErr(()=>form.id?api(`/appointments/${form.id}`,"PUT",form,token):api("/appointments","POST",form,token),t("appointments.saved"));
    if(ok){ setModal(null);setForm({});load(); } else return false;
  };
  const del=async(id)=>{ if(confirm(t("appointments.deleteConfirm"))){ await withErr(()=>api(`/appointments/${id}`,"DELETE",null,token)); load(); } };
  const doctorItems=useMemo(()=>doctors.map(d=>({value:d.id,label:`Dr. ${d.name}`,sub:[d.specialization,d.department].filter(Boolean).join(" · ")})),[doctors]);
  return (
    <div>
      <div style={pageHead}>
        <h2 style={h2s}>{t("appointments.title")}</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("appointments.schedule")}</button>}
      </div>
      <div style={panel}>
        <Table columns={[{key:"patientName",label:t("fields.patient"),render:(v,row)=>v||row.patientId},{key:"doctorName",label:t("fields.doctor"),render:(v)=>v?"Dr. "+v:"—"},{key:"date",label:t("fields.date")},{key:"time",label:t("fields.time")},{key:"reason",label:t("fields.reason")},{key:"status",label:t("fields.status"),render:v=><Badge status={v}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>,
            canEdit&&<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ].filter(Boolean)}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?t("appointments.editTitle"):t("appointments.scheduleTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}>
            <SearchSelect value={form.patientId||""} valueLabel={form.patientName||""} fetcher={fetchPatients} allowClear={false} disabled={Boolean(form.id)} placeholder={t("appointments.searchPatient")} noResults={t("common.noMatches")} ariaLabel={t("fields.patient")}
              onChange={(v,it)=>setForm(f=>({...f,patientId:v,patientName:it?.label||""}))}/>
          </Field>
          <Field label={t("fields.doctor")}>
            <SearchSelect value={form.doctorId||""} valueLabel={form.doctorName?`Dr. ${form.doctorName}`:""} options={doctorItems} placeholder={t("appointments.chooseDoctor")} noResults={t("common.noMatches")} ariaLabel={t("fields.doctor")}
              onChange={(v,it)=>setForm(f=>({...f,doctorId:v,doctorName:it?it.label.replace(/^Dr\. /,""):""}))}/>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label={t("fields.date")}><input style={inp} type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
            <Field label={t("fields.time")}><input style={inp} type="time" value={form.time||""} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></Field>
          </div>
          <Field label={t("fields.reason")}><input style={inp} value={form.reason||""} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}/></Field>
          <Field label={t("fields.status")}><select style={inp} value={form.status||"scheduled"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="scheduled">{t("status.scheduled")}</option><option value="completed">{t("status.completed")}</option><option value="cancelled">{t("status.cancelled")}</option></select></Field>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {form.id?t("appointments.updateBtn"):t("appointments.scheduleBtn")}</LoadingButton>
        </Modal>
      )}
    </div>
  );
}

function MedicalRecords({ token, user }) {
  const { t, i18n } = useTranslation();
  const [data,setData]=useState([]); const [doctors,setDoctors]=useState([]); const [inventory,setInventory]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({medicinesUsed:[]});
  const canEdit=["admin","doctor"].includes(user.role);
  const fetchPatients=useMemo(()=>patientFetcher(token),[token]);
  const load=useCallback(async()=>{ try{ const [r,d,inv]=await Promise.all([api("/records","GET",null,token),api("/doctors","GET",null,token).catch(()=>[]),api("/inventory","GET",null,token).catch(()=>[])]); setData(r);setDoctors(d);setInventory(inv); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{
    if(!form.patientId){ toast.error(t("records.errPatient")); return false; }
    const ok=await withErr(()=>form.id?api(`/records/${form.id}`,"PUT",form,token):api("/records","POST",form,token),t("records.saved"));
    if(ok){ setModal(null);setForm({medicinesUsed:[]});load(); } else return false;
  };
  const doctorItems=useMemo(()=>doctors.map(d=>({value:d.id,label:`Dr. ${d.name}`,sub:d.specialization||""})),[doctors]);
  const toggleMed=id=>{ const cur=form.medicinesUsed||[]; setForm(f=>({...f,medicinesUsed:cur.includes(id)?cur.filter(m=>m!==id):[...cur,id]})); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("records.title")}</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({medicinesUsed:[]});setModal("add");}}><Icon name="plus" size={16}/> {t("records.add")}</button>}
      </div>
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
        <Table columns={[{key:"patientName",label:t("fields.patient"),render:(v,row)=>v||row.patientId},{key:"doctorName",label:t("fields.doctor"),render:v=>v?"Dr. "+v:"—"},{key:"diagnosis",label:t("fields.diagnosis")},{key:"treatment",label:t("fields.treatment")},{key:"medicinesUsed",label:t("fields.medicinesUsed"),render:v=>v&&v.length?v.map(id=>inventory.find(i=>i.id===id)?.name||id).join(", "):"—"},{key:"createdAt",label:t("fields.date"),render:v=>formatDate(v,i18n.language)}]} data={data}
          actions={canEdit?row=>[<button key="e" style={btnE} onClick={()=>{setForm({...row,medicinesUsed:row.medicinesUsed||[]});setModal("add");}}><Icon name="edit" size={13}/> {t("common.edit")}</button>]:null}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?t("records.editTitle"):t("records.addTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><SearchSelect value={form.patientId||""} valueLabel={form.patientName||""} fetcher={fetchPatients} allowClear={false} disabled={Boolean(form.id)} placeholder={t("appointments.searchPatient")} noResults={t("common.noMatches")} ariaLabel={t("fields.patient")} onChange={(v,it)=>setForm(f=>({...f,patientId:v,patientName:it?.label||""}))}/></Field>
          <Field label={t("fields.doctor")}><SearchSelect value={form.doctorId||""} valueLabel={form.doctorName?`Dr. ${form.doctorName}`:""} options={doctorItems} placeholder={t("appointments.chooseDoctor")} noResults={t("common.noMatches")} ariaLabel={t("fields.doctor")} onChange={(v,it)=>setForm(f=>({...f,doctorId:v,doctorName:it?it.label.replace(/^Dr\. /,""):""}))}/></Field>
          <Field label={t("fields.diagnosis")}><input style={inp} value={form.diagnosis||""} onChange={e=>setForm(f=>({...f,diagnosis:e.target.value}))}/></Field>
          <Field label={t("fields.treatment")}><textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.treatment||""} onChange={e=>setForm(f=>({...f,treatment:e.target.value}))}/></Field>
          <Field label={t("fields.prescription")}><textarea style={{ ...inp, height:60, resize:"vertical" }} value={form.prescription||""} onChange={e=>setForm(f=>({...f,prescription:e.target.value}))}/></Field>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{t("records.medicinesUsedLabel")}</label>
            {inventory.filter(i=>!i.category||i.category==="Medicine").length===0
              ? <p style={{ color:"var(--text-faint)", fontSize:13 }}>{t("records.noMedicines")}</p>
              : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:160, overflowY:"auto", border:"1.5px solid var(--brand-tint)", borderRadius:8, padding:10 }}>
                  {inventory.filter(i=>!i.category||i.category==="Medicine").map(med=>(
                    <label key={med.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                      <input type="checkbox" checked={(form.medicinesUsed||[]).includes(med.id)} onChange={()=>toggleMed(med.id)}/>
                      {med.name} <span style={{ color:"var(--text-faint)", fontSize:11 }}>({med.quantity} {med.unit})</span>
                    </label>
                  ))}
                </div>
            }
          </div>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {form.id?t("records.updateBtn"):t("records.saveBtn")}</LoadingButton>
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
  const save=async()=>{ const ok=await withErr(()=>form.id?api(`/inventory/${form.id}`,"PUT",form,token):api("/inventory","POST",form,token),t("pharmacy.saved")); if(ok){ setModal(null);setForm({});load(); } else return false; };
  const del=async(id)=>{ if(confirm(t("pharmacy.removeConfirm"))){ await withErr(()=>api(`/inventory/${id}`,"DELETE",null,token)); load(); } };
  const CATEGORIES=[["Medicine",t("pharmacy.categories.medicine")],["Equipment",t("pharmacy.categories.equipment")],["Supplies",t("pharmacy.categories.supplies")],["Lab Reagent",t("pharmacy.categories.labReagent")]];
  const catLabel=v=>CATEGORIES.find(c=>c[0]===v)?.[1]||v;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("pharmacy.title")}</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("pharmacy.add")}</button>}
      </div>
      {user.role==="doctor"&&<div style={{ background:"var(--info-bg)", border:"1px solid var(--info-border)", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"var(--info)" }}>{t("pharmacy.doctorViewNote")}</div>}
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:t("fields.item")},{key:"category",label:t("fields.category"),render:v=>catLabel(v)},{key:"quantity",label:t("fields.stock"),render:(v,row)=><span style={{ color:parseInt(v)<10?"var(--danger)":"#333", fontWeight:parseInt(v)<10?700:400 }}>{v} {row.unit}</span>},{key:"unitPrice",label:t("fields.unitPrice"),render:v=>formatMoney(v)},{key:"expiryDate",label:t("fields.expiry")},{key:"supplier",label:t("fields.supplier")}]} data={data}
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
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {form.id?t("pharmacy.updateBtn"):t("pharmacy.addBtn")}</LoadingButton>
        </Modal>
      )}
    </div>
  );
}

function Billing({ token }) {
  const { t, i18n } = useTranslation();
  const [bills,setBills]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({items:[]});
  const fetchPatients=useMemo(()=>patientFetcher(token),[token]);
  const load=useCallback(async()=>{ try{ setBills(await api("/bills","GET",null,token)); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const addItem=()=>setForm(f=>({...f,items:[...(f.items||[]),{desc:"",amount:""}]}));
  const updItem=(i,k,v)=>setForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const total=(form.items||[]).reduce((s,it)=>s+(parseFloat(it.amount)||0),0);
  const save=async()=>{
    if(!form.patientId){ toast.error(t("billing.errPatient")); return false; }
    const items=(form.items||[]).filter(it=>parseFloat(it.amount)>0);
    if(!items.length){ toast.error(t("billing.errItems")); return false; }
    const ok=await withErr(()=>api("/bills","POST",{patientId:form.patientId,notes:form.notes,items,totalAmount:items.reduce((a,it)=>a+(parseFloat(it.amount)||0),0)},token),t("billing.saved"));
    if(ok){ setModal(null);setForm({items:[]}); load(); } else return false;
  };
  const markPaid=async(bill)=>{
    const due=bill.remainingAmount ?? bill.totalAmount ?? 0;
    const ok=await withErr(()=>api("/transactions","POST",{billId:bill.id,amount:due,patientId:bill.patientId,method:"Cash",note:t("billing.manualPayment")},token),t("billing.paid"));
    if(ok) load(); else return false;
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("billing.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({items:[]});setModal("add");}}><Icon name="plus" size={16}/> {t("billing.create")}</button>
      </div>
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
        <Table columns={[{key:"billNumber",label:t("fields.billNumber")},{key:"patientName",label:t("fields.patient"),render:(v,row)=>v||row.patientId},{key:"totalAmount",label:t("fields.total"),render:v=>formatMoney(parseFloat(v||0))},{key:"status",label:t("fields.status"),render:v=><Badge status={v}/>},{key:"createdAt",label:t("fields.date"),render:v=>formatDate(v,i18n.language)}]} data={bills}
          actions={row=>[row.status!=="paid"&&row.status!=="cancelled"&&<LoadingButton key="p" style={btnG} busyLabel={t("common.saving")} onClick={()=>markPaid(row)}><Icon name="check" size={13}/> {t("billing.markPaid")}</LoadingButton>].filter(Boolean)}
        />
      </div>
      {modal==="add"&&(
        <Modal title={t("billing.createTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><SearchSelect value={form.patientId||""} fetcher={fetchPatients} allowClear={false} placeholder={t("appointments.searchPatient")} noResults={t("common.noMatches")} ariaLabel={t("fields.patient")} onChange={v=>setForm(f=>({...f,patientId:v}))}/></Field>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:0.5 }}>{t("billing.billItems")}</label>
            {(form.items||[]).map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginTop:8 }}>
                <input style={{ ...inp, flex:2 }} placeholder={t("billing.description")} value={item.desc} onChange={e=>updItem(i,"desc",e.target.value)}/>
                <input style={{ ...inp, flex:1 }} type="number" min="0" placeholder={getCurrency()} aria-label={t("billing.amountPh")} value={item.amount} onChange={e=>updItem(i,"amount",e.target.value)}/>
              </div>
            ))}
            <button type="button" onClick={addItem} style={{ marginTop:10, background:"var(--brand-tint-light)", border:"1px solid var(--brand-tint)", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer" }}>+ {t("billing.addItem")}</button>
          </div>
          <div style={{ background:"var(--brand-tint-faint)", borderRadius:8, padding:"12px 16px", marginBottom:16, fontWeight:700, fontSize:16 }}>{t("billing.totalLabel",{amount:formatMoney(total)})}</div>
          <Field label={t("fields.notes")}><textarea style={{ ...inp, height:60 }} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {t("billing.generateBtn")}</LoadingButton>
        </Modal>
      )}
    </div>
  );
}

function Transactions({ token }) {
  const { t, i18n } = useTranslation();
  const [data,setData]=useState([]); const [bills,setBills]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const fetchPatients=useMemo(()=>patientFetcher(token),[token]);
  const load=useCallback(async()=>{ try{ const [tx,b]=await Promise.all([api("/transactions","GET",null,token),api("/bills","GET",null,token)]); setData(tx);setBills(b); }catch{ /* surfaced elsewhere */ } },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{
    if(!(parseFloat(form.amount)>0)){ toast.error(t("transactions.errAmount")); return false; }
    if(!form.method){ toast.error(t("transactions.errMethod")); return false; }
    const ok=await withErr(()=>api("/transactions","POST",{...form,currency:payCur},token),t("transactions.saved"));
    if(ok){ setModal(null);setForm({});load(); } else return false;
  };
  const del=async(id)=>{ if(confirm(t("transactions.deleteConfirm"))){ await withErr(()=>api(`/transactions/${id}`,"DELETE",null,token)); load(); } };
  const total=data.reduce((s,tx)=>s+(parseFloat(tx.amount)||0),0);
  // Mixed currencies: the bill and totals stay in the hospital's main currency; the patient may pay in any accepted one.
  const base=getCurrency(); const accepted=getAcceptedCurrencies(); const rates=getPayRates();
  const payCur=form.currency||base;
  const rateText=(b,c,r)=>{ const v=rateView(b,c,r); return `1 ${v.strong} = ${Number(v.value).toLocaleString()} ${v.weak}`; };
  const rateOf=c=>c===base?1:rates[c];
  const convert=(amt,c)=>{ const v=(Number(amt)||0)*rateOf(c); return c==="USD"||c==="EUR"?Math.round(v*100)/100:Math.ceil(v); };
  const equivalent=(parseFloat(form.amount)||0)/(rateOf(payCur)||1);
  const METHODS=[["Cash",t("transactions.methods.cash")],["Mobile Money",t("transactions.methods.mobileMoney")],["Bank Transfer",t("transactions.methods.bankTransfer")],["Insurance",t("transactions.methods.insurance")],["Card",t("transactions.methods.card")]];
  const methodLabel=v=>METHODS.find(m=>m[0]===v)?.[1]||v;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("transactions.title")}</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> {t("transactions.record")}</button>
      </div>
      <div style={{ background:"linear-gradient(135deg,var(--brand),var(--info))", borderRadius:16, padding:"20px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ fontSize:13, opacity:0.7 }}>{t("transactions.totalRevenueCollected")}</div>
        <div style={{ fontSize:32, fontWeight:800, marginTop:4 }}>{formatMoney(total)}</div>
      </div>
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
        <Table columns={[{key:"txRef",label:t("fields.refNumber")},{key:"patientName",label:t("fields.patient"),render:(v,row)=>v||row.patientId||"—"},{key:"amount",label:t("fields.amount"),render:(v,row)=><span>{formatMoney(parseFloat(v||0))}{row.tenderedCurrency&&row.tenderedCurrency!==base&&<div style={{ fontSize:11, color:"var(--text-faint)" }}>{t("transactions.paidIn",{amount:formatMoney(row.tenderedAmount,row.tenderedCurrency),rate:rateText(base,row.tenderedCurrency,row.exchangeRate)})}</div>}</span>},{key:"method",label:t("fields.method"),render:v=>methodLabel(v)},{key:"recordedBy",label:t("fields.recordedBy")},{key:"note",label:t("fields.note")},{key:"createdAt",label:t("fields.date"),render:v=>formatDate(v,i18n.language)}]} data={data}
          actions={row=>[<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>]}
        />
      </div>
      {modal==="add"&&(
        <Modal title={t("transactions.recordTitle")} onClose={()=>setModal(null)}>
          <Field label={t("fields.patient")}><SearchSelect value={form.patientId||""} fetcher={fetchPatients} placeholder={t("appointments.searchPatient")} noResults={t("common.noMatches")} ariaLabel={t("fields.patient")} onChange={v=>setForm(f=>({...f,patientId:v}))}/></Field>
          <Field label={t("transactions.linkToBill")}><select style={inp} value={form.billId||""} onChange={e=>{ const b=bills.find(x=>x.id===e.target.value); setForm(f=>({...f,billId:e.target.value,...(b?{patientId:b.patientId,amount:f.amount||convert(b.remainingAmount||b.totalAmount,f.currency||base)}:{})})); }}><option value="">{t("common.none")}</option>{bills.filter(b=>b.status!=="paid").map(b=><option key={b.id} value={b.id}>{b.billNumber}{b.patientName?` · ${b.patientName}`:""} — {formatMoney(parseFloat(b.remainingAmount ?? b.totalAmount ?? 0))}</option>)}</select></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {accepted.length>1&&<Field label={t("transactions.payCurrency")}>
              <select style={inp} value={payCur} aria-label={t("transactions.payCurrency")} onChange={e=>{ const c=e.target.value; const b=bills.find(x=>x.id===form.billId); setForm(f=>({...f,currency:c,...(b?{amount:convert(b.remainingAmount||b.totalAmount,c)}:{})})); }}>
                {accepted.map(c=><option key={c} value={c}>{c}{c===base?` (${t("transactions.mainCur")})`:""}</option>)}
              </select>
            </Field>}
            <Field label={`${t("fields.amount")} (${payCur})`}><input style={inp} type="number" min="0" aria-label={t("fields.amount")} value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
              {payCur!==base&&equivalent>0&&<div style={{ fontSize:12, color:"var(--text-muted)", marginTop:4 }}>{t("transactions.equals",{amount:formatMoney(equivalent),rate:rateText(base,payCur,rates[payCur])})}</div>}
            </Field>
            <Field label={t("fields.method")}><select style={inp} value={form.method||""} onChange={e=>setForm(f=>({...f,method:e.target.value}))}><option value="">{t("common.select")}</option>{METHODS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <Field label={t("fields.note")}><input style={inp} value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></Field>
          <LoadingButton style={{ ...btnP, marginTop:8 }} busyLabel={t("common.saving")} onClick={save}><Icon name="check" size={16}/> {t("transactions.recordBtn")}</LoadingButton>
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
  if(!stats) return <div style={{ padding:40, color:"var(--text-muted)" }}>{t("common.loading")}</div>;
  const byRole=stats.usersByRole||{};
  return (
    <div>
      <h2 style={{ margin:"0 0 24px", fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("overview.title")}</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16, marginBottom:28 }}>
        <StatCard label={t("dashboard.totalPatients")} value={stats.totalPatients} color="var(--info)" icon="patients" />
        <StatCard label={t("dashboard.doctors")} value={stats.totalDoctors} color="var(--brand)" icon="doctors" />
        <StatCard label={t("dashboard.staff")} value={stats.totalStaff} color="var(--purple)" icon="staff" />
        <StatCard label={t("dashboard.systemUsers")} value={stats.totalUsers} color="var(--brand-accent)" icon="users" sub={t("overview.activeDisabled",{active:stats.activeUsers,disabled:stats.disabledUsers})} />
        <StatCard label={t("overview.totalAppointments")} value={stats.totalAppointments} color="var(--warn)" icon="appointments" />
        <StatCard label={t("overview.totalRecords")} value={stats.totalRecords} color="var(--info)" icon="records" />
        <StatCard label={t("dashboard.pendingBills")} value={stats.pendingBills} color="var(--danger)" icon="billing" />
        {Object.entries(stats.revenueByCurrency||{}).map(([cur,amt])=><StatCard key={cur} label={`${t("dashboard.totalRevenue")} · ${cur}`} value={formatMoney(amt,cur)} color="var(--info)" icon="transactions" />)}
        <StatCard label={t("dashboard.lowStock")} value={stats.lowStockItems} color="var(--danger)" icon="pharmacy" />
        <StatCard label={t("overview.auditToday")} value={stats.auditToday} color="var(--purple)" icon="activity" />
        <StatCard label={t("overview.auditTotal")} value={stats.auditTotal} color="var(--text-muted)" icon="activity" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        <div style={{ background:"var(--surface)", borderRadius:16, padding:24, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>{t("overview.usersByRole")}</h3>
          {Object.keys(byRole).length===0 ? <p style={{ color:"var(--text-faint)", fontSize:13 }}>{t("common.noRecords")}</p> :
            Object.entries(byRole).map(([r,c])=>(
              <div key={r} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--neutral-bg)" }}>
                <Badge status={r}/><span style={{ fontWeight:800, fontSize:16 }}>{c}</span>
              </div>
            ))}
        </div>
        <div style={{ background:"var(--surface)", borderRadius:16, padding:24, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)" }}>
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
  const map={ CREATE:["var(--brand)","var(--brand-tint-light)"], UPDATE:["var(--info)","var(--info-bg)"], DELETE:["var(--danger)","var(--danger-bg)"], LOGIN:["var(--brand)","var(--brand-tint-light)"], LOGIN_FAILED:["var(--danger)","var(--danger-bg)"], PASSWORD_RESET:["var(--purple)","var(--purple-bg)"], ACCOUNT_DISABLED:["var(--danger)","var(--danger-bg)"], ACCOUNT_ENABLED:["var(--brand)","var(--brand-tint-light)"] };
  const [c,bg]=map[action]||["var(--text-muted)","var(--neutral-bg)"];
  return <span style={{ background:bg, color:c, padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{t(`audit.actions.${action}`,action)}</span>;
}

function ClearAuditModal({ token, hospitals, initialHospital, onClose, onDone }) {
  const { t } = useTranslation();
  const [hospitalId,setHospitalId]=useState(initialHospital||"all");
  const [before,setBefore]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false); const [err,setErr]=useState(""); const [result,setResult]=useState(null);
  const submit=async()=>{
    setBusy(true); setErr("");
    try{ const r=await api("/audit-logs","DELETE",{ hospitalId, before:before||undefined, confirm },token); setResult(r.deleted); }
    catch(e){ setErr(apiErrorMessage(e,t("common.error"))); }
    setBusy(false);
  };
  return (
    <Modal title={t("audit.clear.title")} onClose={result===null?onClose:onDone}>
      {result!==null ? (
        <div>
          <p style={{ color:"var(--text)", fontSize:14 }}>{t("audit.clear.done",{count:result})}</p>
          <div style={{ display:"flex", justifyContent:"flex-end" }}><button style={btnP} onClick={onDone}>{t("audit.clear.close")}</button></div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"var(--warn-bg)", border:"1px solid var(--warn-border)", color:"var(--warn-text)", borderRadius:10, padding:"10px 12px", fontSize:13 }}>{t("audit.clear.warning")}</div>
          <Field label={t("audit.clear.scope")}>
            <select style={inp} value={hospitalId} onChange={e=>setHospitalId(e.target.value)}>
              <option value="all">{t("audit.filters.allHospitals")}</option>
              <option value="platform">{t("audit.filters.platformOnly")}</option>
              {hospitals.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Field>
          <Field label={t("audit.clear.before")}>
            <input style={inp} type="date" value={before} onChange={e=>setBefore(e.target.value)}/>
            <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:4 }}>{t("audit.clear.beforeHint")}</div>
          </Field>
          <Field label={t("audit.clear.type")}>
            <input style={inp} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="DELETE" autoComplete="off"/>
          </Field>
          {err&&<div style={{ color:"var(--danger)", fontSize:13 }}>{err}</div>}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button style={btnG} onClick={onClose}>{t("audit.clear.cancel")}</button>
            <button style={{ ...btnP, background:"var(--danger)" }} disabled={busy||confirm!=="DELETE"} onClick={submit}>{busy?t("common.loading"):t("audit.clear.confirm")}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AuditLogs({ token }) {
  const { t, i18n } = useTranslation();
  const EMPTY={ hospitalId:"all", q:"", action:"all", actor:"all", entity:"all", from:"", to:"" };
  const [logs,setLogs]=useState([]); const [meta,setMeta]=useState({actions:[],entities:[],actors:[]});
  const [filters,setFilters]=useState(EMPTY); const [loading,setLoading]=useState(false); const [version,setVersion]=useState(0);
  const [hospitals,setHospitals]=useState([]);
  const [clearOpen,setClearOpen]=useState(false);
  useEffect(()=>{ api("/hospitals","GET",null,token).then(h=>setHospitals(Array.isArray(h)?h:[])).catch(()=>{}); },[token]);
  useEffect(()=>{
    const qs=filters.hospitalId&&filters.hospitalId!=="all"?`?hospitalId=${encodeURIComponent(filters.hospitalId)}`:"";
    api(`/audit-logs/meta${qs}`,"GET",null,token).then(setMeta).catch(()=>{});
  },[token,filters.hospitalId,version]);
  const load=useCallback(async()=>{
    setLoading(true);
    const qs=new URLSearchParams();
    Object.entries(filters).forEach(([k,v])=>{ if(v && v!=="all") qs.append(k,v); });
    try{ setLogs(await api(`/audit-logs?${qs.toString()}`,"GET",null,token)); }catch{ setLogs([]); }
    setLoading(false);
  },[token,filters]);
  useEffect(()=>{ const id=setTimeout(load,filters.q?350:0); return ()=>clearTimeout(id); },[load,version,filters.q]);
  const set=(k,v)=>setFilters(f=>({...f,[k]:v, ...(k==="hospitalId"?{actor:"all",action:"all",entity:"all"}:{})}));
  const fSel={ ...inp, width:"auto", minWidth:150, padding:"8px 10px" };
  const fLbl={ display:"flex", flexDirection:"column", gap:4, fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:0.5 };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("audit.title")}</h2>
        <span style={{ display:"inline-flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:13, color:"var(--text-muted)" }}>{loading?t("common.loading"):t("audit.count",{count:logs.length})}</span>
          <button style={{ ...btnG, color:"var(--danger)", borderColor:"var(--danger-border)" }} onClick={()=>setClearOpen(true)}><Icon name="trash" size={13}/> {t("audit.clear.button")}</button>
        </span>
      </div>
      {clearOpen&&<ClearAuditModal token={token} hospitals={hospitals} initialHospital={filters.hospitalId} onClose={()=>setClearOpen(false)} onDone={()=>{ setClearOpen(false); setVersion(v=>v+1); }}/>}
      <div style={{ background:"var(--surface)", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", marginBottom:16, display:"flex", flexWrap:"wrap", gap:14, alignItems:"flex-end" }}>
        <label style={fLbl}>{t("audit.filters.hospital")}
          <select style={fSel} value={filters.hospitalId} onChange={e=>set("hospitalId",e.target.value)}>
            <option value="all">{t("audit.filters.allHospitals")}</option>
            <option value="platform">{t("audit.filters.platformOnly")}</option>
            {hospitals.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <label style={fLbl}>{t("audit.filters.search")}
          <input style={{ ...fSel, minWidth:180 }} value={filters.q} placeholder={t("audit.filters.searchHint")} onChange={e=>set("q",e.target.value)}/>
        </label>
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
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
        <Table columns={[
          {key:"timestamp",label:t("audit.col.time"),render:v=>formatDateTime(v,i18n.language)},
          {key:"actorName",label:t("audit.col.actor"),render:(v,r)=><span style={{ display:"inline-flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{v||"—"} <Badge status={r.actorRole}/></span>},
          {key:"action",label:t("audit.col.action"),render:v=><AuditActionTag action={v}/>},
          {key:"entity",label:t("audit.col.target"),render:(v,r)=>r.entityId?`${v} · ${String(r.entityId).slice(0,8)}`:(v||"—")},
          {key:"status",label:t("audit.col.result"),render:v=><span style={{ color:v>=400?"var(--danger)":"var(--brand-text)", fontWeight:700 }}>{v||"—"}</span>},
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
    <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"9px 0", borderBottom:"1px solid var(--neutral-bg)", fontSize:14 }}>
      <span style={{ color:"var(--text-muted)" }}>{label}</span><span style={{ fontWeight:600, textAlign:"end" }}>{value}</span>
    </div>
  );
  return (
    <Modal title={t("staffProfile.title",{name:member.name})} onClose={onClose}>
      {err && <div style={{ background:"var(--danger-bg)", border:"1px solid var(--danger-border)", borderRadius:8, padding:"10px 14px", color:"var(--danger)", fontSize:13, marginBottom:16 }}>{err}</div>}
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
    <button onClick={()=>setSearch("")||setTab(key)} style={{ background:tab===key?"var(--brand)":"var(--brand-tint-light)", color:tab===key?"#fff":"var(--brand-text)", border:"1px solid var(--brand-tint)", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{label} ({count})</button>
  );
  return (
    <div>
      <h2 style={{ margin:"0 0 20px", fontSize:22, fontWeight:800, color:"var(--brand-text-strong)" }}>{t("people.title")}</h2>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {tabBtn("staff",t("people.tabStaff"),staff.length)}
        {tabBtn("patients",t("people.tabPatients"),patients.length)}
        <div style={{ position:"relative", marginInlineStart:"auto" }}>
          <span style={{ position:"absolute", insetInlineStart:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-faint)" }}><Icon name="search" size={15}/></span>
          <input style={{ ...inp, paddingInlineStart:34, width:220 }} placeholder={t("common.search")} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div style={{ background:"var(--surface)", borderRadius:16, boxShadow:"0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow:"hidden" }}>
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
  const platform = usePlatform();
  const [token,setToken]=useState(()=>localStorage.getItem("hms_token"));
  const [user,setUser]=useState(()=>{ try{return JSON.parse(localStorage.getItem("hms_user"));}catch{return null;} });
  const [hospital,setHospital]=useState(()=>{ try{ const h=JSON.parse(localStorage.getItem("hms_hospital")); setCurrency(h?.currency); setPayCurrencies(h?.settings); return h; }catch{return null;} });
  const [active,setActive]=useState(()=>{ try{ return JSON.parse(localStorage.getItem("hms_user"))?.role==="superadmin"?"hospitals":"dashboard"; }catch{ return "dashboard"; } });
  const [sidebarOpen,setSidebarOpen]=useState(()=>typeof window==="undefined"||window.innerWidth>=900); // phones start with the slim menu
  const isSmall=typeof window!=="undefined"&&window.innerWidth<700;

  const saveHospital=h=>{ setCurrency(h?.currency); setPayCurrencies(h?.settings); setHospital(h||null); try{ h?localStorage.setItem("hms_hospital",JSON.stringify(h)):localStorage.removeItem("hms_hospital"); }catch{ /* storage unavailable */ } };
  const handleLogin=(tok,u,h)=>{ localStorage.setItem("hms_token",tok); localStorage.setItem("hms_user",JSON.stringify(u)); saveHospital(h); setToken(tok);setUser(u);setActive(u.role==="superadmin"?"hospitals":"dashboard"); };
  const handleLogout=useCallback(()=>{ try{ clearSavedCopy(localStorage.getItem("hms_token")); }catch{ /* nothing saved */ } localStorage.removeItem("hms_token"); localStorage.removeItem("hms_user"); localStorage.removeItem("hms_hospital"); setToken(null);setUser(null);setHospital(null); },[]);

  useEffect(()=>{ setAuthErrorHandler(handleLogout); return ()=>setAuthErrorHandler(null); },[handleLogout]);

  // Signed in: the whole app takes the hospital's colour (platform colour for the platform owner).
  useEffect(()=>{ if(token) applyBrand(effectiveColor(hospital?.theme?.primaryColor)); },[token,hospital,platform.color]);

  // Refresh the hospital's name, theme and enabled features whenever the app
  // opens, so a feature the platform owner switched on/off shows up without
  // everyone having to log out. A suspended hospital is signed out here.
  useEffect(()=>{
    if(!token) return;
    api("/session","GET",null,token)
      .then(s=>saveHospital(s.hospital))
      .catch(e=>{ if(apiErrorCode(e)==="SUSPENDED"||/suspended/i.test(apiErrorMessage(e,""))){ toast.error(t("login.suspended")); handleLogout(); } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[token]);

  // Offline support: keep a fresh saved copy of the main lists, and refresh the screen once offline work has been sent.
  const [syncVersion,setSyncVersion]=useState(0);
  useEffect(()=>{
    if(!token) return undefined;
    const first=setTimeout(()=>warmOfflineCache(token),3000);
    const timer=setInterval(()=>warmOfflineCache(token),10*60*1000);
    return ()=>{ clearTimeout(first); clearInterval(timer); };
  },[token]);
  useEffect(()=>{
    const done=()=>{ if(!document.querySelector('[role="dialog"]')) setSyncVersion(v=>v+1); };
    window.addEventListener("hms-synced",done);
    return ()=>window.removeEventListener("hms-synced",done);
  },[]);

  // Browser tab title: the hospital's name once signed in, the product name otherwise.
  useEffect(()=>{ document.title=(token&&hospital?.name)||platform.name; },[token,hospital,platform.name]);

  if(!token||!user) return <LoginPage onLogin={handleLogin}/>;

  const role=user.role;
  const allowed=MODULES_BY_ROLE[role]||["dashboard"];
  const features=hospital?.features;
  const isVisible=m=>{
    const roleOk=m.roles ? m.roles.includes(role) : allowed.includes(m.key);
    if(!roleOk) return false;
    const feat=m.feature||LEGACY_FEATURE[m.key];
    if(!feat||role==="superadmin") return true;
    // Hospital info not loaded yet: keep the long-standing screens, hold back the newer ones.
    return features ? Boolean(features[feat]) : Boolean(!m.roles);
  };
  const modules=(()=>{
    const list=[...MODULES.filter(m=>m.first),...ALL_MODULES,...MODULES.filter(m=>!m.first&&!m.after)].filter(isVisible);
    // A module with after:"key" sits right below that menu item (or at the top if it isn't shown).
    MODULES.filter(m=>m.after&&!m.first).filter(isVisible).forEach(m=>{
      const i=list.findIndex(x=>x.key===m.after);
      list.splice(i+1,0,m);
    });
    return list;
  })();
  const ActiveModule=modules.find(m=>m.key===active)||modules[0];
  const ActiveComponent=ActiveModule.Component;
  const activeLabel=t(`nav.${ActiveModule.navKey}`);
  const roleColors={ superadmin:"var(--danger)", admin:"var(--brand)", doctor:"var(--info)", receptionist:"var(--warn)", pharmacist:"var(--brand-accent)", labstaff:"var(--teal)" };
  const roleColor=roleColors[role]||"var(--info)";
  const brand=effectiveColor(hospital?.theme?.primaryColor);
  const orgName=hospital?.name||platform.name;

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"var(--page-bg)", color:"var(--text)" }}>
      <div style={{ width:sidebarOpen?240:68, background:`linear-gradient(180deg,${shade(brand,0.35)} 0%,${brand} 100%)`, color:"#fff", display:"flex", flexDirection:"column", transition:"width 0.2s", overflow:"hidden", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"20px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width:36, height:36, background:"rgba(255,255,255,0.2)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, overflow:"hidden" }}>{(hospital?.logo||(!hospital&&platform.logo))?<img src={hospital?.logo||platform.logo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:"🏥"}</div>
          {sidebarOpen&&<div><div style={{ fontWeight:800, fontSize:15 }}>{orgName}</div>{role==="superadmin"&&<div style={{ fontSize:11, opacity:0.6 }}>{t("roles.superadmin")}</div>}</div>}
        </div>
        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {modules.map(m=>(
            <button key={m.key} onClick={()=>{ setActive(m.key); if(isSmall) setSidebarOpen(false); }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 12px", borderRadius:10, border:"none", cursor:"pointer", marginBottom:4, background:active===m.key?"rgba(255,255,255,0.2)":"transparent", color:active===m.key?"#ffffff":"rgba(255,255,255,0.7)", fontWeight:active===m.key?700:400, fontSize:14, textAlign:"start" }}>
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
          <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:"rgba(198,40,40,0.2)", color:"var(--danger-border)", fontWeight:600, fontSize:13 }}>
            <Icon name="logout" size={16}/>{sidebarOpen&&t("app.signOut")}
          </button>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <div style={{ background:"var(--surface)", borderBottom:"1px solid var(--brand-tint)", padding:isSmall?"0 12px":"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
            <button onClick={()=>setSidebarOpen(s=>!s)} style={{ background:"var(--brand-tint-light)", border:"none", borderRadius:8, padding:8, cursor:"pointer", color:"var(--brand-text)" }}><Icon name="dashboard" size={16}/></button>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:"var(--brand-text-strong)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{activeLabel}</h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:isSmall?6:12, flexShrink:0 }}>
            <ThemeToggle />
            <LanguageSwitcher />
            {!isSmall&&<span style={{ fontSize:13, color:"var(--text-muted)" }}>{new Date().toLocaleDateString(i18n.language,{weekday:"short",year:"numeric",month:"short",day:"numeric"})}</span>}
            {!isSmall&&<div style={{ width:34, height:34, background:roleColor, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>{user.name?.charAt(0).toUpperCase()}</div>}
          </div>
        </div>
        <div style={{ flex:1, padding:isSmall?14:28, overflowY:"auto", minWidth:0 }}>
          {role!=="superadmin"&&<OfflineBar token={token}/>}
          <ActiveComponent key={`${ActiveModule.key}-${syncVersion}`} token={token} user={user} hospital={hospital} onHospitalChanged={patch=>saveHospital({...hospital,...patch})}/>
        </div>
      </div>
    </div>
  );
}
