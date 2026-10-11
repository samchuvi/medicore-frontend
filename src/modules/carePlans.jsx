// Treatment plans & referrals: the forms and actions used inside a patient's
// history page, plus a small "Referrals" screen (inbox) for doctors.
// Backend: /treatment-plans, /referrals, /doctors. Each can be switched off per
// hospital (features treatmentPlans / referrals).
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, formatDate, addTranslations, Icon, Modal, Field, inp, btnP, btnG, btnE, Badge, StatCard, Table } from "../shared";

const card = { background: "var(--surface)", borderRadius: 16, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow: "hidden" };
const lbl = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 };
const today = () => new Date().toISOString().slice(0, 10);

addTranslations({
  en: {
    nav: { referrals: "Referrals" },
    care: {
      newPlan: "New treatment plan", editPlan: "Edit treatment plan", newReferral: "Refer patient",
      doctor: "Doctor", chooseDoctor: "Choose a doctor…", diagnosis: "Diagnosis / condition", goals: "Goals of treatment", instructions: "Instructions for the patient", notes: "Notes",
      start: "Start date", review: "Review date", status: "Status", active: "Active", completed: "Completed", discontinued: "Discontinued",
      medications: "Medications", medName: "Medicine", dosage: "Dosage", frequency: "Frequency", duration: "Duration", addMed: "Add medicine",
      save: "Save", saving: "Saving…", cancel: "Cancel", edit: "Edit",
      errDiagnosis: "Enter the diagnosis", errDoctor: "Choose the doctor", errTarget: "Choose a doctor or enter a department to refer to",
      toDoctor: "Refer to doctor", toDepartment: "…or department", anyDoctor: "No specific doctor", reason: "Reason for referral", urgency: "Urgency", routine: "Routine", urgent: "Urgent", fromDoctor: "Referring doctor",
      send: "Send referral", planSaved: "Treatment plan saved.", referralSent: "Referral sent.", updated: "Referral updated.",
      accept: "Accept", decline: "Decline", complete: "Mark completed",
      title: "Referrals", fPending: "Pending", fAccepted: "Accepted", fAll: "All",
      cPending: "Pending", cUrgent: "Urgent pending", cAccepted: "Accepted", cDone: "Completed",
      date: "Date", patient: "Patient", from: "From", to: "To", none: "No referrals here", respondedBy: "Handled by", noLinkedDoctor: "Your account is not linked to a doctor profile, so you cannot send referrals. Ask an administrator to link it.",
    },
  },
  fr: {
    nav: { referrals: "Références" },
    care: {
      newPlan: "Nouveau plan de traitement", editPlan: "Modifier le plan de traitement", newReferral: "Référer le patient",
      doctor: "Médecin", chooseDoctor: "Choisir un médecin…", diagnosis: "Diagnostic / affection", goals: "Objectifs du traitement", instructions: "Instructions pour le patient", notes: "Notes",
      start: "Date de début", review: "Date de révision", status: "Statut", active: "Actif", completed: "Terminé", discontinued: "Interrompu",
      medications: "Médicaments", medName: "Médicament", dosage: "Dosage", frequency: "Fréquence", duration: "Durée", addMed: "Ajouter un médicament",
      save: "Enregistrer", saving: "Enregistrement…", cancel: "Annuler", edit: "Modifier",
      errDiagnosis: "Saisissez le diagnostic", errDoctor: "Choisissez le médecin", errTarget: "Choisissez un médecin ou saisissez un service",
      toDoctor: "Référer au médecin", toDepartment: "…ou au service", anyDoctor: "Aucun médecin précis", reason: "Motif de la référence", urgency: "Urgence", routine: "Routine", urgent: "Urgent", fromDoctor: "Médecin référent",
      send: "Envoyer la référence", planSaved: "Plan de traitement enregistré.", referralSent: "Référence envoyée.", updated: "Référence mise à jour.",
      accept: "Accepter", decline: "Refuser", complete: "Marquer terminée",
      title: "Références", fPending: "En attente", fAccepted: "Acceptées", fAll: "Toutes",
      cPending: "En attente", cUrgent: "Urgentes en attente", cAccepted: "Acceptées", cDone: "Terminées",
      date: "Date", patient: "Patient", from: "De", to: "À", none: "Aucune référence ici", respondedBy: "Traité par", noLinkedDoctor: "Votre compte n'est pas lié à un profil de médecin : vous ne pouvez pas envoyer de références. Demandez à un administrateur de le lier.",
    },
  },
  ar: {
    nav: { referrals: "التحويلات" },
    care: {
      newPlan: "خطة علاج جديدة", editPlan: "تعديل خطة العلاج", newReferral: "تحويل المريض",
      doctor: "الطبيب", chooseDoctor: "اختر طبيبًا…", diagnosis: "التشخيص / الحالة", goals: "أهداف العلاج", instructions: "تعليمات للمريض", notes: "ملاحظات",
      start: "تاريخ البدء", review: "تاريخ المراجعة", status: "الحالة", active: "نشطة", completed: "مكتملة", discontinued: "متوقفة",
      medications: "الأدوية", medName: "الدواء", dosage: "الجرعة", frequency: "التكرار", duration: "المدة", addMed: "إضافة دواء",
      save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء", edit: "تعديل",
      errDiagnosis: "أدخل التشخيص", errDoctor: "اختر الطبيب", errTarget: "اختر طبيبًا أو أدخل قسمًا للتحويل إليه",
      toDoctor: "تحويل إلى الطبيب", toDepartment: "…أو إلى قسم", anyDoctor: "بدون طبيب محدد", reason: "سبب التحويل", urgency: "الاستعجال", routine: "عادي", urgent: "عاجل", fromDoctor: "الطبيب المحوِّل",
      send: "إرسال التحويل", planSaved: "تم حفظ خطة العلاج.", referralSent: "تم إرسال التحويل.", updated: "تم تحديث التحويل.",
      accept: "قبول", decline: "رفض", complete: "تحديد كمكتمل",
      title: "التحويلات", fPending: "قيد الانتظار", fAccepted: "مقبولة", fAll: "الكل",
      cPending: "قيد الانتظار", cUrgent: "عاجلة بالانتظار", cAccepted: "مقبولة", cDone: "مكتملة",
      date: "التاريخ", patient: "المريض", from: "من", to: "إلى", none: "لا توجد تحويلات هنا", respondedBy: "تمت المعالجة بواسطة", noLinkedDoctor: "حسابك غير مرتبط بملف طبيب، لذا لا يمكنك إرسال تحويلات. اطلب من المدير ربطه.",
    },
  },
});

