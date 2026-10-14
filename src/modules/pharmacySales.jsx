// Pharmacy sales: sell medicines over the counter (stock goes down automatically)
// and review past sales. Backend: POST/GET /pharmacy-sales, GET /inventory.
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api, apiErrorMessage, formatDateTime, addTranslations, Icon, Modal, Field, inp, btnP, btnG, StatCard, Table, formatMoney, LoadingButton } from "../shared";

const money = (n, c) => formatMoney(n, c);
const card = { background: "var(--surface)", borderRadius: 16, boxShadow: "0 2px 12px color-mix(in srgb, var(--brand) 8%, transparent)", overflow: "hidden" };

addTranslations({
  en: {
    nav: { pharmacySales: "Pharmacy Sales" },
    psales: {
      title: "Pharmacy Sales", newSale: "New sale", today: "Today", todayCount: "Sales today", todayTotal: "Today's total", rangeTotal: "Total in range",
      from: "From", to: "To", filter: "Filter", clear: "Clear",
      ref: "Sale #", date: "Date", patient: "Patient", items: "Items", total: "Total", soldBy: "Sold by", none: "No sales in this period",
      patientName: "Patient name (optional)", notes: "Notes (optional)", addMedicine: "Add medicine", chooseMedicine: "Choose a medicine…",
      inStock: "in stock", qty: "Qty", line: "Amount", remove: "Remove", noStock: "Out of stock", confirmSale: "Complete sale", saving: "Saving…",
      errNone: "Add at least one medicine", errQty: "Check the quantities — each must be 1 or more and not above the stock",
      done: "Sale recorded. Stock updated.", details: "Sale details", close: "Close", unitPrice: "Unit price",
      customer: "Customer", walkIn: "Walk-in customer", registered: "Registered patient", searchPatient: "Search patient by name or phone…",
      changePatient: "Change", noPatientFound: "No matching patient", errPatient: "Choose the patient this sale is for",
      walkInTag: "Walk-in", patientTag: "Patient", linkSetting: "Link sales to patient records", linkOff: "Off — just type a name", linkOptional: "Optional — walk-ins allowed", linkRequired: "Required — every sale needs a patient",
      linkSaved: "Preference saved.", linkHelp: "Your hospital's choice. Optional suits pharmacies that also serve people who are not patients.",
    },
  },
  fr: {
    nav: { pharmacySales: "Ventes pharmacie" },
    psales: {
      title: "Ventes de la pharmacie", newSale: "Nouvelle vente", today: "Aujourd'hui", todayCount: "Ventes du jour", todayTotal: "Total du jour", rangeTotal: "Total de la période",
      from: "Du", to: "Au", filter: "Filtrer", clear: "Effacer",
      ref: "N° de vente", date: "Date", patient: "Patient", items: "Articles", total: "Total", soldBy: "Vendu par", none: "Aucune vente sur cette période",
      patientName: "Nom du patient (facultatif)", notes: "Notes (facultatif)", addMedicine: "Ajouter un médicament", chooseMedicine: "Choisir un médicament…",
      inStock: "en stock", qty: "Qté", line: "Montant", remove: "Retirer", noStock: "Rupture de stock", confirmSale: "Valider la vente", saving: "Enregistrement…",
      errNone: "Ajoutez au moins un médicament", errQty: "Vérifiez les quantités — au moins 1 et pas plus que le stock",
      done: "Vente enregistrée. Stock mis à jour.", details: "Détails de la vente", close: "Fermer", unitPrice: "Prix unitaire",
      customer: "Client", walkIn: "Client de passage", registered: "Patient enregistré", searchPatient: "Rechercher un patient par nom ou téléphone…",
      changePatient: "Changer", noPatientFound: "Aucun patient trouvé", errPatient: "Choisissez le patient concerné par cette vente",
      walkInTag: "De passage", patientTag: "Patient", linkSetting: "Lier les ventes aux dossiers patients", linkOff: "Désactivé — saisir un nom", linkOptional: "Facultatif — clients de passage acceptés", linkRequired: "Obligatoire — chaque vente nécessite un patient",
      linkSaved: "Préférence enregistrée.", linkHelp: "Choix de votre hôpital. « Facultatif » convient aux pharmacies qui servent aussi des personnes non patientes.",
    },
  },
  ar: {
    nav: { pharmacySales: "مبيعات الصيدلية" },
    psales: {
      title: "مبيعات الصيدلية", newSale: "عملية بيع جديدة", today: "اليوم", todayCount: "مبيعات اليوم", todayTotal: "إجمالي اليوم", rangeTotal: "إجمالي الفترة",
      from: "من", to: "إلى", filter: "تصفية", clear: "مسح",
      ref: "رقم البيع", date: "التاريخ", patient: "المريض", items: "الأصناف", total: "الإجمالي", soldBy: "البائع", none: "لا توجد مبيعات في هذه الفترة",
      patientName: "اسم المريض (اختياري)", notes: "ملاحظات (اختياري)", addMedicine: "إضافة دواء", chooseMedicine: "اختر دواءً…",
      inStock: "متوفر", qty: "الكمية", line: "المبلغ", remove: "إزالة", noStock: "نفد المخزون", confirmSale: "إتمام البيع", saving: "جارٍ الحفظ…",
      errNone: "أضف دواءً واحدًا على الأقل", errQty: "تحقق من الكميات — يجب أن تكون 1 على الأقل وألا تتجاوز المخزون",
      done: "تم تسجيل البيع وتحديث المخزون.", details: "تفاصيل البيع", close: "إغلاق", unitPrice: "سعر الوحدة",
      customer: "العميل", walkIn: "عميل عابر", registered: "مريض مسجّل", searchPatient: "ابحث عن مريض بالاسم أو الهاتف…",
      changePatient: "تغيير", noPatientFound: "لا يوجد مريض مطابق", errPatient: "اختر المريض الذي تخصه هذه العملية",
      walkInTag: "عابر", patientTag: "مريض", linkSetting: "ربط المبيعات بسجلات المرضى", linkOff: "متوقف — اكتب اسمًا فقط", linkOptional: "اختياري — يُسمح بالعملاء العابرين", linkRequired: "إلزامي — كل عملية بيع تحتاج مريضًا",
      linkSaved: "تم حفظ التفضيل.", linkHelp: "اختيار مستشفاك. «اختياري» يناسب الصيدليات التي تخدم أيضًا أشخاصًا ليسوا مرضى.",
    },
  },
});

