/* ทำเนียบครูดีเด่น - service worker
   *** เมื่อแก้ไขไฟล์ใด ๆ ให้เปลี่ยนเลข VERSION ด้านล่าง ผู้ใช้จะเห็นแถบ "มีเวอร์ชันใหม่" อัตโนมัติ *** */
const VERSION = "2026.11.12-1";
const CACHE = "hof-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  // ไม่เรียก skipWaiting ที่นี่ เพื่อให้ผู้ใช้กด "อัปเดตเลย" เอง (ไม่รีโหลดกลางคันตอนกำลังกรอกคะแนน)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("hof-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).catch(() => caches.match("./index.html"))));
  } else if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
