// Inpatient care: wards with beds, admitting patients, daily progress notes and
// discharge (which raises a bed-days bill when the hospital has billing on).
// Backend: /wards, /admissions, /admissions/:id/notes, /admissions/:id/discharge.
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, formatDateTime, addTranslations, Icon, Modal, Field, inp, btnP, btnG, btnE, Badge, StatCard, Table, formatMoney, LoadingButton, SearchSelect, patientFetcher, getCurrency } from "../shared";

const money = (n, c) => formatMoney(n, c);
const card = { background: "var(--surface)", borderRadius: 16, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow: "hidden" };
const bedColors = { available: ["var(--brand)", "var(--brand-tint-light)"], occupied: ["var(--danger)", "var(--danger-bg)"], maintenance: ["var(--warn)", "var(--warn-bg)"] };

addTranslations({
  en: {
    nav: { inpatient: "Inpatient" },
    inp: {
      title: "Inpatient care", admit: "Admit patient", addWard: "Add ward",
      tabAdmissions: "Admissions", tabWards: "Wards & beds",
      cAdmitted: "Currently admitted", cFree: "Free beds", cBeds: "Total beds", cDischarged: "Discharged",
      fCurrent: "Current", fDischarged: "Discharged", fAll: "All",
      ref: "Admission #", patient: "Patient", ward: "Ward / bed", admittedAt: "Admitted", status: "Status", days: "Days", none: "Nothing here yet", noWards: "No wards yet. An administrator can add the first ward.",
      bed: "Bed", bedFree: "Free — click to admit", rate: "Daily rate", perDay: "/ day", type: "Ward type", wardName: "Ward name", bedCount: "Number of beds", addBeds: "Add beds", howMany: "How many?",
      editWard: "Edit ward", save: "Save", saving: "Saving…", cancel: "Cancel", close: "Close", maintenance: "Maintenance", makeMaint: "Put in maintenance", makeFree: "Mark available",
      types: { general: "General", maternity: "Maternity", paediatric: "Paediatric", icu: "ICU", private: "Private", surgical: "Surgical" },
      choosePatient: "Choose a patient…", chooseWard: "Choose a ward…", chooseBed: "Choose a bed…", reason: "Reason for admission", diagnosis: "Diagnosis", errAdmit: "Choose a patient, ward and bed",
      admitted: "Patient admitted.", wardSaved: "Ward saved.", bedsAdded: "Beds added.", noteAdded: "Note added.", discharged: "Patient discharged.", billRaised: "A bill of {{amount}} was raised.",
      reasonLabel: "Reason", diagnosisLabel: "Diagnosis", notes: "Progress notes", noNotes: "No notes yet", addNote: "Add a note", notePh: "Today's progress, treatment given, plan…", postNote: "Add note",
      discharge: "Discharge patient", dischargeTitle: "Discharge {{name}}", summary: "Discharge summary", extra: "Extra charges (optional)", extraDesc: "Description", extraAmt: "Amount ({{cur}})", addExtra: "Add charge",
      dischargeNote: "The bed is freed straight away. Bed days are charged per started 24 hours (minimum 1 day).", confirmDischarge: "Confirm discharge",
      dischargedOn: "Discharged", by: "by", billedBed: "Bed charge", stay: "{{n}} day(s)", occupantOpen: "Open admission",
    },
  },
  fr: {
    nav: { inpatient: "Hospitalisation" },
    inp: {
      title: "Hospitalisation", admit: "Admettre un patient", addWard: "Ajouter un service",
      tabAdmissions: "Admissions", tabWards: "Services et lits",
      cAdmitted: "Actuellement hospitalisés", cFree: "Lits libres", cBeds: "Total des lits", cDischarged: "Sortis",
      fCurrent: "En cours", fDischarged: "Sortis", fAll: "Tous",
      ref: "N° d'admission", patient: "Patient", ward: "Service / lit", admittedAt: "Admis le", status: "Statut", days: "Jours", none: "Rien pour le moment", noWards: "Aucun service. Un administrateur peut ajouter le premier.",
      bed: "Lit", bedFree: "Libre — cliquer pour admettre", rate: "Tarif journalier", perDay: "/ jour", type: "Type de service", wardName: "Nom du service", bedCount: "Nombre de lits", addBeds: "Ajouter des lits", howMany: "Combien ?",
      editWard: "Modifier le service", save: "Enregistrer", saving: "Enregistrement…", cancel: "Annuler", close: "Fermer", maintenance: "Maintenance", makeMaint: "Mettre en maintenance", makeFree: "Marquer disponible",
      types: { general: "Général", maternity: "Maternité", paediatric: "Pédiatrie", icu: "Soins intensifs", private: "Privé", surgical: "Chirurgie" },
      choosePatient: "Choisir un patient…", chooseWard: "Choisir un service…", chooseBed: "Choisir un lit…", reason: "Motif d'admission", diagnosis: "Diagnostic", errAdmit: "Choisissez un patient, un service et un lit",
      admitted: "Patient admis.", wardSaved: "Service enregistré.", bedsAdded: "Lits ajoutés.", noteAdded: "Note ajoutée.", discharged: "Patient sorti.", billRaised: "Une facture de {{amount}} a été créée.",
      reasonLabel: "Motif", diagnosisLabel: "Diagnostic", notes: "Notes d'évolution", noNotes: "Aucune note", addNote: "Ajouter une note", notePh: "Évolution du jour, traitements, plan…", postNote: "Ajouter la note",
      discharge: "Faire sortir le patient", dischargeTitle: "Sortie de {{name}}", summary: "Résumé de sortie", extra: "Frais supplémentaires (facultatif)", extraDesc: "Description", extraAmt: "Montant ({{cur}})", addExtra: "Ajouter des frais",
      dischargeNote: "Le lit est libéré immédiatement. Les jours sont facturés par tranche de 24 h commencée (minimum 1 jour).", confirmDischarge: "Confirmer la sortie",
      dischargedOn: "Sorti le", by: "par", billedBed: "Frais de lit", stay: "{{n}} jour(s)", occupantOpen: "Ouvrir l'admission",
    },
  },
  ar: {
    nav: { inpatient: "التنويم" },
    inp: {
      title: "رعاية المرضى المنوَّمين", admit: "تنويم مريض", addWard: "إضافة جناح",
      tabAdmissions: "حالات التنويم", tabWards: "الأجنحة والأسرّة",
      cAdmitted: "منوَّمون حاليًا", cFree: "أسرّة شاغرة", cBeds: "إجمالي الأسرّة", cDischarged: "تم إخراجهم",
      fCurrent: "الحالية", fDischarged: "المخرَجون", fAll: "الكل",
      ref: "رقم التنويم", patient: "المريض", ward: "الجناح / السرير", admittedAt: "تاريخ الدخول", status: "الحالة", days: "الأيام", none: "لا شيء بعد", noWards: "لا توجد أجنحة. يمكن للمدير إضافة أول جناح.",
      bed: "سرير", bedFree: "شاغر — انقر للتنويم", rate: "السعر اليومي", perDay: "/ يوم", type: "نوع الجناح", wardName: "اسم الجناح", bedCount: "عدد الأسرّة", addBeds: "إضافة أسرّة", howMany: "كم؟",
      editWard: "تعديل الجناح", save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء", close: "إغلاق", maintenance: "صيانة", makeMaint: "وضع قيد الصيانة", makeFree: "جعله متاحًا",
      types: { general: "عام", maternity: "الولادة", paediatric: "الأطفال", icu: "العناية المركزة", private: "خاص", surgical: "الجراحة" },
      choosePatient: "اختر مريضًا…", chooseWard: "اختر جناحًا…", chooseBed: "اختر سريرًا…", reason: "سبب التنويم", diagnosis: "التشخيص", errAdmit: "اختر مريضًا وجناحًا وسريرًا",
      admitted: "تم تنويم المريض.", wardSaved: "تم حفظ الجناح.", bedsAdded: "تمت إضافة الأسرّة.", noteAdded: "تمت إضافة الملاحظة.", discharged: "تم إخراج المريض.", billRaised: "تم إصدار فاتورة بمبلغ {{amount}}.",
      reasonLabel: "السبب", diagnosisLabel: "التشخيص", notes: "ملاحظات المتابعة", noNotes: "لا توجد ملاحظات", addNote: "إضافة ملاحظة", notePh: "تطور اليوم، العلاج المُعطى، الخطة…", postNote: "إضافة الملاحظة",
      discharge: "إخراج المريض", dischargeTitle: "إخراج {{name}}", summary: "ملخص الإخراج", extra: "رسوم إضافية (اختياري)", extraDesc: "الوصف", extraAmt: "المبلغ ({{cur}})", addExtra: "إضافة رسم",
      dischargeNote: "يُحرَّر السرير فورًا. تُحتسب الأيام لكل 24 ساعة بدأت (حدٌّ أدنى يوم واحد).", confirmDischarge: "تأكيد الإخراج",
      dischargedOn: "تاريخ الإخراج", by: "بواسطة", billedBed: "رسوم السرير", stay: "{{n}} يوم", occupantOpen: "فتح التنويم",
    },
  },
});

