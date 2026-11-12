/* NeuroTriage service worker - auto-generated. Version: a343aec4d4 */
const V = "nt-a343aec4d4";
const PRE = [
 "index.html",
 "offline.html",
 "css/app.e7ae78d1.css",
 "css/head.ff7d355b.css",
 "js/000-blk1.17513812.js",
 "js/001-blk4.d361f05e.js",
 "js/002-blk7.5d0b37e4.js",
 "js/003-blk10.82d1d416.js",
 "js/004-nts-js.a343aec4d4.js",
 "js/005-blk30.c1d182fe.js",
 "js/006-blk31-0.1113e794.js",
 "js/007-blk31-1.31a2f1c4.js",
 "js/008-blk32-0.77f6be39.js",
 "js/009-blk32-1.03303c20.js",
 "js/010-blk32-2.5f62f9e4.js",
 "js/011-blk32-3.db64f529.js",
 "js/012-blk32-4.9b1c0b9a.js",
 "js/013-blk32-5.fd9a9c53.js",
 "js/014-blk32-6.ab4f1152.js",
 "js/015-blk33-0.1df0141a.js",
 "js/016-blk33-1.f630b7d6.js",
 "js/017-blk33-2.5a53d49c.js",
 "js/018-blk33-3.46ae0c0f.js",
 "js/019-blk33-4.450b7384.js",
 "js/020-blk33-5.a8b9a90a.js",
 "js/021-blk33-6.2c887cf5.js",
 "js/022-blk33-7.bf5fdaab.js",
 "js/023-blk33-8.f15a0e66.js",
 "js/024-blk33-9.02748147.js",
 "js/025-blk33-10.9a082560.js",
 "js/026-blk33-11.c3f6aad4.js",
 "js/027-blk33-12.86eef55a.js",
 "js/028-blk33-13.9a043eb1.js",
 "js/029-blk33-14.50ea7a26.js",
 "js/030-blk33-15.6dcdfe4c.js",
 "js/031-blk33-16.f5f1caac.js",
 "js/032-blk33-17.acf634e1.js",
 "js/033-blk33-18.63b8efee.js",
 "js/034-blk33-19.39660cd0.js",
 "js/035-blk33-20.d9ce55cd.js",
 "js/036-blk33-21.52ab9e5b.js",
 "js/037-blk33-22.33cccfad.js",
 "js/038-blk33-23.5ff8b3ae.js",
 "js/039-blk33-24.d3e39173.js",
 "js/040-blk33-25.5404350a.js",
 "js/041-blk33-26.1a94af89.js",
 "js/042-blk33-27.fea51419.js",
 "js/043-blk33-28.bcc5a671.js",
 "js/044-blk33-29.6647e664.js",
 "js/045-blk33-30.ff4ea998.js",
 "js/046-blk33-31.855a4026.js",
 "js/047-blk33-32.6491e41b.js",
 "js/048-blk33-33.ae001f17.js",
 "js/049-blk33-34.0ebaa3a2.js",
 "js/050-blk33-35.9f20f0ab.js",
 "js/051-blk34-0.28dd99d9.js",
 "js/052-blk34-1.c53a4167.js",
 "js/053-blk34-2.80bba595.js",
 "js/054-blk34-3.052e6799.js",
 "js/055-blk34-4.f89a83e3.js",
 "js/056-nt-r2js.a6dcffef.js",
 "js/057-ntfix2.94a122c8.js",
 "js/058-ntdx-js.a60ca994.js",
 "js/059-ntt2-js.b294e459.js",
 "js/060-nt-dock-js.845d5a67.js",
 "js/061-nt-sub-js.46128ab3.js",
 "js/062-nt-bill-js.60c85eb8.js",
 "js/063-nt-legal-js.3336950b.js",
 "js/064-nt-th-js.b2f2a99c.js",
 "js/065-nt-r7-js.385d3fda.js",
 "js/066-nt-max-js.efa91a4d.js",
 "js/067-ntx-pro.7e8070cc.js",
 "js/068-nt-r46-focus.efa478b8.js",
 "js/069-nt-r47-paths.1c1c2223.js",
 "js/070-nt-r5-duel.470a2cda.js",
 "js/071-nt-pwa2.4ca49d0a.js",
 "js/072-ntfeat-js.971a9da6.js",
 "js/073-ntwhy-js.23e65a8b.js",
 "js/074-blk86.454ec154.js",
 "js/075-blk87-0.3dc4ba88.js",
 "js/076-blk87-1.d59540cb.js",
 "js/077-blk87-2.df23ee11.js",
 "js/078-blk87-3.f4f16572.js",
 "js/079-blk87-4.034598f0.js",
 "js/080-blk87-5.8457bad4.js",
 "js/081-blk87-6.74ff7839.js",
 "js/082-blk87-7.5d5b9ec5.js",
 "js/083-blk87-8.e2503fc1.js",
 "js/084-blk87-9.514c12c6.js",
 "js/085-blk87-10.a9cbbaf2.js",
 "js/086-blk87-11.21b97cf1.js",
 "js/087-blk87-12.97ed9b5d.js",
 "js/088-blk87-13.9d67f696.js",
 "js/089-blk87-14.1996d64e.js",
 "js/090-blk87-15.ef2bccee.js",
 "js/091-blk88.e485b072.js",
 "js/092-blk89.d9d5fa81.js",
 "js/093-blk90.e1a86d94.js",
 "js/094-blk91.482dfa3f.js",
 "js/095-blk92.353031d7.js",
 "js/096-blk93.e2574d69.js",
 "js/097-blk94.4d70b1dd.js",
 "js/098-blk95.d0410918.js",
 "js/099-blk96.128a0c16.js",
 "js/100-blk97.bbc2d692.js",
 "js/101-blk98-0.30618cae.js",
 "js/102-blk98-1.f206db41.js",
 "js/103-blk99.45badfed.js",
 "js/104-blk100.8ba5ffcb.js",
 "js/105-ntmsn-js.6125b5de.js",
 "js/106-ntmission-20r-js.f00e8ac7.js",
 "js/107-ntdm-js.95645595.js",
 "js/108-nt-tools-fix-js.44956957.js",
 "js/109-nt-plans-fix-js.3382a9ef.js",
 "js/110-nt-trial-js.26460582.js",
 "js/111-blk116.47c51c40.js",
 "js/112-blk117.341d2a5a.js",
 "js/113-blk119.583e0121.js",
 "js/114-nt-arena.f026552b.js",
 "js/115-nt-dq.5db5a9bf.js",
 "js/116-nt-lv.563b90c4.js",
 "js/117-nt-iv-js.07e4bf5c.js",
 "js/118-nt-r48.59dab309.js",
 "js/119-nt-sx.a398cc25.js",
 "js/120-nt-cbt-studio.4754e59d.js",
 "js/121-nt-sound-layer.da11245e.js",
 "js/122-nt-playstore-master-fix-js.82394492.js",
 "js/d900.js",
 "js/d901.js",
 "js/d902.js",
 "js/d903.js",
 "js/d904.js",
 "js/d905.js",
 "js/d906.js",
 "js/d907.js",
 "js/d908.js",
 "js/d909.js",
 "js/d910.js",
 "js/d911.js",
 "js/d912.js"
];      // app shell: precached at install (offline ready)
const MEDIA = [
 "media/1a31eee100.jpg",
 "media/40372ef20b.jpg",
 "media/460a18d808.mp3",
 "media/4cd6ce6fad.jpg",
 "media/5b18128fe6.jpg",
 "media/63fb6ee9e2.jpg",
 "media/clip-beat.mp3",
 "media/clip-brown.mp3",
 "media/clip-forest.mp3",
 "media/clip-med.mp3",
 "media/clip-sleep.mp3",
 "media/d0e2ecbb29.jpg",
 "media/intro-video.mp4",
 "media/rain.mp3",
 "media/sos-voice.mp3",
 "media/wd-opus.ogg"
];  // sounds/video: cached in background after install
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    // addAll is all-or-nothing, so add one by one and ignore single failures
    await Promise.all(PRE.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => {})));
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("nt-") && k !== V) await caches.delete(k);
    await self.clients.claim();
    // warm media cache quietly (does not block activation)
    const c = await caches.open(V);
    for (const u of MEDIA) { try { if (!(await c.match(u))) await c.add(u); } catch (_) {} }
  })());
});
self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

async function rangeResponse(req, res) {
  // <audio>/<video> send Range requests; answer from cache with a proper 206
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  if (!m) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const s = m[1] ? parseInt(m[1], 10) : 0, e = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  return new Response(buf.slice(s, e + 1), { status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
    "Content-Range": "bytes " + s + "-" + e + "/" + size, "Content-Length": String(e - s + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;   // Firebase, fonts, APIs: network only

  // Pages: network first, fall back to cached copy, then offline page
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(V)).put("index.html", res.clone());
        return res;
      } catch (_) {
        const c = await caches.open(V);
        return (await c.match("index.html")) || (await c.match("offline.html")) || (await caches.match("offline.html")) ||
               new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Hashed js/css and media are immutable: cache first
  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return req.headers.has("range") ? rangeResponse(req, hit) : hit;
    try {
      const res = await fetch(req.headers.has("range") ? new Request(req.url) : req);
      if (res.ok && res.status === 200) c.put(req.url, res.clone());
      return req.headers.has("range") && res.ok ? rangeResponse(req, res) : res;
    } catch (_) {
      return new Response("", { status: 504 });
    }
  })());
});
