import { useState, useEffect, useCallback } from "react";

const API = 'https://medicore-backend-6q33.onrender.com/api';

async function api(path, method = "GET", body = null, token = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const r = await fetch(`${API}${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const MODULES_BY_ROLE = {
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px", borderBottom:"1px solid #f0f0f0" }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"#1a1a2e" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:8, cursor:"pointer" }}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#666", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width:"100%", padding:"10px 12px", border:"1.5px solid #e8e8e8", borderRadius:8, fontSize:14, color:"#1a1a2e", outline:"none", boxSizing:"border-box", background:"#fafafa", fontFamily:"inherit" };
const btnP = { background:"linear-gradient(135deg,#1a1a2e,#16213e)", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 };
const btnD = { background:"#fff0f0", color:"#e53e3e", border:"1px solid #ffd0d0", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
const btnE = { background:"#f0f4ff", color:"#3b6fd4", border:"1px solid #d0dcff", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
const btnG = { background:"#f0fff4", color:"#38a169", border:"1px solid #c6f6d5", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };

function Badge({ status }) {
  const map = { scheduled:["#3b6fd4","#eef2ff"], completed:["#38a169","#f0fff4"], cancelled:["#e53e3e","#fff5f5"], pending:["#d97706","#fffbeb"], paid:["#38a169","#f0fff4"], active:["#38a169","#f0fff4"], inactive:["#e53e3e","#fff5f5"], admin:["#7c3aed","#f5f3ff"], doctor:["#0891b2","#ecfeff"], receptionist:["#d97706","#fffbeb"], pharmacist:["#059669","#ecfdf5"] };
  const [color,bg] = map[status] || ["#888","#f5f5f5"];
  return <span style={{ background:bg, color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{status}</span>;
}

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"22px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", borderLeft:`4px solid ${color}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:13, color:"#888", fontWeight:500, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color:"#1a1a2e" }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>{sub}</div>}
      </div>
      <div style={{ background:color+"18", borderRadius:12, padding:14, color }}><Icon name={icon} size={22} /></div>
    </div>
  );
}

