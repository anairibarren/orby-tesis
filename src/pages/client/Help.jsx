// src/pages/client/Help.jsx
import { useState } from "react";
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
            {/* ✅ cambio: antes tenía "truncate" y se cortaba */}
            <p className="text-[14px] font-extrabold text-[#3D3D3D] whitespace-normal break-words leading-snug">
              {title}
            </p>
            {desc ? <p className="mt-0.5 text-[12px] text-black/45 leading-relaxed">{desc}</p> : null}
          </div>
        </div>

        <IconifyIcon
          icon="mdi:chevron-down"
          className={["h-6 w-6 text-black/30 transition", open ? "rotate-180" : ""].join(" ")}
        />
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

export default function Help() {
  const nav = useNavigate();

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

            <h1 className="text-[16px] font-extrabold text-[#3D3D3D]">Ayuda y soporte</h1>
          </div>

          <div className="mt-4 grid gap-3">
            <Card>
              <SectionTitle title="Preguntas frecuentes" subtitle="Respuestas rápidas para usar orby sin vueltas." />

              <Disclosure
                icon="mdi:clipboard-text-outline"
                title="¿Cómo hago una solicitud?"
                desc="Elegí servicio, prestador y completá el pedido."
              >
                Entrá a una categoría, seleccioná un servicio y elegí un prestador. Luego completás el formulario y confirmás.
                Si el servicio es con cotización, el prestador puede enviarte un monto antes de agendar.
              </Disclosure>

              <Disclosure
                icon="mdi:calendar-check-outline"
                title="¿Cómo se agenda el turno?"
                desc="Confirmación de fecha y horario."
              >
                Una vez aceptada la cotización (o confirmado el precio fijo), podés elegir día y horario. El turno queda
                confirmado y se refleja en tu historial.
              </Disclosure>

              <Disclosure
                icon="mdi:close-circle-outline"
                title="¿Puedo cancelar?"
                desc="Depende del estado de la solicitud."
              >
                Sí. Podés cancelar según el estado. Recomendamos dejar un motivo para que quede registro y evitar confusiones.
              </Disclosure>

              <Disclosure
                icon="mdi:alert-decagram-outline"
                title="¿Qué hago si el prestador no se presenta?"
                desc='Marcá la solicitud como "incumplida".'
              >
                Si el prestador no se presenta en el día y horario acordado, podés marcar la solicitud como{" "}
                <strong>“incumplida”</strong>. Esto deja registro del inconveniente y te permite continuar sin tener que
                recoordinar ese turno. Recomendamos hacerlo cuando efectivamente pasó el horario pactado y el prestador no
                asistió.
              </Disclosure>

              <Disclosure
                icon="mdi:star-outline"
                title="¿Cómo dejo una reseña?"
                desc="Después de completar el servicio."
              >
                Cuando el servicio se marca como completado, vas a poder calificar y dejar un comentario. Eso ayuda a mejorar la
                experiencia para todos.
              </Disclosure>
            </Card>

            <Card>
              <SectionTitle title="Recomendaciones" subtitle="Buenas prácticas para coordinar mejor." />

              <div className="px-5 pb-5 grid gap-3">
                <Pill
                  icon="mdi:account-check-outline"
                  title="Elegí con confianza"
                  desc="Mirá reseñas y servicios publicados para decidir mejor."
                />
                <Pill
                  icon="mdi:calendar-outline"
                  title="Agendá con claridad"
                  desc="Confirmá día y horario y evitá cambios de último momento."
                />
                <Pill
                  icon="mdi:alert-outline"
                  title="Ante inconvenientes"
                  desc="Si algo no coincide con lo acordado, cancelá y dejá un motivo."
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
