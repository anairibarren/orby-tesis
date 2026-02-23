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
function isChromium() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /chrome|crios|edg|opera|opr\//.test(ua);
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const ios = useMemo(
    () => (typeof window !== "undefined" ? isIOS() : false),
    []
  );
  const android = useMemo(
    () => (typeof window !== "undefined" ? isAndroid() : false),
    []
  );
  const chromium = useMemo(
    () => (typeof window !== "undefined" ? isChromium() : false),
    []
  );

  const standalone = useMemo(
    () => (typeof window !== "undefined" ? isStandalone() : false),
    [installed]
  );

  useEffect(() => {
    setDeferredPrompt(window.__orbyDeferredPrompt || null);

    const onAvail = () => setDeferredPrompt(window.__orbyDeferredPrompt || null);
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("orby:pwa-install-available", onAvail);
    window.addEventListener("orby:pwa-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("orby:pwa-install-available", onAvail);
      window.removeEventListener("orby:pwa-installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  // ✅ Mismo estilo para iPhone / Android / Windows
  const linkStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    color: "rgba(255,255,255,0.88)",
    fontWeight: 500,
    fontSize: 13,
    textDecoration: "underline",
    textUnderlineOffset: 4,
    cursor: "pointer",
  };

  const openInstructions = () => {
    if (ios) {
      alert(
        "En iPhone:\n\n1) Tocá Compartir (⬆️)\n2) “Agregar a pantalla de inicio”\n3) Confirmá “Agregar”"
      );
      return;
    }

    // Android / Windows (Chrome/Edge)
    alert(
      "Para instalar:\n\n• Android: Tocá ⋮ (3 puntitos) → “Instalar app”\n• PC (Chrome/Edge): buscá el ícono de instalación en la barra (o ⋮ → Instalar)\n\nSi no aparece todavía, recargá la página y probá de nuevo."
    );
  };

  const canPrompt = !!deferredPrompt;

  // Si no es iOS ni Android ni Chromium, no mostramos nada
  if (!ios && !android && !chromium) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        style={linkStyle}
        onClick={async () => {
          if (!canPrompt) return openInstructions();
          try {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
          } finally {
            window.__orbyDeferredPrompt = null;
            setDeferredPrompt(null);
          }
        }}
      >
        Descargar app
      </button>
    </div>
  );
}