// Laboratory: doctors/admins request tests; lab staff collect samples, enter
// results and release them. Doctors see results as soon as they are completed.
// Backend: GET/POST /lab-orders, PUT /lab-orders/:id, GET /patients (to order).
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, formatDateTime, addTranslations, Icon, Modal, Field, inp, btnP, btnG, btnE, Badge, StatCard, Table, formatMoney, LoadingButton, SearchSelect, patientFetcher } from "../shared";

const money = (n, c) => formatMoney(n, c);
const card = { background: "var(--surface)", borderRadius: 16, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow: "hidden" };
const flagColor = { normal: "var(--brand)", high: "var(--danger)", low: "var(--warn)", abnormal: "var(--danger)" };
// Suggestions only — staff can type any test name.
const COMMON_TESTS = ["Malaria RDT", "Malaria smear", "Full blood count", "Blood sugar (random)", "HIV test", "Hepatitis B", "Widal test", "Urinalysis", "Stool analysis", "Pregnancy test", "Blood group", "Liver function tests", "Renal function tests"];

addTranslations({
  en: {
    nav: { lab: "Laboratory" },
    lab: {
      title: "Laboratory", newOrder: "New lab order",
      fOpen: "To do", fPending: "Pending", fProgress: "In progress", fCompleted: "Completed", fAll: "All",
      cPending: "Waiting", cProgress: "In progress", cDone: "Completed", cUrgent: "Urgent waiting",
      ref: "Order #", date: "Date", patient: "Patient", tests: "Tests", priority: "Priority", status: "Status", orderedBy: "Ordered by",
      none: "No lab orders here", open: "Open", view: "View results", process: "Enter results",
      choosePatient: "Choose a patient…", routine: "Routine", urgent: "Urgent", clinicalNotes: "Clinical notes (why these tests?)",
      testName: "Test name", price: "Price ({{cur}})", unit: "Unit", range: "Reference range", result: "Result", flag: "Flag",
      addTest: "Add test", removeTest: "Remove", flagNone: "—", normal: "Normal", high: "High", low: "Low", abnormal: "Abnormal",
      place: "Place order", saving: "Saving…", errPatient: "Choose a patient", errTests: "Add at least one test",
      orderPlaced: "Lab order placed.", saved: "Saved.", released: "Results released.",
      start: "Collect sample & start", save: "Save results", complete: "Complete & release", cancelOrder: "Cancel order", confirmCancel: "Cancel this lab order?",
      notes: "Lab notes", sampleAt: "Sample collected", completedAt: "Completed", processedBy: "Processed by", total: "Total",
      lockedNote: "This order is released. Only an administrator can change it.", errResults: "Enter a result for every test before completing.",
    },
  },
  fr: {
    nav: { lab: "Laboratoire" },
    lab: {
      title: "Laboratoire", newOrder: "Nouvelle demande",
      fOpen: "À faire", fPending: "En attente", fProgress: "En cours", fCompleted: "Terminées", fAll: "Toutes",
      cPending: "En attente", cProgress: "En cours", cDone: "Terminées", cUrgent: "Urgentes en attente",
      ref: "N° demande", date: "Date", patient: "Patient", tests: "Examens", priority: "Priorité", status: "Statut", orderedBy: "Demandé par",
      none: "Aucune demande ici", open: "Ouvrir", view: "Voir les résultats", process: "Saisir les résultats",
      choosePatient: "Choisir un patient…", routine: "Routine", urgent: "Urgent", clinicalNotes: "Renseignements cliniques (pourquoi ces examens ?)",
      testName: "Nom de l'examen", price: "Prix ({{cur}})", unit: "Unité", range: "Valeurs de référence", result: "Résultat", flag: "Indicateur",
      addTest: "Ajouter un examen", removeTest: "Retirer", flagNone: "—", normal: "Normal", high: "Élevé", low: "Bas", abnormal: "Anormal",
      place: "Envoyer la demande", saving: "Enregistrement…", errPatient: "Choisissez un patient", errTests: "Ajoutez au moins un examen",
      orderPlaced: "Demande envoyée.", saved: "Enregistré.", released: "Résultats publiés.",
      start: "Prélever et démarrer", save: "Enregistrer les résultats", complete: "Terminer et publier", cancelOrder: "Annuler la demande", confirmCancel: "Annuler cette demande d'examen ?",
      notes: "Notes du laboratoire", sampleAt: "Prélèvement", completedAt: "Terminé", processedBy: "Traité par", total: "Total",
      lockedNote: "Cette demande est publiée. Seul un administrateur peut la modifier.", errResults: "Saisissez un résultat pour chaque examen avant de terminer.",
    },
  },
  ar: {
    nav: { lab: "المختبر" },
    lab: {
      title: "المختبر", newOrder: "طلب تحليل جديد",
      fOpen: "المطلوب", fPending: "قيد الانتظار", fProgress: "قيد التنفيذ", fCompleted: "مكتملة", fAll: "الكل",
      cPending: "بالانتظار", cProgress: "قيد التنفيذ", cDone: "مكتملة", cUrgent: "عاجلة بالانتظار",
      ref: "رقم الطلب", date: "التاريخ", patient: "المريض", tests: "التحاليل", priority: "الأولوية", status: "الحالة", orderedBy: "طلبه",
      none: "لا توجد طلبات هنا", open: "فتح", view: "عرض النتائج", process: "إدخال النتائج",
      choosePatient: "اختر مريضًا…", routine: "عادي", urgent: "عاجل", clinicalNotes: "ملاحظات سريرية (سبب التحاليل)",
      testName: "اسم التحليل", price: "السعر ({{cur}})", unit: "الوحدة", range: "المدى المرجعي", result: "النتيجة", flag: "الدلالة",
      addTest: "إضافة تحليل", removeTest: "إزالة", flagNone: "—", normal: "طبيعي", high: "مرتفع", low: "منخفض", abnormal: "غير طبيعي",
      place: "إرسال الطلب", saving: "جارٍ الحفظ…", errPatient: "اختر مريضًا", errTests: "أضف تحليلًا واحدًا على الأقل",
      orderPlaced: "تم إرسال الطلب.", saved: "تم الحفظ.", released: "تم إصدار النتائج.",
      start: "سحب العينة والبدء", save: "حفظ النتائج", complete: "إنهاء وإصدار", cancelOrder: "إلغاء الطلب", confirmCancel: "إلغاء طلب التحليل هذا؟",
      notes: "ملاحظات المختبر", sampleAt: "وقت سحب العينة", completedAt: "اكتمل", processedBy: "أنجزه", total: "الإجمالي",
      lockedNote: "تم إصدار هذا الطلب. يمكن للمدير فقط تعديله.", errResults: "أدخل نتيجة لكل تحليل قبل الإنهاء.",
    },
  },
});