const Alert = ({ kind = "error", children }) => (
  <div role={kind === "error" ? "alert" : "status"} style={{ background: kind === "error" ? "var(--danger-bg)" : "var(--brand-tint-light)", color: kind === "error" ? "var(--danger)" : "var(--brand-text)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{children}</div>
);

// Doctors at this hospital, and which one (if any) is the logged-in user.
function useDoctors(token, user) {
  const [doctors, setDoctors] = useState([]);
  useEffect(() => { api("/doctors", "GET", null, token).then((r) => setDoctors(Array.isArray(r) ? r : [])).catch(() => {}); }, [token]);
  const me = doctors.find((d) => d.linkedUserId === user.id) || null;
  return { doctors, me };
}

export function PlanModal({ token, user, patient, plan, onClose, onDone }) {
  const { t } = useTranslation();
  const { doctors, me } = useDoctors(token, user);
  const [f, setF] = useState({
    doctorId: plan?.doctorId || "", diagnosis: plan?.diagnosis || "", goals: plan?.goals || "", instructions: plan?.instructions || "", notes: plan?.notes || "",
    startDate: plan?.startDate || today(), reviewDate: plan?.reviewDate || "", status: plan?.status || "active",
  });
  const [meds, setMeds] = useState((plan?.medications || []).length ? plan.medications.map((m) => ({ ...m })) : []);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isDoctor = user.role === "doctor";
  const doctorId = isDoctor ? me?.id : f.doctorId;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setMed = (i, patch) => setMeds((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const submit = async () => {
    if (!f.diagnosis.trim()) return setErr(t("care.errDiagnosis"));
    const doc = doctors.find((d) => d.id === doctorId);
    if (!plan && !doc) return setErr(t("care.errDoctor"));
    setBusy(true); setErr("");
    const body = {
      diagnosis: f.diagnosis.trim(), goals: f.goals, instructions: f.instructions, notes: f.notes,
      startDate: f.startDate, reviewDate: f.reviewDate, status: f.status,
      medications: meds.filter((m) => (m.name || "").trim()),
    };
    try {
      if (plan) await api(`/treatment-plans/${plan.id}`, "PUT", body, token);
      else await api("/treatment-plans", "POST", { ...body, patientId: patient.id, patientName: patient.name, doctorId: doc.id, doctorName: doc.name }, token);
      onDone(t("care.planSaved"));
    } catch (e) { setErr(apiErrorMessage(e)); setBusy(false); }
  };

  return (
    <Modal title={plan ? t("care.editPlan") : t("care.newPlan")} onClose={onClose}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-text-strong)", marginBottom: 10 }}>{patient.name}</div>
      {!plan && !isDoctor && (
        <Field label={t("care.doctor")}>
          <select style={inp} value={f.doctorId} onChange={set("doctorId")}><option value="">{t("care.chooseDoctor")}</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </Field>
      )}
      {!plan && isDoctor && !me && <Alert>{t("care.noLinkedDoctor")}</Alert>}
      <Field label={t("care.diagnosis")}><input style={inp} value={f.diagnosis} onChange={set("diagnosis")} /></Field>
      <Field label={t("care.goals")}><textarea style={{ ...inp, minHeight: 50 }} value={f.goals} onChange={set("goals")} /></Field>
      <div style={lbl}>{t("care.medications")}</div>
      {meds.map((m, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input style={inp} placeholder={t("care.medName")} value={m.name || ""} onChange={(e) => setMed(i, { name: e.target.value })} />
          <input style={inp} placeholder={t("care.dosage")} value={m.dosage || ""} onChange={(e) => setMed(i, { dosage: e.target.value })} />
          <input style={inp} placeholder={t("care.frequency")} value={m.frequency || ""} onChange={(e) => setMed(i, { frequency: e.target.value })} />
          <input style={inp} placeholder={t("care.duration")} value={m.duration || ""} onChange={(e) => setMed(i, { duration: e.target.value })} />
          <button type="button" onClick={() => setMeds((ms) => ms.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 20 }}>×</button>
        </div>
      ))}
      <button type="button" style={{ ...btnG, marginBottom: 12 }} onClick={() => setMeds((ms) => [...ms, { name: "", dosage: "", frequency: "", duration: "" }])}><Icon name="plus" size={13} /> {t("care.addMed")}</button>
      <Field label={t("care.instructions")}><textarea style={{ ...inp, minHeight: 50 }} value={f.instructions} onChange={set("instructions")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label={t("care.start")}><input style={inp} type="date" value={f.startDate} onChange={set("startDate")} /></Field>
        <Field label={t("care.review")}><input style={inp} type="date" value={f.reviewDate} onChange={set("reviewDate")} /></Field>
        <Field label={t("care.status")}>
          <select style={inp} value={f.status} onChange={set("status")}>{["active", "completed", "discontinued"].map((s) => <option key={s} value={s}>{t(`care.${s}`)}</option>)}</select>
        </Field>
      </div>
      <Field label={t("care.notes")}><input style={inp} value={f.notes} onChange={set("notes")} /></Field>
      {err && <Alert>{err}</Alert>}
      <button style={{ ...btnP, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}><Icon name="check" size={16} /> {busy ? t("care.saving") : t("care.save")}</button>
    </Modal>
  );
}

export function ReferralModal({ token, user, patient, onClose, onDone }) {
  const { t } = useTranslation();
  const { doctors, me } = useDoctors(token, user);
  const isDoctor = user.role === "doctor";
  const [f, setF] = useState({ fromDoctorId: "", toDoctorId: "", toDepartment: "", reason: "", urgency: "routine", notes: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async () => {
    const to = doctors.find((d) => d.id === f.toDoctorId);
    if (!to && !f.toDepartment.trim()) return setErr(t("care.errTarget"));
    if (isDoctor && !me) return setErr(t("care.noLinkedDoctor"));
    const from = isDoctor ? me : doctors.find((d) => d.id === f.fromDoctorId);
    setBusy(true); setErr("");
    try {
      await api("/referrals", "POST", {
        patientId: patient.id, patientName: patient.name,
        ...(from ? { fromDoctorId: from.id, fromDoctorName: from.name } : {}),
        ...(to ? { toDoctorId: to.id, toDoctorName: to.name } : {}),
        toDepartment: f.toDepartment.trim() || undefined, reason: f.reason.trim() || undefined, urgency: f.urgency, notes: f.notes.trim() || undefined,
      }, token);
      onDone(t("care.referralSent"));
    } catch (e) { setErr(apiErrorMessage(e)); setBusy(false); }
  };

  return (
    <Modal title={t("care.newReferral")} onClose={onClose}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-text-strong)", marginBottom: 10 }}>{patient.name}</div>
      {isDoctor && !me && <Alert>{t("care.noLinkedDoctor")}</Alert>}
      {!isDoctor && (
        <Field label={t("care.fromDoctor")}>
          <select style={inp} value={f.fromDoctorId} onChange={set("fromDoctorId")}><option value="">{t("care.chooseDoctor")}</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("care.toDoctor")}>
          <select style={inp} value={f.toDoctorId} onChange={set("toDoctorId")}>
            <option value="">{t("care.anyDoctor")}</option>{doctors.filter((d) => d.id !== me?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label={t("care.toDepartment")}><input style={inp} value={f.toDepartment} onChange={set("toDepartment")} /></Field>
      </div>
      <Field label={t("care.reason")}><textarea style={{ ...inp, minHeight: 60 }} value={f.reason} onChange={set("reason")} /></Field>
      <Field label={t("care.urgency")}>
        <select style={inp} value={f.urgency} onChange={set("urgency")}><option value="routine">{t("care.routine")}</option><option value="urgent">{t("care.urgent")}</option></select>
      </Field>
      {err && <Alert>{err}</Alert>}
      <button style={{ ...btnP, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}><Icon name="check" size={16} /> {busy ? t("care.saving") : t("care.send")}</button>
    </Modal>
  );
}

// Accept / decline / complete buttons for one referral. onChanged(message) reloads.
export function ReferralActions({ token, referral, onChanged, onError }) {
  const { t } = useTranslation();
  const move = async (status) => {
    try { await api(`/referrals/${referral.id}`, "PUT", { status }, token); onChanged(t("care.updated")); }
    catch (e) { onError?.(apiErrorMessage(e)); }
  };
  if (referral.status === "pending") return (
    <>
      <button style={btnE} onClick={() => move("accepted")}>{t("care.accept")}</button>{" "}
      <button style={{ ...btnG, color: "var(--danger)" }} onClick={() => move("declined")}>{t("care.decline")}</button>
    </>
  );
  if (referral.status === "accepted") return <button style={btnG} onClick={() => move("completed")}>{t("care.complete")}</button>;
  return null;
}

// Doctor's referral inbox (sent and received), reachable from the menu.
export default function Referrals({ token, user }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try { const r = await api("/referrals", "GET", null, token); setRows(Array.isArray(r) ? r : []); setError(""); }
    catch (e) { setError(apiErrorMessage(e, t("common.error"))); }
  }, [token, t]);
  useEffect(() => { load(); }, [load]);

  const n = (s) => rows.filter((r) => r.status === s).length;
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const canAct = ["admin", "doctor"].includes(user.role);

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("care.title")}</h2>
      {notice && <Alert kind="ok">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("care.cPending")} value={n("pending")} color="var(--warn)" icon="referral" />
        <StatCard label={t("care.cUrgent")} value={rows.filter((r) => r.status === "pending" && r.urgency === "urgent").length} color="var(--danger)" icon="referral" />
        <StatCard label={t("care.cAccepted")} value={n("accepted")} color="var(--info)" icon="referral" />
        <StatCard label={t("care.cDone")} value={n("completed")} color="var(--brand)" icon="referral" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[["pending", "fPending"], ["accepted", "fAccepted"], ["all", "fAll"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...btnG, ...(filter === k ? { background: "var(--brand)", color: "#fff" } : {}) }}>{t(`care.${l}`)}</button>
        ))}
      </div>
      <div style={card}>
        {shown.length === 0 ? <div style={{ textAlign: "center", padding: 36, color: "var(--text-faint)" }}>{t("care.none")}</div> : (
          <Table data={shown} columns={[
            { key: "createdAt", label: t("care.date"), render: (v) => formatDate(v, i18n.language) },
            { key: "patientName", label: t("care.patient") },
            { key: "fromDoctorName", label: t("care.from"), render: (v) => v || "—" },
            { key: "toDoctorName", label: t("care.to"), render: (v, r) => v || r.toDepartment || "—" },
            { key: "reason", label: t("care.reason") },
            { key: "urgency", label: t("care.urgency"), render: (v) => <Badge status={v || "routine"} /> },
            { key: "status", label: t("care.status"), render: (v) => <Badge status={v} /> },
          ]} actions={canAct ? (row) => [<ReferralActions key="a" token={token} referral={row} onChanged={(m) => { setNotice(m); load(); }} onError={setError} />] : null} />
        )}
      </div>
    </div>
  );
}
