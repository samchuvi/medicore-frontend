// Platform owner only: the system's own name, colour and logo — what the login page
// (and the platform owner's own screens) show. Hospitals keep their own look, set on
// the Hospitals screen. Backend: PUT /platform (read is public: /public/platform).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, addTranslations, shrinkImage, Icon, Field, inp, btnP, btnE, btnG, LoadingButton } from "../shared";
import { usePlatform, setPlatform } from "../platform";
import { buildPalette } from "../theme";
import { PLATFORM_NAME, PLATFORM_COLOR } from "../config";

addTranslations({
  en: { nav: { platform: "Platform settings" }, plat: {
    title: "Platform settings", hint: "How your system looks on the login page and in your own platform-owner screens. Each hospital still has its own logo and colour (Hospitals → Logo & colour).",
    name: "System name", color: "Login page & platform colour", logo: "Logo (shown on the login page)", chooseLogo: "Choose logo", removeLogo: "Remove logo",
    preview: "Preview of the login page", save: "Save", saving: "Saving…", saved: "Saved. The login page now looks like this.", reset: "Back to default",
    errImage: "Please choose a normal picture file (PNG, JPG…) that is not huge.", errName: "Enter a system name", signIn: "Sign In", hospitalCode: "Hospital code", username: "Username",
  } },
  fr: { nav: { platform: "Paramètres de la plateforme" }, plat: {
    title: "Paramètres de la plateforme", hint: "L'apparence de votre système sur la page de connexion et dans vos écrans de propriétaire. Chaque hôpital garde son logo et sa couleur (Hôpitaux → Logo et couleur).",
    name: "Nom du système", color: "Couleur de la page de connexion et de la plateforme", logo: "Logo (affiché sur la page de connexion)", chooseLogo: "Choisir un logo", removeLogo: "Retirer le logo",
    preview: "Aperçu de la page de connexion", save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré. La page de connexion ressemble maintenant à ceci.", reset: "Valeurs par défaut",
    errImage: "Choisissez un fichier image normal (PNG, JPG…) de taille raisonnable.", errName: "Saisissez un nom de système", signIn: "Se connecter", hospitalCode: "Code de l'hôpital", username: "Nom d'utilisateur",
  } },
  ar: { nav: { platform: "إعدادات المنصة" }, plat: {
    title: "إعدادات المنصة", hint: "مظهر نظامك في صفحة الدخول وفي شاشات مالك المنصة. يحتفظ كل مستشفى بشعاره ولونه (المستشفيات ← الشعار واللون).",
    name: "اسم النظام", color: "لون صفحة الدخول والمنصة", logo: "الشعار (يظهر في صفحة الدخول)", chooseLogo: "اختيار شعار", removeLogo: "إزالة الشعار",
    preview: "معاينة صفحة الدخول", save: "حفظ", saving: "جارٍ الحفظ…", saved: "تم الحفظ. تبدو صفحة الدخول الآن هكذا.", reset: "العودة للافتراضي",
    errImage: "اختر ملف صورة عاديًا (PNG أو JPG…) وليس كبيرًا جدًا.", errName: "أدخل اسم النظام", signIn: "تسجيل الدخول", hospitalCode: "رمز المستشفى", username: "اسم المستخدم",
  } },
});

export default function PlatformSettings({ token }) {
  const { t } = useTranslation();
  const current = usePlatform();
  const [name, setName] = useState(current.name);
  const [color, setColor] = useState(current.color);
  const [logo, setLogo] = useState(current.logo);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [, setBusy] = useState(false);
  const pal = buildPalette(color);

  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr(t("plat.errImage"));
    try { setLogo(await shrinkImage(file)); setErr(""); setOk(""); } catch { setErr(t("plat.errImage")); }
  };
  const save = async () => {
    if (!name.trim()) return setErr(t("plat.errName"));
    setBusy(true); setErr(""); setOk("");
    try {
      const r = await api("/platform", "PUT", { name: name.trim(), color, logo }, token);
      setPlatform(r); setOk(t("plat.saved"));
    } catch (e) { setErr(apiErrorMessage(e)); }
    setBusy(false);
  };
  const reset = () => { setName(PLATFORM_NAME); setColor(PLATFORM_COLOR); setLogo(""); setOk(""); };

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("plat.title")}</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)", maxWidth: 640 }}>{t("plat.hint")}</p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, flex: "1 1 340px", maxWidth: 480, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)" }}>
          <Field label={t("plat.name")}><input style={inp} value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setOk(""); }} /></Field>
          <Field label={t("plat.color")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={color} onChange={(e) => { setColor(e.target.value.toUpperCase()); setOk(""); }} style={{ width: 52, height: 40, border: "none", background: "none", cursor: "pointer" }} />
              <b style={{ fontSize: 13, color: "var(--text-muted)" }}>{color}</b>
            </div>
          </Field>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("plat.logo")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, background: logo ? "var(--neutral-bg)" : color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 32 }}>
              {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🏥"}
            </div>
            <label style={{ ...btnE, cursor: "pointer" }}><Icon name="plus" size={14} /> {t("plat.chooseLogo")}<input type="file" accept="image/*" onChange={pick} style={{ display: "none" }} /></label>
            {logo && <button type="button" style={btnG} onClick={() => { setLogo(""); setOk(""); }}>{t("plat.removeLogo")}</button>}
          </div>
          {err && <div role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          {ok && <div role="status" style={{ background: "var(--brand-tint-light)", color: "var(--brand-text)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{ok}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <LoadingButton style={btnP} busyLabel={t("plat.saving")} onClick={save}><Icon name="check" size={16} /> {t("plat.save")}</LoadingButton>
            <button style={btnG} onClick={reset}>{t("plat.reset")}</button>
          </div>
        </div>

        <div style={{ flex: "1 1 300px", maxWidth: 420 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("plat.preview")}</div>
          <div style={{ borderRadius: 16, padding: 28, background: `linear-gradient(135deg,${pal["--brand-dark"]} 0%,${pal["--brand"]} 50%,var(--info) 100%)` }}>
            <div style={{ background: "var(--surface)", borderRadius: 18, padding: 24, textAlign: "center" }}>
              <div style={{ width: logo ? 72 : 52, height: logo ? 72 : 52, margin: "0 auto 10px", borderRadius: 16, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: logo ? "transparent" : `linear-gradient(135deg,${pal["--brand"]},var(--info))` }}>
                {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🏥"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>{name || "…"}</div>
              {[t("plat.hospitalCode"), t("plat.username")].map((l) => <div key={l} style={{ border: "1px solid " + pal["--brand-tint"], borderRadius: 10, padding: "9px 12px", fontSize: 12, color: "var(--text-faint)", textAlign: "start", marginBottom: 8 }}>{l}</div>)}
              <div style={{ background: `linear-gradient(135deg,${pal["--brand"]},${pal["--brand-dark"]})`, color: "#fff", borderRadius: 10, padding: 10, fontWeight: 700, fontSize: 13 }}>{t("plat.signIn")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
