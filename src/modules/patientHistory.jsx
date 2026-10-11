// Find a patient (by name, phone or email) and open their full history:
// visits, medical records, treatment plans, referrals, lab results, admissions
// and accounts — everything in one place for continuity of care.
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, formatDate, formatDateTime, addTranslations, Icon, inp, btnG, btnP, Badge, StatCard, Table } from "../shared";
import { PlanModal, ReferralModal, ReferralActions } from "./carePlans";

const money = (n) => `UGX ${(Number(n) || 0).toLocaleString()}`;

addTranslations({
  en: {
    nav: { findPatient: "Find Patient" },
    status: { in_progress: "In progress", urgent: "Urgent", routine: "Routine", accepted: "Accepted", declined: "Declined", discontinued: "Discontinued", admitted: "Admitted", discharged: "Discharged" },
    history: {
      title: "Find a patient", searchPlaceholder: "Search by name, phone or email…", showing: "Showing the {{n}} most recent — type to narrow the list",
      open: "Open history", back: "Back to search", noMatch: "No patient matches your search",
      age: "Age", years: "{{n}} yrs", blood: "Blood group", phone: "Phone", email: "Email", address: "Address", emergency: "Emergency contact", allergies: "Notes / allergies",
      statVisits: "Visits", statPlans: "Active plans", statBilled: "Total billed", statPaid: "Total paid", statOutstanding: "Outstanding", statPharmacy: "Pharmacy purchases",
      tabVisits: "Visits", tabRecords: "Records", tabPlans: "Treatment plans", tabReferrals: "Referrals", tabLab: "Lab", tabInpatient: "Inpatient", tabAccounts: "Accounts",
      date: "Date", time: "Time", doctor: "Doctor", reason: "Reason", status: "Status", none: "Nothing recorded yet",
      diagnosis: "Diagnosis", treatment: "Treatment", prescription: "Prescription", notes: "Notes",
      goals: "Goals", medications: "Medications", instructions: "Instructions", start: "Start", review: "Review", dosage: "Dosage", frequency: "Frequency", duration: "Duration", medicine: "Medicine",
      to: "Referred to", from: "From", urgency: "Urgency", department: "Department",
      test: "Test", result: "Result", unit: "Unit", range: "Reference range", flag: "Flag", orderedBy: "Ordered by", priority: "Priority",
      admission: "Admission", ward: "Ward / bed", admitted: "Admitted", discharged: "Discharged", days: "Days",
      bills: "Bills", payments: "Payments", pharmacy: "Pharmacy purchases", bill: "Bill #", total: "Total", paid: "Paid", remaining: "Remaining", ref: "Ref", amount: "Amount", method: "Method", items: "Items",
      bed: "bed {{n}}",
    },
  },
  fr: {
    nav: { findPatient: "Chercher un patient" },
    status: { in_progress: "En cours", urgent: "Urgent", routine: "Routine", accepted: "Accepté", declined: "Refusé", discontinued: "Interrompu", admitted: "Hospitalisé", discharged: "Sorti" },
    history: {
      title: "Chercher un patient", searchPlaceholder: "Rechercher par nom, téléphone ou e-mail…", showing: "Affichage des {{n}} plus récents — tapez pour affiner la liste",
      open: "Ouvrir le dossier", back: "Retour à la recherche", noMatch: "Aucun patient ne correspond à votre recherche",
      age: "Âge", years: "{{n}} ans", blood: "Groupe sanguin", phone: "Téléphone", email: "E-mail", address: "Adresse", emergency: "Contact d'urgence", allergies: "Notes / allergies",
      statVisits: "Visites", statPlans: "Plans actifs", statBilled: "Total facturé", statPaid: "Total payé", statOutstanding: "Reste à payer", statPharmacy: "Achats en pharmacie",
      tabVisits: "Visites", tabRecords: "Dossiers", tabPlans: "Plans de traitement", tabReferrals: "Références", tabLab: "Labo", tabInpatient: "Hospitalisation", tabAccounts: "Comptes",
      date: "Date", time: "Heure", doctor: "Médecin", reason: "Motif", status: "Statut", none: "Rien d'enregistré pour le moment",
      diagnosis: "Diagnostic", treatment: "Traitement", prescription: "Ordonnance", notes: "Notes",
      goals: "Objectifs", medications: "Médicaments", instructions: "Instructions", start: "Début", review: "Révision", dosage: "Dosage", frequency: "Fréquence", duration: "Durée", medicine: "Médicament",
      to: "Référé à", from: "De", urgency: "Urgence", department: "Service",
      test: "Analyse", result: "Résultat", unit: "Unité", range: "Valeurs de référence", flag: "Indicateur", orderedBy: "Prescrit par", priority: "Priorité",
      admission: "Admission", ward: "Service / lit", admitted: "Admis", discharged: "Sorti", days: "Jours",
      bills: "Factures", payments: "Paiements", pharmacy: "Achats en pharmacie", bill: "Facture n°", total: "Total", paid: "Payé", remaining: "Reste", ref: "Réf.", amount: "Montant", method: "Mode", items: "Articles",
      bed: "lit {{n}}",
    },
  },
  ar: {
    nav: { findPatient: "البحث عن مريض" },
    status: { in_progress: "قيد التنفيذ", urgent: "عاجل", routine: "روتيني", accepted: "مقبول", declined: "مرفوض", discontinued: "متوقف", admitted: "منوَّم", discharged: "خرج" },
    history: {
      title: "البحث عن مريض", searchPlaceholder: "ابحث بالاسم أو الهاتف أو البريد الإلكتروني…", showing: "عرض أحدث {{n}} — اكتب لتضييق القائمة",
      open: "فتح السجل", back: "العودة إلى البحث", noMatch: "لا يوجد مريض مطابق لبحثك",
      age: "العمر", years: "{{n}} سنة", blood: "فصيلة الدم", phone: "الهاتف", email: "البريد الإلكتروني", address: "العنوان", emergency: "جهة اتصال الطوارئ", allergies: "ملاحظات / حساسية",
      statVisits: "الزيارات", statPlans: "الخطط النشطة", statBilled: "إجمالي الفواتير", statPaid: "إجمالي المدفوع", statOutstanding: "المتبقي", statPharmacy: "مشتريات الصيدلية",
      tabVisits: "الزيارات", tabRecords: "السجلات", tabPlans: "خطط العلاج", tabReferrals: "الإحالات", tabLab: "المختبر", tabInpatient: "التنويم", tabAccounts: "الحسابات",
      date: "التاريخ", time: "الوقت", doctor: "الطبيب", reason: "السبب", status: "الحالة", none: "لا يوجد شيء مسجل بعد",
      diagnosis: "التشخيص", treatment: "العلاج", prescription: "الوصفة", notes: "ملاحظات",
      goals: "الأهداف", medications: "الأدوية", instructions: "التعليمات", start: "البداية", review: "المراجعة", dosage: "الجرعة", frequency: "التكرار", duration: "المدة", medicine: "الدواء",
      to: "محال إلى", from: "من", urgency: "الاستعجال", department: "القسم",
      test: "الفحص", result: "النتيجة", unit: "الوحدة", range: "المدى المرجعي", flag: "المؤشر", orderedBy: "طلبه", priority: "الأولوية",
      admission: "التنويم", ward: "الجناح / السرير", admitted: "تاريخ الدخول", discharged: "تاريخ الخروج", days: "الأيام",
      bills: "الفواتير", payments: "المدفوعات", pharmacy: "مشتريات الصيدلية", bill: "رقم الفاتورة", total: "الإجمالي", paid: "المدفوع", remaining: "المتبقي", ref: "المرجع", amount: "المبلغ", method: "الطريقة", items: "الأصناف",
      bed: "سرير {{n}}",
    },
  },
});

