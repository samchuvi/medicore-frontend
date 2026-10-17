// Keeps the app itself (pages, scripts, styles) on the device so it still opens when the internet is down.
// Patient data is NOT stored here; that is handled inside the app, per signed-in user.
const CACHE = "hms-shell-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // API calls go straight through
  if (req.mode === "navigate") {
    // Open pages: the network first (so updates arrive), the saved copy when offline.
    e.respondWith((async () => {
      try { const r = await fetch(req); const c = await caches.open(CACHE); c.put("/index.html", r.clone()); return r; }
      catch { return (await caches.match("/index.html")) || Response.error(); }
    })());
    return;
  }
  // Scripts, styles, images: saved copy first (their names change whenever they change), refreshed in the background.
  e.respondWith((async () => {
    const hit = await caches.match(req);
    const net = fetch(req).then(async (r) => { if (r && r.ok) { (await caches.open(CACHE)).put(req, r.clone()); } return r; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
