// src/pages/client/RequestSuccess.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { useMemo } from "react";

function successKey() {
  return `orby_last_success`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });
}

function paymentLabel(method) {
  const m = String(method || "").toLowerCase();
  if (m === "cash") return "Efectivo";
  if (m === "mp") return "Mercado Pago";
  if (m === "card") return "Tarjeta";
  return "—";
}

export default function ClientRequestSuccess() {
  const nav = useNavigate();
  const location = useLocation();

  const summary = useMemo(() => {
    if (location?.state && typeof location.state === "object") return location.state;

    const raw = localStorage.getItem(successKey());
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [location?.state]);

  const paymentMethod = summary?.paymentMethod ?? summary?.payment_method ?? null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      {/* Overlay + Bottom Sheet */}
      <div className="fixed inset-0 z-[9999]">
        <div className="absolute inset-0 bg-black/35" />

        <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
          <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden">
            {/* Handle */}
            <div className="pt-3 flex justify-center">
              <div className="h-1.5 w-14 rounded-full bg-black/10" />
            </div>

            <div className="relative px-6 pt-5 pb-6">
              <button
                type="button"
                onClick={() => nav("/client/requests", { replace: true })}
                className="absolute right-4 top-4 h-12 w-12 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
              </button>

              <div className="flex items-start gap-3">
                <span className="h-12 w-12 rounded-full bg-[#EAF2FF] grid place-items-center shrink-0">
                  {/* Icono alineado a marca (sin verde) */}
                  <IconifyIcon icon="mdi:sparkles" className="h-7 w-7 text-[#1E2F5D]" />
                </span>

                <div className="min-w-0">
                  <p className="text-[18px] font-extrabold text-[#1E2F5D] leading-tight">Solicitud enviada</p>
                  <p className="mt-1 text-[13px] text-black/55 leading-snug">
                    El prestador la va a ver en sus solicitudes y te confirma desde ahí.
                  </p>
                </div>
              </div>

              {/* Resumen minimal */}
              <div className="mt-5 rounded-[18px] bg-black/[0.03] p-4">
                <p className="text-[12px] font-semibold text-black/45">Resumen</p>

                <p className="mt-1 text-[15px] font-extrabold text-[#3D3D3D]">
                  {summary?.serviceName || "Servicio"}
                </p>

                <div className="mt-4 grid gap-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-black/45">Fecha y hora</span>
                    <span className="font-semibold text-black/70">{formatDateTime(summary?.datetimeISO)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-black/45">Método de pago</span>
                    <span className="font-semibold text-black/70">{paymentLabel(paymentMethod)}</span>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => nav("/client/requests", { replace: true })}
                  className="w-full h-[54px] rounded-full bg-[#1E2F5D] text-white text-[15px] font-extrabold shadow-[0_10px_22px_rgba(30,47,93,0.20)] active:scale-[0.99] transition"
                >
                  Ver mis solicitudes
                </button>

                <button
                  onClick={() => nav("/client", { replace: true })}
                  className="w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[15px] font-extrabold active:scale-[0.99] transition"
                >
                  Seguir explorando
                </button>
              </div>

              <p className="mt-4 text-center text-[11px] text-black/40">
                Podés cerrar y seguir usando la app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
