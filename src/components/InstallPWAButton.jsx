// src/components/InstallPWAButton.jsx
import { useEffect, useMemo, useState } from "react";

function isIOS() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}
function isAndroid() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua);
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const ios = useMemo(() => (typeof window !== "undefined" ? isIOS() : false), []);
  const android = useMemo(
    () => (typeof window !== "undefined" ? isAndroid() : false),
    []
  );

  const standalone = useMemo(
    () => (typeof window !== "undefined" ? isStandalone() : false),
    [installed]
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (standalone) return null;

  const btnStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "#fff",
    fontWeight: 700,
  };

  // iOS: instrucciones
  if (ios) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() =>
            alert(
              "En iPhone se instala asi:\n\n1) Äpretá Compartir (⬆️)\n2) Elegí “Agregar a pantalla de inicio”\n3) Confirmá “Agregar”"
            )
          }
          style={btnStyle}
        >
          Descargar app (iPhone)
        </button>
      </div>
    );
  }

  // ✅ Android/Chrome: si hay prompt -> instalar directo
  if (deferredPrompt) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={async () => {
            try {
              deferredPrompt.prompt();
              await deferredPrompt.userChoice;
            } finally {
              setDeferredPrompt(null);
            }
          }}
          style={btnStyle}
        >
          Descargar app
        </button>
      </div>
    );
  }

  // ✅ Fallback Android: siempre mostrar CTA con guía (porque Chrome a veces no dispara beforeinstallprompt)
  if (android) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() =>
            alert(
              "Para instalar en Android:\n\n1) Tocá los 3 puntitos (⋮)\n2) Elegí “Instalar app”\n3) Confirmá"
            )
          }
          style={btnStyle}
        >
          Descargar app (Android)
        </button>
      </div>
    );
  }

  return null;
}