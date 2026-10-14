// Platform owner screen: every hospital on the platform in one place.
// Add a hospital (with its first admin), switch its features on/off, suspend or
// resume it (e.g. non-payment), and copy its login link.
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PLATFORM_COLOR } from "../config";
import { effectiveColor } from "../theme";
import { shrinkImage, api, apiErrorMessage, withErr, formatDate, addTranslations, Icon, Modal, Field, inp, btnP, btnD, btnE, btnG, Badge, formatMoney, LoadingButton, toast, CURRENCY_INFO } from "../shared";

// The feature switches a hospital can have. To offer a new one, add its key here
// and a label under hospitals.feat.<key> in the translations below.
const FEATURES = ["pharmacy", "billing", "laboratory", "inpatient", "treatmentPlans", "referrals"];

const money = (n, c) => formatMoney(n, c);

addTranslations({
  en: {
    nav: { hospitals: "Hospitals" },
    status: { suspended: "Suspended" },
    hospitals: {
      title: "Hospitals on the platform",
      add: "Add hospital",
      none: "No hospitals yet",
      code: "Code", codeHint: "Letters, numbers and dashes only — staff type this to log in (e.g. byarwanga)",
      name: "Hospital name", color: "Brand colour",
      adminSection: "First administrator", adminName: "Admin full name", adminUsername: "Admin username", adminPassword: "Admin password (min. 6 characters)",
      create: "Create hospital", creating: "Creating…",
      patients: "Patients", users: "Staff accounts", revenue: "Revenue", pharmacy: "…of which pharmacy", lowStock: "Low stock", pendingBills: "Pending bills", since: "Since",
      suspend: "Suspend", resume: "Resume", features: "Features", addAdmin: "Add admin", copyLink: "Copy login link", linkCopied: "Link copied",
      confirmSuspendTitle: "Suspend {{name}}?",
      confirmSuspendText: "Every staff member of this hospital is locked out immediately, even if they are logged in. Their data is kept.",
      confirmResumeTitle: "Resume {{name}}?",
      confirmResumeText: "Staff can log in and work again straight away.",
      confirm: "Yes, continue", cancel: "Cancel", save: "Save",
      featuresTitle: "Features — {{name}}", featuresHint: "Switch on only what this hospital needs. The menu updates for them the next time they open the app.",
      addAdminTitle: "Add administrator — {{name}}", adminAdded: "Administrator added",
      errName: "Hospital name is required", errCode: "Code: use lowercase letters, numbers and dashes only", errAdmin: "Admin username and a password of at least 6 characters are required",
      partial: "The hospital was created, but its administrator could not be: {{message}}. Use “Add admin” on its card.",
      feat: { pharmacy: "Pharmacy", billing: "Billing & payments", laboratory: "Laboratory", inpatient: "Inpatient (wards & beds)", treatmentPlans: "Treatment plans", referrals: "Referrals" },
    },
  },
  fr: {
    nav: { hospitals: "Hôpitaux" },
    status: { suspended: "Suspendu" },
    hospitals: {
      title: "Hôpitaux de la plateforme",
      add: "Ajouter un hôpital",
      none: "Aucun hôpital pour le moment",
      code: "Code", codeHint: "Lettres, chiffres et tirets uniquement — le personnel le saisit pour se connecter (ex. byarwanga)",
      name: "Nom de l'hôpital", color: "Couleur de la marque",
      adminSection: "Premier administrateur", adminName: "Nom complet de l'administrateur", adminUsername: "Identifiant de l'administrateur", adminPassword: "Mot de passe de l'administrateur (6 caractères min.)",
      create: "Créer l'hôpital", creating: "Création…",
      patients: "Patients", users: "Comptes du personnel", revenue: "Revenus", pharmacy: "…dont pharmacie", lowStock: "Stock faible", pendingBills: "Factures en attente", since: "Depuis",
      suspend: "Suspendre", resume: "Rétablir", features: "Fonctionnalités", addAdmin: "Ajouter un admin", copyLink: "Copier le lien de connexion", linkCopied: "Lien copié",
      confirmSuspendTitle: "Suspendre {{name}} ?",
      confirmSuspendText: "Tout le personnel de cet hôpital est immédiatement déconnecté, même s'il est connecté. Ses données sont conservées.",
      confirmResumeTitle: "Rétablir {{name}} ?",
      confirmResumeText: "Le personnel peut se reconnecter et travailler immédiatement.",
      confirm: "Oui, continuer", cancel: "Annuler", save: "Enregistrer",
      featuresTitle: "Fonctionnalités — {{name}}", featuresHint: "Activez uniquement ce dont cet hôpital a besoin. Le menu est mis à jour à sa prochaine ouverture de l'application.",
      addAdminTitle: "Ajouter un administrateur — {{name}}", adminAdded: "Administrateur ajouté",
      errName: "Le nom de l'hôpital est obligatoire", errCode: "Code : utilisez uniquement des minuscules, des chiffres et des tirets", errAdmin: "Un identifiant et un mot de passe d'au moins 6 caractères sont requis",
      partial: "L'hôpital a été créé, mais son administrateur n'a pas pu l'être : {{message}}. Utilisez « Ajouter un admin » sur sa carte.",
      feat: { pharmacy: "Pharmacie", billing: "Facturation et paiements", laboratory: "Laboratoire", inpatient: "Hospitalisation (services et lits)", treatmentPlans: "Plans de traitement", referrals: "Références" },
    },
  },
  ar: {
    nav: { hospitals: "المستشفيات" },
    status: { suspended: "موقوف" },
    hospitals: {
      title: "المستشفيات على المنصة",
      add: "إضافة مستشفى",
      none: "لا توجد مستشفيات بعد",
      code: "الرمز", codeHint: "أحرف وأرقام وشرطات فقط — يكتبه الموظفون لتسجيل الدخول (مثل byarwanga)",
      name: "اسم المستشفى", color: "لون الهوية",
      adminSection: "المسؤول الأول", adminName: "الاسم الكامل للمسؤول", adminUsername: "اسم مستخدم المسؤول", adminPassword: "كلمة مرور المسؤول (6 أحرف على الأقل)",
      create: "إنشاء المستشفى", creating: "جارٍ الإنشاء…",
      patients: "المرضى", users: "حسابات الموظفين", revenue: "الإيرادات", pharmacy: "…منها الصيدلية", lowStock: "مخزون منخفض", pendingBills: "فواتير معلقة", since: "منذ",
      suspend: "إيقاف", resume: "استئناف", features: "الميزات", addAdmin: "إضافة مسؤول", copyLink: "نسخ رابط الدخول", linkCopied: "تم نسخ الرابط",
      confirmSuspendTitle: "إيقاف {{name}}؟",
      confirmSuspendText: "سيتم إخراج جميع موظفي هذا المستشفى فورًا حتى لو كانوا مسجلين الدخول. تبقى بياناتهم محفوظة.",
      confirmResumeTitle: "استئناف {{name}}؟",
      confirmResumeText: "يمكن للموظفين تسجيل الدخول والعمل مجددًا على الفور.",
      confirm: "نعم، متابعة", cancel: "إلغاء", save: "حفظ",
      featuresTitle: "الميزات — {{name}}", featuresHint: "فعّل فقط ما يحتاجه هذا المستشفى. تتحدث القائمة لديهم عند فتح التطبيق في المرة القادمة.",
      addAdminTitle: "إضافة مسؤول — {{name}}", adminAdded: "تمت إضافة المسؤول",
      errName: "اسم المستشفى مطلوب", errCode: "الرمز: استخدم أحرفًا صغيرة وأرقامًا وشرطات فقط", errAdmin: "اسم المستخدم وكلمة مرور من 6 أحرف على الأقل مطلوبان",
      partial: "تم إنشاء المستشفى لكن تعذر إنشاء مسؤوله: {{message}}. استخدم «إضافة مسؤول» في بطاقته.",
      feat: { pharmacy: "الصيدلية", billing: "الفواتير والمدفوعات", laboratory: "المختبر", inpatient: "التنويم (الأجنحة والأسرّة)", treatmentPlans: "خطط العلاج", referrals: "الإحالات" },
    },
  },
});

