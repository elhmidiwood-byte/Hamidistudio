
const CACHE_NAME = "hamidi-studio-v5";
const CACHE_PREFIX = "hamidi-studio-";

const APP_SHELL = new URL(
  "./index.html",
  self.registration.scope
).href;

// تثبيت التطبيق وحفظ الصفحة الرئيسية
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // لا يتم تفعيل النسخة الجديدة إلا بعد حفظ الصفحة
      await cache.add(APP_SHELL);

      await self.skipWaiting();
    })()
  );
});

// تفعيل النسخة الجديدة وتنظيف النسخ القديمة
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

// تشغيل البرنامج وتخزين ملفاته
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // لا نتدخل في المواقع الخارجية
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
        // محاولة جلب أحدث نسخة من الإنترنت
        const response = await fetch(request);

        if (response && response.ok) {
          try {
            await cache.put(request, response.clone());
          } catch (error) {
            // لا نوقف البرنامج إذا فشل التخزين
          }
        }

        return response;

      } catch (error) {
        // استخدام الملف المحفوظ عند انقطاع الإنترنت
        const cached = await cache.match(request, {
          ignoreSearch: true
        });

        if (cached) return cached;

        // الرجوع للصفحة الرئيسية عند تعذر فتح صفحة أخرى
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
