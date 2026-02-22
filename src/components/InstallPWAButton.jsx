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
  // Chrome / Edge / Opera (suficiente para nuestro caso)
  return /chrome|crios|edg|opera|opr\//.test(ua);
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const ios = useMemo(() => (typeof window !== "undefined" ? isIOS() : false), []);
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
    // ✅ Tomar el prompt global si ya existe
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

  const btnStyle = {
    width: "100%",
    height: 54,
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    fontWeight: 800,
    boxShadow: "0 14px 36px rgba(0,0,0,0.16)",
  };

  const openInstructions = () => {
    if (ios) {
      alert(
        "En iPhone:\n\n1) Tocá Compartir (⬆️)\n2) “Agregar a pantalla de inicio”\n3) Confirmá “Agregar”"
      );
      return;
    }

    // Android o Desktop Chromium
    alert(
      "Para instalar:\n\n• Android: Tocá ⋮ (3 puntitos) → “Instalar app”\n• PC (Chrome/Edge): buscá el ícono de instalación en la barra (o ⋮ → Instalar)\n\nSi no aparece todavía, recargá la página y probá de nuevo."
    );
  };

  // ✅ Si tenemos prompt real -> instalamos directo
  const canPrompt = !!deferredPrompt;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
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
        style={btnStyle}
      >
        Descargar app
      </button>

      {/* opcional: si querés, podés mostrar mini texto debajo cuando no hay prompt */}
      {/* {!canPrompt && (android || chromium || ios) ? (
        <p style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          Si no aparece el pop-up, instalá desde el menú del navegador.
        </p>
      ) : null} */}
    </div>
  );
}