function Table({ columns, data, actions }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
        <thead>
          <tr style={{ background:"#f8f9ff" }}>
            {columns.map(c => <th key={c.key} style={{ padding:"12px 16px", textAlign:"left", fontWeight:600, color:"#555", fontSize:12, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #eef0f8" }}>{c.label}</th>)}
            {actions && <th style={{ padding:"12px 16px", textAlign:"right", color:"#555", fontSize:12, textTransform:"uppercase", borderBottom:"2px solid #eef0f8" }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length+(actions?1:0)} style={{ textAlign:"center", padding:40, color:"#aaa" }}>No records found</td></tr>
            : data.map((row,i) => (
              <tr key={row.id||i} style={{ borderBottom:"1px solid #f0f0f0" }}>
                {columns.map(c => <td key={c.key} style={{ padding:"13px 16px", color:"#333", verticalAlign:"middle" }}>{c.render ? c.render(row[c.key],row) : (row[c.key]??"—")}</td>)}
                {actions && <td style={{ padding:"10px 16px", textAlign:"right" }}><div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>{actions(row)}</div></td>}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    setLoading(true); setError("");
    try { const data = await api("/login","POST",form); onLogin(data.token,data.user); }
    catch { setError("Invalid username or password"); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:40, width:"100%", maxWidth:400, boxShadow:"0 32px 100px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, background:"linear-gradient(135deg,#1a1a2e,#0f3460)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>🏥</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:"#1a1a2e" }}>MediCore HMS</h1>
          <p style={{ margin:"6px 0 0", color:"#888", fontSize:14 }}>Hospital Management System</p>
        </div>
        {error && <div style={{ background:"#fff5f5", border:"1px solid #ffd0d0", borderRadius:8, padding:"10px 14px", color:"#e53e3e", fontSize:13, marginBottom:16 }}>{error}</div>}
        <Field label="Username"><input style={inp} value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></Field>
        <Field label="Password"><input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></Field>
        <button onClick={handleSubmit} disabled={loading} style={{ ...btnP, width:"100%", justifyContent:"center", marginTop:8, padding:"13px 24px", fontSize:15 }}>{loading?"Signing in...":"Sign In"}</button>
      </div>
    </div>
  );
}

function Dashboard({ token, user }) {
  const [stats, setStats] = useState(null);
  useEffect(()=>{ api("/stats","GET",null,token).then(setStats).catch(()=>{}); },[token]);
  if (!stats) return <div style={{ padding:40, color:"#888" }}>Loading...</div>;
  const role = user.role;
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Welcome, {user.name} 👋</h2>
        <p style={{ margin:"4px 0 0", color:"#888", fontSize:14 }}><Badge status={role} /></p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16, marginBottom:32 }}>
        {role==="admin" && <>
          <StatCard label="Total Patients" value={stats.totalPatients} color="#3b6fd4" icon="patients" />
          <StatCard label="Doctors" value={stats.totalDoctors} color="#38a169" icon="doctors" />
          <StatCard label="Staff" value={stats.totalStaff} color="#805ad5" icon="staff" />
          <StatCard label="System Users" value={stats.totalUsers} color="#0891b2" icon="users" />
          <StatCard label="Today's Appointments" value={stats.todayAppointments} color="#d97706" icon="appointments" />
          <StatCard label="Pending Bills" value={stats.pendingBills} color="#e53e3e" icon="billing" />
          <StatCard label="Total Revenue" value={`UGX ${(stats.totalRevenue||0).toLocaleString()}`} color="#0891b2" icon="transactions" />
          <StatCard label="Low Stock" value={stats.lowStockItems} color="#dc2626" icon="pharmacy" />
        </>}
        {role==="doctor" && <>
          <StatCard label="Total Patients" value={stats.totalPatients} color="#3b6fd4" icon="patients" />
          <StatCard label="My Appointments" value={stats.myAppointments} color="#d97706" icon="appointments" />
          <StatCard label="Today's Appointments" value={stats.todayAppointments} color="#38a169" icon="appointments" />
          <StatCard label="My Records" value={stats.myRecords} color="#805ad5" icon="records" />
          <StatCard label="Low Stock Medicines" value={stats.lowStockItems} color="#dc2626" icon="pharmacy" />
        </>}
        {role==="receptionist" && <>
          <StatCard label="Total Patients" value={stats.totalPatients} color="#3b6fd4" icon="patients" />
          <StatCard label="Today's Appointments" value={stats.todayAppointments} color="#d97706" icon="appointments" />
          <StatCard label="Pending Bills" value={stats.pendingBills} color="#e53e3e" icon="billing" />
          <StatCard label="Revenue Collected" value={`UGX ${(stats.totalRevenue||0).toLocaleString()}`} color="#0891b2" icon="transactions" />
        </>}
        {role==="pharmacist" && <>
          <StatCard label="Total Items" value={stats.totalItems} color="#3b6fd4" icon="pharmacy" />
          <StatCard label="Low Stock" value={stats.lowStockItems} color="#dc2626" icon="alert" sub="Qty < 10" />
          <StatCard label="Expiring Soon" value={stats.expiringSoon} color="#d97706" icon="alert" sub="Within 30 days" />
          <StatCard label="Out of Stock" value={stats.outOfStock} color="#e53e3e" icon="alert" />
        </>}
      </div>
      {stats.recentPatients && (
        <div style={{ background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>Recent Patients</h3>
          <Table columns={[{key:"name",label:"Name"},{key:"age",label:"Age"},{key:"gender",label:"Gender"},{key:"phone",label:"Phone"},{key:"createdAt",label:"Registered",render:v=>new Date(v).toLocaleDateString()}]} data={stats.recentPatients} />
        </div>
      )}
    </div>
  );
}

function UserManagement({ token }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({}); const [err,setErr]=useState("");
  const load=useCallback(()=>api("/users","GET",null,token).then(setData).catch(()=>{}),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ setErr(""); try{ if(form.id)await api(`/users/${form.id}`,"PUT",form,token); else await api("/users","POST",form,token); load();setModal(null);setForm({}); }catch(e){setErr(JSON.parse(e.message)?.error||"Error");} };
  const del=async(id)=>{ if(confirm("Delete user?")){ await api(`/users/${id}`,"DELETE",null,token); load(); } };
  const toggle=async(u)=>{ await api(`/users/${u.id}`,"PUT",{status:u.status==="active"?"inactive":"active"},token); load(); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>User Management</h2>
        <button style={btnP} onClick={()=>{setForm({});setErr("");setModal("add");}}><Icon name="plus" size={16}/> Add User</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:"Name"},{key:"username",label:"Username"},{key:"role",label:"Role",render:v=><Badge status={v}/>},{key:"status",label:"Status",render:v=><Badge status={v}/>},{key:"createdAt",label:"Created",render:v=>new Date(v).toLocaleDateString()}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm({...row,password:""});setErr("");setModal("add");}}><Icon name="edit" size={13}/> Edit</button>,
            <button key="t" style={row.status==="active"?btnD:btnG} onClick={()=>toggle(row)}>{row.status==="active"?"Deactivate":"Activate"}</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?"Edit User":"Create User"} onClose={()=>setModal(null)}>
          {err && <div style={{ background:"#fff5f5", border:"1px solid #ffd0d0", borderRadius:8, padding:"10px 14px", color:"#e53e3e", fontSize:13, marginBottom:16 }}>{err}</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full Name"><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Username"><input style={inp} value={form.username||""} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/></Field>
            <Field label="Password"><input style={inp} type="password" placeholder={form.id?"Leave blank to keep":"Set password"} value={form.password||""} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></Field>
            <Field label="Role">
              <select style={inp} value={form.role||""} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="">Select</option><option value="admin">Admin</option><option value="doctor">Doctor</option><option value="receptionist">Receptionist</option><option value="pharmacist">Pharmacist</option>
              </select>
            </Field>
          </div>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Create"} User</button>
        </Modal>
      )}
    </div>
  );
}

function Patients({ token, user }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({}); const [search,setSearch]=useState("");
  const canEdit=["admin","receptionist"].includes(user.role);
  const load=useCallback(()=>api("/patients","GET",null,token).then(setData),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(form.id)await api(`/patients/${form.id}`,"PUT",form,token); else await api("/patients","POST",form,token); load();setModal(null);setForm({}); };
  const del=async(id)=>{ if(confirm("Delete patient?")){ await api(`/patients/${id}`,"DELETE",null,token); load(); } };
  const filtered=data.filter(p=>p.name?.toLowerCase().includes(search.toLowerCase())||p.phone?.includes(search));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Patient Registration</h2>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }}><Icon name="search" size={15}/></span>
            <input style={{ ...inp, paddingLeft:34, width:220 }} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {canEdit && <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> Add Patient</button>}
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:"Full Name"},{key:"age",label:"Age"},{key:"gender",label:"Gender"},{key:"phone",label:"Phone"},{key:"bloodGroup",label:"Blood Group"},{key:"address",label:"Address"},{key:"createdAt",label:"Registered",render:v=>new Date(v).toLocaleDateString()}]} data={filtered}
          actions={canEdit?row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> Edit</button>,
            user.role==="admin"&&<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ].filter(Boolean):null}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?"Edit Patient":"Register Patient"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full Name"><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Age"><input style={inp} type="number" value={form.age||""} onChange={e=>setForm(f=>({...f,age:e.target.value}))}/></Field>
            <Field label="Gender"><select style={inp} value={form.gender||""} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
            <Field label="Blood Group"><select style={inp} value={form.bloodGroup||""} onChange={e=>setForm(f=>({...f,bloodGroup:e.target.value}))}><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></Field>
            <Field label="Phone"><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label="Email"><input style={inp} value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></Field>
          </div>
          <Field label="Address"><input style={inp} value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></Field>
          <Field label="Emergency Contact"><input style={inp} value={form.emergencyContact||""} onChange={e=>setForm(f=>({...f,emergencyContact:e.target.value}))}/></Field>
          <Field label="Notes / Allergies"><textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Register"}</button>
        </Modal>
      )}
    </div>
  );
}