const Alert = ({ kind = "error", children }) => (
  <div role={kind === "error" ? "alert" : "status"} style={{ background: kind === "error" ? "var(--danger-bg)" : "var(--brand-tint-light)", color: kind === "error" ? "var(--danger)" : "var(--brand-text)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{children}</div>
);
const lbl = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 };
const WARD_TYPES = ["general", "maternity", "paediatric", "icu", "private", "surgical"];

function AdmitModal({ token, wards, preset, onClose, onDone }) {
  const { t } = useTranslation();
  const fetchPatients = useMemo(() => patientFetcher(token), [token]);
  const [f, setF] = useState({ patientId: "", wardId: preset?.wardId || "", bedNumber: preset?.bedNumber || "", reason: "", diagnosis: "" });
  const [err, setErr] = useState("");
  const ward = wards.find((w) => w.id === f.wardId);
  const free = (ward?.beds || []).filter((b) => b.status === "available");
  const submit = async () => {
    if (!f.patientId || !f.wardId || !f.bedNumber) { setErr(t("inp.errAdmit")); return false; }
    setErr("");
    try { await api("/admissions", "POST", { ...f, reason: f.reason.trim() || undefined, diagnosis: f.diagnosis.trim() || undefined }, token); onDone(); }
    catch (e) { setErr(apiErrorMessage(e)); return false; }
  };
  return (
    <Modal title={t("inp.admit")} onClose={onClose}>
      <Field label={t("inp.patient")}>
        <SearchSelect value={f.patientId} onChange={(v) => setF({ ...f, patientId: v })} fetcher={fetchPatients} placeholder={t("inp.choosePatient")} noResults={t("common.noRecords")} ariaLabel={t("inp.patient")} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label={t("inp.ward").split(" / ")[0]}>
          <select style={inp} value={f.wardId} onChange={(e) => setF({ ...f, wardId: e.target.value, bedNumber: "" })}>
            <option value="">{t("inp.chooseWard")}</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({(w.beds || []).filter((b) => b.status === "available").length} {t("inp.cFree").toLowerCase()})</option>)}
          </select>
        </Field>
        <Field label={t("inp.bed")}>
          <select style={inp} value={f.bedNumber} disabled={!ward} onChange={(e) => setF({ ...f, bedNumber: e.target.value })}>
            <option value="">{t("inp.chooseBed")}</option>{free.map((b) => <option key={b.number} value={b.number}>{b.number}</option>)}
          </select>
        </Field>
      </div>
      {ward && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{t("inp.rate")}: {money(ward.dailyRate)} {t("inp.perDay")}</div>}
      <Field label={t("inp.reason")}><input style={inp} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <Field label={t("inp.diagnosis")}><input style={inp} value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} /></Field>
      {err && <Alert>{err}</Alert>}
      <LoadingButton style={btnP} busyLabel={t("inp.saving")} onClick={submit}><Icon name="check" size={16} /> {t("inp.admit")}</LoadingButton>
    </Modal>
  );
}

