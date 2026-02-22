// src/components/OfflineOverlay.jsx
import { useEffect, useState } from "react";

export default function OfflineOverlay() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const on = () => {
      setOffline(false);
      // cuando vuelve la conexión, recién ahí recargamos para reintentar fetchs
      location.reload();
    };
    const off = () => setOffline(true);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  function handleRetry() {
    // ✅ si sigue offline, NO recargamos (evita pantalla del navegador)
    if (!navigator.onLine) return;
    location.reload();
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/40 grid place-items-center px-6">
      <div className="w-full max-w-[380px] rounded-[22px] bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col items-center text-center">
          {/* Icono sin wifi */}
          <div className="h-14 w-14 rounded-full bg-black/[0.06] grid place-items-center">
            <svg
              className="h-7 w-7 text-black/55"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* wifi arcs */}
              <path d="M5 9.5a11 11 0 0 1 14 0" />
              <path d="M7.8 12.3a7 7 0 0 1 8.4 0" />
              <path d="M10.6 15.1a3 3 0 0 1 2.8 0" />
              <path d="M12 18h0" />
              {/* slash */}
              <path d="M4 4l16 16" />
            </svg>
          </div>

          <p className="mt-4 text-[16px] font-extrabold text-[#3D3D3D]">
            Sin conexión a internet
          </p>

          <p className="mt-2 text-[12px] leading-[18px] text-black/50 max-w-[300px]">
            Algunas secciones no pueden actualizarse. Revisá tu Wi-Fi o datos móviles y volvé a intentar.
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-5 h-11 px-10 rounded-full bg-[#1E2F5D] text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(30,47,93,0.22)] active:scale-[0.98] transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}