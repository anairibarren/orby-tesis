// src/pages/provider/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../hooks/useAuth";
import {
  listMyProviderServices,
  updateProviderService,
  deactivateProviderService,
  reactivateProviderService,
} from "../../services/services";
import { listIncomingRequests } from "../../services/requests";
import { useToast } from "../../components/Toast";
import patronBg from "../../assets/img/fondo-patron.png";

import { supabase } from "../../services/supabase";
import { countMyUnreadNotifications } from "../../services/notifications";

function BellIcon({ className = "h-6 w-6 text-[#3D3D3D]" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 10.2a5.5 5.5 0 0 1 11 0c0 5 2.2 6.1 2.2 6.1H4.3s2.2-1.1 2.2-6.1Z" />
      <path d="M9.4 19.2a2.8 2.8 0 0 0 5.2 0" />
    </svg>
  );
}

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function IconCircleButton({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0 active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 rounded-full bg-[#1E2F5D] px-5 text-white text-[13px] font-semibold shadow-[0_8px_18px_rgba(30,47,93,0.22)] active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 rounded-full bg-white border border-black/10 px-5 text-[13px] font-semibold text-[#3D3D3D] shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ServiceCardSkeleton() {
  return (
    <CardShell className="p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="h-4 w-44 rounded bg-black/10" />
          <div className="mt-2 h-3 w-28 rounded bg-black/10" />
          <div className="mt-4 h-4 w-32 rounded bg-black/10" />
        </div>
        <div className="h-7 w-24 rounded-full bg-black/10" />
      </div>

      <div className="mt-4 h-px w-full bg-black/5" />

      <div className="mt-4 flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-black/10" />
        <div className="h-10 w-28 rounded-full bg-black/10" />
      </div>
    </CardShell>
  );
}

function RemindersSkeleton() {
  return (
    <CardShell className="mt-4 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="h-4 w-40 rounded bg-black/10" />
          <div className="mt-2 h-3 w-56 rounded bg-black/10" />
        </div>
        <div className="h-9 w-9 rounded-full bg-black/10" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-16 rounded-[18px] bg-black/10" />
        <div className="h-16 rounded-[18px] bg-black/10" />
        <div className="h-16 rounded-[18px] bg-black/10" />
      </div>

      <div className="mt-4 h-12 rounded-[18px] bg-black/10" />
    </CardShell>
  );
}

/** Bottom sheet con animación (sale desde abajo) */
function Sheet({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="absolute inset-x-0 bottom-0 p-4 pb-6">
            <motion.div
              className="mx-auto w-full max-w-lg rounded-[28px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.9 }}
              role="dialog"
              aria-modal="true"
            >
              <div className="h-1.5 w-12 bg-black/10 rounded-full mx-auto mt-3" />
              <div className="p-5">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function safeDate(v) {
  const d = v ? new Date(v) : null;
  return d && Number.isFinite(d.getTime()) ? d : null;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function fmtDate(dt) {
  try {
    return dt.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export default function Home() {
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  // ✅ Requests preview (recordatorios)
  const [reqLoading, setReqLoading] = useState(true);
  const [incoming, setIncoming] = useState([]);

  // ✅ notificaciones (badge)
  const [unread, setUnread] = useState(0);

  // ✅ Sheet state (FIX: selectedRow estaba comentado por accidente)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState(null); // "actions" | "price" | "unpublish"
  const [selectedRow, setSelectedRow] = useState(null);
  const [priceInput, setPriceInput] = useState("");

  const [durationInput, setDurationInput] = useState("60");

  const firstName = useMemo(() => {
    const full = profile?.full_name || "";
    const f = full.trim().split(" ")[0];
    if (f) return f;
    const email = user?.email || "";
    return email ? email.split("@")[0] : "Hola";
  }, [profile?.full_name, user?.email]);

  async function refreshUnread({ silent = true } = {}) {
    if (!user?.id) return;
    try {
      const n = await countMyUnreadNotifications(user.id);
      if (Number.isFinite(n)) setUnread(n);
    } catch (e) {
      if (!silent) console.warn("count unread failed:", e?.message || e);
    }
  }

  async function refresh() {
    if (!user?.id) return;
    setErr("");
    setLoading(true);
    try {
      const data = await listMyProviderServices(user.id);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e?.message || "Error cargando tus servicios";
      setErr(msg);
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  async function refreshIncoming({ silent = false } = {}) {
    if (!user?.id) return;
    if (!silent) setReqLoading(true);
    try {
      const data = await listIncomingRequests(user.id);
      setIncoming(Array.isArray(data) ? data : []);
    } catch {
      setIncoming([]);
    } finally {
      if (!silent) setReqLoading(false);
    }
  }

  
  useEffect(() => {
    refresh();
    refreshIncoming();
    refreshUnread({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // incoming refresh
  useEffect(() => {
    if (!user?.id) return;
    const t = setInterval(() => refreshIncoming({ silent: true }), 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // badge interval backup
  useEffect(() => {
    if (!user?.id) return;
    const t = setInterval(() => refreshUnread({ silent: true }), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ badge realtime (robusto)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`provider-notifications-badge-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshUnread({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshUnread({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshUnread({ silent: true })
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refreshUnread({ silent: true });
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const preview = useMemo(() => (items || []).slice(0, 3), [items]);

  const reminders = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const isPending = (r) => {
      const s = String(r?.status || "").toLowerCase();
      return s === "solicitada" || s === "cotizada";
    };
    const isAgendada = (r) => String(r?.status || "").toLowerCase() === "agendada";

    const pendingCount = (incoming || []).filter(isPending).length;

    const todayTurns = (incoming || [])
      .filter(isAgendada)
      .map((r) => ({ r, dt: safeDate(r?.preferred_datetime) }))
      .filter((x) => x.dt && x.dt >= todayStart && x.dt <= todayEnd)
      .sort((a, b) => a.dt - b.dt)
      .slice(0, 2);

    const nextTurn = (incoming || [])
      .filter(isAgendada)
      .map((r) => ({ r, dt: safeDate(r?.preferred_datetime) }))
      .filter((x) => x.dt && x.dt > todayEnd)
      .sort((a, b) => a.dt - b.dt)[0];

    const hasAny = pendingCount > 0 || todayTurns.length > 0 || Boolean(nextTurn?.dt);

    return { pendingCount, todayTurns, nextTurn, hasAny };
  }, [incoming]);

  function openActions(row) {
    setSelectedRow(row);
    setSheetType("actions");
    setSheetOpen(true);
  }

  function openPrice(row) {
    setSelectedRow(row);
    setPriceInput(String(row?.base_price ?? ""));
    setSheetType("price");
    setSheetOpen(true);
  }

  function openDuration(row) {
    setSelectedRow(row);
    setDurationInput(String(row?.duration_minutes ?? "60"));
    setSheetType("duration");
    setSheetOpen(true);
  }

  function openUnpublish(row) {
    setSelectedRow(row);
    setSheetType("unpublish");
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetType(null);
    setSelectedRow(null);
    setPriceInput("");
  }

  async function confirmPrice() {
    if (!selectedRow) return;

    const pricingType = selectedRow?.service_catalog?.pricing_type;
    if (pricingType !== "A") {
      toast.warning("Atención", "Este servicio no usa precio fijo.");
      closeSheet();
      return;
    }

    const num = Number(String(priceInput).replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      toast.warning("Precio inválido", "Ingresá un número mayor a 0.");
      return;
    }

    try {
      await updateProviderService(selectedRow.id, { base_price: num });
      toast.success("Precio actualizado", "Se guardó el nuevo precio.");
      closeSheet();
      refresh();
    } catch (e) {
      toast.error("No se pudo editar", e?.message || "Intentá de nuevo.");
    }
  }

  async function confirmDuration() {
  if (!selectedRow) return;

  const pricingType = selectedRow?.service_catalog?.pricing_type;
  if (pricingType !== "A") {
    toast.warning("Atención", "Este servicio no usa precio fijo.");
    closeSheet();
    return;
  }

  const d = Number(durationInput);
  if (![30, 45, 60, 90, 120].includes(d)) {
    toast.warning("Duración inválida", "Elegí una duración válida.");
    return;
  }

  try {
    await updateProviderService(selectedRow.id, { duration_minutes: d });
    toast.success("Duración actualizada", "Se guardó la nueva duración.");
    closeSheet();
    refresh();
  } catch (e) {
    toast.error("No se pudo editar", e?.message || "Intentá de nuevo.");
  }
}

  async function confirmUnpublish() {
  if (!selectedRow) return;

  try {
    await deactivateProviderService(selectedRow.id);

    toast.success(
      "Servicio despublicado",
      "Se cancelaron automáticamente las solicitudes y turnos pendientes de este servicio."
    );

    closeSheet();
    refresh();
    refreshIncoming({ silent: true }); // opcional: refresca recordatorios
  } catch (e) {
    toast.error("No se pudo despublicar", e?.message || "Intentá de nuevo.");
  }
}

  // ✅ FIX: permitir publicar desde card sin depender de setSelectedRow async
  async function confirmRepublish(rowArg) {
    const row = rowArg ?? selectedRow;
    if (!row) return;

    try {
      await reactivateProviderService(row.id);
      toast.success("Servicio publicado", "Ya vuelve a aparecer para clientes.");
      closeSheet();
      refresh();
    } catch (e) {
      toast.error("No se pudo publicar", e?.message || "Intentá de nuevo.");
    }
  }

  const selectedName =
    selectedRow?.service_catalog?.name || selectedRow?.service_catalog?.title || "este servicio";

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
     <div className="px-6 pb-6">

       {/* Header (provider) + fondo azul más alto (menos redondeado) + patrón */}
        <div
          className="-mx-6 px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[64px] rounded-b-[22px] relative overflow-hidden"
          style={{
            backgroundColor: "#1E2F5D",
            backgroundImage: `url(${patronBg})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pt-1">
              <p className="text-[13px] text-white/70">Hola,</p>
              <h1 className="mt-1 text-[28px] font-extrabold text-white leading-tight truncate">
                {firstName}
              </h1>
              <p className="mt-1 text-[13px] font-medium text-white/70">
                Te damos la bienvenida a <span className="lowercase">orby</span>
              </p>
            </div>

            <button
              type="button"
              className="relative h-14 w-14 mt-[26px] rounded-full bg-white/10 border border-white/15 shadow-[0_10px_24px_rgba(0,0,0,0.18)] grid place-items-center"
              aria-label="Notificaciones"
              title="Notificaciones"
              onClick={() => nav("/provider/notifications")}
            >
              <BellIcon className="h-6 w-6 text-white" />

              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-white text-[#1E2F5D] text-[10px] font-extrabold grid place-items-center shadow">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Accesos (suben y pisan el azul para que quede “a la mitad”) */}
          <div className="-mt-[38px] relative z-10 grid grid-cols-2 gap-3">          
          <button
            type="button"
            onClick={() => nav("/provider/requests")}
            className="rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-4 text-left active:scale-[0.99] transition"
          >
            <p className="text-[12px] font-semibold text-black/40">Acceso</p>
            <p className="mt-1 text-[15px] font-extrabold text-[#3D3D3D]">Solicitudes</p>
            <p className="mt-1 text-[12px] text-black/45">Ver y gestionar</p>
          </button>

          <button
            type="button"
            onClick={() => nav("/provider/availability")}
            className="rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-4 text-left active:scale-[0.99] transition"
          >
            <p className="text-[12px] font-semibold text-black/40">Acceso</p>
            <p className="mt-1 text-[15px] font-extrabold text-[#3D3D3D]">Disponibilidad</p>
            <p className="mt-1 text-[12px] text-black/45">Horarios y turnos</p>
          </button>
        </div>

        {/* Recordatorios */}
        {reqLoading ? (
          <RemindersSkeleton />
        ) : (
          <CardShell className="mt-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-[#3D3D3D]">Recordatorios</p>
                <p className="mt-1 text-[12px] text-black/45">Lo importante para hoy y lo próximo.</p>
              </div>

              <IconCircleButton
                onClick={() => nav("/provider/requests")}
                title="Solicitudes"
                className="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
              >
                <IconifyIcon icon="mdi:arrow-top-right" className="h-6 w-6 text-black/40" />
              </IconCircleButton>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => nav("/provider/requests")}
                className="rounded-[18px] bg-[#F5F5F5] p-3 text-left active:scale-[0.99] transition"
              >
                <p className="text-[11px] font-semibold text-black/40">Pendientes</p>
                <p className="mt-1 text-[18px] font-extrabold text-[#1E2F5D]">
                  {(incoming || []).filter((r) => {
                    const s = String(r?.status || "").toLowerCase();
                    return s === "solicitada" || s === "cotizada";
                  }).length}
                </p>
              </button>

              <button
                type="button"
                onClick={() => nav("/provider/requests")}
                className="rounded-[18px] bg-[#F5F5F5] p-3 text-left active:scale-[0.99] transition"
              >
                <p className="text-[11px] font-semibold text-black/40">Turnos hoy</p>
                <p className="mt-1 text-[18px] font-extrabold text-[#3D3D3D]">
                  {reminders.todayTurns.length}
                </p>
              </button>

              <button
                type="button"
                onClick={() => nav("/provider/requests")}
                className="rounded-[18px] bg-[#F5F5F5] p-3 text-left active:scale-[0.99] transition"
              >
                <p className="text-[11px] font-semibold text-black/40">Próximo</p>
                <p className="mt-1 text-[12px] font-extrabold text-[#3D3D3D]">
                  {reminders.nextTurn?.dt ? fmtDate(reminders.nextTurn.dt) : "—"}
                </p>
              </button>
            </div>
          </CardShell>
        )}

        {/* Mis servicios */}
        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">Mis servicios</h2>
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-4 grid gap-3">
          {loading && Array.from({ length: 3 }).map((_, i) => <ServiceCardSkeleton key={i} />)}

          {!loading &&
            !err &&
            preview.map((row) => {
              const s = row?.service_catalog;
              const isA = s?.pricing_type === "A";
              const price =
                isA && row?.base_price != null ? `$${Number(row.base_price).toLocaleString("es-AR")}` : null;

              return (
                <CardShell key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#3D3D3D] truncate">{s?.name || "Servicio"}</p>
                      <p className="mt-1 text-[12px] text-black/45 truncate">{s?.category || "—"}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Pill
                        className={
                          row.is_active ? "bg-[rgba(44,72,148,0.18)] text-[#1E2F5D]" : "bg-black/[0.04] text-black/55"
                        }
                      >
                        {row.is_active ? "Publicado" : "Despublicado"}
                      </Pill>

                      <IconCircleButton onClick={() => openActions(row)} title="Acciones">
                        <IconifyIcon icon="mdi:dots-horizontal" className="h-6 w-6 text-black/35" />
                      </IconCircleButton>
                    </div>
                  </div>

                  <div className="mt-4 h-px w-full bg-black/5" />

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-black/40 font-semibold">Precio</p>
                      <p className="text-[14px] font-extrabold text-[#1E2F5D]">{price ? price : "Cotización"}</p>                    </div>

                    {row.is_active ? (
                      <button
                        type="button"
                        onClick={() => openUnpublish(row)}
                        className="h-11 rounded-full px-4 text-[13px] font-semibold border border-[#1E2F5D]/25 text-[#1E2F5D] bg-[rgba(44,72,148,0.18)] active:scale-[0.98] transition"
                      >
                        Despublicar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => confirmRepublish(row)}
                        className="h-11 rounded-full px-4 text-[13px] font-semibold bg-[#1E2F5D] text-white shadow-[0_8px_18px_rgba(30,47,93,0.22)] active:scale-[0.98] transition"
                      >
                        Publicar
                      </button>
                    )}
                  </div>
                </CardShell>
              );
            })}

          {!loading && !err && items.length === 0 && (
            <div className="py-8">
              <div className="flex flex-col items-center text-center px-2">
                <span className="h-12 w-12 rounded-full bg-black/[0.05] grid place-items-center">
                  <IconifyIcon icon="mdi:clipboard-text-outline" className="h-6 w-6 text-black/40" />
                </span>

                <p className="mt-4 text-[14px] font-extrabold text-[#3D3D3D]">Todavía no publicaste servicios</p>

                <p className="mt-1 text-[12px] text-black/45 max-w-[260px]">
                  Publicá tu primer servicio para empezar a recibir solicitudes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB publicar */}
      <button
        type="button"
        onClick={() => nav("/provider/services/new")}
        className="fixed right-5 bottom-[110px] z-[50] h-14 w-14 rounded-full bg-[#1E2F5D] text-white shadow-[0_14px_30px_rgba(30,47,93,0.35)] grid place-items-center active:scale-[0.98] transition"
        aria-label="Publicar servicio"
        title="Publicar servicio"
      >
        <IconifyIcon icon="mdi:plus" className="h-7 w-7" />
      </button>

      {/* SHEET */}
      <Sheet open={sheetOpen} onClose={closeSheet}>
        {sheetType === "actions" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Acciones</h3>
                <p className="mt-1 text-[12px] text-black/45 truncate">{selectedName}</p>
              </div>

              <IconCircleButton onClick={closeSheet} title="Cerrar" className="h-10 w-10">
                <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
              </IconCircleButton>
            </div>

            <div className="mt-4 grid gap-2">
              {selectedRow?.service_catalog?.pricing_type === "A" && (
                <button
                  type="button"
                  onClick={() => openPrice(selectedRow)}
                  className="h-12 w-full rounded-full bg-white border border-black/10 text-[#3D3D3D] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition"
                >
                  Editar precio
                </button>
              )}

              {selectedRow?.service_catalog?.pricing_type === "A" && (
                <button
                  type="button"
                  onClick={() => openDuration(selectedRow)}
                  className="h-12 w-full rounded-full bg-white border border-black/10 text-[#3D3D3D] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition"
                >
                  Editar duración
                </button>
              )}

              {selectedRow?.is_active ? (
                <button
                  type="button"
                  onClick={() => openUnpublish(selectedRow)}
                  className="h-12 w-full rounded-full bg-white border border-black/10 text-[#1E2F5D] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition"
                >
                  Despublicar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => confirmRepublish(selectedRow)}
                  className="h-12 w-full rounded-full bg-[#1E2F5D] text-white font-semibold shadow-[0_10px_22px_rgba(30,47,93,0.22)] active:scale-[0.98] transition"
                >
                  Publicar nuevamente
                </button>
              )}
            </div>
          </>
        )}

        {sheetType === "unpublish" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Despublicar servicio</h3>
                <p className="mt-1 text-[12px] text-black/45">
                <span className="font-semibold">{selectedName}</span> dejará de aparecer para clientes.
                <br />
                <span className="text-black/50">
                  Se cancelarán automáticamente las solicitudes y turnos pendientes. No se borra historial ni reseñas.
                </span>
              </p>
              </div>

              <IconCircleButton onClick={closeSheet} title="Cerrar" className="h-10 w-10">
                <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
              </IconCircleButton>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <GhostButton onClick={closeSheet} className="flex-1">
                Cancelar
              </GhostButton>
              <PrimaryButton onClick={confirmUnpublish} className="flex-1">
                Despublicar
              </PrimaryButton>
            </div>
          </>
        )}

        {sheetType === "duration" && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Editar duración</h3>
              <p className="mt-1 text-[12px] text-black/45">
                Nueva duración para <span className="font-semibold">{selectedName}</span>
              </p>
            </div>

            <IconCircleButton onClick={closeSheet} title="Cerrar" className="h-10 w-10">
              <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
            </IconCircleButton>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[30, 45, 60, 90, 120].map((m) => {
              const active = Number(durationInput) === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationInput(String(m))}
                  className={[
                    "h-11 rounded-full border text-[13px] font-semibold active:scale-[0.98] transition",
                    active ? "bg-[rgba(44,72,148,0.18)] border-[#1E2F5D]/25 text-[#1E2F5D]" : "bg-white border-black/10 text-black/60"
                  ].join(" ")}
                >
                  {m} min
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <GhostButton onClick={closeSheet} className="flex-1">
              Cancelar
            </GhostButton>
            <PrimaryButton onClick={confirmDuration} className="flex-1">
              Guardar
            </PrimaryButton>
          </div>
        </>
      )}

        {sheetType === "price" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Editar precio</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  Nuevo precio para <span className="font-semibold">{selectedName}</span>
                </p>
              </div>

              <IconCircleButton onClick={closeSheet} title="Cerrar" className="h-10 w-10">
                <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
              </IconCircleButton>
            </div>

            <div className="mt-4">
              <label className="text-[12px] font-semibold text-black/45">Precio base</label>

              <div className="mt-2 flex items-center gap-2 rounded-[18px] bg-black/[0.04] px-4 py-3">
                <span className="text-[14px] font-extrabold text-[#1E2F5D]">$</span>
                <input
                  className="w-full bg-transparent outline-none text-[16px] font-semibold text-[#3D3D3D] placeholder:text-black/35"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Ej: 20000"
                  inputMode="numeric"
                />
              </div>

              <div className="mt-5 flex items-center gap-2">
                <GhostButton onClick={closeSheet} className="flex-1">
                  Cancelar
                </GhostButton>
                <PrimaryButton onClick={confirmPrice} className="flex-1">
                  Guardar
                </PrimaryButton>
              </div>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}