// Who the sale is for. Depends on the hospital's preference:
//   off: just a free-text name · optional: walk-in or registered patient · required: registered patient only.
function CustomerPicker({ token, mode, value, onChange }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState(mode === "required" ? "patient" : "walkin");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (kind !== "patient" || value.patient || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    const id = setTimeout(() => {
      api(`/pharmacy-sales/patient-search?q=${encodeURIComponent(q.trim())}`, "GET", null, token)
        .then((r) => { setResults(Array.isArray(r) ? r : []); setSearched(true); })
        .catch(() => { setResults([]); setSearched(true); });
    }, 300);
    return () => clearTimeout(id);
  }, [q, kind, value.patient, token]);

  const nameInput = (
    <Field label={t("psales.patientName")}><input style={inp} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></Field>
  );
  if (mode === "off") return nameInput;

  const tab = (k, label) => (
    <button type="button" key={k} onClick={() => { setKind(k); onChange({ patient: null, name: "" }); setQ(""); }}
      style={{ ...btnG, ...(kind === k ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : {}) }}>{label}</button>
  );
  return (
    <Field label={t("psales.customer")}>
      {mode === "optional" && <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>{tab("walkin", t("psales.walkIn"))}{tab("patient", t("psales.registered"))}</div>}
      {kind === "walkin" ? (
        <input style={inp} value={value.name} placeholder={t("psales.patientName")} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      ) : value.patient ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "var(--brand-tint-light)", borderRadius: 10, padding: "10px 14px" }}>
          <div><div style={{ fontWeight: 700, color: "var(--brand-text-strong)" }}>{value.patient.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{[value.patient.phone, value.patient.age ? `${value.patient.age}` : "", value.patient.gender].filter(Boolean).join(" · ")}</div></div>
          <button type="button" style={btnG} onClick={() => { onChange({ patient: null, name: "" }); setQ(""); }}>{t("psales.changePatient")}</button>
        </div>
      ) : (
        <div>
          <input style={inp} value={q} placeholder={t("psales.searchPatient")} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          {results.length > 0 && (
            <div style={{ border: "1px solid var(--brand-tint)", borderRadius: 10, marginTop: 6, overflow: "hidden" }}>
              {results.map((p) => (
                <button type="button" key={p.id} onClick={() => onChange({ patient: p, name: p.name })}
                  style={{ display: "block", width: "100%", textAlign: "start", background: "var(--surface)", border: "none", borderBottom: "1px solid var(--brand-tint)", padding: "9px 14px", cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
                  <strong>{p.name}</strong> <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{[p.phone, p.age, p.gender].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
            </div>
          )}
          {searched && results.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6 }}>{t("psales.noPatientFound")}</div>}
        </div>
      )}
    </Field>
  );
}

function NewSaleModal({ token, mode, onClose, onDone }) {
  const { t } = useTranslation();
  const [stock, setStock] = useState([]);
  const [lines, setLines] = useState([{ inventoryId: "", quantity: 1 }]);
  const [customer, setCustomer] = useState({ patient: null, name: "" });
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("Cash");
  const [err, setErr] = useState("");
  const [, setBusy] = useState(false);

  useEffect(() => {
    api("/inventory", "GET", null, token).then((r) => setStock(Array.isArray(r) ? r : [])).catch((e) => setErr(apiErrorMessage(e)));
  }, [token]);

  const byId = useMemo(() => Object.fromEntries(stock.map((s) => [s.id, s])), [stock]);
  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (byId[l.inventoryId] ? (Number(byId[l.inventoryId].unitPrice) || 0) * (Number(l.quantity) || 0) : 0), 0);

  const submit = async () => {
    const chosen = lines.filter((l) => l.inventoryId);
    if (!chosen.length) return setErr(t("psales.errNone"));
    if (mode === "required" && !customer.patient) return setErr(t("psales.errPatient"));
    for (const l of chosen) {
      const q = Number(l.quantity);
      if (!Number.isInteger(q) || q < 1 || q > Number(byId[l.inventoryId]?.quantity)) return setErr(t("psales.errQty"));
    }
    setBusy(true); setErr("");
    try {
      await api("/pharmacy-sales", "POST", {
        items: chosen.map((l) => ({ inventoryId: l.inventoryId, quantity: Number(l.quantity) })),
        patientId: customer.patient ? customer.patient.id : undefined,
        patientName: customer.patient ? undefined : (customer.name.trim() || undefined), notes: notes.trim() || undefined, method,
      }, token);
      onDone();
    } catch (e) { setErr(apiErrorMessage(e)); setBusy(false); }
  };

  const used = new Set(lines.map((l) => l.inventoryId));
  return (
    <Modal title={t("psales.newSale")} onClose={onClose}>
      <CustomerPicker token={token} mode={mode} value={customer} onChange={setCustomer} />
      {lines.map((l, i) => {
        const item = byId[l.inventoryId];
        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <select style={{ ...inp, flex: "2 1 200px" }} value={l.inventoryId} onChange={(e) => setLine(i, { inventoryId: e.target.value, quantity: 1 })}>
              <option value="">{t("psales.chooseMedicine")}</option>
              {stock.map((s) => (
                <option key={s.id} value={s.id} disabled={Number(s.quantity) <= 0 || (used.has(s.id) && s.id !== l.inventoryId)}>
                  {s.name} — {Number(s.quantity) > 0 ? `${s.quantity} ${s.unit || ""} ${t("psales.inStock")}` : t("psales.noStock")}
                </option>
              ))}
            </select>
            <input style={{ ...inp, flex: "0 0 80px" }} type="number" min="1" max={item ? item.quantity : undefined} value={l.quantity} aria-label={t("psales.qty")} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <div style={{ flex: "0 0 110px", textAlign: "end", fontWeight: 700, color: "var(--brand-text-strong)", fontSize: 14 }}>{item ? money((Number(item.unitPrice) || 0) * (Number(l.quantity) || 0)) : ""}</div>
            {lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} title={t("psales.remove")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 20, lineHeight: 1 }}>×</button>}
          </div>
        );
      })}
      <button type="button" style={{ ...btnG, marginBottom: 12 }} onClick={() => setLines((ls) => [...ls, { inventoryId: "", quantity: 1 }])}><Icon name="plus" size={13} /> {t("psales.addMedicine")}</button>
      <Field label={t("fields.method")}>
        <select style={inp} value={method} onChange={(e) => setMethod(e.target.value)} aria-label={t("fields.method")}>
          {[["Cash", "cash"], ["Mobile Money", "mobileMoney"], ["Bank Transfer", "bankTransfer"], ["Insurance", "insurance"], ["Card", "card"]].map(([v, k]) => <option key={v} value={v}>{t(`transactions.methods.${k}`)}</option>)}
        </select>
      </Field>
      <Field label={t("psales.notes")}><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--brand-tint)", marginTop: 4 }}>
        <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>{t("psales.total")}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{money(total)}</span>
      </div>
      {err && <div role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      <LoadingButton style={btnP} busyLabel={t("psales.saving")} onClick={submit}><Icon name="check" size={16} /> {t("psales.confirmSale")}</LoadingButton>
    </Modal>
  );
}