const COUNTRY_CURRENCY = { UG: "UGX", CD: "CDF", KE: "KES", TZ: "TZS", RW: "RWF", BI: "BIF", SS: "USD", OTHER: "USD" };
const COUNTRIES = Object.keys(COUNTRY_CURRENCY);
const CurrencySelect = ({ value, onChange, label }) => (
  <select style={inp} value={value} aria-label={label} onChange={onChange}>
    {Object.keys(CURRENCY_INFO).map((c) => <option key={c} value={c}>{c}</option>)}
  </select>
);

const errBox = { background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 8, padding: "10px 14px", color: "var(--danger)", fontSize: 13, marginBottom: 16 };

function CreateHospitalModal({ token, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: "", slug: "", color: PLATFORM_COLOR, adminName: "", adminUsername: "", adminPassword: "", country: "UG", currency: "UGX" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    const slug = f.slug.trim().toLowerCase();
    if (!f.name.trim()) return setErr(t("hospitals.errName"));
    if (!/^[a-z0-9-]+$/.test(slug)) return setErr(t("hospitals.errCode"));
    if (!f.adminUsername.trim() || f.adminPassword.length < 8) return setErr(t("hospitals.errAdmin"));
    setErr("");
    let hospital;
    try {
      hospital = await api("/hospitals", "POST", { name: f.name.trim(), slug, country: f.country, currency: f.currency, theme: { primaryColor: f.color } }, token);
    } catch (e) { setErr(apiErrorMessage(e, t("common.error"))); return false; }
    try {
      await api(`/hospitals/${hospital.id}/admin`, "POST", { name: f.adminName.trim() || undefined, username: f.adminUsername.trim(), password: f.adminPassword }, token);
      onDone();
    } catch (e) {
      // The hospital exists; only its first admin failed. Say so clearly.
      toast.error(t("hospitals.partial", { message: apiErrorMessage(e, t("common.error")) }));
      onDone();
    }
  };

  return (
    <Modal title={t("hospitals.add")} onClose={onClose}>
      {err && <div style={errBox}>{err}</div>}
      <Field label={t("hospitals.name")}><input style={inp} value={f.name} onChange={set("name")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
        <Field label={t("hospitals.code")}>
          <input style={inp} value={f.slug} autoCapitalize="none" spellCheck={false} onChange={set("slug")} />
        </Field>
        <Field label={t("hospitals.color")}><input style={{ ...inp, padding: 4, height: 42 }} type="color" value={f.color} onChange={set("color")} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", margin: "-8px 0 16px" }}>{t("hospitals.codeHint")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("hospitals.country")}>
          <select style={inp} value={f.country} onChange={(e) => setF((x) => ({ ...x, country: e.target.value, currency: COUNTRY_CURRENCY[e.target.value] || x.currency }))}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{t(`hospitals.countries.${c}`)}</option>)}
          </select>
        </Field>
        <Field label={t("hospitals.currency")}><CurrencySelect value={f.currency} onChange={set("currency")} label={t("hospitals.currency")} /></Field>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-text-strong)", margin: "8px 0 12px" }}>{t("hospitals.adminSection")}</div>
      <Field label={t("hospitals.adminName")}><input style={inp} value={f.adminName} onChange={set("adminName")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("hospitals.adminUsername")}><input style={inp} value={f.adminUsername} autoCapitalize="none" onChange={set("adminUsername")} /></Field>
        <Field label={t("hospitals.adminPassword")}><input style={inp} type="password" value={f.adminPassword} onChange={set("adminPassword")} /></Field>
      </div>
      <LoadingButton style={{ ...btnP, marginTop: 8 }} busyLabel={t("hospitals.creating")} onClick={save}>
        <Icon name="plus" size={16} /> {t("hospitals.create")}
      </LoadingButton>
    </Modal>
  );
}