function Doctors({ token }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const load=useCallback(()=>api("/doctors","GET",null,token).then(setData),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(form.id)await api(`/doctors/${form.id}`,"PUT",form,token); else await api("/doctors","POST",form,token); load();setModal(null);setForm({}); };
  const del=async(id)=>{ if(confirm("Delete?")){ await api(`/doctors/${id}`,"DELETE",null,token); load(); } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Doctor Management</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> Add Doctor</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:"Name"},{key:"specialization",label:"Specialization"},{key:"qualification",label:"Qualification"},{key:"department",label:"Department"},{key:"phone",label:"Phone"},{key:"status",label:"Status",render:v=><Badge status={v||"active"}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> Edit</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?"Edit Doctor":"Add Doctor"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full Name"><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Specialization"><input style={inp} value={form.specialization||""} onChange={e=>setForm(f=>({...f,specialization:e.target.value}))}/></Field>
            <Field label="Qualification"><input style={inp} value={form.qualification||""} onChange={e=>setForm(f=>({...f,qualification:e.target.value}))}/></Field>
            <Field label="Department"><input style={inp} value={form.department||""} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/></Field>
            <Field label="Phone"><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label="Status"><select style={inp} value={form.status||"active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
          </div>
          <Field label="Linked User ID (for doctor login)"><input style={inp} value={form.linkedUserId||""} placeholder="Get from User Management" onChange={e=>setForm(f=>({...f,linkedUserId:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Add"} Doctor</button>
        </Modal>
      )}
    </div>
  );
}

function Staff({ token }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const load=useCallback(()=>api("/staff","GET",null,token).then(setData),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(form.id)await api(`/staff/${form.id}`,"PUT",form,token); else await api("/staff","POST",form,token); load();setModal(null);setForm({}); };
  const del=async(id)=>{ if(confirm("Delete?")){ await api(`/staff/${id}`,"DELETE",null,token); load(); } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Staff Management</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> Add Staff</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:"Name"},{key:"role",label:"Role"},{key:"department",label:"Department"},{key:"phone",label:"Phone"},{key:"salary",label:"Salary",render:v=>v?`UGX ${parseInt(v).toLocaleString()}`:"—"},{key:"status",label:"Status",render:v=><Badge status={v||"active"}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> Edit</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]}
        />
      </div>
      {modal==="add" && (
        <Modal title={form.id?"Edit Staff":"Add Staff"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full Name"><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Role"><input style={inp} value={form.role||""} placeholder="Nurse, Receptionist..." onChange={e=>setForm(f=>({...f,role:e.target.value}))}/></Field>
            <Field label="Department"><input style={inp} value={form.department||""} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/></Field>
            <Field label="Phone"><input style={inp} value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
            <Field label="Salary (UGX)"><input style={inp} type="number" value={form.salary||""} onChange={e=>setForm(f=>({...f,salary:e.target.value}))}/></Field>
            <Field label="Status"><select style={inp} value={form.status||"active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
          </div>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Add"} Staff</button>
        </Modal>
      )}
    </div>
  );
}

function Appointments({ token, user }) {
  const [data,setData]=useState([]); const [patients,setPatients]=useState([]); const [doctors,setDoctors]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const canEdit=["admin","receptionist"].includes(user.role);
  const load=useCallback(async()=>{ const [a,p,d]=await Promise.all([api("/appointments","GET",null,token),api("/patients","GET",null,token),api("/doctors","GET",null,token)]); setData(a);setPatients(p);setDoctors(d); },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(form.id)await api(`/appointments/${form.id}`,"PUT",form,token); else await api("/appointments","POST",form,token); load();setModal(null);setForm({}); };
  const del=async(id)=>{ if(confirm("Delete?")){ await api(`/appointments/${id}`,"DELETE",null,token); load(); } };
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const dName=id=>doctors.find(d=>d.id===id)?.name||id;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Appointments</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> Schedule</button>}
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"patientId",label:"Patient",render:v=>pName(v)},{key:"doctorId",label:"Doctor",render:v=>"Dr. "+dName(v)},{key:"date",label:"Date"},{key:"time",label:"Time"},{key:"reason",label:"Reason"},{key:"status",label:"Status",render:v=><Badge status={v}/>}]} data={data}
          actions={row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> Edit</button>,
            canEdit&&<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ].filter(Boolean)}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?"Edit Appointment":"Schedule Appointment"} onClose={()=>setModal(null)}>
          <Field label="Patient"><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">Select patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Doctor"><select style={inp} value={form.doctorId||""} onChange={e=>setForm(f=>({...f,doctorId:e.target.value}))}><option value="">Select doctor</option>{doctors.map(d=><option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization})</option>)}</select></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Date"><input style={inp} type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
            <Field label="Time"><input style={inp} type="time" value={form.time||""} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></Field>
          </div>
          <Field label="Reason"><input style={inp} value={form.reason||""} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}/></Field>
          <Field label="Status"><select style={inp} value={form.status||"scheduled"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Schedule"}</button>
        </Modal>
      )}
    </div>
  );
}

