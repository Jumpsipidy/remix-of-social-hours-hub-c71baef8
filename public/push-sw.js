// Push-only service worker for Socialinės Valandos.
// Does NOT cache app shell — installability and offline are not enabled.
// Handles incoming Web Push events and notification clicks only.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Socialinės Valandos",
    body: "Turite naują pranešimą.",
    url: "/",
    tag: "sv-generic",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (_) {
    try {
      payload.body = event.data ? event.data.text() : payload.body;
    } catch (_) {}
  }
  const opts = {
    body: payload.body,
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    tag: payload.tag || "sv-generic",
    renotify: true,
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(payload.title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        try {
          if ("focus" in c) {
            await c.focus();
            if ("navigate" in c) await c.navigate(url);
            return;
          }
        } catch (_) {}
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })(),
  );
});