function SaleDetails({ sale, onClose }) {
  const { t, i18n } = useTranslation();
  return (
    <Modal title={`${t("psales.details")} — ${sale.saleRef || ""}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
        {formatDateTime(sale.createdAt, i18n.language)} · {sale.soldByName}{sale.patientName ? ` · ${sale.patientName}` : ""}{sale.patientId ? ` · ${t("psales.patientTag")}` : ` · ${t("psales.walkInTag")}`}
      </div>
      <Table data={(sale.items || []).map((it, i) => ({ ...it, id: i }))} columns={[
        { key: "name", label: t("psales.items") },
        { key: "quantity", label: t("psales.qty") },
        { key: "unitPrice", label: t("psales.unitPrice"), render: (v) => money(v) },
        { key: "subtotal", label: t("psales.line"), render: (v) => money(v) },
      ]} />
      {sale.notes && <div style={{ marginTop: 12, fontSize: 14 }}>{sale.notes}</div>}
      <div style={{ textAlign: "end", fontSize: 20, fontWeight: 800, color: "var(--brand-text-strong)", marginTop: 12 }}>{money(sale.totalAmount)}</div>
    </Modal>
  );
}

export default function PharmacySales({ token, user, hospital }) {
  const { t, i18n } = useTranslation();
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState(hospital?.settings?.pharmacyPatientLink || "optional");
  useEffect(() => {
    api("/session", "GET", null, token).then((s) => { if (s?.hospital?.settings?.pharmacyPatientLink) setMode(s.hospital.settings.pharmacyPatientLink); }).catch(() => {});
  }, [token]);
  const saveMode = async (next) => {
    const prev = mode; setMode(next); setError("");
    try { await api("/hospital/settings", "PUT", { pharmacyPatientLink: next }, token); setNotice(t("psales.linkSaved")); }
    catch (e) { setMode(prev); setError(apiErrorMessage(e, t("common.error"))); }
  };

  const load = useCallback(async (f = "", tt = "") => {
    try {
      const qs = new URLSearchParams();
      if (f) qs.set("from", f);
      if (tt) qs.set("to", tt);
      const r = await api(`/pharmacy-sales${qs.toString() ? `?${qs}` : ""}`, "GET", null, token);
      setSales(Array.isArray(r) ? r : []); setError("");
    } catch (e) { setError(apiErrorMessage(e, t("common.error"))); }
  }, [token, t]);
  useEffect(() => { load(); }, [load]);

  const todayKey = new Date().toDateString();
  const todays = sales.filter((s) => new Date(s.createdAt).toDateString() === todayKey);
  const sum = (rows) => rows.reduce((a, s) => a + (Number(s.totalAmount) || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--brand-text-strong)" }}>{t("psales.title")}</h2>
        <button style={btnP} onClick={() => { setNotice(""); setModal("new"); }}><Icon name="plus" size={16} /> {t("psales.newSale")}</button>
      </div>

      {notice && <div role="status" style={{ background: "var(--brand-tint-light)", color: "var(--brand-text)", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 14 }}>{notice}</div>}
      {error && <div role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 14 }}>{error}</div>}

      {user?.role === "admin" && (
        <div style={{ ...card, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--brand-text-strong)" }}>{t("psales.linkSetting")}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("psales.linkHelp")}</div>
          </div>
          <select style={{ ...inp, width: "auto", minWidth: 240 }} value={mode} onChange={(e) => saveMode(e.target.value)} aria-label={t("psales.linkSetting")}>
            <option value="off">{t("psales.linkOff")}</option>
            <option value="optional">{t("psales.linkOptional")}</option>
            <option value="required">{t("psales.linkRequired")}</option>
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("psales.todayCount")} value={todays.length} color="var(--info)" icon="pharmacy" />
        <StatCard label={t("psales.todayTotal")} value={money(sum(todays))} color="var(--brand)" icon="transactions" />
        <StatCard label={t("psales.rangeTotal")} value={money(sum(sales))} color="var(--purple)" icon="transactions" />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <div><div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{t("psales.from")}</div><input type="date" style={inp} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{t("psales.to")}</div><input type="date" style={inp} value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <button style={btnG} onClick={() => load(from, to)}>{t("psales.filter")}</button>
        {(from || to) && <button style={btnG} onClick={() => { setFrom(""); setTo(""); load(); }}>{t("psales.clear")}</button>}
      </div>

      <div style={card}>
        {sales.length === 0 ? (
          <div style={{ textAlign: "center", padding: 36, color: "var(--text-faint)" }}>{t("psales.none")}</div>
        ) : (
          <Table data={sales} columns={[
            { key: "saleRef", label: t("psales.ref") },
            { key: "createdAt", label: t("psales.date"), render: (v) => formatDateTime(v, i18n.language) },
            { key: "patientName", label: t("psales.patient"), render: (v, r) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{v || "—"}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: r.patientId ? "var(--info-bg)" : "var(--neutral-bg)", color: r.patientId ? "var(--info)" : "var(--text-muted)" }}>{r.patientId ? t("psales.patientTag") : t("psales.walkInTag")}</span>
              </span>) },
            { key: "items", label: t("psales.items"), render: (v) => (v || []).map((i) => `${i.name} ×${i.quantity}`).join(", ") },
            { key: "totalAmount", label: t("psales.total"), render: (v) => money(v) },
            { key: "soldByName", label: t("psales.soldBy") },
          ]} actions={(row) => [<button key="v" style={btnG} onClick={() => setOpen(row)}>{t("psales.details")}</button>]} />
        )}
      </div>

      {modal === "new" && <NewSaleModal token={token} mode={mode} onClose={() => setModal(null)} onDone={() => { setModal(null); setNotice(t("psales.done")); load(from, to); }} />}
      {open && <SaleDetails sale={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