const Alert = ({ kind = "error", children }) => (
  <div role={kind === "error" ? "alert" : "status"} style={{ background: kind === "error" ? "var(--danger-bg)" : "var(--brand-tint-light)", color: kind === "error" ? "var(--danger)" : "var(--brand-text)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{children}</div>
);

function NewOrderModal({ token, onClose, onDone }) {
  const { t } = useTranslation();
  const fetchPatients = useMemo(() => patientFetcher(token), [token]);
  const [patientId, setPatientId] = useState("");
  const [priority, setPriority] = useState("routine");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [tests, setTests] = useState([{ name: "", price: "" }]);
  const [err, setErr] = useState("");

  const setTest = (i, patch) => setTests((ts) => ts.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const submit = async () => {
    const clean = tests.filter((x) => x.name.trim());
    if (!patientId) return setErr(t("lab.errPatient"));
    if (!clean.length) return setErr(t("lab.errTests"));
    setErr("");
    try {
      await api("/lab-orders", "POST", { patientId, priority, clinicalNotes: clinicalNotes.trim() || undefined, tests: clean.map((x) => ({ name: x.name.trim(), price: Number(x.price) || 0 })) }, token);
      onDone();
    } catch (e) { setErr(apiErrorMessage(e)); return false; }
  };

  return (
    <Modal title={t("lab.newOrder")} onClose={onClose}>
      <datalist id="lab-common-tests">{COMMON_TESTS.map((n) => <option key={n} value={n} />)}</datalist>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label={t("lab.patient")}>
          <SearchSelect value={patientId} onChange={(v) => setPatientId(v)} fetcher={fetchPatients} placeholder={t("lab.choosePatient")} noResults={t("common.noRecords")} ariaLabel={t("lab.patient")} />
        </Field>
        <Field label={t("lab.priority")}>
          <select style={inp} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="routine">{t("lab.routine")}</option><option value="urgent">{t("lab.urgent")}</option>
          </select>
        </Field>
      </div>
      <Field label={t("lab.clinicalNotes")}><textarea style={{ ...inp, minHeight: 60 }} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} /></Field>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t("lab.tests")}</div>
      {tests.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input style={{ ...inp, flex: 3 }} list="lab-common-tests" placeholder={t("lab.testName")} value={x.name} onChange={(e) => setTest(i, { name: e.target.value })} />
          <input style={{ ...inp, flex: 1 }} type="number" min="0" placeholder={t("lab.price")} value={x.price} onChange={(e) => setTest(i, { price: e.target.value })} />
          {tests.length > 1 && <button type="button" title={t("lab.removeTest")} onClick={() => setTests((ts) => ts.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 20, lineHeight: 1 }}>×</button>}
        </div>
      ))}
      <button type="button" style={{ ...btnG, marginBottom: 14 }} onClick={() => setTests((ts) => [...ts, { name: "", price: "" }])}><Icon name="plus" size={13} /> {t("lab.addTest")}</button>
      {err && <Alert>{err}</Alert>}
      <LoadingButton style={btnP} busyLabel={t("lab.saving")} onClick={submit}><Icon name="check" size={16} /> {t("lab.place")}</LoadingButton>
    </Modal>
  );
}