function FeaturesModal({ token, hospital, onClose, onDone }) {
  const { t } = useTranslation();
  const [on, setOn] = useState(() => Object.fromEntries(FEATURES.map((k) => [k, Boolean(hospital.features?.[k])])));
  const [currency, setCur] = useState(hospital.currency || "UGX");
  const save = async () => {
    // Only the switches are sent; the backend merges them, so other settings stay untouched.
    const ok = await withErr(() => api(`/hospitals/${hospital.id}`, "PUT", { features: on, currency }, token), t("hospitals.savedOk"));
    if (ok) onDone(); else return false;
  };
  return (
    <Modal title={t("hospitals.featuresTitle", { name: hospital.name })} onClose={onClose}>
      <Field label={t("hospitals.currency")}><CurrencySelect value={currency} onChange={(e) => setCur(e.target.value)} label={t("hospitals.currency")} /></Field>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>{t("hospitals.featuresHint")}</p>
      {FEATURES.map((k) => (
        <label key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", border: "1px solid var(--brand-tint)", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: on[k] ? "var(--brand-tint-light)" : "#fff" }}>
          <input type="checkbox" checked={on[k]} onChange={(e) => setOn((x) => ({ ...x, [k]: e.target.checked }))} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{t(`hospitals.feat.${k}`)}</span>
        </label>
      ))}
      <LoadingButton style={{ ...btnP, marginTop: 12 }} busyLabel={t("hospitals.saving")} onClick={save}><Icon name="check" size={16} /> {t("hospitals.save")}</LoadingButton>
    </Modal>
  );
}