function WardModal({ token, ward, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: ward?.name || "", type: ward?.type || "general", dailyRate: ward?.dailyRate ?? "", bedCount: 10, addBeds: "" });
  const [err, setErr] = useState("");
  const [, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim()) return setErr(t("inp.wardName"));
    setBusy(true); setErr("");
    try {
      if (ward) {
        const body = { name: f.name.trim(), type: f.type, dailyRate: Number(f.dailyRate) || 0 };
        if (Number(f.addBeds) > 0) body.addBeds = Number(f.addBeds);
        await api(`/wards/${ward.id}`, "PUT", body, token);
        onDone(Number(f.addBeds) > 0 ? t("inp.bedsAdded") : t("inp.wardSaved"));
      } else {
        await api("/wards", "POST", { name: f.name.trim(), type: f.type, dailyRate: Number(f.dailyRate) || 0, bedCount: Number(f.bedCount) }, token);
        onDone(t("inp.wardSaved"));
      }
    } catch (e) { setErr(apiErrorMessage(e)); setBusy(false); }
  };
  return (
    <Modal title={ward ? t("inp.editWard") : t("inp.addWard")} onClose={onClose}>
      <Field label={t("inp.wardName")}><input style={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("inp.type")}><select style={inp} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{WARD_TYPES.map((x) => <option key={x} value={x}>{t(`inp.types.${x}`)}</option>)}</select></Field>
        <Field label={`${t("inp.rate")} (${getCurrency()})`}><input style={inp} type="number" min="0" value={f.dailyRate} onChange={(e) => setF({ ...f, dailyRate: e.target.value })} /></Field>
      </div>
      {ward
        ? <Field label={`${t("inp.addBeds")} — ${t("inp.howMany")}`}><input style={inp} type="number" min="0" value={f.addBeds} onChange={(e) => setF({ ...f, addBeds: e.target.value })} /></Field>
        : <Field label={t("inp.bedCount")}><input style={inp} type="number" min="1" max="200" value={f.bedCount} onChange={(e) => setF({ ...f, bedCount: e.target.value })} /></Field>}
      {err && <Alert>{err}</Alert>}
      <LoadingButton style={btnP} busyLabel={t("inp.saving")} onClick={submit}><Icon name="check" size={16} /> {t("inp.save")}</LoadingButton>
    </Modal>
  );
}