function MedicalRecords({ token, user }) {
  const [data,setData]=useState([]); const [patients,setPatients]=useState([]); const [doctors,setDoctors]=useState([]); const [inventory,setInventory]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({medicinesUsed:[]});
  const canEdit=["admin","doctor"].includes(user.role);
  const load=useCallback(async()=>{ const [r,p,d,inv]=await Promise.all([api("/records","GET",null,token),api("/patients","GET",null,token),api("/doctors","GET",null,token),api("/inventory","GET",null,token).catch(()=>[])]); setData(r);setPatients(p);setDoctors(d);setInventory(inv); },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(form.id)await api(`/records/${form.id}`,"PUT",form,token); else await api("/records","POST",form,token); load();setModal(null);setForm({medicinesUsed:[]}); };
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const dName=id=>doctors.find(d=>d.id===id)?.name||id;
  const toggleMed=id=>{ const cur=form.medicinesUsed||[]; setForm(f=>({...f,medicinesUsed:cur.includes(id)?cur.filter(m=>m!==id):[...cur,id]})); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Medical Records</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({medicinesUsed:[]});setModal("add");}}><Icon name="plus" size={16}/> Add Record</button>}
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"patientId",label:"Patient",render:v=>pName(v)},{key:"doctorId",label:"Doctor",render:v=>"Dr. "+dName(v)},{key:"diagnosis",label:"Diagnosis"},{key:"treatment",label:"Treatment"},{key:"medicinesUsed",label:"Medicines Used",render:v=>v&&v.length?v.map(id=>inventory.find(i=>i.id===id)?.name||id).join(", "):"—"},{key:"createdAt",label:"Date",render:v=>new Date(v).toLocaleDateString()}]} data={data}
          actions={canEdit?row=>[<button key="e" style={btnE} onClick={()=>{setForm({...row,medicinesUsed:row.medicinesUsed||[]});setModal("add");}}><Icon name="edit" size={13}/> Edit</button>]:null}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?"Edit Record":"Add Medical Record"} onClose={()=>setModal(null)}>
          <Field label="Patient"><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">Select</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Doctor"><select style={inp} value={form.doctorId||""} onChange={e=>setForm(f=>({...f,doctorId:e.target.value}))}><option value="">Select</option>{doctors.map(d=><option key={d.id} value={d.id}>Dr. {d.name}</option>)}</select></Field>
          <Field label="Diagnosis"><input style={inp} value={form.diagnosis||""} onChange={e=>setForm(f=>({...f,diagnosis:e.target.value}))}/></Field>
          <Field label="Treatment"><textarea style={{ ...inp, height:70, resize:"vertical" }} value={form.treatment||""} onChange={e=>setForm(f=>({...f,treatment:e.target.value}))}/></Field>
          <Field label="Prescription"><textarea style={{ ...inp, height:60, resize:"vertical" }} value={form.prescription||""} onChange={e=>setForm(f=>({...f,prescription:e.target.value}))}/></Field>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#666", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>Medicines Used (tick from inventory)</label>
            {inventory.filter(i=>!i.category||i.category==="Medicine").length===0
              ? <p style={{ color:"#aaa", fontSize:13 }}>No medicines in inventory.</p>
              : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:160, overflowY:"auto", border:"1.5px solid #e8e8e8", borderRadius:8, padding:10 }}>
                  {inventory.filter(i=>!i.category||i.category==="Medicine").map(med=>(
                    <label key={med.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer" }}>
                      <input type="checkbox" checked={(form.medicinesUsed||[]).includes(med.id)} onChange={()=>toggleMed(med.id)}/>
                      {med.name} <span style={{ color:"#aaa", fontSize:11 }}>({med.quantity} {med.unit})</span>
                    </label>
                  ))}
                </div>
            }
          </div>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Save"} Record</button>
        </Modal>
      )}
    </div>
  );
}

