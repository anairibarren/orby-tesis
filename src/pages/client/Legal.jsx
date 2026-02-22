// src/pages/client/Legal.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="px-5 pt-5 pb-3">
      <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
      {subtitle ? <p className="mt-1 text-[12px] text-black/45 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

function Disclosure({ title, icon, desc, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-black/[0.02] active:bg-black/[0.04]"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
            <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
          </span>

          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{title}</p>
            {desc ? <p className="mt-0.5 text-[12px] text-black/45 leading-relaxed">{desc}</p> : null}
          </div>
        </div>

        <IconifyIcon icon="mdi:chevron-down" className={["h-6 w-6 text-black/30 transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <div className="px-5 pb-4 text-[13px] text-black/60 leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-px w-full bg-black/5" />
    </div>
  );
}

function Pill({ icon, title, desc }) {
  return (
    <div className="rounded-[18px] bg-black/[0.03] px-4 py-3 flex items-start gap-3">
      <span className="h-9 w-9 rounded-full bg-white border border-black/10 grid place-items-center shrink-0">
        <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold text-[#3D3D3D]">{title}</p>
        <p className="mt-1 text-[12px] text-black/55 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function Legal() {
  const nav = useNavigate();

  const statuses = useMemo(
    () => [
      { k: "Solicitada", v: "Creaste un pedido y se envió al prestador." },
      { k: "Cotizada", v: "El prestador te envió un monto. Podés aceptarlo o rechazarlo." },
      { k: "Aceptada", v: "Aceptaste la cotización (o precio fijo) y queda lista para agendar." },
      { k: "Agendada", v: "Turno confirmado." },
      { k: "Cancelada", v: "La solicitud se canceló y el horario queda liberado." },
      { k: "Rechazada", v: "No se aceptó la solicitud/cotización." },
      { k: "Completada", v: "El servicio terminó y podés dejar reseña." },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div
        className="w-full pb-24 box-border overflow-x-hidden"
        style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}
      >
        <div
          className="mx-auto w-full max-w-[460px] box-border overflow-x-hidden"
          style={{
            paddingLeft: "max(16px, env(safe-area-inset-left))",
            paddingRight: "max(16px, env(safe-area-inset-right))",
          }}
        >
          {/* Header (sin p) */}
          <div className="relative flex items-center justify-center pt-3 overflow-visible">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="absolute left-0 top-[2px] h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-xl leading-none">‹</span>
            </button>

            <h1 className="text-[16px] font-extrabold text-[#3D3D3D]">Privacidad y términos</h1>
          </div>

          <div className="mt-4 grid gap-3">
            <Card>
              <SectionTitle title="Privacidad" subtitle="Qué se muestra, qué se guarda y para qué se usa." />

              <Disclosure icon="mdi:account-outline" title="Tu perfil" desc="Datos básicos para operar.">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Se guarda tu <span className="font-semibold text-black/70">nombre</span> y{" "}
                    <span className="font-semibold text-black/70">barrio</span> para personalizar la experiencia.
                  </li>
                  <li>Tu email no se muestra públicamente a prestadores.</li>
                </ul>
              </Disclosure>

              <Disclosure icon="mdi:heart-outline" title="Favoritos" desc="Prestadores guardados.">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Podés guardar prestadores para encontrarlos rápido.</li>
                  <li>Podés quitar favoritos cuando quieras.</li>
                </ul>
              </Disclosure>

              <Disclosure icon="mdi:clipboard-text-outline" title="Solicitudes" desc="Datos necesarios para el servicio.">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Se guardan tus pedidos, estados y horarios elegidos.</li>
                  <li>Esto permite seguimiento, historial y reseñas.</li>
                </ul>
              </Disclosure>
            </Card>

            <Card>
              <SectionTitle title="Términos de uso" subtitle="Reglas simples para evitar problemas." />

              <Disclosure icon="mdi:cash" title="Pagos y precios" desc="Cómo se interpreta el monto.">
                <p>
                  Si el servicio es <span className="font-semibold text-black/70">precio fijo</span>, vas a ver un valor base.
                  Si es <span className="font-semibold text-black/70">cotización</span>, el prestador te envía un monto para
                  aceptar o rechazar. El cobro se coordina por fuera entre partes para mantener orby simple.
                </p>
              </Disclosure>

              <Disclosure icon="mdi:alert-circle-outline" title="Conducta" desc="Cuidemos la comunidad.">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Usá lenguaje respetuoso y brindá información real.</li>
                  <li>Si algo no te cierra, cancelá y dejá un motivo.</li>
                  <li>No uses orby para contenidos engañosos.</li>
                </ul>
              </Disclosure>

              <Disclosure icon="mdi:clipboard-check-outline" title="Estados de solicitudes" desc="Qué significa cada estado.">
                <div className="grid gap-3">
                  {statuses.map((s) => (
                    <div key={s.k} className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                      <p className="text-[13px] font-extrabold text-[#3D3D3D]">{s.k}</p>
                      <p className="mt-1 text-[12px] text-black/60 leading-relaxed">{s.v}</p>
                    </div>
                  ))}
                </div>
              </Disclosure>

              <Disclosure icon="mdi:star-outline" title="Reseñas" desc="Cómo ayudan a mejorar.">
                <p>
                  Cuando una solicitud se completa, podés dejar una calificación y un comentario. Eso ayuda a que otros clientes
                  elijan mejor.
                </p>
              </Disclosure>

              <Disclosure icon="mdi:shield-check-outline" title="Seguridad" desc="Recomendaciones.">
                <div className="grid gap-3">
                  <Pill
                    icon="mdi:account-check-outline"
                    title="Verificación"
                    desc="Revisá reseñas y servicios publicados antes de contratar."
                  />
                  <Pill
                    icon="mdi:calendar-outline"
                    title="Coordinación"
                    desc="Confirmá día y horario y evitá cambios de último momento."
                  />
                  <Pill
                    icon="mdi:alert-outline"
                    title="Precaución"
                    desc="Si algo te parece sospechoso, evitá avanzar y cancelá la solicitud."
                  />
                </div>
              </Disclosure>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
