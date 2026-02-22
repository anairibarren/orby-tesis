//src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./assets/tw.css";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";

import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    // si querés después lo hacemos “lindo” con toast/modal:
    // “Hay una actualización disponible”
  },
  onOfflineReady() {
    // opcional: toast “Ya podés usar orby sin conexión”
  },
})

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