function DischargeModal({ token, adm, onClose, onDone }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState("");
  const [extras, setExtras] = useState([]);
  const [err, setErr] = useState("");
  const [, setBusy] = useState(false);
  const setX = (i, patch) => setExtras((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api(`/admissions/${adm.id}/discharge`, "POST", {
        dischargeSummary: summary.trim() || undefined,
        extraCharges: extras.filter((x) => x.description.trim() && Number(x.amount) > 0).map((x) => ({ description: x.description.trim(), amount: Number(x.amount) })),
      }, token);
      onDone(r);
    } catch (e) { setErr(apiErrorMessage(e)); setBusy(false); }
  };
  return (
    <Modal title={t("inp.dischargeTitle", { name: adm.patientName })} onClose={onClose}>
      <Field label={t("inp.summary")}><textarea style={{ ...inp, minHeight: 80 }} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
      <div style={lbl}>{t("inp.extra")}</div>
      {extras.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input style={{ ...inp, flex: 2 }} placeholder={t("inp.extraDesc")} value={x.description} onChange={(e) => setX(i, { description: e.target.value })} />
          <input style={{ ...inp, flex: 1 }} type="number" min="0" placeholder={t("inp.extraAmt")} value={x.amount} onChange={(e) => setX(i, { amount: e.target.value })} />
          <button type="button" onClick={() => setExtras((xs) => xs.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 20 }}>×</button>
        </div>
      ))}
      <button type="button" style={{ ...btnG, marginBottom: 12 }} onClick={() => setExtras((xs) => [...xs, { description: "", amount: "" }])}><Icon name="plus" size={13} /> {t("inp.addExtra")}</button>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{t("inp.dischargeNote")}</div>
      {err && <Alert>{err}</Alert>}
      <LoadingButton style={btnP} busyLabel={t("inp.saving")} onClick={submit}><Icon name="check" size={16} /> {t("inp.confirmDischarge")}</LoadingButton>
    </Modal>
  );
}