const card = { background: "var(--surface)", borderRadius: 16, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow: "hidden" };
const errBox = { background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 8, padding: "10px 14px", color: "var(--danger)", fontSize: 13 };
const label = { fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 };

function Empty() {
  const { t } = useTranslation();
  return <div style={{ textAlign: "center", padding: 36, color: "var(--text-faint)" }}>{t("history.none")}</div>;
}

function Detail({ title, children }) {
  if (!children) return null;
  return <div style={{ marginBottom: 8 }}><div style={label}>{title}</div><div style={{ fontSize: 14, color: "var(--text)", whiteSpace: "pre-wrap" }}>{children}</div></div>;
}

// ── One tab per kind of record ────────────────────────────────────────────────

function VisitsTab({ rows }) {
  const { t, i18n } = useTranslation();
  if (!rows.length) return <Empty />;
  return <Table data={rows} columns={[
    { key: "date", label: t("history.date"), render: (v) => formatDate(v, i18n.language) },
    { key: "time", label: t("history.time") },
    { key: "doctorName", label: t("history.doctor") },
    { key: "reason", label: t("history.reason") },
    { key: "status", label: t("history.status"), render: (v) => <Badge status={v} /> },
  ]} />;
}

function RecordsTab({ rows }) {
  const { t, i18n } = useTranslation();
  if (!rows.length) return <Empty />;
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.id} style={{ border: "1px solid var(--brand-tint)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, color: "var(--text-muted)" }}>
            <b style={{ color: "var(--text)" }}>{formatDateTime(r.createdAt, i18n.language)}</b><span>{r.doctorName}</span>
          </div>
          <Detail title={t("history.diagnosis")}>{r.diagnosis}</Detail>
          <Detail title={t("history.treatment")}>{r.treatment}</Detail>
          <Detail title={t("history.prescription")}>{r.prescription}</Detail>
          <Detail title={t("history.notes")}>{r.notes}</Detail>
        </div>
      ))}
    </div>
  );
}