function Pharmacy({ token, user }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const canEdit=["admin","pharmacist"].includes(user.role);
  const load=useCallback(()=>api("/inventory","GET",null,token).then(setData),[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ if(form.id)await api(`/inventory/${form.id}`,"PUT",form,token); else await api("/inventory","POST",form,token); load();setModal(null);setForm({}); };
  const del=async(id)=>{ if(confirm("Remove?")){ await api(`/inventory/${id}`,"DELETE",null,token); load(); } };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Pharmacy & Inventory</h2>
        {canEdit&&<button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> Add Item</button>}
      </div>
      {user.role==="doctor"&&<div style={{ background:"#f0f8ff", border:"1px solid #bee3f8", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#2b6cb0" }}>👁️ View-only — reference available medicines when writing prescriptions.</div>}
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"name",label:"Item"},{key:"category",label:"Category"},{key:"quantity",label:"Stock",render:(v,row)=><span style={{ color:parseInt(v)<10?"#e53e3e":"#333", fontWeight:parseInt(v)<10?700:400 }}>{v} {row.unit}</span>},{key:"unitPrice",label:"Unit Price",render:v=>`UGX ${parseInt(v||0).toLocaleString()}`},{key:"expiryDate",label:"Expiry"},{key:"supplier",label:"Supplier"}]} data={data}
          actions={canEdit?row=>[
            <button key="e" style={btnE} onClick={()=>{setForm(row);setModal("add");}}><Icon name="edit" size={13}/> Edit</button>,
            <button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>,
          ]:null}
        />
      </div>
      {modal==="add"&&(
        <Modal title={form.id?"Edit Item":"Add Item"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Item Name"><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Category"><select style={inp} value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}><option value="">Select</option><option>Medicine</option><option>Equipment</option><option>Supplies</option><option>Lab Reagent</option></select></Field>
            <Field label="Quantity"><input style={inp} type="number" value={form.quantity||""} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}/></Field>
            <Field label="Unit"><input style={inp} value={form.unit||""} placeholder="tablets, bottles..." onChange={e=>setForm(f=>({...f,unit:e.target.value}))}/></Field>
            <Field label="Unit Price (UGX)"><input style={inp} type="number" value={form.unitPrice||""} onChange={e=>setForm(f=>({...f,unitPrice:e.target.value}))}/></Field>
            <Field label="Expiry Date"><input style={inp} type="date" value={form.expiryDate||""} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))}/></Field>
          </div>
          <Field label="Supplier"><input style={inp} value={form.supplier||""} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> {form.id?"Update":"Add"} Item</button>
        </Modal>
      )}
    </div>
  );
}

