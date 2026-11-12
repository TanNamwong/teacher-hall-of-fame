/* ทำเนียบครูดีเด่น - service worker
   ไฟล์หน้าเว็บใช้แบบ "เน็ตก่อน" (ไม่เน็ตค่อยใช้ของที่เก็บไว้) จึงได้รุ่นใหม่ทันทีที่อัปโหลดขึ้น GitHub
   ไม่ต้องแก้เลขเวอร์ชันเอง (เลขด้านล่างเปลี่ยนเมื่อไหร่ก็ได้ ถ้าอยากล้างแคชรูป/ไอคอนเก่า) */
const VERSION = "2026.11.12-2";
const CACHE = "hof-v" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];
const TIMEOUT = 6000;
const hs = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

self.addEventListener("install", e => {
  // ไม่เรียก skipWaiting เอง เพื่อไม่ให้รีโหลดกลางคันตอนกำลังกรอกคะแนน (แอปจะสั่งเองเมื่อไม่ได้กรอกอยู่)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("hof-v") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

const isIndex = u => /(^|\/)(index\.html)?$/.test(u.pathname);
async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT);
    const res = await fetch(req.url, { cache: "no-cache", signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) c.put(key, res.clone());
    return res;
  } catch (_) {
    return (await c.match(key, { ignoreSearch: true })) || (await c.match("./index.html")) || Response.error();
  }
}
async function swr(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (req.mode === "navigate" || isIndex(u)) e.respondWith(networkFirst(req, "./index.html"));
    else if (/manifest\.json$/.test(u.pathname)) e.respondWith(networkFirst(req, req));
    else e.respondWith(swr(req));
  } else if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(swr(req));
  }
});

/* ตรวจเบื้องหลัง (Android Chrome ที่ติดตั้งแอปแล้ว และเปิดการแจ้งเตือนไว้) */
async function bgCheck() {
  try {
    const c = await caches.open(CACHE);
    const old = await c.match("./index.html");
    const res = await fetch("./index.html", { cache: "no-store" });
    if (!old || !res.ok) return;
    if (hs(await old.text()) !== hs(await res.text())) {
      await self.registration.showNotification("ทำเนียบครูดีเด่น", { body: "มีเวอร์ชันใหม่ เปิดแอปเพื่ออัปเดต", icon: "icon-192.png", badge: "icon-192.png", tag: "hof-update" });
    }
  } catch (_) {}
}
self.addEventListener("periodicsync", e => { if (e.tag === "hof-update") e.waitUntil(bgCheck()); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => ws.length ? ws[0].focus() : self.clients.openWindow("./")));
});