function TabBar({ label, onClick }) {
  return (
    <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "flex-end" }}>
      <button style={btnP} onClick={onClick}><Icon name="plus" size={14} /> {label}</button>
    </div>
  );
}

function PlansTab({ rows, canEdit, onNew, onEdit }) {
  const { t, i18n } = useTranslation();
  if (!rows.length) return <>{canEdit && <TabBar label={t("care.newPlan")} onClick={onNew} />}<Empty /></>;
  return (
    <>
    {canEdit && <TabBar label={t("care.newPlan")} onClick={onNew} />}
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {rows.map((p) => (
        <div key={p.id} style={{ border: "1px solid var(--brand-tint)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <b style={{ color: "var(--text)" }}>{p.diagnosis}</b><Badge status={p.status} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            {p.doctorName} · {t("history.start")}: {formatDate(p.startDate, i18n.language)} · {t("history.review")}: {formatDate(p.reviewDate, i18n.language)}
          </div>
          <Detail title={t("history.goals")}>{p.goals}</Detail>
          {Array.isArray(p.medications) && p.medications.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={label}>{t("history.medications")}</div>
              <Table data={p.medications.map((m, i) => ({ ...m, id: i }))} columns={[
                { key: "name", label: t("history.medicine") }, { key: "dosage", label: t("history.dosage") },
                { key: "frequency", label: t("history.frequency") }, { key: "duration", label: t("history.duration") },
              ]} />
            </div>
          )}
          <Detail title={t("history.instructions")}>{p.instructions}</Detail>
          <Detail title={t("history.notes")}>{p.notes}</Detail>
          {canEdit && <button style={{ ...btnG, marginTop: 6 }} onClick={() => onEdit(p)}><Icon name="edit" size={13} /> {t("care.edit")}</button>}
        </div>
      ))}
    </div>
    </>
  );
}

function ReferralsTab({ rows, canRefer, onNew, token, onChanged, onError }) {
  const { t, i18n } = useTranslation();
  if (!rows.length) return <>{canRefer && <TabBar label={t("care.newReferral")} onClick={onNew} />}<Empty /></>;
  return <>{canRefer && <TabBar label={t("care.newReferral")} onClick={onNew} />}<Table data={rows} actions={canRefer ? (row) => [<ReferralActions key="a" token={token} referral={row} onChanged={onChanged} onError={onError} />] : null} columns={[
    { key: "createdAt", label: t("history.date"), render: (v) => formatDate(v, i18n.language) },
    { key: "fromDoctorName", label: t("history.from") },
    { key: "toDoctorName", label: t("history.to"), render: (v, r) => v || r.toDepartment || "—" },
    { key: "reason", label: t("history.reason") },
    { key: "urgency", label: t("history.urgency"), render: (v) => <Badge status={v} /> },
    { key: "status", label: t("history.status"), render: (v) => <Badge status={v} /> },
  ]} /></>;
}

function LabTab({ rows }) {
  const { t, i18n } = useTranslation();
  if (!rows.length) return <Empty />;
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {rows.map((o) => (
        <div key={o.id} style={{ border: "1px solid var(--brand-tint)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
            <b style={{ color: "var(--text)" }}>{o.orderRef} · {formatDateTime(o.createdAt, i18n.language)}</b>
            <span style={{ display: "flex", gap: 6 }}><Badge status={o.priority} /><Badge status={o.status} /></span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{t("history.orderedBy")}: {o.orderedByName}</div>
          <Table data={(o.tests || []).map((x, i) => ({ ...x, id: i }))} columns={[
            { key: "name", label: t("history.test") },
            { key: "result", label: t("history.result"), render: (v) => v ? <b>{v}</b> : "—" },
            { key: "unit", label: t("history.unit") },
            { key: "referenceRange", label: t("history.range") },
            { key: "flag", label: t("history.flag"), render: (v) => v ? <span style={{ color: v === "normal" ? "var(--brand)" : "var(--danger)", fontWeight: 600 }}>{v}</span> : "—" },
          ]} />
        </div>
      ))}
    </div>
  );
}

function InpatientTab({ rows }) {
  const { t, i18n } = useTranslation();
  if (!rows.length) return <Empty />;
  return <Table data={rows} columns={[
    { key: "admissionRef", label: t("history.admission") },
    { key: "wardName", label: t("history.ward"), render: (v, r) => `${v} · ${t("history.bed", { n: r.bedNumber })}` },
    { key: "admittedAt", label: t("history.admitted"), render: (v) => formatDateTime(v, i18n.language) },
    { key: "dischargedAt", label: t("history.discharged"), render: (v) => v ? formatDateTime(v, i18n.language) : "—" },
    { key: "daysStayed", label: t("history.days") },
    { key: "diagnosis", label: t("history.diagnosis") },
    { key: "status", label: t("history.status"), render: (v) => <Badge status={v} /> },
  ]} />;
}

function AccountsTab({ bills, transactions, sales, showPharmacy }) {
  const { t, i18n } = useTranslation();
  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <div>
        <div style={{ ...label, marginBottom: 6 }}>{t("history.bills")}</div>
        {bills.length ? <Table data={bills} columns={[
          { key: "billNumber", label: t("history.bill") },
          { key: "createdAt", label: t("history.date"), render: (v) => formatDate(v, i18n.language) },
          { key: "totalAmount", label: t("history.total"), render: money },
          { key: "paidAmount", label: t("history.paid"), render: money },
          { key: "remainingAmount", label: t("history.remaining"), render: money },
          { key: "status", label: t("history.status"), render: (v) => <Badge status={v} /> },
        ]} /> : <Empty />}
      </div>
      <div>
        <div style={{ ...label, marginBottom: 6 }}>{t("history.payments")}</div>
        {transactions.length ? <Table data={transactions} columns={[
          { key: "txRef", label: t("history.ref") },
          { key: "createdAt", label: t("history.date"), render: (v) => formatDate(v, i18n.language) },
          { key: "amount", label: t("history.amount"), render: money },
          { key: "method", label: t("history.method") },
        ]} /> : <Empty />}
      </div>
      {showPharmacy && (
        <div>
          <div style={{ ...label, marginBottom: 6 }}>{t("history.pharmacy")}</div>
          {sales.length ? <Table data={sales} columns={[
            { key: "saleRef", label: t("history.ref") },
            { key: "createdAt", label: t("history.date"), render: (v) => formatDate(v, i18n.language) },
            { key: "items", label: t("history.items"), render: (v) => (v || []).map((i) => `${i.name?.trim()} × ${i.quantity}`).join(", ") },
            { key: "totalAmount", label: t("history.total"), render: money },
          ]} /> : <Empty />}
        </div>
      )}
    </div>
  );
}

// ── A patient's full history ──────────────────────────────────────────────────

function PatientHistory({ token, user, hospital, patientId, onBack }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("visits");
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const reload = (msg) => { setModal(null); setActionError(""); if (typeof msg === "string") setNotice(msg); setVersion((v) => v + 1); };

  useEffect(() => {
    let live = true;
    api(`/patients/${patientId}/history`, "GET", null, token)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(apiErrorMessage(e, t("common.error"))));
    return () => { live = false; };
  }, [patientId, token, t, version]);

  if (error) return <div><button style={btnG} onClick={onBack}>← {t("history.back")}</button><div style={{ ...errBox, marginTop: 16 }}>{error}</div></div>;
  if (!data) return <div style={{ padding: 40, color: "var(--text-muted)" }}>{t("common.loading")}</div>;

  const f = hospital?.features || {};
  const canClinical = ["admin", "doctor"].includes(user.role);
  const p = data.patient, s = data.summary || {};
  const tabs = [
    { key: "visits", label: t("history.tabVisits"), count: data.appointments.length, el: <VisitsTab rows={data.appointments} /> },
    { key: "records", label: t("history.tabRecords"), count: data.records.length, el: <RecordsTab rows={data.records} /> },
    f.treatmentPlans && { key: "plans", label: t("history.tabPlans"), count: data.treatmentPlans.length, el: <PlansTab rows={data.treatmentPlans} canEdit={canClinical} onNew={() => setModal({ type: "plan" })} onEdit={(plan) => setModal({ type: "plan", plan })} /> },
    f.referrals && { key: "referrals", label: t("history.tabReferrals"), count: data.referrals.length, el: <ReferralsTab rows={data.referrals} canRefer={canClinical} onNew={() => setModal({ type: "referral" })} token={token} onChanged={reload} onError={setActionError} /> },
    f.laboratory && user.role !== "receptionist" && { key: "lab", label: t("history.tabLab"), count: data.labOrders.length, el: <LabTab rows={data.labOrders} /> },
    f.inpatient && { key: "inpatient", label: t("history.tabInpatient"), count: (data.admissions || []).length, el: <InpatientTab rows={data.admissions || []} /> },
    { key: "accounts", label: t("history.tabAccounts"), count: data.bills.length, el: <AccountsTab bills={data.bills} transactions={data.transactions} sales={data.pharmacySales} showPharmacy={Boolean(f.pharmacy)} /> },
  ].filter(Boolean);
  const current = tabs.find((x) => x.key === tab) || tabs[0];

  return (
    <div>
      <button style={{ ...btnG, marginBottom: 16 }} onClick={onBack}>← {t("history.back")}</button>
      {actionError && <div role="alert" style={errBox}>{actionError}</div>}
      {notice && <div role="status" style={{ background: "var(--brand-tint-light)", color: "var(--brand-text)", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 14 }}>{notice}</div>}

      <div style={{ ...card, padding: 24, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{p.name}</h2>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          {[p.age != null && t("history.years", { n: p.age }), p.gender && t(`gender.${String(p.gender).toLowerCase()}`, p.gender)].filter(Boolean).join(" · ")}
          {p.createdAt && ` · ${t("fields.registered")} ${formatDate(p.createdAt, i18n.language)}`}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
          {[["blood", p.bloodGroup], ["phone", p.phone], ["email", p.email], ["address", p.address], ["emergency", p.emergencyContact]].map(([k, v]) => v ? (
            <div key={k}><div style={label}>{t(`history.${k}`)}</div><div style={{ fontSize: 14, color: "var(--text)" }}>{v}</div></div>
          ) : null)}
        </div>
        {p.notes && (
          <div style={{ marginTop: 16, background: "var(--warn-bg)", border: "1px solid var(--warn-border)", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ ...label, color: "var(--warn-text)" }}>{t("history.allergies")}</div>
            <div style={{ fontSize: 14, color: "var(--text)", whiteSpace: "pre-wrap" }}>{p.notes}</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label={t("history.statVisits")} value={s.totalVisits ?? 0} color="var(--info)" icon="appointments" />
        {f.treatmentPlans && <StatCard label={t("history.statPlans")} value={s.activeTreatmentPlans ?? 0} color="var(--purple)" icon="plan" />}
        <StatCard label={t("history.statBilled")} value={money(s.totalBilled)} color="var(--brand)" icon="billing" />
        <StatCard label={t("history.statPaid")} value={money(s.totalPaid)} color="var(--brand-accent)" icon="transactions" />
        <StatCard label={t("history.statOutstanding")} value={money(s.outstanding)} color={s.outstanding > 0 ? "var(--danger)" : "var(--brand)"} icon="alert" />
        {f.pharmacy && <StatCard label={t("history.statPharmacy")} value={money(s.pharmacyTotal)} color="var(--warn)" icon="pharmacy" />}
      </div>

      <div style={card}>
        <div style={{ display: "flex", gap: 4, padding: "10px 12px 0", borderBottom: "1px solid var(--brand-tint)", overflowX: "auto" }}>
          {tabs.map((x) => (
            <button key={x.key} onClick={() => setTab(x.key)} style={{
              padding: "10px 16px", border: "none", cursor: "pointer", background: "transparent", whiteSpace: "nowrap", fontFamily: "inherit", fontSize: 14,
              fontWeight: current.key === x.key ? 700 : 500, color: current.key === x.key ? "var(--brand-text-strong)" : "var(--text-muted)",
              borderBottom: current.key === x.key ? "3px solid var(--brand)" : "3px solid transparent",
            }}>{x.label} <span style={{ fontSize: 11, background: "var(--brand-tint-light)", borderRadius: 10, padding: "1px 7px", marginInlineStart: 4 }}>{x.count}</span></button>
          ))}
        </div>
        {current.el}
      </div>
      {modal?.type === "plan" && <PlanModal token={token} user={user} patient={p} plan={modal.plan} onClose={() => setModal(null)} onDone={reload} />}
      {modal?.type === "referral" && <ReferralModal token={token} user={user} patient={p} onClose={() => setModal(null)} onDone={reload} />}
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────

export default function FindPatient({ token, user, hospital }) {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const LIMIT = 50;

  const run = useCallback(async (query) => {
    try {
      const list = await api(`/patients${query ? `?q=${encodeURIComponent(query)}` : ""}`, "GET", null, token);
      setRows(list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
      setError("");
    } catch (e) { setError(apiErrorMessage(e, t("common.error"))); }
  }, [token, t]);

  // Search as you type, but wait a moment after the last keystroke.
  useEffect(() => {
    const id = setTimeout(() => run(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q, run]);

  if (selected) return <PatientHistory token={token} user={user} hospital={hospital} patientId={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("history.title")}</h2>
      <div style={{ position: "relative", maxWidth: 520, marginBottom: 20 }}>
        <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }}><Icon name="search" size={16} /></span>
        <input autoFocus style={{ ...inp, paddingInlineStart: 38, padding: "13px 14px 13px 38px", fontSize: 15 }} placeholder={t("history.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <div style={errBox}>{error}</div>}
      {!error && rows && (
        <div style={card}>
          {rows.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>{t("history.noMatch")}</div> : (
            <Table data={rows.slice(0, LIMIT)} columns={[
              { key: "name", label: t("fields.fullName"), render: (v) => <b>{v}</b> },
              { key: "age", label: t("fields.age") },
              { key: "gender", label: t("fields.gender"), render: (v) => v ? t(`gender.${String(v).toLowerCase()}`, v) : "—" },
              { key: "phone", label: t("fields.phone") },
              { key: "createdAt", label: t("fields.registered"), render: (v) => formatDate(v, i18n.language) },
            ]} actions={(row) => [<button key="o" style={btnG} onClick={() => setSelected(row.id)}>{t("history.open")} →</button>]} />
          )}
          {rows.length > LIMIT && <div style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-faint)", borderTop: "1px solid var(--brand-tint)" }}>{t("history.showing", { n: LIMIT })}</div>}
        </div>
      )}
      {!rows && !error && <div style={{ padding: 40, color: "var(--text-muted)" }}>{t("common.loading")}</div>}
    </div>
  );
}
