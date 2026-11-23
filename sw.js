// Service worker — يجعل الموقع قابلًا للتثبيت كتطبيق، ويحفظ «هيكل التطبيق» فقط ليفتح بسرعة وبلا إنترنت (الشاشة والإعدادات لا البيانات).
// قواعد الأمان:
//  • لا يعترض إلا طلبات GET من نفس الموقع. كل اتصالات Firebase (حسابات/قاعدة بيانات/ترابيزات) تذهب مباشرة للشبكة ولا تُخزَّن أبدًا.
//  • الشبكة أولًا: التحديثات تصل فورًا؛ الكاش احتياطي عند انقطاع الإنترنت فقط.
//  • لا يخزّن إلا ردودًا ناجحة (200) من نفس الأصل، ولا يخزّن config.js.
const VERSION = '22ec2777edb3';
const CACHE = `chess-shell-${VERSION}`;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
const NEVER = /(^|\/)(config\.js|sw\.js)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('chess-shell-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;              // Firebase وغيره: لا نلمسه
  if (req.headers.has('range')) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic' && !NEVER.test(url.pathname)) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') { const shell = await caches.match('index.html') || await caches.match('./'); if (shell) return shell; }
      throw err;
    }
  })());
});
