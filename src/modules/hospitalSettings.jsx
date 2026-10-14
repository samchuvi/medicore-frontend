// Hospital settings for the hospital's own administrator: currency and the
// list of departments that staff and doctors choose from.
// Backend: GET /session, PUT /hospital/settings.
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, Icon, Field, inp, btnP, btnG, LoadingButton, toast, CURRENCY_INFO, setCurrency, clearOptionsCache, setPayCurrencies, rateView, rateToStored } from "../shared";

const card = { background: "var(--surface)", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", maxWidth: 640 };

export default function HospitalSettings({ token, hospital, onHospitalChanged }) {
  const { t } = useTranslation();
  const [currency, setCur] = useState(hospital?.currency || "UGX");
  const [departments, setDepartments] = useState(hospital?.settings?.departments || []);
  const [extra, setExtra] = useState(hospital?.settings?.exchangeRates ? Object.keys(hospital.settings.exchangeRates) : []);
  const typedFrom = (base, er) => Object.fromEntries(Object.entries(er || {}).map(([k, v]) => [k, String(rateView(base, k, v).value)]));
  const [rates, setRates] = useState(() => typedFrom(hospital?.currency || "UGX", hospital?.settings?.exchangeRates));
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/session", "GET", null, token).then((s) => {
      if (s?.hospital) {
        setCur(s.hospital.currency || "UGX"); setDepartments(s.hospital.settings?.departments || []);
        const er = s.hospital.settings?.exchangeRates || {};
        setExtra(Object.keys(er)); setRates(typedFrom(s.hospital.currency || "UGX", er));
      }
    }).catch(() => {});
  }, [token]);

  const add = () => {
    const d = draft.trim();
    if (!d) return;
    if (departments.some((x) => x.toLowerCase() === d.toLowerCase())) { setDraft(""); return; }
    setDepartments([...departments, d]); setDraft("");
  };

  const changeBase = (c) => { setCur(c); setExtra((x) => x.filter((k) => k !== c)); setRates({}); };
  const toggle = (c) => setExtra((x) => (x.includes(c) ? x.filter((k) => k !== c) : [...x, c]));

  const save = async () => {
    setErr("");
    for (const c of extra) {
      if (!(rateToStored(currency, c, rates[c]) > 0)) { setErr(t("hset.rateErr", { code: c })); return false; }
    }
    try {
      const exchangeRates = Object.fromEntries(extra.map((c) => [c, rateToStored(currency, c, rates[c])]));
      const r = await api("/hospital/settings", "PUT", { currency, departments, acceptedCurrencies: extra, exchangeRates }, token);
      setCurrency(r.currency); setPayCurrencies(r.settings); clearOptionsCache();
      onHospitalChanged?.({ currency: r.currency, settings: r.settings });
      toast.success(t("hset.saved"));
    } catch (e) { setErr(apiErrorMessage(e, t("common.error"))); return false; }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("hset.title")}</h2>
      <div style={card}>
        <Field label={t("hset.currency")}>
          <select style={inp} value={currency} onChange={(e) => changeBase(e.target.value)} aria-label={t("hset.currency")}>
            {Object.keys(CURRENCY_INFO).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{t("hset.currencyHint")}</div>
        </Field>
        <Field label={t("hset.accepted")}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>{t("hset.acceptedHint")}</div>
          {Object.keys(CURRENCY_INFO).filter((c) => c !== currency).map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 80, fontWeight: 600 }}>
                <input type="checkbox" checked={extra.includes(c)} onChange={() => toggle(c)} aria-label={c} /> {c}
              </label>
              {extra.includes(c) && (() => { const v = rateView(currency, c, null); return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  {t("hset.rateLabel", { base: v.strong })}
                  <input style={{ ...inp, width: 130 }} type="number" min="0" step="any" value={rates[c] || ""} aria-label={`${t("hset.rateLabel", { base: v.strong })} ${v.weak}`} onChange={(e) => setRates({ ...rates, [c]: e.target.value })} />
                  {v.weak}
                </span>); })()}
            </div>
          ))}
        </Field>
        <Field label={t("hset.departments")}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>{t("hset.departmentsHint")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {departments.map((d) => (
              <span key={d} style={{ background: "var(--brand-tint-light)", color: "var(--brand-text)", borderRadius: 20, padding: "5px 6px 5px 12px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                {d}
                <button type="button" aria-label={`${t("hset.remove")} ${d}`} onClick={() => setDepartments(departments.filter((x) => x !== d))} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--danger)", fontSize: 16, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={inp} value={draft} placeholder={t("hset.deptPlaceholder")} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <button type="button" style={btnG} onClick={add}><Icon name="plus" size={14} /> {t("hset.addDept")}</button>
          </div>
        </Field>
        {err && <div role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <LoadingButton style={btnP} busyLabel={t("hset.saving")} onClick={save}><Icon name="check" size={16} /> {t("hset.save")}</LoadingButton>
      </div>
    </div>
  );
}
