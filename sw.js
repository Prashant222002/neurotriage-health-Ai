/* NeuroTriage service worker — offline-first shell, never touches payments/auth/API */
const VERSION = "nt-r7-1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const PRECACHE = ["./", "./index.html", "./offline.html", "./manifest.webmanifest",
  "./icons/icon-any-192.png", "./icons/icon-any-512.png", "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];
const NEVER_CACHE = /(checkout\.razorpay|razorpay\.com|googleapis\.com\/(identitytoolkit|oauth)|securetoken|firebaseio|firestore\.googleapis|cloudfunctions|\/api\/|play\.google\.com|appleid\.apple|overpass-api|accounts\.google)/i;
const FONTS = /(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)/i;

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (_) {} }
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NEVER_CACHE.test(req.url)) return;            // network only, SW stays out of the way

  // Page loads: cache first (4.6 MB file), refresh in background, offline page as last resort
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const cached = await cache.match("./index.html", { ignoreSearch: true });
      const refresh = (async () => {
        try {
          const r = (await e.preloadResponse) || (await fetch("./index.html", { cache: "no-cache" }));
          if (r && r.ok) await cache.put("./index.html", r.clone());
          return r;
        } catch (_) { return null; }
      })();
      if (cached) { e.waitUntil(refresh); return cached; }
      const net = await refresh;
      return net || (await cache.match("./offline.html")) || Response.error();
    })());
    return;
  }

  // Same-origin assets + fonts/CDN libs: stale-while-revalidate
  if (url.origin === location.origin || FONTS.test(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(url.origin === location.origin ? SHELL : RUNTIME);
      const cached = await cache.match(req);
      const fetching = fetch(req).then((r) => { if (r && (r.ok || r.type === "opaque")) cache.put(req, r.clone()); return r; }).catch(() => null);
      return cached || (await fetching) || new Response("", { status: 504 });
    })());
  }
});
