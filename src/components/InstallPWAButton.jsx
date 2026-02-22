
import { useEffect, useMemo, useState } from "react";

function isIOS() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
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
  const standalone = useMemo(
    () => (typeof window !== "undefined" ? isStandalone() : false),
    [installed]
  );

  useEffect(() => {
    // Android/Chrome: capturamos el prompt
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

  // Si ya está instalada, no mostramos nada
  if (standalone) return null;

  // iOS: no hay prompt -> mostramos instrucciones
  if (ios) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() =>
            alert(
              "En iPhone se instala así:\n\n1) Tocá Compartir (⬆️)\n2) Elegí “Agregar a pantalla de inicio”\n3) Confirmá “Agregar”"
            )
          }
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "#fff",
            fontWeight: 700,
          }}
        >
          Descargar app (iPhone)
        </button>
      </div>
    );
  }

  // Android/Chrome: solo mostramos si tenemos deferredPrompt
  if (!deferredPrompt) return null;

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
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.15)",
          background: "#fff",
          fontWeight: 700,
        }}
      >
        Descargar app
      </button>
    </div>
  );
}