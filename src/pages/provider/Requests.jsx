// src/pages/provider/Requests.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { listIncomingRequests, updateRequest, deleteRequest } from "../../services/requests";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabase";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { ensureAppointmentForRequest, confirmAppointmentByRequestId, cancelAppointmentByRequestId } from "../../services/appointments";

/* ---------------- utils ---------------- */
const norm = (v) => String(v ?? "").toLowerCase();

function isMissingColumn(err, col) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes(`column "${col.toLowerCase()}" does not exist`);
}
function addMinutesISO(startISO, minutes) {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() + Number(minutes || 0));
  return d.toISOString();
}
function safeTS(iso) {
  const t = new Date(iso || "").getTime();
  return Number.isFinite(t) ? t : NaN;
}
function formatTurno(preferred_datetime) {
  if (!preferred_datetime) return { date: "—", time: "", ts: NaN };
  const d = new Date(preferred_datetime);
  const date = d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return { date, time, ts: d.getTime() };
}
function formatMoneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return `$${num.toLocaleString("es-AR")}`;
}
function getPricingType(r) {
  return r?.catalog?.pricing_type || r?.provider_service?.service_catalog?.pricing_type || r?.service_catalog?.pricing_type || null;
}
function getFixedPrice(r) {
  return (
    r?.fixed_price ??
    r?.catalog?.fixed_price ??
    r?.catalog?.price ??
    r?.catalog?.base_price ??
    r?.provider_service?.base_price ??
    r?.provider_service?.price ??
    null
  );
}

/** ✅ MÁS ROBUSTO: intentar sacar nombre real del cliente */
function getClientName(r) {
  const candidates = [
    r?.client?.full_name,
    r?.client?.name,
    r?.client_profile?.full_name,
    r?.client_profile?.name,
    r?.profile?.full_name,
    r?.profiles?.full_name,
    r?.client_full_name,
    r?.client_name,
    r?.clientName,
    r?.customer_name,
    r?.customer?.full_name,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const cleaned = candidates.filter((x) => norm(x) !== "sin nombre" && norm(x) !== "s/n");
  return cleaned[0] || candidates[0] || "Sin nombre";
}

function truncateText(v, max = 110) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ✅ NUEVO: mostrar SOLO descripción (sin bloque de ubicación/barrio/dirección) */
function cleanDescriptionForCard(desc) {
  const raw = String(desc || "").trim();
  if (!raw) return "";
  const marker = "📍 Ubicación:";
  let base = raw;
  const idx = raw.indexOf(marker);
  if (idx !== -1) base = raw.slice(0, idx).trim();

  // además filtramos líneas tipo "Ubicación:", "Barrio:", "Dirección:" si vinieran sueltas
  const lines = base
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => {
      const x = norm(l);
      return !(x.startsWith("ubicación:") || x.startsWith("ubicacion:") || x.startsWith("barrio:") || x.startsWith("dirección:") || x.startsWith("direccion:"));
    });

  return lines.join("\n").trim();
}

/* ---------------- constants ---------------- */
const STATUS = {
  SOLICITADA: "solicitada",
  COTIZADA: "cotizada",
  ACEPTADA: "aceptada",
  AGENDADA: "agendada",
  RECHAZADA: "rechazada",
  CANCELADA: "cancelada",
  COMPLETADA: "completada",
};

const FILTERS = {
  TODAS: "todas",
  PENDIENTES: "pendientes",
  AGENDADAS: "agendadas",
  CANCELADAS: "canceladas",
  RECHAZADAS: "rechazadas",
};

const PENDIENTES_SET = new Set([STATUS.SOLICITADA, STATUS.COTIZADA, STATUS.ACEPTADA]);
const AGENDADAS_SET = new Set([STATUS.AGENDADA]);
const CANCELADAS_SET = new Set([STATUS.CANCELADA]);
const RECHAZADAS_SET = new Set([STATUS.RECHAZADA]);

