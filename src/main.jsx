// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./assets/tw.css";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";

import { registerSW } from "virtual:pwa-register";

// ✅ Captura global del beforeinstallprompt (evita perderlo por timing)
if (typeof window !== "undefined") {
  window.__orbyDeferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__orbyDeferredPrompt = e;
    window.dispatchEvent(new Event("orby:pwa-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    window.__orbyDeferredPrompt = null;
    window.dispatchEvent(new Event("orby:pwa-installed"));
  });
}

// ✅ Registrar Service Worker (una sola vez)
registerSW({
  immediate: true,
  onNeedRefresh() {
    // después si querés lo hacemos con toast/modal
  },
  onOfflineReady() {
    // opcional: toast “Ya podés usar orby sin conexión”
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);