/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

const MANIFEST = self.__WB_MANIFEST || [];
precacheAndRoute(MANIFEST);

// Detectar si estamos en DEV (Vite PWA usa dev-sw.js y no precachea index.html real)
const IS_DEV = typeof self !== "undefined" && String(self.location?.hostname || "").includes("localhost");

// ✅ Navegación SPA
if (IS_DEV) {
  // En DEV: NO usar createHandlerBoundToURL porque /index.html no está precacheado => rompe
  registerRoute(
    new NavigationRoute(async ({ event }) => {
      try {
        return await fetch(event.request);
      } catch {
        return new Response("Estás sin conexión", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })
  );
} else {
  // En PROD: sí usamos Workbox SPA fallback con precache
  const appHandler = createHandlerBoundToURL("/index.html");

  registerRoute(
    new NavigationRoute(async (options) => {
      try {
        return await appHandler(options);
      } catch {
        return (
          (await caches.match("/index.html", { ignoreSearch: true })) ||
          new Response("Estás sin conexión", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }
    })
  );
}

