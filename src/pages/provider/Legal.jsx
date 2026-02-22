// src/pages/provider/Legal.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

/* ---------------- UI atoms ---------------- */
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

/* ---------------- Page ---------------- */
export default function Legal() {
  const nav = useNavigate();

  const statuses = useMemo(
    () => [
      { k: "Solicitada", v: "Te llegó un pedido nuevo." },
      { k: "Cotizada", v: "Enviaste un monto y el cliente lo puede aceptar o rechazar." },
      { k: "Aceptada", v: "El cliente aceptó y queda lista para agendar." },
      { k: "Agendada", v: "Turno confirmado." },
      { k: "Cancelada", v: "Se canceló y el horario queda liberado." },
      { k: "Rechazada", v: "No se aceptó la solicitud." },
      { k: "Completada", v: "El servicio terminó y el cliente puede dejar reseña." },
    ],
    []
  );

  return (
        <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">      {/* ✅ safe area TOP real */}
        <div
            className="w-full pb-24 box-border overflow-x-hidden"
            style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}
        >
        {/* ✅ safe area L/R */}
        <div
        className="mx-auto w-full max-w-[460px] box-border overflow-x-hidden"
        style={{
            paddingLeft: "max(16px, env(safe-area-inset-left))",
            paddingRight: "max(16px, env(safe-area-inset-right))",
        }}
        >
        {/* Header (centrado + back izq) */}
        <div className="relative flex items-center justify-center pt-3">
            <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 top-0 h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
            >
            <span className="text-xl leading-none">‹</span>
            </button>

            <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Privacidad y términos</h1>
        </div>

          <div className="mt-4 grid gap-3">
            {/* PRIVACIDAD */}
            <Card>
              <SectionTitle
                title="Privacidad"
                subtitle="Qué se muestra, qué se guarda y para qué se usa."
              />

              <Disclosure
                icon="mdi:account-outline"
                title="Tu perfil"
                desc="Información visible para clientes."
              >
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Se muestran tu <span className="font-semibold text-black/70">nombre</span>, <span className="font-semibold text-black/70">barrio</span> y <span className="font-semibold text-black/70">descripción</span> para que puedan encontrarte.
                  </li>
                  <li>
                    Tu email no se muestra públicamente.
                  </li>
                </ul>
              </Disclosure>

              <Disclosure
                icon="mdi:file-certificate-outline"
                title="Certificaciones"
                desc="Archivos que subís para respaldo."
              >
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Los archivos se usan para respaldar tu perfil (por ejemplo, para verificación).
                  </li>
                  <li>
                    Podés eliminarlos cuando quieras desde “Editar perfil”.
                  </li>
                </ul>
              </Disclosure>

              <Disclosure
                icon="mdi:clipboard-text-outline"
                title="Solicitudes y agenda"
                desc="Datos necesarios para operar."
              >
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Se guardan solicitudes, estados y horarios para que puedas gestionar tu trabajo.
                  </li>
                  <li>
                    Las notificaciones existen para avisarte cambios importantes (cotizaciones, confirmaciones, cancelaciones).
                  </li>
                </ul>
              </Disclosure>
            </Card>

            {/* TÉRMINOS */}
            <Card>
              <SectionTitle
                title="Términos de uso"
                subtitle="Reglas simples para evitar problemas."
              />

              <Disclosure
                icon="mdi:cash-remove"
                title="Pagos y precios"
                desc="Cómo se interpreta el monto."
              >
                <p>
                  El precio o la cotización funcionan como referencia. El cobro se coordina por fuera entre cliente y prestador. Eso ayuda a mantener la app simple.
                </p>
              </Disclosure>

              <Disclosure
                icon="mdi:alert-circle-outline"
                title="Contenido y conducta"
                desc="Lo que pedimos para cuidar la comunidad."
              >
                <ul className="list-disc pl-5 space-y-2">
                  <li>Usar lenguaje respetuoso y brindar información real.</li>
                  <li>No publicar contenido engañoso.</li>
                  <li>Si hay un inconveniente, se recomienda cancelar y dejar un motivo.</li>
                </ul>
              </Disclosure>

              <Disclosure
                icon="mdi:clipboard-check-outline"
                title="Estados de solicitudes"
                desc="Qué significa cada estado."
              >
                <div className="grid gap-3">
                  {statuses.map((s) => (
                    <div key={s.k} className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                      <p className="text-[13px] font-extrabold text-[#3D3D3D]">{s.k}</p>
                      <p className="mt-1 text-[12px] text-black/60 leading-relaxed">{s.v}</p>
                    </div>
                  ))}
                </div>
              </Disclosure>

              <Disclosure
                icon="mdi:star-outline"
                title="Reseñas"
                desc="Cómo aparecen en tu perfil."
              >
                <p>
                  Cuando un servicio se completa, el cliente puede dejar una calificación y un comentario. Eso se muestra en “Mis reseñas”.
                </p>
              </Disclosure>

              <Disclosure
                icon="mdi:account-eye-outline"
                title="Visibilidad"
                desc="Tu perfil está para que te contraten."
              >
                <p>
                  Tu perfil se muestra dentro de <span className="font-semibold text-black/70">orby</span> para que los clientes puedan encontrarte. Si no querés recibir solicitudes, podés pausar tu disponibilidad.
                </p>
              </Disclosure>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