function AdmissionModal({ token, user, admId, onClose, onChanged }) {
  const { t, i18n } = useTranslation();
  const [adm, setAdm] = useState(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [dis, setDis] = useState(false);
  const canAct = ["admin", "doctor"].includes(user.role);

  const load = useCallback(() => api(`/admissions/${admId}`, "GET", null, token).then(setAdm).catch((e) => setErr(apiErrorMessage(e))), [admId, token]);
  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr("");
    try { const r = await api(`/admissions/${admId}/notes`, "POST", { text: text.trim() }, token); setAdm(r); setText(""); }
    catch (e) { setErr(apiErrorMessage(e)); }
    setBusy(false);
  };

  if (!adm) return <Modal title="…" onClose={onClose}>{err ? <Alert>{err}</Alert> : <div style={{ padding: 20, textAlign: "center", color: "var(--text-faint)" }}>{t("common.loading")}</div>}</Modal>;
  if (dis) return <DischargeModal token={token} adm={adm} onClose={() => setDis(false)} onDone={(r) => onChanged(r)} />;

  const active = adm.status === "admitted";
  return (
    <Modal title={`${adm.patientName} — ${adm.admissionRef || ""}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <Badge status={adm.status} />
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{adm.wardName} · {t("inp.bed")} {adm.bedNumber} · {formatDateTime(adm.admittedAt, i18n.language)}</span>
      </div>
      {adm.reason && <div style={{ fontSize: 14, marginBottom: 4 }}><b>{t("inp.reasonLabel")}:</b> {adm.reason}</div>}
      {adm.diagnosis && <div style={{ fontSize: 14, marginBottom: 4 }}><b>{t("inp.diagnosisLabel")}:</b> {adm.diagnosis}</div>}
      {!active && (
        <div style={{ background: "var(--brand-tint-light)", borderRadius: 10, padding: "10px 14px", fontSize: 14, margin: "10px 0" }}>
          {t("inp.dischargedOn")} {formatDateTime(adm.dischargedAt, i18n.language)} {t("inp.by")} {adm.dischargedByName} · {t("inp.stay", { n: adm.daysStayed })} · {t("inp.billedBed")}: {money(adm.bedCharge)}
          {adm.dischargeSummary && <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{adm.dischargeSummary}</div>}
        </div>
      )}
      <div style={{ ...lbl, marginTop: 14 }}>{t("inp.notes")}</div>
      {(adm.notes || []).length === 0 ? <div style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 8 }}>{t("inp.noNotes")}</div> : (
        <div style={{ display: "grid", gap: 8, marginBottom: 10, maxHeight: 220, overflowY: "auto" }}>
          {[...adm.notes].reverse().map((n) => (
            <div key={n.id} style={{ border: "1px solid var(--brand-tint)", borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{formatDateTime(n.at, i18n.language)} · {n.byName}</div>
              <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{n.text}</div>
            </div>
          ))}
        </div>
      )}
      {active && canAct && (
        <>
          <textarea style={{ ...inp, minHeight: 60 }} placeholder={t("inp.notePh")} aria-label={t("inp.addNote")} value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={btnG} disabled={busy || !text.trim()} onClick={addNote}>{t("inp.postNote")}</button>
            <button style={btnP} onClick={() => setDis(true)}>{t("inp.discharge")}</button>
          </div>
        </>
      )}
      {err && <div style={{ marginTop: 10 }}><Alert>{err}</Alert></div>}
    </Modal>
  );
}

function BedGrid({ ward, canManage, onBed }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {(ward.beds || []).map((b) => {
        const [fg, bg] = bedColors[b.status] || bedColors.available;
        return (
          <button key={b.number} onClick={() => onBed(ward, b)} title={`${t("inp.bed")} ${b.number} — ${t(`status.${b.status}`, b.status)}`}
            style={{ width: 56, height: 56, borderRadius: 12, border: `2px solid ${fg}`, background: bg, color: fg, fontWeight: 800, fontSize: 15, cursor: b.status === "maintenance" && !canManage ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <Icon name="bed" size={16} />{b.number}
          </button>
        );
      })}
    </div>
  );
}

export default function Inpatient({ token, user }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState("admissions");
  const [filter, setFilter] = useState("admitted");
  const [wards, setWards] = useState([]);
  const [adms, setAdms] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isAdmin = user.role === "admin";

  const load = useCallback(async () => {
    try {
      const [w, a] = await Promise.all([api("/wards", "GET", null, token), api("/admissions", "GET", null, token)]);
      setWards(Array.isArray(w) ? w : []); setAdms(Array.isArray(a) ? a : []); setError("");
    } catch (e) { setError(apiErrorMessage(e, t("common.error"))); }
  }, [token, t]);
  useEffect(() => { load(); }, [load]);

  const allBeds = wards.flatMap((w) => w.beds || []);
  const freeBeds = allBeds.filter((b) => b.status === "available").length;
  const current = adms.filter((a) => a.status === "admitted");
  const shown = filter === "all" ? adms : adms.filter((a) => a.status === filter);
  const done = (msg) => { setModal(null); setNotice(msg); load(); };

  const onBed = (ward, bed) => {
    if (bed.status === "available") setModal({ type: "admit", preset: { wardId: ward.id, bedNumber: bed.number } });
    else if (bed.status === "occupied" && bed.admissionId) setModal({ type: "adm", id: bed.admissionId });
    else if (bed.status === "maintenance" && isAdmin) toggleMaint(ward, bed, "available");
  };
  const toggleMaint = async (ward, bed, status) => {
    try { await api(`/wards/${ward.id}`, "PUT", { bedStatus: { number: bed.number, status } }, token); load(); }
    catch (e) { setError(apiErrorMessage(e)); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("inp.title")}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && <button style={btnG} onClick={() => { setNotice(""); setModal({ type: "ward" }); }}><Icon name="plus" size={14} /> {t("inp.addWard")}</button>}
          <button style={btnP} onClick={() => { setNotice(""); setModal({ type: "admit" }); }}><Icon name="plus" size={16} /> {t("inp.admit")}</button>
        </div>
      </div>
      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("inp.cAdmitted")} value={current.length} color="var(--danger)" icon="bed" />
        <StatCard label={t("inp.cFree")} value={freeBeds} color="var(--brand)" icon="bed" />
        <StatCard label={t("inp.cBeds")} value={allBeds.length} color="var(--info)" icon="bed" />
        <StatCard label={t("inp.cDischarged")} value={adms.length - current.length} color="var(--text-muted)" icon="bed" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["admissions", "tabAdmissions"], ["wards", "tabWards"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...btnG, ...(tab === k ? { background: "var(--brand)", color: "#fff" } : {}) }}>{t(`inp.${l}`)}</button>
        ))}
      </div>

      {tab === "admissions" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {[["admitted", "fCurrent"], ["discharged", "fDischarged"], ["all", "fAll"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ ...btnE, ...(filter === k ? { background: "var(--brand-tint)" } : {}) }}>{t(`inp.${l}`)}</button>
            ))}
          </div>
          <div style={card}>
            {shown.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: "var(--text-faint)" }}>{t("inp.none")}</div> : (
              <Table data={shown} columns={[
                { key: "admissionRef", label: t("inp.ref") },
                { key: "patientName", label: t("inp.patient") },
                { key: "wardName", label: t("inp.ward"), render: (v, r) => `${v} · ${t("inp.bed")} ${r.bedNumber}` },
                { key: "admittedAt", label: t("inp.admittedAt"), render: (v) => formatDateTime(v, i18n.language) },
                { key: "status", label: t("inp.status"), render: (v) => <Badge status={v} /> },
              ]} actions={(row) => [<button key="o" style={btnG} onClick={() => setModal({ type: "adm", id: row.id })}>{t("inp.occupantOpen")}</button>]} />
            )}
          </div>
        </>
      )}

      {tab === "wards" && (
        wards.length === 0 ? <div style={{ ...card, textAlign: "center", padding: 36, color: "var(--text-faint)" }}>{t("inp.noWards")}</div> : (
          <div style={{ display: "grid", gap: 16 }}>
            {wards.map((w) => (
              <div key={w.id} style={{ ...card, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: "var(--brand-text-strong)" }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(`inp.types.${w.type}`, w.type)} · {money(w.dailyRate)} {t("inp.perDay")} · {(w.beds || []).filter((b) => b.status === "available").length}/{(w.beds || []).length} {t("inp.cFree").toLowerCase()}</div>
                  </div>
                  {isAdmin && <button style={btnE} onClick={() => { setNotice(""); setModal({ type: "ward", ward: w }); }}><Icon name="edit" size={13} /> {t("inp.editWard")}</button>}
                </div>
                <BedGrid ward={w} canManage={isAdmin} onBed={onBed} />
                {isAdmin && (w.beds || []).some((b) => b.status !== "occupied") && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
                    <MaintRow ward={w} onToggle={toggleMaint} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {modal?.type === "admit" && <AdmitModal token={token} wards={wards} preset={modal.preset} onClose={() => setModal(null)} onDone={() => done(t("inp.admitted"))} />}
      {modal?.type === "ward" && <WardModal token={token} ward={modal.ward} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "adm" && (
        <AdmissionModal token={token} user={user} admId={modal.id} onClose={() => { setModal(null); load(); }}
          onChanged={(r) => { setModal(null); setNotice(t("inp.discharged") + (r?.bill ? ` ${t("inp.billRaised", { amount: money(r.bill.totalAmount) })}` : "")); load(); }} />
      )}
    </div>
  );
}

// Admin-only: put a free bed into maintenance (and back) from the ward card.
function MaintRow({ ward, onToggle }) {
  const { t } = useTranslation();
  const [num, setNum] = useState("");
  const candidates = (ward.beds || []).filter((b) => b.status !== "occupied");
  const bed = candidates.find((b) => b.number === num);
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 12 }} value={num} onChange={(e) => setNum(e.target.value)} aria-label={t("inp.maintenance")}>
        <option value="">{t("inp.maintenance")}…</option>
        {candidates.map((b) => <option key={b.number} value={b.number}>{t("inp.bed")} {b.number}</option>)}
      </select>
      {bed && <button style={btnG} onClick={() => { onToggle(ward, bed, bed.status === "available" ? "maintenance" : "available"); setNum(""); }}>{bed.status === "available" ? t("inp.makeMaint") : t("inp.makeFree")}</button>}
    </span>
  );
}