function BrandingModal({ token, hospital, onClose, onDone }) {
  const { t } = useTranslation();
  const [logo, setLogo] = useState(hospital.logo || "");
  const [color, setColor] = useState(effectiveColor(hospital.theme?.primaryColor));
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr(t("hospitals.errImage"));
    try { setLogo(await shrinkImage(file)); setErr(""); } catch { setErr(t("hospitals.errImage")); }
  };
  const save = async () => {
    const ok = await withErr(() => api(`/hospitals/${hospital.id}`, "PUT", { logo, theme: { primaryColor: color } }, token), t("hospitals.savedOk"));
    if (ok) onDone(); else return false;
  };
  return (
    <Modal title={t("hospitals.brandingTitle", { name: hospital.name })} onClose={onClose}>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>{t("hospitals.brandingHint")}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: 18, background: color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 38 }}>
          {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🏥"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ ...btnE, cursor: "pointer" }}>
            <Icon name="plus" size={14} /> {t("hospitals.chooseLogo")}
            <input type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
          </label>
          {logo && <button type="button" style={btnG} onClick={() => setLogo("")}>{t("hospitals.removeLogo")}</button>}
        </div>
      </div>
      <Field label={t("hospitals.color")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} style={{ width: 52, height: 40, border: "none", background: "none", cursor: "pointer" }} />
          <b style={{ fontSize: 13, color: "var(--text-muted)" }}>{color}</b>
        </div>
      </Field>
      {err && <div role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 10, fontSize: 13, margin: "8px 0" }}>{err}</div>}
      <LoadingButton style={{ ...btnP, marginTop: 12 }} busyLabel={t("hospitals.saving")} onClick={save}><Icon name="check" size={16} /> {t("hospitals.save")}</LoadingButton>
    </Modal>
  );
}

function AddAdminModal({ token, hospital, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: "", username: "", password: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    if (!f.username.trim() || f.password.length < 8) return setErr(t("hospitals.errAdmin"));
    setErr("");
    try {
      await api(`/hospitals/${hospital.id}/admin`, "POST", { name: f.name.trim() || undefined, username: f.username.trim(), password: f.password }, token);
      toast.success(t("hospitals.savedOk"));
      onDone();
    } catch (e) { setErr(apiErrorMessage(e, t("common.error"))); return false; }
  };
  return (
    <Modal title={t("hospitals.addAdminTitle", { name: hospital.name })} onClose={onClose}>
      {err && <div style={errBox}>{err}</div>}
      <Field label={t("hospitals.adminName")}><input style={inp} value={f.name} onChange={set("name")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("hospitals.adminUsername")}><input style={inp} value={f.username} autoCapitalize="none" onChange={set("username")} /></Field>
        <Field label={t("hospitals.adminPassword")}><input style={inp} type="password" value={f.password} onChange={set("password")} /></Field>
      </div>
      <LoadingButton style={{ ...btnP, marginTop: 8 }} busyLabel={t("hospitals.saving")} onClick={save}><Icon name="plus" size={16} /> {t("hospitals.addAdmin")}</LoadingButton>
    </Modal>
  );
}

