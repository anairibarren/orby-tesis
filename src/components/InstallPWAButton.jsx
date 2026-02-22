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
      // debug útil:
      // console.log("beforeinstallprompt fired");
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

  const commonBtnStyle = {
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
              "En iPhone se instala así:\n\n1) Tocá Compartir (⬆️)\n2) Elegí “Agregar a pantalla de inicio”\n3) Confirmá “Agregar”"
            )
          }
          style={commonBtnStyle}
        >
          Descargar app (iPhone)
        </button>
      </div>
    );
  }

  // Android/Chrome: si tenemos prompt -> instalamos “directo”
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
          style={commonBtnStyle}
        >
          Descargar app
        </button>
      </div>
    );
  }

  // ✅ Fallback Android: mostrar guía (porque Chrome a veces no da beforeinstallprompt)
  if (android) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() =>
            alert(
              "Para instalar en Android:\n\n1) Tocá los 3 puntitos (⋮)\n2) Elegí “Instalar app” o “Agregar a pantalla principal”\n3) Confirmá"
            )
          }
          style={commonBtnStyle}
        >
          Descargar app (Android)
        </button>
      </div>
    );
  }

  // Otros casos: no mostramos nada
  return null;
}