// Opens one order. Lab staff/admin can enter results; everyone else just reads.
function OrderModal({ order, token, user, onClose, onChanged }) {
  const { t, i18n } = useTranslation();
  const isLab = ["labstaff", "admin"].includes(user.role);
  const released = order.status === "completed" || order.status === "cancelled";
  const locked = released && user.role !== "admin";
  const canEdit = isLab && !locked;
  const [tests, setTests] = useState(order.tests.map((x) => ({ result: x.result || "", unit: x.unit || "", referenceRange: x.referenceRange || "", flag: x.flag || "" })));
  const [notes, setNotes] = useState(order.notes || "");
  const [err, setErr] = useState("");
  const setT = (i, patch) => setTests((ts) => ts.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const send = async (status, doneMsg) => {
    if (status === "completed" && tests.some((x) => !x.result.trim())) { setErr(t("lab.errResults")); return false; }
    setErr("");
    try {
      const body = { tests, notes };
      if (status) body.status = status;
      const updated = await api(`/lab-orders/${order.id}`, "PUT", body, token);
      // Starting work keeps the order open so the technician goes straight on to entering results.
      onChanged(doneMsg, status === "in_progress" ? updated : null);
    } catch (e) { setErr(apiErrorMessage(e)); return false; }
  };

  return (
    <Modal title={`${order.orderRef || ""} — ${order.patientName || ""}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <Badge status={order.status} /> <Badge status={order.priority || "routine"} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDateTime(order.createdAt, i18n.language)} · {order.orderedByName}</span>
      </div>
      {order.clinicalNotes && <div style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)", borderRadius: 10, padding: "8px 12px", fontSize: 14, marginBottom: 12 }}>{order.clinicalNotes}</div>}
      {order.sampleCollectedAt && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("lab.sampleAt")}: {formatDateTime(order.sampleCollectedAt, i18n.language)}</div>}
      {order.completedAt && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{t("lab.completedAt")}: {formatDateTime(order.completedAt, i18n.language)} · {order.processedByName}</div>}

      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {order.tests.map((x, i) => (
          <div key={i} style={{ border: "1px solid var(--brand-tint)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, color: "var(--brand-text-strong)", marginBottom: 8 }}>{x.name}{x.price ? <span style={{ fontWeight: 400, color: "var(--text-faint)", fontSize: 12 }}> · {money(x.price)}</span> : null}</div>
            {canEdit ? (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.4fr 1fr", gap: 8 }}>
                <input style={inp} placeholder={t("lab.result")} aria-label={`${t("lab.result")} ${x.name}`} value={tests[i].result} onChange={(e) => setT(i, { result: e.target.value })} />
                <input style={inp} placeholder={t("lab.unit")} value={tests[i].unit} onChange={(e) => setT(i, { unit: e.target.value })} />
                <input style={inp} placeholder={t("lab.range")} value={tests[i].referenceRange} onChange={(e) => setT(i, { referenceRange: e.target.value })} />
                <select style={inp} aria-label={t("lab.flag")} value={tests[i].flag} onChange={(e) => setT(i, { flag: e.target.value })}>
                  <option value="">{t("lab.flagNone")}</option>
                  {["normal", "high", "low", "abnormal"].map((f) => <option key={f} value={f}>{t(`lab.${f}`)}</option>)}
                </select>
              </div>
            ) : x.result ? (
              <div style={{ fontSize: 15 }}>
                <b style={{ color: flagColor[x.flag] || "var(--text)" }}>{x.result}</b> {x.unit}
                {x.flag && <span style={{ marginInlineStart: 8, fontSize: 12, color: flagColor[x.flag] || "var(--text-muted)", fontWeight: 700 }}>{t(`lab.${x.flag}`, x.flag)}</span>}
                {x.referenceRange && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("lab.range")}: {x.referenceRange}</div>}
              </div>
            ) : <div style={{ color: "var(--text-faint)", fontSize: 13 }}>—</div>}
          </div>
        ))}
      </div>

      {canEdit
        ? <Field label={t("lab.notes")}><textarea style={{ ...inp, minHeight: 50 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        : order.notes && <div style={{ marginTop: 10, fontSize: 14 }}>{order.notes}</div>}
      {isLab && locked && <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-faint)" }}>{t("lab.lockedNote")}</div>}
      {err && <div style={{ marginTop: 10 }}><Alert>{err}</Alert></div>}

      {canEdit && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {order.status === "pending" && <LoadingButton style={btnE} busyLabel={t("lab.saving")} onClick={() => send("in_progress", t("lab.saved"))}>{t("lab.start")}</LoadingButton>}
          <LoadingButton style={btnG} busyLabel={t("lab.saving")} onClick={() => send(null, t("lab.saved"))}>{t("lab.save")}</LoadingButton>
          {order.status !== "completed" && order.status !== "cancelled" && <LoadingButton style={btnP} busyLabel={t("lab.saving")} onClick={() => send("completed", t("lab.released"))}><Icon name="check" size={15} /> {t("lab.complete")}</LoadingButton>}
          {order.status !== "completed" && order.status !== "cancelled" && <LoadingButton style={{ ...btnG, color: "var(--danger)" }} busyLabel={t("lab.saving")} onClick={() => { if (window.confirm(t("lab.confirmCancel"))) return send("cancelled", t("lab.saved")); }}>{t("lab.cancelOrder")}</LoadingButton>}
        </div>
      )}
    </Modal>
  );
}

export default function Lab({ token, user }) {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState(user.role === "labstaff" ? "open" : "all");
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canOrder = ["admin", "doctor"].includes(user.role);

  const load = useCallback(async () => {
    try { const r = await api("/lab-orders", "GET", null, token); setOrders(Array.isArray(r) ? r : []); setError(""); }
    catch (e) { setError(apiErrorMessage(e, t("common.error"))); }
  }, [token, t]);
  useEffect(() => { load(); }, [load]);

  const count = (s) => orders.filter((o) => o.status === s).length;
  const urgentWaiting = orders.filter((o) => o.status === "pending" && o.priority === "urgent").length;

  const shown = useMemo(() => {
    const isOpen = (o) => o.status === "pending" || o.status === "in_progress";
    const rows = filter === "all" ? orders : filter === "open" ? orders.filter(isOpen) : orders.filter((o) => o.status === filter);
    // Urgent first, then oldest first for work still to do; newest first otherwise.
    const open = (o) => o.status === "pending" || o.status === "in_progress";
    return [...rows].sort((a, b) => {
      if (open(a) && open(b)) return (b.priority === "urgent") - (a.priority === "urgent") || String(a.createdAt).localeCompare(String(b.createdAt));
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [orders, filter]);

  const tabs = [["open", "fOpen"], ["pending", "fPending"], ["in_progress", "fProgress"], ["completed", "fCompleted"], ["all", "fAll"]];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("lab.title")}</h2>
        {canOrder && <button style={btnP} onClick={() => { setNotice(""); setModal("new"); }}><Icon name="plus" size={16} /> {t("lab.newOrder")}</button>}
      </div>
      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("lab.cPending")} value={count("pending")} color="var(--warn)" icon="lab" />
        <StatCard label={t("lab.cUrgent")} value={urgentWaiting} color="var(--danger)" icon="lab" />
        <StatCard label={t("lab.cProgress")} value={count("in_progress")} color="var(--info)" icon="lab" />
        <StatCard label={t("lab.cDone")} value={count("completed")} color="var(--brand)" icon="lab" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...btnG, ...(filter === k ? { background: "var(--brand)", color: "#fff" } : {}) }}>{t(`lab.${label}`)}</button>
        ))}
      </div>

      <div style={card}>
        {shown.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: "var(--text-faint)" }}>{t("lab.none")}</div> : (
          <Table data={shown} columns={[
            { key: "orderRef", label: t("lab.ref") },
            { key: "createdAt", label: t("lab.date"), render: (v) => formatDateTime(v, i18n.language) },
            { key: "patientName", label: t("lab.patient") },
            { key: "tests", label: t("lab.tests"), render: (v) => (v || []).map((x) => x.name).join(", ") },
            { key: "priority", label: t("lab.priority"), render: (v) => <Badge status={v || "routine"} /> },
            { key: "status", label: t("lab.status"), render: (v) => <Badge status={v} /> },
          ]} actions={(row) => {
            const work = ["labstaff", "admin"].includes(user.role) && (row.status === "pending" || row.status === "in_progress");
            return [<button key="o" style={work ? btnE : btnG} onClick={() => setOpen(row)}>{work ? t("lab.process") : row.status === "completed" ? t("lab.view") : t("lab.open")}</button>];
          }} />
        )}
      </div>

      {modal === "new" && <NewOrderModal token={token} onClose={() => setModal(null)} onDone={() => { setModal(null); setNotice(t("lab.orderPlaced")); load(); }} />}
      {open && <OrderModal key={`${open.id}-${open.status}`} order={open} token={token} user={user} onClose={() => setOpen(null)} onChanged={(msg, keep) => { setOpen(keep || null); setNotice(msg); load(); }} />}
    </div>
  );
}
