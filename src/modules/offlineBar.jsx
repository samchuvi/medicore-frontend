// The strip under the top bar that tells staff when they are offline, how many changes are
// waiting to be sent, and lets them review anything the server refused.
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Modal, btnP, btnG, toast, pendingItems, onQueueChange, onConnection, isOffline, setOffline, runSync, retryProblems, queueRemove, pingServer } from "../shared";

const KIND = { "/patients": "patients", "/bills": "bills", "/transactions": "payments", "/pharmacy-sales": "sales", "/appointments": "appointments", "/records": "records" };
const bar = (bg, fg, bd) => ({ background: bg, color: fg, border: `1px solid ${bd}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" });

export default function OfflineBar({ token }) {
  const { t } = useTranslation();
  const [offline, setOff] = useState(isOffline());
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const busyRef = useRef(false);

  const refresh = useCallback(() => { pendingItems(token).then(setItems).catch(() => {}); }, [token]);
  const waiting = items.filter((i) => !i.failed), problems = items.filter((i) => i.failed);

  const send = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const res = await runSync(token);
      if (res && res.sent) toast.success(t("offline.synced", { count: res.sent }));
      if (res && res.failed) toast.error(t("offline.someFailed", { count: res.failed }));
    } finally { busyRef.current = false; setBusy(false); refresh(); }
  }, [token, t, refresh]);

  useEffect(() => { refresh(); return onQueueChange(refresh); }, [refresh]);
  useEffect(() => onConnection(setOff), []);
  // Back online: send at once. Otherwise keep trying every 30 seconds while something is waiting.
  useEffect(() => {
    const go = () => { if (!isOffline()) send(); };
    window.addEventListener("hms-try-sync", go);
    const first = setTimeout(go, 1500);
    const timer = setInterval(go, 30000);
    return () => { window.removeEventListener("hms-try-sync", go); clearTimeout(first); clearInterval(timer); };
  }, [send]);
  // While offline, quietly check every 15 seconds whether the server can be reached again.
  useEffect(() => {
    if (!offline) return undefined;
    const timer = setInterval(async () => { if (await pingServer()) { setOffline(false); window.dispatchEvent(new Event("hms-try-sync")); } }, 15000);
    return () => clearInterval(timer);
  }, [offline]);

  if (!offline && !waiting.length && !problems.length) return null;
  const label = (i) => t(`offline.kind.${KIND[i.path] || "other"}`);
  return (
    <div data-testid="offline-bar">
      {offline && <div role="status" data-testid="offline-banner" style={bar("var(--warn-bg, #fff8e1)", "var(--warn, #8a5a00)", "var(--warn-border, #f0c36d)")}><strong>{t("offline.title")}</strong><span>{t("offline.body")}</span></div>}
      {waiting.length > 0 && (
        <div role="status" data-testid="offline-pending" style={bar("var(--brand-tint-light)", "var(--brand-text-strong)", "var(--brand-tint)")}>
          <span>{busy ? t("offline.sending") : t("offline.waiting", { count: waiting.length })}</span>
          {!offline && !busy && <button style={{ ...btnG, padding: "4px 12px" }} onClick={send}>{t("offline.sendNow")}</button>}
        </div>
      )}
      {problems.length > 0 && (
        <div role="alert" data-testid="offline-problems" style={bar("var(--danger-bg)", "var(--danger)", "var(--danger-border)")}>
          <span>{t("offline.problems", { count: problems.length })}</span>
          <button style={{ ...btnG, padding: "4px 12px" }} onClick={() => setReview(true)}>{t("offline.review")}</button>
        </div>
      )}
      {review && (
        <Modal title={t("offline.reviewTitle")} onClose={() => setReview(false)}>
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-muted)" }}>{t("offline.reviewHint")}</p>
          {problems.map((i) => (
            <div key={i.qid} style={{ border: "1px solid var(--danger-border)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{label(i)}{i.body.name ? ` — ${i.body.name}` : i.body.patientName ? ` — ${i.body.patientName}` : ""}</div>
              <div style={{ fontSize: 13, color: "var(--danger)", margin: "4px 0 8px" }}>{i.error}</div>
              <button style={{ ...btnG, padding: "4px 12px" }} onClick={async () => { await queueRemove(i.qid); toast.success(t("offline.discarded")); }}>{t("offline.discard")}</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btnG} onClick={() => setReview(false)}>{t("offline.close")}</button>
            <button style={btnP} onClick={async () => { await retryProblems(token); setReview(false); send(); }}>{t("offline.retry")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
