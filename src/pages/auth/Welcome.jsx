// src/pages/auth/Welcome.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/img/logo-claro.png";
import InstallPWAButton from "../../components/InstallPWAButton";

export default function Welcome() {
  // ✅ PWA install
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // detectar si ya está instalada (PWA)
    const checkInstalled = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true; // iOS
      setIsInstalled(!!standalone);
    };

    checkInstalled();

    const onBeforeInstallPrompt = (e) => {
      // Chrome/Edge/Android
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onMqlChange = () => checkInstalled();
    mql?.addEventListener?.("change", onMqlChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mql?.removeEventListener?.("change", onMqlChange);
    };
  }, []);

  async function handleInstall() {
    try {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch {
      // no-op
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#1E2F5D] overflow-hidden">
      {/* ✅ Un solo contenedor “full” con safe-areas */}
      <div
        className="min-h-[100dvh] px-6 relative flex flex-col"
        style={{
          paddingTop: "max(18px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {/* logo arriba */}
        <div className="absolute left-1/2 top-[max(28px,env(safe-area-inset-top))] -translate-x-1/2">
          <img
            src={logo}
            alt="orby"
            className="h-10 w-auto select-none opacity-95"
            draggable="false"
          />
        </div>

        {/* contenido centrado (usa flex-1 real, no min-h-screen) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm text-center">
            <h1 className="text-[34px] leading-[1.06] font-extrabold tracking-tight text-white">
              Bienvenido
            </h1>

            <p className="mt-3 text-[13px] text-white/70 leading-relaxed">
              Iniciá sesión o creá tu cuenta para continuar.
            </p>

            <div className="mt-10 grid gap-3">
              <Link
                to="/login"
                className="w-full h-[54px] rounded-full bg-white text-[#1E2F5D] font-extrabold grid place-items-center
                           shadow-[0_18px_45px_rgba(0,0,0,0.18)] active:scale-[0.99] transition"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/register"
                className="w-full h-[54px] rounded-full bg-white/10 text-white font-extrabold grid place-items-center
                           border border-white/20 shadow-[0_14px_36px_rgba(0,0,0,0.16)] active:scale-[0.99] transition"
              >
                Crear cuenta
              </Link>
              <InstallPWAButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}