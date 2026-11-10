// Service worker: cache file để app mở được khi offline.
// Đổi VERSION mỗi lần cập nhật code để điện thoại tải bản mới.
const VERSION = "v7";
const FILES = ["./", "index.html", "style.css", "data.js", "places.js", "sync-config.js", "app.js", "sync.js", "manifest.webmanifest", "icon.svg", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first, chỉ cho file cùng nguồn (không cache request bên ngoài).
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }) // luôn hỏi lại server (304 nếu không đổi) để JS và CSS không bị lệch phiên bản
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
