// Service worker: cache file để app mở được khi offline.
// Đổi VERSION mỗi lần cập nhật code để điện thoại tải bản mới.
const VERSION = "v3";
const FILES = ["./", "index.html", "style.css", "data.js", "app.js", "manifest.webmanifest", "icon.svg", "icon-512.png"];

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
    fetch(e.request)
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
