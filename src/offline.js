// Offline support: a saved copy of what the screens last showed, and a queue of
// things staff did while the internet was down (new patients, bills, payments,
// pharmacy sales, appointments, medical records). The queue is sent automatically,
// in the order it was made, as soon as the connection is back.
//
// Everything lives in this browser (IndexedDB). Nothing here talks to the server
// except through the `send` function that shared.jsx hands to startSync().

const DB_NAME = "hms-offline", DB_VERSION = 1;
let dbPromise = null;
const memory = { cache: new Map(), queue: new Map() }; // fallback when IndexedDB is blocked (private windows)

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
        if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "qid" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(store, mode);
      const out = fn(t.objectStore(store));
      t.oncomplete = () => resolve(out && "result" in out ? out.result : out);
      t.onerror = () => resolve(null);
      t.onabort = () => resolve(null);
    } catch { resolve(null); }
  });
}

// ── saved copies of what the server last said ────────────────────────────────
export async function cachePut(key, value) {
  memory.cache.set(key, value);
  await tx("cache", "readwrite", (s) => s.put(value, key));
}
export async function cacheGet(key) {
  const r = await tx("cache", "readonly", (s) => s.get(key));
  return r === null || r === undefined ? (memory.cache.has(key) ? memory.cache.get(key) : undefined) : r;
}
export async function cacheKeys(prefix) {
  const db = await openDb();
  const mem = [...memory.cache.keys()].filter((k) => k.startsWith(prefix));
  if (!db) return mem;
  const keys = await tx("cache", "readonly", (s) => s.getAllKeys());
  return Array.isArray(keys) ? keys.filter((k) => String(k).startsWith(prefix)) : mem;
}
export async function cacheClearScope(prefix) {
  const keys = await cacheKeys(prefix);
  await Promise.all(keys.map((k) => { memory.cache.delete(k); return tx("cache", "readwrite", (s) => s.delete(k)); }));
}

// ── the queue of things done while offline ───────────────────────────────────
const listeners = new Set();
export function onQueueChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const changed = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export async function queueAll(scope) {
  const rows = await tx("queue", "readonly", (s) => s.getAll());
  const list = Array.isArray(rows) ? rows : [...memory.queue.values()];
  return list.filter((i) => !scope || i.scope === scope).sort((a, b) => a.createdAt - b.createdAt);
}
export async function queueAdd(item) {
  memory.queue.set(item.qid, item);
  await tx("queue", "readwrite", (s) => s.put(item));
  changed();
}
export async function queueRemove(qid) {
  memory.queue.delete(qid);
  await tx("queue", "readwrite", (s) => s.delete(qid));
  changed();
}

// ── connection state ─────────────────────────────────────────────────────────
let offline = typeof navigator !== "undefined" && navigator.onLine === false;
const connListeners = new Set();
export function isOffline() { return offline; }
export function onConnection(fn) { connListeners.add(fn); return () => connListeners.delete(fn); }
export function setOffline(v) {
  if (v === offline) return;
  offline = v;
  connListeners.forEach((fn) => { try { fn(v); } catch { /* ignore */ } });
}
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => setOffline(true));
  window.addEventListener("online", () => { setOffline(false); window.dispatchEvent(new Event("hms-try-sync")); });
}

// ── sending the queue ────────────────────────────────────────────────────────
// send(path, body, key) -> { status, json }   or throws when the network is down
const ID_MAP_KEY = "__idmap";
let syncing = false;

async function loadMap() { return (await cacheGet(ID_MAP_KEY)) || {}; }
function remap(body, map) {
  let text = JSON.stringify(body);
  for (const [temp, real] of Object.entries(map)) text = text.split(temp).join(real);
  return JSON.parse(text);
}

/** Send what is waiting. Returns { sent, failed, stopped }. */
export async function syncQueue(scope, send) {
  if (syncing) return { sent: 0, failed: 0, stopped: false, busy: true };
  syncing = true;
  let sent = 0, failed = 0, stopped = false;
  try {
    const map = await loadMap();
    const items = (await queueAll(scope)).filter((i) => !i.failed);
    for (const item of items) {
      let res;
      try { res = await send(item.path, remap(item.body, map), item.key); }
      catch { stopped = true; break; }              // still no connection: try again later
      const { status, json } = res;
      if (status >= 200 && status < 300) {
        if (json && json.id) { map[item.tempId] = json.id; await cachePut(ID_MAP_KEY, map); }
        await queueRemove(item.qid); sent++;
      } else if (status === 401 || status === 502 || status === 503 || status === 504 || (status === 409 && json && json.code === "DUPLICATE_REQUEST")) {
        stopped = true; break;                       // signed out or server busy: keep everything, retry later
      } else {
        // The server refused it (for example: out of stock, bill already paid). Keep it, show it, let the user decide.
        await queueAdd({ ...item, failed: true, error: (json && json.error) || `Error ${status}` }); failed++;
      }
    }
  } finally { syncing = false; }
  return { sent, failed, stopped };
}

export async function retryFailed(scope) {
  const rows = await queueAll(scope);
  for (const i of rows) if (i.failed) await queueAdd({ ...i, failed: false, error: undefined });
}
