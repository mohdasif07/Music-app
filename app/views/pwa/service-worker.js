const CACHE_NAME = "music-pwa-v6"

const APP_SHELL = [
  "/manifest.json",
  "/icon.png",
  "/icon.svg",
  "/cover.svg",
  "/audio/background.mp3"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") return

  // Never intercept HTML page navigations — SoftNav / Back must not get a full document swap from SW.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request))
    return
  }

  const url = new URL(request.url)

  // Cache only static media/assets.
  if (!(url.pathname.startsWith("/audio/") || url.pathname.startsWith("/assets/") || url.pathname.match(/\.(png|svg|mp3|js|css)$/))) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || fetched
    })
  )
})