function Billing({ token }) {
  const [bills,setBills]=useState([]); const [patients,setPatients]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({items:[]});
  const load=useCallback(async()=>{ const [b,p]=await Promise.all([api("/bills","GET",null,token),api("/patients","GET",null,token)]); setBills(b);setPatients(p); },[token]);
  useEffect(()=>{load();},[load]);
  const addItem=()=>setForm(f=>({...f,items:[...(f.items||[]),{desc:"",amount:""}]}));
  const updItem=(i,k,v)=>setForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const total=(form.items||[]).reduce((s,it)=>s+(parseFloat(it.amount)||0),0);
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const save=async()=>{ await api("/bills","POST",{...form,total},token); load();setModal(null);setForm({items:[]}); };
  const markPaid=async(bill)=>{ await api("/transactions","POST",{billId:bill.id,amount:bill.total,patientId:bill.patientId,method:"Cash",note:"Manual payment"},token); load(); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Billing</h2>
        <button style={btnP} onClick={()=>{setForm({items:[]});setModal("add");}}><Icon name="plus" size={16}/> Create Bill</button>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"billNumber",label:"Bill #"},{key:"patientId",label:"Patient",render:v=>pName(v)},{key:"total",label:"Total",render:v=>`UGX ${parseFloat(v||0).toLocaleString()}`},{key:"status",label:"Status",render:v=><Badge status={v}/>},{key:"createdAt",label:"Date",render:v=>new Date(v).toLocaleDateString()}]} data={bills}
          actions={row=>[row.status==="pending"&&<button key="p" style={btnG} onClick={()=>markPaid(row)}><Icon name="check" size={13}/> Mark Paid</button>].filter(Boolean)}
        />
      </div>
      {modal==="add"&&(
        <Modal title="Create Bill" onClose={()=>setModal(null)}>
          <Field label="Patient"><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">Select</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#666", textTransform:"uppercase", letterSpacing:0.5 }}>Bill Items</label>
            {(form.items||[]).map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginTop:8 }}>
                <input style={{ ...inp, flex:2 }} placeholder="Description" value={item.desc} onChange={e=>updItem(i,"desc",e.target.value)}/>
                <input style={{ ...inp, flex:1 }} type="number" placeholder="UGX" value={item.amount} onChange={e=>updItem(i,"amount",e.target.value)}/>
              </div>
            ))}
            <button onClick={addItem} style={{ marginTop:10, background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer" }}>+ Add Item</button>
          </div>
          <div style={{ background:"#f8f9ff", borderRadius:8, padding:"12px 16px", marginBottom:16, fontWeight:700, fontSize:16 }}>Total: UGX {total.toLocaleString()}</div>
          <Field label="Notes"><textarea style={{ ...inp, height:60 }} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> Generate Bill</button>
        </Modal>
      )}
    </div>
  );
}

