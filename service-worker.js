
const CACHE_NAME = "hamidi-studio-v4";
const CACHE_PREFIX = "hamidi-studio-";

const APP_SHELL = new URL(
  "./index.html",
  self.registration.scope
).href;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            key =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";

  const isStaticFile =
    /\.(html?|js|mjs|css|json|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf)$/i
      .test(url.pathname);

  if (!isNavigation && !isStaticFile) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // تحميل أحدث نسخة من الموقع أولاً
        const response = await fetch(request);

        if (response && response.ok) {
          try {
            await cache.put(request, response.clone());
          } catch (error) {
            // استمرار تشغيل التطبيق حتى لو تعذر التخزين
          }
        }

        return response;

      } catch (error) {
        // عند انقطاع الإنترنت نستخدم النسخة المخزنة
        const cached = await cache.match(request, {
          ignoreSearch: true
        });

        if (cached) return cached;

        // محاولة فتح الصفحة الرئيسية عند تعذر تحميل صفحة أخرى
        if (isNavigation) {
          const home = await cache.match(APP_SHELL);

          if (home) return home;
        }

        return new Response(
          "لا يوجد اتصال بالإنترنت. حاول مرة أخرى عند توفر الاتصال.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      }
    })()
  );
});