function ConfirmModal({ hospital, onClose, onConfirm }) {
  const { t } = useTranslation();
  const suspending = hospital.status !== "suspended";
  return (
    <Modal title={t(suspending ? "hospitals.confirmSuspendTitle" : "hospitals.confirmResumeTitle", { name: hospital.name })} onClose={onClose}>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{t(suspending ? "hospitals.confirmSuspendText" : "hospitals.confirmResumeText")}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <LoadingButton style={suspending ? { ...btnD, padding: "11px 24px", fontSize: 14 } : { ...btnP }} busyLabel={t("hospitals.saving")} onClick={onConfirm}>{t("hospitals.confirm")}</LoadingButton>
        <button style={{ ...btnG, padding: "11px 24px", fontSize: 14 }} onClick={onClose}>{t("hospitals.cancel")}</button>
      </div>
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

export default function Hospitals({ token }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { type: "create" | "features" | "admin" | "confirm", h? }
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try { setRows(await api("/hospitals/overview", "GET", null, token)); setError(""); }
    catch (e) { setError(apiErrorMessage(e, t("common.error"))); }
  }, [token, t]);
  useEffect(() => { load(); }, [load]);

  const done = () => { setModal(null); load(); };

  const toggleStatus = async (h) => {
    const action = h.status === "suspended" ? "resume" : "suspend";
    const ok = await withErr(() => api(`/hospitals/${h.id}/${action}`, "POST", {}, token));
    if (ok) done();
  };

  const copyLink = async (h) => {
    const link = `${window.location.origin}/?hospital=${h.slug}`;
    try { await navigator.clipboard.writeText(link); setCopied(h.id); setTimeout(() => setCopied(""), 2000); }
    catch { window.prompt(t("hospitals.copyLink"), link); }
  };

  if (error) return <div style={{ ...errBox, margin: 0 }}>{error}</div>;
  if (!rows) return <div style={{ padding: 40, color: "var(--text-muted)" }}>{t("common.loading")}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("hospitals.title")}</h2>
        <button style={btnP} onClick={() => setModal({ type: "create" })}><Icon name="plus" size={16} /> {t("hospitals.add")}</button>
      </div>

      {rows.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>{t("hospitals.none")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 16 }}>
        {rows.map((h) => {
          const suspended = h.status === "suspended";
          return (
            <div key={h.id} style={{ background: "var(--surface)", borderRadius: 16, padding: 22, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", borderInlineStart: `4px solid ${suspended ? "var(--danger)" : "var(--brand)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: effectiveColor(h.theme?.primaryColor), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 22, flexShrink: 0 }}>
                    {h.logo ? <img src={h.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🏥"}
                  </div>
                  <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{t("hospitals.code")}: <b>{h.slug}</b> · <b>{h.currency || "UGX"}</b> · {t("hospitals.since")} {formatDate(h.createdAt, i18n.language)}</div>
                  </div>
                </div>
                <Badge status={h.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                <Stat label={t("hospitals.patients")} value={h.totalPatients} />
                <Stat label={t("hospitals.users")} value={h.totalUsers} />
                <Stat label={t("hospitals.pendingBills")} value={h.pendingBills} />
                <Stat label={t("hospitals.revenue")} value={money(h.totalRevenue, h.currency)} />
                <Stat label={t("hospitals.pharmacy")} value={money(h.pharmacyRevenue, h.currency)} />
                <Stat label={t("hospitals.lowStock")} value={h.lowStockItems} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {FEATURES.filter((k) => h.features?.[k]).map((k) => (
                  <span key={k} style={{ background: "var(--brand-tint-light)", color: "var(--brand-text)", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{t(`hospitals.feat.${k}`)}</span>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button style={suspended ? btnG : btnD} onClick={() => setModal({ type: "confirm", h })}>
                  <Icon name={suspended ? "play" : "pause"} size={14} /> {t(suspended ? "hospitals.resume" : "hospitals.suspend")}
                </button>
                <button style={btnE} onClick={() => setModal({ type: "features", h })}><Icon name="edit" size={14} /> {t("hospitals.features")}</button>
                <button style={btnG} onClick={() => setModal({ type: "branding", h })}><Icon name="edit" size={14} /> {t("hospitals.branding")}</button>
                <button style={btnG} onClick={() => setModal({ type: "admin", h })}><Icon name="users" size={14} /> {t("hospitals.addAdmin")}</button>
                <button style={btnG} onClick={() => copyLink(h)}><Icon name="check" size={14} /> {copied === h.id ? t("hospitals.linkCopied") : t("hospitals.copyLink")}</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal?.type === "create" && <CreateHospitalModal token={token} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "features" && <FeaturesModal token={token} hospital={modal.h} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "branding" && <BrandingModal token={token} hospital={modal.h} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "admin" && <AddAdminModal token={token} hospital={modal.h} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "confirm" && <ConfirmModal hospital={modal.h} onClose={() => setModal(null)} onConfirm={async () => { await toggleStatus(modal.h); }} />}
    </div>
  );
}

addTranslations({
  en: { hospitals: { branding: "Logo & colour", brandingTitle: "Logo & colour — {{name}}", brandingHint: "The logo and colour appear in this hospital's menu once its staff sign in. Any picture works; it is shrunk automatically.", chooseLogo: "Choose logo", removeLogo: "Remove logo", errImage: "Please choose a normal picture file (PNG, JPG…) that is not huge." } },
  fr: { hospitals: { branding: "Logo et couleur", brandingTitle: "Logo et couleur — {{name}}", brandingHint: "Le logo et la couleur apparaissent dans le menu de cet hôpital après la connexion du personnel. Toute image convient ; elle est réduite automatiquement.", chooseLogo: "Choisir un logo", removeLogo: "Retirer le logo", errImage: "Choisissez un fichier image normal (PNG, JPG…) de taille raisonnable." } },
  ar: { hospitals: { branding: "الشعار واللون", brandingTitle: "الشعار واللون — {{name}}", brandingHint: "يظهر الشعار واللون في قائمة هذا المستشفى بعد تسجيل دخول موظفيه. أي صورة تصلح؛ يتم تصغيرها تلقائيًا.", chooseLogo: "اختيار شعار", removeLogo: "إزالة الشعار", errImage: "اختر ملف صورة عاديًا (PNG أو JPG…) وليس كبيرًا جدًا." } },
});
