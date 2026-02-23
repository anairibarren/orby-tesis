// src/pages/client/Requests.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { listMyRequestsAsClientRich, deleteRequest, updateRequestSafe } from "../../services/requests";
import { cancelAppointmentByRequestId } from "../../services/appointments";
import { supabase } from "../../services/supabase";

// ✅ NUEVO
import { safeCreateNotification } from "../../services/notifications";

const norm = (v) => String(v ?? "").toLowerCase();

function safeTS(iso) {
  const t = new Date(iso || "").getTime();
  return Number.isFinite(t) ? t : NaN;
}

function formatTurno(preferred_datetime) {
  if (!preferred_datetime) return { date: "—", time: "", ts: NaN };
  const d = new Date(preferred_datetime);
  const date = d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time, ts: d.getTime() };
}

function moneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("es-AR")}`;
}

function computeAmountsForCard(r) {
  const pricingType =
    r?.catalog?.pricing_type ||
    r?.provider_service?.service_catalog?.pricing_type ||
    null;

  const baseFixed =
    r?.provider_service?.base_price != null
      ? Number(r.provider_service.base_price)
      : null;

  const quote = r?.quote_amount != null ? Number(r.quote_amount) : null;

  const base =
    String(pricingType || "").toUpperCase() === "B"
      ? Number.isFinite(quote)
        ? quote
        : null
      : Number.isFinite(baseFixed)
      ? baseFixed
      : r?.service_amount != null
      ? Number(r.service_amount)
      : null;

  const fee = base != null ? Math.round(base * 0.07 * 100) / 100 : null;
  const total =
    base != null && fee != null ? Math.round((base + fee) * 100) / 100 : null;

  return { pricingType, base, fee, total };
}

const STATUS = {
  SOLICITADA: "solicitada",
  COTIZADA: "cotizada",
  ACEPTADA: "aceptada",
  AGENDADA: "agendada",
  RECHAZADA: "rechazada",
  CANCELADA: "cancelada",
  COMPLETADA: "completada",
  INCUMPLIDA: "incumplida",
};

const FILTERS = {
  TODAS: "todas",
  PENDIENTES: "pendientes",
  AGENDADAS: "agendadas",
  COMPLETADAS: "completadas",
  CANCELADAS: "canceladas",
  RECHAZADAS: "rechazadas",
  INCUMPLIDAS: "incumplidas", // ✅ nuevo
};

const PENDIENTES_SET = new Set([STATUS.SOLICITADA, STATUS.COTIZADA, STATUS.ACEPTADA]);
const AGENDADAS_SET = new Set([STATUS.AGENDADA]);
const COMPLETADAS_SET = new Set([STATUS.COMPLETADA]);
const CANCELADAS_SET = new Set([STATUS.CANCELADA]);
const RECHAZADAS_SET = new Set([STATUS.RECHAZADA]);
const INCUMPLIDAS_SET = new Set([STATUS.INCUMPLIDA]); // ✅ nuevo

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

function VerifiedIcon({ show }) {
  if (!show) return null;
  return <IconifyIcon icon="mdi:check-decagram" className="h-3.5 w-3.5 text-[#4368C5]" />;
}

function statusStyle(status) {
  const s = norm(status);
  const map = {
    solicitada: "bg-[#FFF5CC] text-[#7A5B00] border border-[#F3E4A5]",
    cotizada: "bg-[#F1E8FF] text-[#4B2A8A] border border-[#E3D6FF]",
    aceptada: "bg-[#E9FFF6] text-[#0F6B3D] border border-[#CFF4E3]",
    agendada: "bg-[#EAF2FF] text-[#1E2F5D] border border-[#CFE0FF]",
    rechazada: "bg-[#FFE6EA] text-[#9B1C1C] border border-[#FFC9D3]",
    cancelada: "bg-black/[0.05] text-black/70 border border-black/10",
    completada: "bg-[#E8FFF2] text-[#0F6B3D] border border-[#CFF4E3]",
    incumplida: "bg-[#FFE6EA] text-[#9B1C1C] border border-[#FFC9D3]",
  };
  return map[s] || "bg-black/[0.05] text-black/70 border border-black/10";
}

function StatusBadge({ status }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold capitalize",
        statusStyle(status),
      ].join(" ")}
    >
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
        active
        ? "bg-[#1E2F5D] text-white shadow-[0_4px_12px_rgba(30,47,93,0.16)]"
        : "bg-white text-[#3D3D3D] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-black/10"
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-2 py-[2px] text-[12px]",
          active ? "bg-white/20 text-white" : "bg-black/[0.04] text-black/50",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function RequestPillSkeleton() {
  return (
    <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-4 py-4 select-none animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-[14px] w-[78%] rounded bg-black/10" />
          <div className="mt-2 h-[14px] w-[56%] rounded bg-black/10" />
          <div className="mt-3 flex items-center gap-[6px]">
            <div className="h-[12px] w-[44%] rounded bg-black/10" />
            <div className="h-3.5 w-3.5 rounded-full bg-black/10" />
          </div>
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
    </div>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="w-full pt-40 pb-10">
      <div className="mx-auto w-full max-w-[320px] text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-black/[0.04] grid place-items-center">
          <IconifyIcon icon="mdi:bell-outline" className="h-8 w-8 text-black/30" />
        </div>

        <p className="mt-5 text-[16px] font-extrabold text-[#3D3D3D]">{title}</p>
        <p className="mt-2 text-[14px] text-black/45 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Sheet({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Cerrar" />

          <motion.div
            className="absolute left-0 right-0 bottom-0"
            initial={{ y: 44, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 44, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto w-full max-w-[520px] px-4 pb-6">
              <div className="rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CancelSheet({ open, onClose, onConfirm, busy, serviceName, reason, setReason }) {
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

        <h3 className="text-[22px] font-extrabold text-[#3D3D3D]">Cancelar turno</h3>
        <p className="mt-2 text-[14px] text-black/50 leading-snug">
          ¿Seguro que querés cancelar <b>{serviceName}</b>?
          <br />
          <span className="text-[12px] text-black/45">Se libera el horario automáticamente.</span>
        </p>
      </div>

      <div className="px-6 pb-6">
        <p className="text-[12px] font-semibold text-black/60">Motivo (opcional)</p>

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


export default function Requests() {
  const nav = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const location = useLocation();

  // si venís desde notificaciones: nav("/client/requests", { state: { focusRequestId } })
  const focusIdFromNav = location?.state?.focusRequestId || null;

  // refs para scrollear a la card específica
  const itemRefs = useRef({});

  // id que se resalta visualmente unos segundos
  const [focusedId, setFocusedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [psActiveByKey, setPsActiveByKey] = useState({});

  const [filter, setFilter] = useState(FILTERS.TODAS);
  const [busyId, setBusyId] = useState(null);
  const [didAutoPickInc, setDidAutoPickInc] = useState(false); 

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReq, setCancelReq] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReq, setDeleteReq] = useState(null);

  function isOrphanRequest(r) {
    // Si el prestador eliminó la oferta (provider_services) el enrich no puede traer provider_service/catalog
    // y te queda la solicitud "colgada".
    return !r?.provider_service && !r?.catalog;
  }

  async function refresh({ silent = false } = {}) {
    if (!user?.id) return [];
    if (!silent) setLoading(true);
    setErr("");

    try {
      const data = await listMyRequestsAsClientRich(user.id);
      const arr = data ?? [];
      setItems(arr);
      return arr;
    } catch (e) {
      const msg = e?.message || "Error cargando solicitudes";
      setErr(msg);
      if (!silent) toast.error("Error", msg);
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  useEffect(() => {
    // armamos un lookup en batch: (provider_id + catalog_id) -> is_active
    const run = async () => {
      try {
        const providerIds = Array.from(new Set((items || []).map(r => r?.provider_id).filter(Boolean)));
        const catalogIds = Array.from(
          new Set((items || []).map(r => r?.catalog_id ?? r?.service_id ?? null).filter(Boolean))
        );

        if (!providerIds.length || !catalogIds.length) {
          setPsActiveByKey({});
          return;
        }

        const { data, error } = await supabase
          .from("provider_services")
          .select("provider_id, catalog_id, is_active")
          .in("provider_id", providerIds)
          .in("catalog_id", catalogIds);

        if (error) throw error;

        const map = {};
        for (const row of data || []) {
          const key = `${row.provider_id}:${row.catalog_id}`;
          map[key] = row.is_active;
        }
        setPsActiveByKey(map);
      } catch {
        // si falla, no rompemos nada
        setPsActiveByKey({});
      }
    };

    run();
  }, [items]);


  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`client-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `client_id=eq.${user.id}` },
        () => refresh({ silent: true })
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ Si hay incumplidas, el usuario cae directo al chip "Incumplidas"
  useEffect(() => {
    // ✅ SOLO 1 vez al entrar
    if (didAutoPickInc) return;

    const hasInc = (items || []).some((r) => norm(r?.status) === STATUS.INCUMPLIDA);
    if (hasInc) setFilter(FILTERS.INCUMPLIDAS);

    setDidAutoPickInc(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, didAutoPickInc]);




  // ✅ Focus desde notificaciones: cambia chip, scrollea y resalta
  useEffect(() => {
    if (!focusIdFromNav) return;
    if (!items || items.length === 0) return;

    const target = items.find((x) => x?.id === focusIdFromNav);
    if (!target) return;

    const s = norm(target?.status);

    // elegimos el filtro donde cae esa solicitud
    const desiredFilter =
      s === STATUS.INCUMPLIDA ? FILTERS.INCUMPLIDAS :
      s === STATUS.AGENDADA ? FILTERS.AGENDADAS :
      s === STATUS.CANCELADA ? FILTERS.CANCELADAS :
      s === STATUS.RECHAZADA ? FILTERS.RECHAZADAS :
      s === STATUS.COMPLETADA ? FILTERS.COMPLETADAS :
      FILTERS.PENDIENTES;

    if (filter !== desiredFilter) setFilter(desiredFilter);

    // resaltar
    setFocusedId(focusIdFromNav);

    // esperar un toque para que el render aplique el filtro y exista el elemento
    const t = setTimeout(() => {
      const el = itemRefs.current[focusIdFromNav];
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    // sacar el highlight después
    const t2 = setTimeout(() => setFocusedId(null), 2500);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIdFromNav, items, filter]);



  const counts = useMemo(() => {
    const st = (r) => norm(r?.status);

    const pending = items.filter((r) => PENDIENTES_SET.has(st(r))).length;
    const scheduled = items.filter((r) => AGENDADAS_SET.has(st(r))).length;
    const completed = items.filter((r) => COMPLETADAS_SET.has(st(r))).length;
    const cancelled = items.filter((r) => CANCELADAS_SET.has(st(r))).length;
    const rejected = items.filter((r) => RECHAZADAS_SET.has(st(r))).length;
    const incumplidas = items.filter((r) => INCUMPLIDAS_SET.has(st(r))).length;

    // ✅ "Todas" NO debe incluir incumplidas ni completadas
    const all = items.filter((r) => {
      const s = st(r);
      return s !== STATUS.COMPLETADA && s !== STATUS.INCUMPLIDA;
    }).length;

    return { all, pending, scheduled, completed, cancelled, rejected, incumplidas };
  }, [items]);

  const filteredItems = useMemo(() => {
    const st = (r) => norm(r.status);
    let arr = [...items];

    // ✅ TODAS: sin completadas ni incumplidas
    if (filter === FILTERS.TODAS) {
      arr = arr.filter((r) => {
        const s = st(r);
        return s !== STATUS.COMPLETADA && s !== STATUS.INCUMPLIDA;
      });
    }

    if (filter === FILTERS.PENDIENTES) arr = arr.filter((r) => PENDIENTES_SET.has(st(r)));
    if (filter === FILTERS.AGENDADAS) arr = arr.filter((r) => AGENDADAS_SET.has(st(r)));
    if (filter === FILTERS.COMPLETADAS) arr = arr.filter((r) => COMPLETADAS_SET.has(st(r)));
    if (filter === FILTERS.CANCELADAS) arr = arr.filter((r) => CANCELADAS_SET.has(st(r)));
    if (filter === FILTERS.RECHAZADAS) arr = arr.filter((r) => RECHAZADAS_SET.has(st(r)));
    if (filter === FILTERS.INCUMPLIDAS) arr = arr.filter((r) => INCUMPLIDAS_SET.has(st(r)));

    // Sort
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
    if (filter === FILTERS.PENDIENTES) return { title: "No tenés pendientes", desc: "Cuando hagas una nueva solicitud, te va a aparecer acá." };
    if (filter === FILTERS.AGENDADAS) return { title: "No tenés agendadas", desc: "Cuando el prestador confirme, te va a aparecer acá." };
    if (filter === FILTERS.COMPLETADAS) return { title: "No hay completadas", desc: "Te quedan como historial y también podés verlas en Historial." };
    if (filter === FILTERS.CANCELADAS) return { title: "No hay canceladas", desc: "Si cancelás un turno, va a quedar acá." };
    if (filter === FILTERS.RECHAZADAS) return { title: "No hay rechazadas", desc: "Si rechazás, queda acá para que puedas eliminarla." };
    if (filter === FILTERS.INCUMPLIDAS) return { title: "No hay incumplidas", desc: "Si una solicitud se marca como incumplida, te va a aparecer acá." };
    return { title: "Todavía no hiciste solicitudes", desc: "Cuando pidas un servicio, lo vas a ver acá." };
  }, [filter]);

  // ✅ Cancelar:
  // - normal: solo si agendada y todavía no empezó
  // - ORPHAN: si quedó colgada por servicio eliminado, la dejamos cancelar igual (para destrabar)
  function canCancel(req) {
    if (norm(req?.status) !== STATUS.AGENDADA) return false;

    if (isOrphanRequest(req)) return true;

    const ts = safeTS(req?.preferred_datetime);
    if (!Number.isFinite(ts)) return true;
    return Date.now() < ts;
  }

  function isInactiveFlag(v) {
    // soporta boolean, 0/1, string "false"/"0"
    if (v === false) return true;
    if (v === 0) return true;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "false" || s === "0" || s === "inactive" || s === "off") return true;
    }
    return false;
  }

  function isDepublishedRequest(r) {
    // 1) si ya vino provider_service, usamos eso
    if (isInactiveFlag(r?.provider_service?.is_active)) return true;

    // 2) lookup por (provider_id + catalog_id/service_id)
    const catalogId = r?.catalog_id ?? r?.service_id ?? null;
    const key = r?.provider_id && catalogId ? `${r.provider_id}:${catalogId}` : null;
    if (key && isInactiveFlag(psActiveByKey[key])) return true;

    // 3) si el catálogo está inactivo (por las dudas)
    if (isInactiveFlag(r?.catalog?.is_active)) return true;

    return false;
  }


  // ✅ Eliminar:
  // - cancelada / rechazada 
  // - ORPHAN: permitir eliminar aunque esté agendada (para destrabar “quedó agendada y no puedo hacer nada”)
function canDelete(req) {
  const s = norm(req?.status);
  // ✅ solo cancelada o rechazada 
  if (s === STATUS.CANCELADA || s === STATUS.RECHAZADA) return true;

  // ✅ orphan: permitir eliminar para destrabar, pero NO si es incumplida
  if (isOrphanRequest(req) && s !== STATUS.COMPLETADA && s !== STATUS.INCUMPLIDA) return true;

  return false;
}

  function openCancel(req) {
    setCancelReq(req);
    setCancelReason("");
    setCancelOpen(true);
  }
  function openDelete(req) {
    setDeleteReq(req);
    setDeleteOpen(true);
  }

  async function confirmCancel() {
    if (!cancelReq?.id) return;

    try {
      setBusyId(cancelReq.id);

      await updateRequestSafe(cancelReq.id, { status: STATUS.CANCELADA });
      const reason = String(cancelReason || "").trim() || "Cancelado por el cliente";

      // Si no existe appointment o falla, no rompemos el flujo (así destraba el caso orphan)
      try {
        await cancelAppointmentByRequestId(cancelReq.id, { cancelled_by: "client", cancelled_reason: reason });
      } catch {}

      toast.success("Turno cancelado", "Se liberó el horario.");
      setCancelOpen(false);
      setCancelReq(null);
      setCancelReason("");
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo cancelar.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

async function confirmDelete() {
  if (!deleteReq?.id) return;
  if (!canDelete(deleteReq)) return;

  const id = deleteReq.id;

  try {
    setBusyId(id);

    // ❌ NO hacemos optimista acá (para que no desaparezca la card mientras el sheet está abierto)
    await deleteRequest(id);

    // ✅ verificación SIN tocar el state (no llamamos refresh porque refresh hace setItems)
    const after = await listMyRequestsAsClientRich(user.id);
    const stillThere = (after || []).some((x) => x.id === id);

    if (stillThere) {
      toast.error("No se pudo eliminar", "Parece un tema de permisos (RLS).");
      return; // dejo el modal abierto
    }

    toast.success("Eliminada", "Ya no aparece en tu lista.");

    // ✅ cerramos primero el modal
    setDeleteOpen(false);
    setDeleteReq(null);

    // ✅ ahora sí actualizamos la lista (ya sin modal)
    setItems((prev) => prev.filter((x) => x.id !== id));
  } catch (e) {
    // Si por algún motivo ya no existe, lo tratamos como éxito
    const after = await listMyRequestsAsClientRich(user.id);
    const stillThere = (after || []).some((x) => x.id === id);

    if (!stillThere) {
      toast.success("Eliminada", "Ya no aparece en tu lista.");
      setDeleteOpen(false);
      setDeleteReq(null);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } else {
      toast.error("No se pudo eliminar", e?.message || "Revisá RLS/policies.");
    }
  } finally {
    setBusyId(null);
  }
}

  async function acceptQuote(req) {
    if (!req?.id) return;
    try {
      setBusyId(req.id);
      await updateRequestSafe(req.id, { status: STATUS.ACEPTADA });

      try {
        const serviceName = req?.catalog?.name || req?.provider_service?.service_catalog?.name || "un servicio";
        await safeCreateNotification({
          user_id: req.provider_id,
          actor_id: user?.id || null,
          type: "quote_accepted",
          title: "Cotización aceptada",
          body: `${serviceName} · El cliente aceptó la cotización`,
          metadata: { request_id: req.id, provider_id: req.provider_id, client_id: req.client_id },
          is_read: false,
        });
      } catch {}

      toast.success("Cotización aceptada", "Ahora el prestador puede agendar el turno.");
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo aceptar la cotización.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  async function rejectQuote(req) {
    if (!req?.id) return;
    try {
      setBusyId(req.id);
      await updateRequestSafe(req.id, { status: STATUS.RECHAZADA });

      try {
        const serviceName = req?.catalog?.name || req?.provider_service?.service_catalog?.name || "un servicio";
        await safeCreateNotification({
          user_id: req.provider_id,
          actor_id: user?.id || null,
          type: "quote_rejected",
          title: "Cotización rechazada",
          body: `${serviceName} · El cliente rechazó la cotización`,
          metadata: { request_id: req.id, provider_id: req.provider_id, client_id: req.client_id },
          is_read: false,
        });
      } catch {}

      toast.success("Cotización rechazada", "La solicitud quedó rechazada.");
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo rechazar la cotización.");
      refresh({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  const deleteName = useMemo(() => {
    return deleteReq?.service_name_snapshot || deleteReq?.catalog?.name || deleteReq?.provider_service?.service_catalog?.name || "esta solicitud";
  }, [deleteReq]);

  const goDetail = (id) => nav(`/client/requests/${id}`);

  function setItemRef(id) {
      return (el) => {
        if (!id) return;
        if (el) itemRefs.current[id] = el;
        else delete itemRefs.current[id];
      };
    }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-10 box-border">
        {/* Top */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">Mis solicitudes</h1>
            <p className="mt-1 text-[13px] text-black/45">Estado y turno. El detalle adentro.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <IconButton onClick={() => refresh()} title="Actualizar">
              <IconifyIcon icon="mdi:refresh" className="h-6 w-6 text-black/40" />
            </IconButton>
          </div>
        </div>

        {/* Chips */}
          <div className="mt-6 -mx-6 px-6 overflow-x-auto hide-scrollbar py-3 scroll-px-6">          
            <style>{`
              .hide-scrollbar { 
                scrollbar-width: none; 
                -ms-overflow-style: none; 
                -webkit-overflow-scrolling: touch; /* ✅ iOS scroll suave */
              }
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="flex gap-3 w-max px-3">          
              <FilterChip
              active={filter === FILTERS.TODAS}
              label="Todas"
              count={counts.all}
              onClick={() => setFilter(FILTERS.TODAS)}
            />
            <FilterChip
              active={filter === FILTERS.PENDIENTES}
              label="Pendientes"
              count={counts.pending}
              onClick={() => setFilter(FILTERS.PENDIENTES)}
            />
            <FilterChip
              active={filter === FILTERS.AGENDADAS}
              label="Agendadas"
              count={counts.scheduled}
              onClick={() => setFilter(FILTERS.AGENDADAS)}
            />
            <FilterChip
              active={filter === FILTERS.INCUMPLIDAS}
              label="Incumplidas"
              count={counts.incumplidas}
              onClick={() => setFilter(FILTERS.INCUMPLIDAS)}
            />
            <FilterChip
              active={filter === FILTERS.COMPLETADAS}
              label="Completadas"
              count={counts.completed}
              onClick={() => setFilter(FILTERS.COMPLETADAS)}
            />
            <FilterChip
              active={filter === FILTERS.CANCELADAS}
              label="Canceladas"
              count={counts.cancelled}
              onClick={() => setFilter(FILTERS.CANCELADAS)}
            />
            <FilterChip
              active={filter === FILTERS.RECHAZADAS}
              label="Rechazadas"
              count={counts.rejected}
              onClick={() => setFilter(FILTERS.RECHAZADAS)}
            />
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {/* List */}
        <div className="mt-5 grid gap-3">
          {loading && Array.from({ length: 5 }).map((_, i) => <RequestPillSkeleton key={i} />)}

          {!loading && !err && filteredItems.length === 0 && <EmptyState title={emptyCopy.title} desc={emptyCopy.desc} />}

          {!loading &&
            !err &&
            filteredItems.map((r) => {
              const name =
                r?.service_name_snapshot ||
                r?.catalog?.name ||
                r?.provider_service?.service_catalog?.name ||
                "Servicio";

              const providerName =
                r?.provider_name_snapshot ||
                r?.provider?.full_name ||
                "Prestador";

              const hasCertification = !!r?.provider?.certificate_url || !!r?.provider?.cert_url;
              const providerVerified = !!r?.provider?.provider_verified && hasCertification;

              const turno = formatTurno(r.preferred_datetime);
              const isBusy = busyId === r.id;

              const orphan = isOrphanRequest(r);
              const depublished = isDepublishedRequest(r);

              // ✅ NUEVO: el prestador borró su publicación (provider_services),
              // pero el catálogo existe por fallback => hay que mostrar banner igual
              const offerMissing = !r?.provider_service && !!r?.catalog;

              // ✅ bandera final para banner + forzar cancelada visual
              const shouldMarkAsCancelled = (orphan || depublished || offerMissing);


            const { pricingType, base } = computeAmountsForCard(r);
            const isQuote = String(pricingType || "").toUpperCase() === "B";

            const showQuoteDecision =
              !orphan && isQuote && base != null && norm(r.status) === STATUS.COTIZADA;

              // ✅ Si quedó orphan y no está completada ni incumplida,
              // la mostramos como cancelada
              const displayStatus =
              shouldMarkAsCancelled &&
              norm(r.status) !== STATUS.COMPLETADA &&
              norm(r.status) !== STATUS.INCUMPLIDA
                ? STATUS.CANCELADA
                : r.status;



              return (
              <div
                key={r.id}
                ref={setItemRef(r.id)}
                role="button"
                tabIndex={0}
                onClick={() => goDetail(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") goDetail(r.id);
                }}
                className={[
                  "w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-4 py-4 cursor-pointer select-none",
                  (orphan || depublished) ? "opacity-[0.92]" : "",
                  focusedId === r.id
                    ? "ring-2 ring-[#A0B8E1] shadow-[0_14px_34px_rgba(160,184,225,0.28)]"
                    : "",
                ].join(" ")}
              >
                {/* Header (izq: título + prestador) (der: estado + acciones) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold text-[#3D3D3D] leading-snug line-clamp-2">
                      {name}
                    </p>

                    <div className="mt-2 flex items-center gap-[2px] min-w-0">
                      <p className="text-[12px] text-black/55 truncate">{providerName}</p>
                      <VerifiedIcon show={providerVerified} />
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <StatusBadge status={displayStatus} />

                    {canCancel(r) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCancel(r);
                        }}
                        disabled={isBusy}
                        className={[
                          "h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition",
                          isBusy
                            ? "opacity-60 cursor-not-allowed active:scale-100"
                            : "hover:bg-black/[0.02]",
                        ].join(" ")}
                        aria-label="Cancelar"
                        title="Cancelar"
                      >
                        <IconifyIcon
                          icon="mdi:calendar-remove-outline"
                          className="h-5 w-5 text-black/45"
                        />
                      </button>
                    )}

                    {canDelete(r) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDelete(r);
                        }}
                        disabled={isBusy}
                        className={[
                          "h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition",
                          isBusy
                            ? "opacity-60 cursor-not-allowed active:scale-100"
                            : "hover:bg-black/[0.02]",
                        ].join(" ")}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        <IconifyIcon
                          icon="mdi:trash-can-outline"
                          className="h-5 w-5 text-black/45"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* ✅ Banner FULL WIDTH (mejor mobile) */}
                {shouldMarkAsCancelled && (
                <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-black/[0.03] px-3 py-2">
                  <span className="mt-[2px] h-6 w-6 rounded-full bg-white border border-black/10 grid place-items-center shrink-0">
                    <IconifyIcon icon="mdi:information-outline" className="h-4.5 w-4.5 text-black/45" />
                  </span>

                  <p className="text-[12px] text-black/60 leading-snug">
                    <span className="font-extrabold text-black/70">Servicio despublicado.</span>{" "}
                    Esta solicitud quedó <span className="font-semibold">cancelada</span>.
                    {canDelete(r) ? (
                      <>
                        {" "}
                        <span className="text-black/50">Podés eliminarla.</span>
                      </>
                    ) : null}
                  </p>
                </div>
              )}

                {/* Footer info */}
                <div className="mt-4 grid grid-cols-2 items-center gap-3">
               <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold bg-black/[0.04] text-black/60 w-fit max-w-full">
                <IconifyIcon
                  icon="mdi:calendar-blank-outline"
                  className="h-4 w-4 text-black/40 shrink-0"
                />

                <span className="whitespace-nowrap">
                  {turno.date}
                  {turno.time ? ` · ${turno.time}` : ""}
                </span>
              </span>

                  <div className="justify-self-end text-right">
                    <p className="text-[11px] font-medium text-black/45 leading-none">
                      {isQuote ? "Cotización" : "Precio"}
                    </p>
                    <p className="mt-2 text-[15px] font-extrabold text-[#3D3D3D] leading-none">
                      {base != null ? moneyARS(base) : "—"}
                    </p>
                  </div>
                </div>

                {showQuoteDecision && (
                  <div className="mt-3 grid grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isBusy) acceptQuote(r);
                      }}
                      disabled={isBusy}
                      className={[
                        "w-full h-11 rounded-full bg-[#1E2F5D] text-white text-[12px] font-extrabold shadow-[0_10px_22px_rgba(30,47,93,0.18)] active:scale-[0.98] transition inline-flex items-center justify-center gap-2",
                        isBusy
                          ? "opacity-60 cursor-not-allowed active:scale-100"
                          : "hover:brightness-[1.02]",
                      ].join(" ")}
                      title="Aceptar cotización"
                      aria-label="Aceptar cotización"
                    >
                      <IconifyIcon icon="mdi:check" className="h-4.5 w-4.5 text-white/90" />
                      Aceptar
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isBusy) rejectQuote(r);
                      }}
                      disabled={isBusy}
                      className={[
                        "w-full h-11 rounded-full border border-black/10 bg-[#FFECEE] text-[12px] font-extrabold active:scale-[0.98] transition inline-flex items-center justify-center gap-2",
                        isBusy
                          ? "opacity-60 cursor-not-allowed active:scale-100"
                          : "hover:bg-[#FFE4E7]",
                      ].join(" ")}
                      title="Rechazar cotización"
                      aria-label="Rechazar cotización"
                    >
                      <IconifyIcon icon="mdi:close" className="h-4.5 w-4.5 text-[#9B1C1C]" />
                      <span className="text-[#9B1C1C]">Rechazar</span>
                    </button>
                  </div>
                )}
              </div>
            );
            })}
        </div>
      </div>

      <CancelSheet
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setCancelReq(null);
          setCancelReason("");
        }}
        onConfirm={confirmCancel}
        busy={busyId === cancelReq?.id}
        serviceName={
          cancelReq?.service_name_snapshot ||
          cancelReq?.catalog?.name ||
          cancelReq?.provider_service?.service_catalog?.name ||
          "este servicio"
        }
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