/* ---------------- UI atoms ---------------- */
function IconButton({ onClick, title, children, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        "h-11 w-11 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition border border-black/10",
        disabled ? "opacity-60 cursor-not-allowed active:scale-100" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function statusStyle(status) {
  const s = norm(status);
  const map = {
    solicitada: "bg-[#FFF5CC] text-[#7A5B00]",
    cotizada: "bg-[#F1E8FF] text-[#4B2A8A]",
    aceptada: "bg-[#E9FFF6] text-[#0F6B3D]",
    agendada: "bg-[#EAF2FF] text-[#1E2F5D]",
    rechazada: "bg-[#FFE6EA] text-[#9B1C1C]",
    cancelada: "bg-black/[0.06] text-black/70",
    completada: "bg-[#E8FFF2] text-[#0F6B3D]",
  };
  return map[s] || "bg-black/[0.06] text-black/70";
}
function StatusBadge({ status }) {
  return (
    <span className={["inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold capitalize", statusStyle(status)].join(" ")}>
      {status || "—"}
    </span>
  );
}

function FilterChip({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]",
        active ? "bg-[#1E2F5D] text-white shadow-[0_6px_18px_rgba(30,47,93,0.18)]" : "bg-white text-[#3D3D3D] shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className={["rounded-full px-2 py-[2px] text-[12px]", active ? "bg-white/20 text-white" : "bg-black/[0.04] text-black/50"].join(" ")}>
        {count}
      </span>
    </button>
  );
}

function RequestCardSkeleton() {
  return (
    <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-4 py-4 select-none animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-[14px] w-[78%] rounded bg-black/10" />
          <div className="mt-2 h-[12px] w-[44%] rounded bg-black/10" />
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <div className="h-6 w-[86px] rounded-full bg-black/10" />
          <div className="h-9 w-9 rounded-full bg-black/10" />
          <div className="h-9 w-9 rounded-full bg-black/10" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="h-6 w-[150px] rounded-full bg-black/10" />
        <div className="h-6 w-[120px] rounded-full bg-black/10" />
      </div>

      <div className="mt-3 h-4 w-[90%] rounded bg-black/10" />
      <div className="mt-3 h-11 w-full rounded-full bg-black/10" />
    </div>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-5">
      <div className="flex items-start gap-3">
        <span className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
          <IconifyIcon icon="mdi:inbox-outline" className="h-6 w-6 text-black/35" />
        </span>

        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
          <p className="mt-1 text-[12px] text-black/45">{desc}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- BottomSheet base ---------------- */
function Sheet({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[9999]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Cerrar" />

          <motion.div
            className="absolute left-0 right-0 bottom-0"
            initial={{ y: 44, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 44, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto w-full max-w-[520px] px-4 pb-6">
              <div className="rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Cancel sheet ---------------- */
function CancelTurnSheet({ open, serviceName, onClose, onConfirm, busy, reason, setReason }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pt-3 flex justify-center">
        <div className="h-1.5 w-14 rounded-full bg-black/10" />
      </div>

      <div className="px-6 pt-5 pb-4">
        <h3 className="text-[22px] font-extrabold text-[#3D3D3D]">Cancelar turno</h3>

        <p className="mt-2 text-[14px] text-black/50 leading-snug">
          ¿Seguro que querés cancelar el turno de <b>{serviceName}</b>?
          <br />
          <span className="text-[12px] text-black/45">Se liberará el horario automáticamente.</span>
        </p>
      </div>

      <div className="px-6 pb-6">
        <p className="text-[12px] font-semibold text-black/60">
          Motivo <span className="text-red-600">*</span>
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Tuve un imprevisto..."
          className="mt-2 w-full min-h-[96px] rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none placeholder:text-black/30"
        />

        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={[
            "mt-4 w-full h-[54px] rounded-full text-white text-[16px] font-extrabold shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition",
            busy ? "bg-[#1E2F5D]/60" : "bg-[#1E2F5D]",
          ].join(" ")}
        >
          {busy ? "Cancelando..." : "Cancelar turno"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[16px] font-extrabold active:scale-[0.99] transition"
        >
          Volver
        </button>
      </div>
    </Sheet>
  );
}

/* ---------------- Delete sheet ---------------- */
function ConfirmDeleteSheet({ open, title, desc, onClose, onConfirm, busy }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pt-3 flex justify-center">
        <div className="h-1.5 w-14 rounded-full bg-black/10" />
      </div>

      <div className="relative px-6 pt-5 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 h-12 w-12 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
        </button>

        <h3 className="text-[22px] font-extrabold text-[#3D3D3D]">{title}</h3>
        <p className="mt-2 text-[14px] text-black/50 leading-snug">{desc}</p>
      </div>

      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={[
            "w-full h-[54px] rounded-full text-white text-[16px] font-extrabold shadow-[0_10px_24px_rgba(220,38,38,0.22)] active:scale-[0.99] transition",
            busy ? "bg-red-600/60" : "bg-red-600",
          ].join(" ")}
        >
          {busy ? "Eliminando..." : "Eliminar"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[16px] font-extrabold active:scale-[0.99] transition"
        >
          Cancelar
        </button>
      </div>
    </Sheet>
  );
}

/* ---------------- permissions ---------------- */
function canReject(req) {
  const s = norm(req?.status);
  // ✅ NO mostrar rechazar en completada
  return s !== STATUS.AGENDADA && s !== STATUS.CANCELADA && s !== STATUS.RECHAZADA && s !== STATUS.COMPLETADA;
}
function canCancelScheduled(req) {
  return norm(req?.status) === STATUS.AGENDADA;
}
function canDelete(req) {
  const s = norm(req?.status);
  return s === STATUS.CANCELADA || s === STATUS.RECHAZADA;
}

/* ---------------- page ---------------- */
export default function Requests() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [filter, setFilter] = useState(FILTERS.TODAS);
  const [quoteMap, setQuoteMap] = useState({}); // requestId -> amount

  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReq, setCancelReq] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReq, setDeleteReq] = useState(null);

  const [busyId, setBusyId] = useState(null);

  const [clientNameMap, setClientNameMap] = useState({}); // clientId -> full_name

  // ✅ FIX: evita el “flash” del botón Confirmar turno (optimista hasta que llegue DB)
  const [optimisticStatus, setOptimisticStatus] = useState({}); // { [requestId]: status }

  const selectedName = useMemo(() => {
    return selectedReq?.catalog?.name || selectedReq?.provider_service?.service_catalog?.name || "este servicio";
  }, [selectedReq]);

  const cancelName = useMemo(() => {
    return cancelReq?.catalog?.name || cancelReq?.provider_service?.service_catalog?.name || "este servicio";
  }, [cancelReq]);

  const deleteName = useMemo(() => {
    return deleteReq?.catalog?.name || deleteReq?.provider_service?.service_catalog?.name || "este servicio";
  }, [deleteReq]);

  async function refresh({ silent = false } = {}) {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    setErr("");

    try {
      const data = await listIncomingRequests(user.id);

      // ✅ si ya llegó el status real, limpiamos el optimista de esos ids
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        (data || []).forEach((r) => {
          const id = r?.id;
          if (!id) return;
          const real = norm(r?.status);
          const opt = norm(next[id]);
          if (opt && real === opt) delete next[id];
        });
        return next;
      });

      setItems(data || []);
    } catch (e) {
      const msg = e?.message || "Error cargando solicitudes";
      setErr(msg);
      if (!silent) toast.error("Error", msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    const ids = (items || [])
      .map((r) => r?.client_id)
      .filter(Boolean)
      .filter((id) => !clientNameMap[id])
      .filter((id) => {
        const r = items.find((x) => x?.client_id === id);
        const n = getClientName(r);
        return norm(n) === "sin nombre" || norm(n) === "cliente";
      });

    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;

    (async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", unique);
      if (error) return;

      setClientNameMap((prev) => {
        const next = { ...prev };
        (data || []).forEach((p) => {
          const name = String(p?.full_name || "").trim();
          if (p?.id && name) next[p.id] = name;
        });
        return next;
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const reqCh = supabase
      .channel(`provider-requests-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `provider_id=eq.${user.id}` }, () =>
        refresh({ silent: true })
      )
      .subscribe();

    const apptCh = supabase
      .channel(`provider-appts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `provider_id=eq.${user.id}` }, () =>
        refresh({ silent: true })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reqCh);
      supabase.removeChannel(apptCh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const counts = useMemo(() => {
    const all = items.length;
    const pending = items.filter((r) => PENDIENTES_SET.has(norm(r.status))).length;
    const scheduled = items.filter((r) => AGENDADAS_SET.has(norm(r.status))).length;
    const cancelled = items.filter((r) => CANCELADAS_SET.has(norm(r.status))).length;
    const rejected = items.filter((r) => RECHAZADAS_SET.has(norm(r.status))).length;
    return { all, pending, scheduled, cancelled, rejected };
  }, [items]);

  const filteredItems = useMemo(() => {
    const st = (r) => norm(r.status);
    let arr = [...items];

    if (filter === FILTERS.PENDIENTES) arr = arr.filter((r) => PENDIENTES_SET.has(st(r)));
    if (filter === FILTERS.AGENDADAS) arr = arr.filter((r) => AGENDADAS_SET.has(st(r)));
    if (filter === FILTERS.CANCELADAS) arr = arr.filter((r) => CANCELADAS_SET.has(st(r)));
    if (filter === FILTERS.RECHAZADAS) arr = arr.filter((r) => RECHAZADAS_SET.has(st(r)));

    if (filter === FILTERS.AGENDADAS) {
      arr.sort((a, b) => {
        const ta = safeTS(a?.preferred_datetime);
        const tb = safeTS(b?.preferred_datetime);
        return (Number.isFinite(ta) ? ta : Infinity) - (Number.isFinite(tb) ? tb : Infinity);
      });
    } else {
      arr.sort((a, b) => {
        const ta = safeTS(a?.created_at) || safeTS(a?.preferred_datetime);
        const tb = safeTS(b?.created_at) || safeTS(b?.preferred_datetime);
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      });
    }

    return arr;
  }, [items, filter]);

  const emptyCopy = useMemo(() => {
    if (filter === FILTERS.PENDIENTES) return { title: "No hay solicitudes pendientes", desc: "Cuando te llegue una nueva solicitud o una para cotizar, aparece acá." };
    if (filter === FILTERS.AGENDADAS) return { title: "No hay turnos agendados", desc: "Cuando confirmes un turno, lo vas a ver acá." };
    if (filter === FILTERS.CANCELADAS) return { title: "No hay solicitudes canceladas", desc: "Acá quedan las canceladas para referencia (y podés eliminarlas)." };
    if (filter === FILTERS.RECHAZADAS) return { title: "No hay solicitudes rechazadas", desc: "Acá quedan las rechazadas para referencia (y podés eliminarlas)." };
    return { title: "Todavía no te llegaron solicitudes", desc: "Cuando un cliente te escriba, vas a poder cotizar o agendar desde acá." };
  }, [filter]);

  function canQuote(req) {
    const pricingType = getPricingType(req);
    return pricingType === "B" && norm(req?.status) === STATUS.SOLICITADA;
  }

  function canSchedule(req) {
    if (!req) return false;
    const s = norm(req.status);
    if (s === STATUS.AGENDADA) return false;
    if (!req.preferred_datetime) return false;

    const pricingType = getPricingType(req);
    if (pricingType === "B") return s === STATUS.ACEPTADA;
    return s === STATUS.SOLICITADA || s === STATUS.ACEPTADA;
  }

  async function sendQuote(req) {
    const amount = quoteMap[req.id];
    const num = Number(amount);

    if (!Number.isFinite(num) || num <= 0) return toast.warning("Cotización inválida", "Ingresá un monto válido.");

    try {
      setBusyId(req.id);
      await updateRequest(req.id, { status: STATUS.COTIZADA, quote_amount: num });

      // ✅ NOTI al CLIENTE: nueva cotización
      try {
        const serviceName = req?.catalog?.name || req?.provider_service?.service_catalog?.name || "un servicio";
        await safeCreateNotification({
          user_id: req.client_id, // destinatario
          actor_id: user?.id || null, // quien hace la acción
          type: "quote_new",
          title: "Nueva cotización",
          body: `${serviceName}: ${formatMoneyARS(num) || ""}`.trim(),
          metadata: {
            request_id: req.id,
            provider_id: req.provider_id,
            client_id: req.client_id,
            quote_amount: num,
          },
          is_read: false,
        });
      } catch {
        // no rompe
      }

      toast.success("Cotización enviada", "El cliente ya puede aceptarla o rechazarla.");
      setItems((prev) => prev.map((x) => (x.id === req.id ? { ...x, status: STATUS.COTIZADA, quote_amount: num } : x)));
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo enviar cotización.");
    } finally {
      setBusyId(null);
    }
  }

  async function getDurationMinutesForRequest(req) {
    const serviceId = req?.service_id ?? req?.provider_service_id ?? null;
    if (!serviceId) return 60;

    let res = await supabase.from("provider_services").select("id, duration_minutes").eq("id", serviceId).single();
    if (res.error && isMissingColumn(res.error, "duration_minutes")) return 60;
    if (res.error) return 60;

    const n = Number(res.data?.duration_minutes);
    return Number.isFinite(n) && n > 0 ? n : 60;
  }

  async function schedule(req) {
    try {
      if (!req?.preferred_datetime) return toast.warning("Falta horario", "La solicitud no tiene fecha/hora.");

      setBusyId(req.id);

      // ✅ optimista: escondemos el botón inmediatamente (evita el flash feo)
      setOptimisticStatus((m) => ({ ...m, [req.id]: STATUS.AGENDADA }));

      const durationMin = await getDurationMinutesForRequest(req);
      const startISO = new Date(req.preferred_datetime).toISOString();
      const endISO = addMinutesISO(startISO, durationMin);

      await ensureAppointmentForRequest({
        request_id: req.id,
        provider_id: req.provider_id,
        client_id: req.client_id,
        start_at: startISO,
        end_at: endISO,
      });

      await confirmAppointmentByRequestId(req.id);
      await updateRequest(req.id, { status: STATUS.AGENDADA });

      // ✅ NOTI al CLIENTE: turno confirmado
      try {
        const serviceName = req?.catalog?.name || req?.provider_service?.service_catalog?.name || "un servicio";
        const when = formatWhen(req.preferred_datetime);
        await safeCreateNotification({
          user_id: req.client_id,
          actor_id: user?.id || null,
          type: "request_agendada",
          title: "Turno confirmado",
          body: `${serviceName} · ${when}`,
          metadata: {
            request_id: req.id,
            provider_id: req.provider_id,
            client_id: req.client_id,
            preferred_datetime: req.preferred_datetime ?? null,
          },
          is_read: false,
        });
      } catch {}

      toast.success("Agendado", "El turno quedó confirmado.");
      setItems((prev) => prev.map((x) => (x.id === req.id ? { ...x, status: STATUS.AGENDADA } : x)));
      refresh({ silent: true });
    } catch (e) {
      // si falló, revertimos el optimista para que no “mienta”
      setOptimisticStatus((m) => {
        const next = { ...m };
        delete next[req?.id];
        return next;
      });

      toast.error("Error", e?.message || "No se pudo agendar.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  function openReject(req) {
    setSelectedReq(req);
    setRejectOpen(true);
  }
  function closeReject() {
    setRejectOpen(false);
    setSelectedReq(null);
  }

  async function confirmReject() {
    if (!selectedReq) return;

    try {
      setBusyId(selectedReq.id);

      await updateRequest(selectedReq.id, { status: STATUS.RECHAZADA });
      await cancelAppointmentByRequestId(selectedReq.id, {
        cancelled_by: "provider",
        cancelled_reason: "Rechazado por el prestador",
      });

      // ✅ NOTI al CLIENTE: solicitud rechazada
      try {
        const serviceName = selectedReq?.catalog?.name || selectedReq?.provider_service?.service_catalog?.name || "un servicio";
        await safeCreateNotification({
          user_id: selectedReq.client_id,
          actor_id: user?.id || null,
          type: "request_rejected",
          title: "Solicitud rechazada",
          body: `${serviceName} · Rechazada por el prestador`,
          metadata: {
            request_id: selectedReq.id,
            provider_id: selectedReq.provider_id,
            client_id: selectedReq.client_id,
          },
          is_read: false,
        });
      } catch {}

      setItems((prev) => prev.map((x) => (x.id === selectedReq.id ? { ...x, status: STATUS.RECHAZADA } : x)));
      toast.success("Solicitud rechazada", "Se informó al cliente y se liberó el horario.");
      closeReject();
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo rechazar.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  function openCancel(req) {
    setCancelReq(req);
    setCancelReason("");
    setCancelOpen(true);
  }
  function closeCancel() {
    setCancelOpen(false);
    setCancelReq(null);
    setCancelReason("");
  }

  async function confirmCancel() {
    if (!cancelReq?.id) return;
    if (!canCancelScheduled(cancelReq)) return;

    const reason = String(cancelReason || "").trim();
    if (!reason) return toast.warning("Motivo obligatorio", "Escribí un motivo para cancelar el turno.");

    try {
      setBusyId(cancelReq.id);

      await updateRequest(cancelReq.id, { status: STATUS.CANCELADA });

      await cancelAppointmentByRequestId(cancelReq.id, {
        cancelled_by: "provider",
        cancelled_reason: reason,
      });

      setItems((prev) => prev.map((x) => (x.id === cancelReq.id ? { ...x, status: STATUS.CANCELADA } : x)));
      toast.success("Turno cancelado", "Se liberó el horario y se notificará al cliente.");
      closeCancel();
      refresh({ silent: true });
    } catch (e) {
      toast.error("No se pudo cancelar", e?.message || "Revisá RLS/policies.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  function openDelete(req) {
    setDeleteReq(req);
    setDeleteOpen(true);
  }
  function closeDelete() {
    setDeleteOpen(false);
    setDeleteReq(null);
  }
  async function confirmDelete() {
    if (!deleteReq?.id) return;
    if (!canDelete(deleteReq)) return;

    const id = deleteReq.id;

    try {
      setBusyId(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      await deleteRequest(id);
      toast.success("Eliminada", "Ya no aparece en tu lista.");
      closeDelete();
      refresh({ silent: true });
    } catch (e) {
      toast.error("No se pudo eliminar", e?.message || "Revisá RLS/policies.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  const subtitle = useMemo(() => {
    if (counts.pending > 0) return `Tenés ${counts.pending} pendiente(s) para responder`;
    if (counts.scheduled > 0) return `Tenés ${counts.scheduled} agendada(s)`;
    return "Gestioná tus solicitudes de forma rápida";
  }, [counts.pending, counts.scheduled]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      {/* ✅ centrado real + márgenes iguales */}
      <div className="w-full px-4 pt-[40px] pb-6 box-border">
        <div className="mx-auto w-full max-w-[520px]">
          {/* Top */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">Solicitudes</h1>
              <p className="mt-1 text-[13px] text-black/45">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <IconButton onClick={() => refresh()} title="Actualizar">
                <IconifyIcon icon="mdi:refresh" className="h-6 w-6 text-black/40" />
              </IconButton>
            </div>
          </div>

          {/* Chips */}
          <div className="mt-6 -mx-4 px-4 overflow-x-auto hide-scrollbar pb-1">
            <style>{`
              .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="flex gap-3 w-max">
              <FilterChip active={filter === FILTERS.TODAS} label="Todas" count={counts.all} onClick={() => setFilter(FILTERS.TODAS)} />
              <FilterChip active={filter === FILTERS.PENDIENTES} label="Pendientes" count={counts.pending} onClick={() => setFilter(FILTERS.PENDIENTES)} />
              <FilterChip active={filter === FILTERS.AGENDADAS} label="Agendadas" count={counts.scheduled} onClick={() => setFilter(FILTERS.AGENDADAS)} />
              <FilterChip active={filter === FILTERS.CANCELADAS} label="Canceladas" count={counts.cancelled} onClick={() => setFilter(FILTERS.CANCELADAS)} />
              <FilterChip active={filter === FILTERS.RECHAZADAS} label="Rechazadas" count={counts.rejected} onClick={() => setFilter(FILTERS.RECHAZADAS)} />
            </div>
          </div>

          {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

          {/* List */}
          <div className="mt-5 grid gap-3">
            {loading && Array.from({ length: 4 }).map((_, i) => <RequestCardSkeleton key={i} />)}

            {!loading && !err && filteredItems.length === 0 && <EmptyState title={emptyCopy.title} desc={emptyCopy.desc} />}

            {!loading &&
              !err &&
              filteredItems.map((r) => {
                const optStatus = optimisticStatus[r.id];
                const effectiveStatus = optStatus || r.status;

                const name = r?.catalog?.name || r?.provider_service?.service_catalog?.name || "Servicio";

                const rawName = getClientName(r);
                const mapped = r?.client_id ? clientNameMap[r.client_id] : null;
                const clientName = norm(rawName) === "sin nombre" && mapped ? mapped : rawName;

                const pricingType = getPricingType(r);
                const fixedPrice = getFixedPrice(r);
                const isQuote = String(pricingType || "").toUpperCase() === "B";

                const base = isQuote ? (r?.quote_amount != null ? Number(r.quote_amount) : null) : fixedPrice != null ? Number(fixedPrice) : null;

                const priceText = isQuote
                  ? base != null
                    ? `Cotización: ${formatMoneyARS(base)}`
                    : "Cotización: pendiente"
                  : base != null
                  ? `Precio: ${formatMoneyARS(base)}`
                  : "Precio: —";

                const turno = formatTurno(r.preferred_datetime);

                // ✅ usar status efectivo para evitar flashes
                const rForPerms = optStatus ? { ...r, status: optStatus } : r;

                const canScheduleThis = canSchedule(rForPerms);
                const canQuoteThis = canQuote(rForPerms);

                const quote = quoteMap[r.id] ?? "";
                const isBusy = busyId === r.id;

                const descClean = cleanDescriptionForCard(r.description);
                const descToShow = truncateText(descClean, 130);

                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => nav(`/provider/requests/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") nav(`/provider/requests/${r.id}`);
                    }}
                    className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-4 py-4 cursor-pointer select-none"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-extrabold text-[#3D3D3D] leading-snug line-clamp-2">{name}</p>

                        <div className="mt-2 flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-extrabold text-black/60 shrink-0">
                            <IconifyIcon icon="mdi:account-outline" className="h-4 w-4 text-black/45" />
                            Cliente
                          </span>
                          <p className="text-[12px] font-semibold text-black/70 truncate">{clientName}</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <StatusBadge status={effectiveStatus} />

                        {canCancelScheduled(rForPerms) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelReq(r);
                              setCancelReason("");
                              setCancelOpen(true);
                            }}
                            disabled={isBusy}
                            className={[
                              "h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition",
                              isBusy ? "opacity-60 cursor-not-allowed active:scale-100" : "hover:bg-black/[0.02]",
                            ].join(" ")}
                            aria-label="Cancelar turno"
                            title="Cancelar turno"
                          >
                            <IconifyIcon icon="mdi:calendar-remove-outline" className="h-5 w-5 text-black/45" />
                          </button>
                        )}

                        {/* ✅ NO mostrar rechazar en completada */}
                        {canReject(rForPerms) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReject(r);
                            }}
                            disabled={isBusy}
                            className={[
                              "h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition",
                              isBusy ? "opacity-60 cursor-not-allowed active:scale-100" : "hover:bg-black/[0.02]",
                            ].join(" ")}
                            aria-label="Rechazar"
                            title="Rechazar"
                          >
                            <IconifyIcon icon="mdi:close" className="h-5 w-5 text-black/45" />
                          </button>
                        )}

                        {canDelete(rForPerms) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDelete(r);
                            }}
                            disabled={isBusy}
                            className={[
                              "h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition",
                              isBusy ? "opacity-60 cursor-not-allowed active:scale-100" : "hover:bg-black/[0.02]",
                            ].join(" ")}
                            aria-label="Eliminar"
                            title="Eliminar"
                          >
                            <IconifyIcon icon="mdi:trash-can-outline" className="h-5 w-5 text-black/45" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ✅ Solo descripción (sin Ubicación/Barrio/Dirección) */}
                    {descToShow ? <p className="mt-4 text-[13px] text-black/55 leading-snug whitespace-pre-line line-clamp-2">{descToShow}</p> : null}

                    {/* ✅ Chips ABAJO de la descripción + SOLO cambian de lugar (fecha primero, precio segundo) */}
                    {/* Bottom pills */}
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-extrabold bg-black/[0.04] text-black/60">
                        {turno.date}
                        {turno.time ? ` · ${turno.time}` : ""}
                      </span>

                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-extrabold bg-[#1E2F5D]/[0.08] text-[#1E2F5D]">
                        {priceText}
                      </span>
                    </div>


                    <div className="mt-3 grid gap-2">
                      {canScheduleThis && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            schedule(r);
                          }}
                          disabled={isBusy}
                          className={[
                            "w-full h-11 rounded-full bg-[#1E2F5D] text-white text-[12px] font-extrabold shadow-[0_10px_22px_rgba(30,47,93,0.18)] active:scale-[0.98] transition",
                            isBusy ? "opacity-60 cursor-not-allowed active:scale-100" : "hover:brightness-[1.02]",
                          ].join(" ")}
                        >
                          {isBusy ? "Procesando..." : "Confirmar turno"}
                        </button>
                      )}

                      {/* ✅ Enviar cotización: más visible / con prioridad */}
                      {canQuoteThis && (
                      <div
                        className="relative overflow-hidden rounded-[22px] border border-black/10 bg-white p-4 shadow-[0_12px_26px_rgba(0,0,0,0.08)]"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[#1E2F5D]/10 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-[#CFDE87]/25 blur-2xl" />

                        <div className="relative flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-extrabold text-[#1E2F5D]">Cotización</p>
                            <p className="mt-1 text-[12px] text-black/55">Ingresá el monto y enviásela al cliente.</p>
                          </div>

                          <span className="h-11 w-11 rounded-full bg-[#1E2F5D]/[0.08] grid place-items-center border border-[#1E2F5D]/15 shrink-0">
                            <IconifyIcon icon="mdi:currency-usd" className="h-5 w-5 text-[#1E2F5D]" />
                          </span>
                        </div>

                        <div className="relative mt-4 rounded-[18px] border border-black/10 bg-[#F7F7F7] p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-[14px] font-extrabold">$</span>

                              <input
                                className="w-full h-[50px] rounded-full bg-white border border-black/10 px-4 pl-7 text-[15px] font-extrabold outline-none text-[#3D3D3D] placeholder:text-black/30 shadow-[0_6px_18px_rgba(0,0,0,0.08)]"
                                type="number"
                                min="1"
                                inputMode="numeric"
                                placeholder="Monto"
                                value={quote}
                                onChange={(e) => setQuoteMap((m) => ({ ...m, [r.id]: e.target.value }))}
                                disabled={isBusy}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => sendQuote(r)}
                              disabled={isBusy}
                              className={[
                                "h-[50px] px-6 rounded-full text-white text-[13px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.22)] active:scale-[0.98] transition",
                                isBusy ? "bg-[#1E2F5D]/60" : "bg-[#1E2F5D] hover:brightness-[1.03]",
                              ].join(" ")}
                            >
                              {isBusy ? "Enviando..." : "Enviar"}
                            </button>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-[11px] text-black/45">
                            <IconifyIcon icon="mdi:information-outline" className="h-4 w-4 text-black/40" />
                            El cliente podrá aceptarla o rechazarla.
                          </div>
                        </div>
                      </div>
                    )}

                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* MODAL RECHAZAR */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={closeReject} aria-label="Cerrar" />

          <div className="relative w-full max-w-lg rounded-[22px] bg-white shadow-2xl p-6 border border-black/10">
            <h3 className="text-[18px] font-extrabold text-[#3D3D3D]">Rechazar solicitud</h3>

            <p className="mt-2 text-[13px] text-black/60">
              ¿Seguro que querés rechazar la solicitud del servicio <b>{selectedName}</b>?
              <br />
              <span className="text-[12px] text-black/45">Si había un horario bloqueado, se libera automáticamente.</span>
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeReject}
                className="h-11 rounded-full bg-white border border-black/10 px-5 text-[13px] font-extrabold text-[#3D3D3D] active:scale-[0.98] transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmReject}
                className="h-11 rounded-full bg-[#1E2F5D] px-6 text-[13px] font-extrabold text-white shadow-[0_6px_18px_rgba(30,47,93,0.18)] active:scale-[0.98] transition"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      <CancelTurnSheet
        open={cancelOpen}
        serviceName={cancelName}
        onClose={() => {
          setCancelOpen(false);
          setCancelReq(null);
          setCancelReason("");
        }}
        onConfirm={confirmCancel}
        busy={busyId === cancelReq?.id}
        reason={cancelReason}
        setReason={setCancelReason}
      />

      <ConfirmDeleteSheet
        open={deleteOpen}
        title="Eliminar solicitud"
        desc={
          <>
            Vas a eliminar <b>{deleteName}</b>. Esta acción no se puede deshacer.
          </>
        }
        onClose={() => {
          setDeleteOpen(false);
          setDeleteReq(null);
        }}
        onConfirm={confirmDelete}
        busy={busyId === deleteReq?.id}
      />
    </div>
  );
}