function Transactions({ token }) {
  const [data,setData]=useState([]); const [patients,setPatients]=useState([]); const [bills,setBills]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({});
  const load=useCallback(async()=>{ const [tx,p,b]=await Promise.all([api("/transactions","GET",null,token),api("/patients","GET",null,token),api("/bills","GET",null,token)]); setData(tx);setPatients(p);setBills(b); },[token]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{ await api("/transactions","POST",form,token); load();setModal(null);setForm({}); };
  const del=async(id)=>{ if(confirm("Delete transaction?")){ await api(`/transactions/${id}`,"DELETE",null,token); load(); } };
  const pName=id=>patients.find(p=>p.id===id)?.name||id;
  const total=data.reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1a1a2e" }}>Transactions & Payments</h2>
        <button style={btnP} onClick={()=>{setForm({});setModal("add");}}><Icon name="plus" size={16}/> Record Payment</button>
      </div>
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#0f3460)", borderRadius:16, padding:"20px 24px", marginBottom:20, color:"#fff" }}>
        <div style={{ fontSize:13, opacity:0.7 }}>Total Revenue Collected</div>
        <div style={{ fontSize:32, fontWeight:800, marginTop:4 }}>UGX {total.toLocaleString()}</div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <Table columns={[{key:"txRef",label:"Ref #"},{key:"patientId",label:"Patient",render:v=>pName(v)},{key:"amount",label:"Amount",render:v=>`UGX ${parseFloat(v||0).toLocaleString()}`},{key:"method",label:"Method"},{key:"recordedBy",label:"Recorded By"},{key:"note",label:"Note"},{key:"createdAt",label:"Date",render:v=>new Date(v).toLocaleDateString()}]} data={data}
          actions={row=>[<button key="d" style={btnD} onClick={()=>del(row.id)}><Icon name="trash" size={13}/></button>]}
        />
      </div>
      {modal==="add"&&(
        <Modal title="Record Payment" onClose={()=>setModal(null)}>
          <Field label="Patient"><select style={inp} value={form.patientId||""} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">Select</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Link to Bill (optional)"><select style={inp} value={form.billId||""} onChange={e=>setForm(f=>({...f,billId:e.target.value}))}><option value="">None</option>{bills.filter(b=>b.status==="pending").map(b=><option key={b.id} value={b.id}>{b.billNumber} — UGX {parseFloat(b.total||0).toLocaleString()}</option>)}</select></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Amount (UGX)"><input style={inp} type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></Field>
            <Field label="Method"><select style={inp} value={form.method||""} onChange={e=>setForm(f=>({...f,method:e.target.value}))}><option value="">Select</option><option>Cash</option><option>Mobile Money</option><option>Bank Transfer</option><option>Insurance</option><option>Card</option></select></Field>
          </div>
          <Field label="Note"><input style={inp} value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></Field>
          <button style={{ ...btnP, marginTop:8 }} onClick={save}><Icon name="check" size={16}/> Record Payment</button>
        </Modal>
      )}
    </div>
  );
}

