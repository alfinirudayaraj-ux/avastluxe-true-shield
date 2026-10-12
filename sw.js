/* True Shield hub worker — network-first, never masks updates. */
const CACHE = "true-shield-v1";
self.addEventListener("install", (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then((r) => {
      const c = r.clone();
      caches.open(CACHE).then((cc) => cc.put(e.request, c).catch(() => {}));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) { c.focus(); return; }
    return clients.openWindow("./");
  }));
});
