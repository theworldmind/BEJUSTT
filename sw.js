/* Bejustt service worker — v28 */
const C = "bejustt-28";
const CORE = ["./", "magazine/", "join/", "app/", "assets/style.css?v=28", "assets/site.js?v=28", "assets/i18n.js?v=28", "assets/depth.js?v=28"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", (e) => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url); if (r.method !== "GET" || u.origin !== location.origin) return;
  const put = (res) => { if (res && res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); } return res; };
  // pages: always the newest from the network; the cache is only for when there is no network
  if (r.mode === "navigate") { e.respondWith(fetch(r, { cache: "no-cache" }).then(put).catch(() => caches.match(r).then((m) => m || caches.match("./")))); return; }
  // versioned files never change: cache first
  if (u.searchParams.has("v")) { e.respondWith(caches.match(r).then((m) => m || fetch(r).then(put))); return; }
  // everything else: show the cached copy instantly, refresh it in the background
  e.respondWith(caches.match(r).then((m) => { const f = fetch(r, { cache: "no-cache" }).then(put).catch(() => m); return m || f; }));
});
