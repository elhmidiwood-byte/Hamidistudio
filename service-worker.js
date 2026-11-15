
const CACHE_NAME = "hamidi-studio-v1";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(FILES)
    )
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request)
      )
    );
  }
});