const ALL_MODULES = [
  { key:"dashboard",    label:"Dashboard",       icon:"dashboard",    Component:Dashboard },
  { key:"patients",     label:"Patients",        icon:"patients",     Component:Patients },
  { key:"doctors",      label:"Doctors",         icon:"doctors",      Component:Doctors },
  { key:"staff",        label:"Staff",           icon:"staff",        Component:Staff },
  { key:"users",        label:"User Management", icon:"users",        Component:UserManagement },
  { key:"appointments", label:"Appointments",    icon:"appointments", Component:Appointments },
  { key:"records",      label:"Medical Records", icon:"records",      Component:MedicalRecords },
  { key:"pharmacy",     label:"Pharmacy",        icon:"pharmacy",     Component:Pharmacy },
  { key:"billing",      label:"Billing",         icon:"billing",      Component:Billing },
  { key:"transactions", label:"Transactions",    icon:"transactions", Component:Transactions },
];

export default function App() {
  const [token,setToken]=useState(()=>localStorage.getItem("hms_token"));
  const [user,setUser]=useState(()=>{ try{return JSON.parse(localStorage.getItem("hms_user"));}catch{return null;} });
  const [active,setActive]=useState("dashboard");
  const [sidebarOpen,setSidebarOpen]=useState(true);

  const handleLogin=(t,u)=>{ localStorage.setItem("hms_token",t); localStorage.setItem("hms_user",JSON.stringify(u)); setToken(t);setUser(u);setActive("dashboard"); };
  const handleLogout=()=>{ localStorage.removeItem("hms_token"); localStorage.removeItem("hms_user"); setToken(null);setUser(null); };

  if(!token||!user) return <LoginPage onLogin={handleLogin}/>;

  const allowed=MODULES_BY_ROLE[user.role]||["dashboard"];
  const modules=ALL_MODULES.filter(m=>allowed.includes(m.key));
  const ActiveModule=modules.find(m=>m.key===active)||modules[0];
  const ActiveComponent=ActiveModule.Component;
  const roleColors={ admin:"#7c3aed", doctor:"#0891b2", receptionist:"#d97706", pharmacist:"#059669" };
  const roleColor=roleColors[user.role]||"#3b6fd4";

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f4f6ff" }}>
      <div style={{ width:sidebarOpen?240:68, background:"linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)", color:"#fff", display:"flex", flexDirection:"column", transition:"width 0.2s", overflow:"hidden", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"20px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width:36, height:36, background:"linear-gradient(135deg,#4fc3f7,#0288d1)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🏥</div>
          {sidebarOpen&&<div><div style={{ fontWeight:800, fontSize:15 }}>MediCore HMS</div><div style={{ fontSize:11, opacity:0.6 }}>v2.0</div></div>}
        </div>
        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {modules.map(m=>(
            <button key={m.key} onClick={()=>setActive(m.key)} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"11px 12px", borderRadius:10, border:"none", cursor:"pointer", marginBottom:4, background:active===m.key?"rgba(79,195,247,0.15)":"transparent", color:active===m.key?"#4fc3f7":"rgba(255,255,255,0.7)", fontWeight:active===m.key?700:400, fontSize:14, textAlign:"left" }}>
              <span style={{ flexShrink:0 }}><Icon name={m.icon} size={18}/></span>
              {sidebarOpen&&<span style={{ whiteSpace:"nowrap" }}>{m.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          {sidebarOpen&&<div style={{ padding:"8px 12px", marginBottom:8 }}>
            <div style={{ fontSize:12, opacity:0.5 }}>Signed in as</div>
            <div style={{ fontSize:13, fontWeight:700 }}>{user.name}</div>
            <div style={{ marginTop:4 }}><Badge status={user.role}/></div>
          </div>}
          <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:"rgba(229,62,62,0.12)", color:"#fc8181", fontWeight:600, fontSize:13 }}>
            <Icon name="logout" size={16}/>{sidebarOpen&&"Sign Out"}
          </button>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #eef0f8", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>setSidebarOpen(s=>!s)} style={{ background:"#f4f6ff", border:"none", borderRadius:8, padding:8, cursor:"pointer", color:"#555" }}><Icon name="dashboard" size={16}/></button>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a1a2e" }}>{ActiveModule.label}</h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:13, color:"#888" }}>{new Date().toLocaleDateString("en-UG",{weekday:"short",year:"numeric",month:"short",day:"numeric"})}</span>
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
