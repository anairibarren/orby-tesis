// src/pages/provider/Agenda.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import { useToast } from "../../components/Toast";
import { listMyAppointmentsAsProvider, completeAppointmentByRequestId, markRequestCompleted } from "../../services/appointments";
import { useNavigate } from "react-router-dom";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatMonthYear(date) {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
function formatWeekdayShort(date) {
  return date
    .toLocaleDateString("es-AR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
}
function formatDayNumber(date) {
  return String(date.getDate());
}
function formatPrettyDateTime(iso) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
  const dayMonth = d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${weekday}, ${dayMonth} · ${time}`;
}

function parseDescAndLocation(raw) {
  const text = String(raw || "");

  // separo descripción de la parte de ubicación
  const marker = "📍 Ubicación:";
  const idx = text.indexOf(marker);

  const descOnly = (idx === -1 ? text : text.slice(0, idx)).trim();

  // intento extraer barrio y dirección desde lo que quedó después del marker
  let barrio = "";
  let direccion = "";

  if (idx !== -1) {
    const tail = text.slice(idx);

    const b = tail.match(/-\s*Barrio:\s*([^-\n]+)/i);
    const d = tail.match(/-\s*Direcci[oó]n:\s*([^-\n]+)/i);

    barrio = String(b?.[1] || "").trim();
    direccion = String(d?.[1] || "").trim();
  }

  return { descOnly, barrio, direccion };
}

function IconButton({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "h-11 w-11 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    confirmada: "bg-[#EAF2FF] text-[#1E2F5D]",
    pendiente: "bg-[#FFF4CC] text-[#8A6A00]",
    cancelada: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold capitalize",
        map[s] || "bg-black/[0.04] text-black/60",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function DayChip({ active, date, count, onClick }) {
  const isToday = sameDay(date, new Date());

  const shadow = active
    ? "drop-shadow(0 6px 14px rgba(30,47,93,0.14))"
    : "drop-shadow(0 3px 10px rgba(0,0,0,0.04))";

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 active:scale-[0.98] transition"
    >
      {/* ✅ wrapper que contiene la sombra */}
      <div className={["p-[2px]", shadow].join(" ")}>
        {/* ✅ tarjeta real (sin sombra) */}
        <div
          className={[
            "w-[74px] rounded-[18px] px-3 py-3 text-left",
            active ? "bg-[#1E2F5D] text-white" : "bg-white text-[#3D3D3D]",
          ].join(" ")}
        >
          <p className="text-[11px] font-extrabold leading-none opacity-95">
            {isToday ? "HOY" : formatWeekdayShort(date)}
          </p>
          <p className="mt-1 text-[20px] font-extrabold leading-[22px]">{formatDayNumber(date)}</p>

          <div
            className={[
              "mt-2 w-full rounded-full px-2 py-1 text-[10px] font-semibold leading-none text-center",
              active ? "bg-white/15 text-white" : "bg-black/[0.04] text-black/55",
            ].join(" ")}
          >
            <span className="whitespace-nowrap block truncate">
              {count} turno{count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyBox({ title, desc }) {
  return (
    <CardShell className="p-5">
      <div className="flex items-start gap-3">
        <span className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
          <IconifyIcon icon="mdi:calendar-blank-outline" className="h-6 w-6 text-black/35" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
          <p className="mt-1 text-[12px] text-black/45">{desc}</p>
        </div>
      </div>
    </CardShell>
  );
}

export default function Agenda() {
  const nav = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [requestsById, setRequestsById] = useState({});

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));

  // detalle bottom-sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAppt, setDetailAppt] = useState(null);

  // UX
  const [busy, setBusy] = useState(false);

  async function fetchRichRequests(requestIds) {
    if (!requestIds.length) return {};

    const { data, error } = await supabase
      .from("service_requests")
      .select(
        `
        id,
        status,
        preferred_datetime,
        quote_amount,
        description,
        client:client_id ( id, full_name, avatar_url ),
        provider_service:provider_service_id (
          id,
          base_price,
          duration_minutes,
          service_catalog:catalog_id ( id, name, category, pricing_type )
        )
      `
      )
      .in("id", requestIds);

    if (error) throw error;

    const map = {};
    (data || []).forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }

  async function refresh({ silent = false } = {}) {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    setErr("");

    try {
      const rows = await listMyAppointmentsAsProvider(user.id);

      // agenda organizacional: solo NO canceladas y desde ahora
      const now = new Date();
      const clean = (rows || [])
        .filter((a) => String(a.status || "").toLowerCase() !== "cancelada")
        .filter((a) => new Date(a.end_at || a.start_at) >= now)
        .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

      setAppointments(clean);

      const ids = Array.from(new Set(clean.map((a) => a.request_id).filter(Boolean)));
      const rich = await fetchRichRequests(ids);
      setRequestsById(rich);
    } catch (e) {
      const msg = e?.message || "Error cargando agenda";
      setErr(msg);
      if (!silent) toast.error("Error", msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`provider-agenda-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `provider_id=eq.${user.id}` },
        () => refresh({ silent: true })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const daysStrip = useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: 7 }).map((_, i) => addDays(base, i));
  }, []);

  const countsByDay = useMemo(() => {
    const map = new Map();
    daysStrip.forEach((d) => map.set(d.getTime(), 0));

    appointments.forEach((a) => {
      const d = startOfDay(new Date(a.start_at));
      const key = d.getTime();
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }, [appointments, daysStrip]);

  const confirmedCount = useMemo(() => {
    return appointments.filter((a) => String(a.status || "").toLowerCase() === "confirmada").length;
  }, [appointments]);

  const dayAppointments = useMemo(() => {
    const day = selectedDate;
    return appointments
      .filter((a) => sameDay(new Date(a.start_at), day))
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  }, [appointments, selectedDate]);

  const nextAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => new Date(a.start_at) >= now).slice(0, 3);
  }, [appointments]);

  function openDetail(appt) {
    setDetailAppt(appt);
    setDetailOpen(true);
  }
  function closeDetail() {
    if (busy) return;
    setDetailOpen(false);
    setDetailAppt(null);
  }

  const detailRequest = detailAppt?.request_id ? requestsById[detailAppt.request_id] : null;
  const parsed = useMemo(
    () => parseDescAndLocation(detailRequest?.description),
    [detailRequest?.description]
  );

  const detailDescOnly = parsed.descOnly;
  const detailBarrio = parsed.barrio;
  const detailDireccion = parsed.direccion;

  const detailName = detailRequest?.provider_service?.service_catalog?.name || "Servicio";
  const detailCategory = detailRequest?.provider_service?.service_catalog?.category || "";
  const detailClientName = detailRequest?.client?.full_name || "Cliente";
  const detailPricingType = detailRequest?.provider_service?.service_catalog?.pricing_type || null;

  const canComplete = useMemo(() => {
    if (!detailAppt?.request_id) return false;
    if (detailAppt?.completed_at) return false;
    const end = new Date(detailAppt.end_at || detailAppt.start_at);
    return new Date() >= end;
  }, [detailAppt]);

  async function handleComplete() {
    if (!detailAppt?.request_id) return;
    if (!canComplete) return;

    try {
      setBusy(true);

      await completeAppointmentByRequestId(detailAppt.request_id);
      await markRequestCompleted(detailAppt.request_id);

      toast.success("Turno completado", "Ahora el cliente puede dejar una reseña.");
      closeDetail();
      await refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo completar el turno.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-6 box-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">Agenda</h1>
            <p className="mt-1 text-[13px] text-black/45">
              Tenés {confirmedCount} turno(s) confirmados
            </p>
          </div>

          <IconButton onClick={() => refresh()} title="Actualizar">
            <IconifyIcon icon="mdi:refresh" className="h-6 w-6 text-black/40" />
          </IconButton>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-[#1E2F5D] capitalize">{formatMonthYear(selectedDate)}</p>

          <button
            type="button"
            onClick={() => setSelectedDate(startOfDay(new Date()))}
            className="h-9 rounded-full bg-[rgba(44,72,148,0.18)] px-4 text-[12px] font-semibold text-[#1E2F5D] active:scale-[0.98] transition"
          >
            Ir a hoy
          </button>
        </div>

        <div className="mt-2 -mx-6 px-6 overflow-x-auto hide-scrollbar py-2">
          <style>{`
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          {/* ✅ sin padding izquierdo extra para alinear con la línea vertical */}
          <div className="flex gap-3 w-max pr-2">
            {daysStrip.map((d) => (
              <DayChip
                key={d.toISOString()}
                date={d}
                active={sameDay(d, selectedDate)}
                count={countsByDay.get(d.getTime()) || 0}
                onClick={() => setSelectedDate(startOfDay(d))}
              />
            ))}
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        <div className="mt-6">
          <p className="text-[13px] font-extrabold text-[#3D3D3D]">Turnos del día ({dayAppointments.length})</p>

          <div className="mt-3 grid gap-3">
            {loading && (
              <CardShell className="p-5 animate-pulse">
                <div className="h-4 w-56 rounded bg-black/10" />
                <div className="mt-2 h-4 w-40 rounded bg-black/10" />
              </CardShell>
            )}

            {!loading && dayAppointments.length === 0 && (
              <EmptyBox
                title="No tenés turnos este día"
                desc="Elegí otra fecha arriba para ver tus turnos confirmados."
              />
            )}

            {!loading &&
              dayAppointments.map((a) => {
                const req = a.request_id ? requestsById[a.request_id] : null;
                const name = req?.provider_service?.service_catalog?.name || "Servicio";
                const when = formatPrettyDateTime(a.start_at);
                const st = a.status || "pendiente";
                const clientName = req?.client?.full_name;

                return (
                  <button key={a.id} type="button" onClick={() => openDetail(a)} className="text-left">
                    <CardShell className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-black/45">{when}</p>
                          <p className="mt-1 text-[16px] font-extrabold text-[#3D3D3D] truncate">{name}</p>
                          {clientName && (
                            <p className="mt-1 text-[12px] text-black/45 truncate">{clientName}</p>
                          )}
                        </div>

                        <div className="shrink-0">
                          <StatusPill status={st} />
                        </div>
                      </div>
                    </CardShell>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[13px] font-extrabold text-[#3D3D3D]">
            Próximos turnos <span className="text-black/40">(vista rápida)</span>
          </p>

          <div className="mt-3 grid gap-3">
            {!loading && nextAppointments.length === 0 && (
              <CardShell className="p-5">
                <p className="text-[14px] font-extrabold text-[#3D3D3D]">No tenés próximos turnos</p>
                <p className="mt-1 text-[12px] text-black/45">
                  Cuando confirmes solicitudes en Requests, van a aparecer acá.
                </p>
              </CardShell>
            )}

            {!loading &&
              nextAppointments.map((a) => {
                const req = a.request_id ? requestsById[a.request_id] : null;
                const name = req?.provider_service?.service_catalog?.name || "Servicio";
                const when = formatPrettyDateTime(a.start_at);

                return (
                  <button key={a.id} type="button" onClick={() => openDetail(a)} className="text-left">
                    <CardShell className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                          <IconifyIcon icon="mdi:calendar-check-outline" className="h-5 w-5 text-black/40" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{name}</p>
                          <p className="mt-1 text-[12px] text-black/45 truncate">{when}</p>
                        </div>

                        <IconifyIcon icon="mdi:chevron-right" className="h-6 w-6 text-black/25" />
                      </div>
                    </CardShell>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {detailOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar"
              onClick={closeDetail}
              className="fixed inset-0 z-[9998] bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="fixed left-0 right-0 bottom-0 z-[9999] bg-white rounded-t-[28px] shadow-2xl p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/10" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[18px] font-extrabold text-[#3D3D3D] truncate">{detailName}</p>
                  {!!detailCategory && <p className="mt-1 text-[12px] text-black/45">{detailCategory}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusPill status={detailAppt?.status || "pendiente"} />
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold bg-black/[0.04] text-black/60">
                  {formatPrettyDateTime(detailAppt?.start_at)}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="flex items-center gap-2 text-[13px] text-black/65">
                  <IconifyIcon icon="mdi:account-outline" className="h-5 w-5 text-black/35" />
                  <span className="truncate">{detailClientName}</span>
                </div>

                {(detailDescOnly || detailBarrio || detailDireccion) && (
                <div className="rounded-2xl bg-black/[0.03] p-3">
                  <p className="text-[12px] font-semibold text-black/60">Descripción</p>

                  {detailDescOnly ? (
                    <p className="mt-1 text-[13px] text-black/70 whitespace-pre-line">
                      {detailDescOnly}
                    </p>
                  ) : (
                    <p className="mt-1 text-[13px] text-black/50 italic">Sin descripción</p>
                  )}

                  {(detailBarrio || detailDireccion) && (
                    <div className="mt-3 pt-3 border-t border-black/10 grid gap-2 text-[13px]">
                      {detailBarrio ? (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-black/45">Barrio</span>
                          <span className="font-semibold text-black/70 text-right">{detailBarrio}</span>
                        </div>
                      ) : null}

                      {detailDireccion ? (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-black/45">Dirección</span>
                          <span className="font-semibold text-black/70 text-right">{detailDireccion}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

                {detailPricingType === "A" && detailRequest?.provider_service?.base_price != null && (
                  <div className="rounded-2xl bg-black/[0.03] p-3">
                    <p className="text-[12px] font-semibold text-black/60">Precio</p>
                    <p className="mt-1 text-[14px] font-extrabold text-[#3D3D3D]">
                      ${Number(detailRequest.provider_service.base_price).toLocaleString("es-AR")}
                    </p>
                  </div>
                )}

                {detailPricingType === "B" && detailRequest?.quote_amount != null && (
                  <div className="rounded-2xl bg-black/[0.03] p-3">
                    <p className="text-[12px] font-semibold text-black/60">Cotización</p>
                    <p className="mt-1 text-[14px] font-extrabold text-[#3D3D3D]">
                      ${Number(detailRequest.quote_amount).toLocaleString("es-AR")}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                {canComplete && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={busy}
                    className={[
                      "h-12 w-full rounded-full text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(30,47,93,0.18)] active:scale-[0.98] transition",
                      busy ? "bg-[#1E2F5D]/60" : "bg-[#1E2F5D]",
                    ].join(" ")}
                  >
                    {busy ? "Procesando..." : "Marcar como completado"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!detailAppt?.request_id) return;
                    closeDetail();
                    nav(`/provider/requests/${detailAppt.request_id}`);
                  }}
                  disabled={busy || !detailAppt?.request_id}
                  className="h-12 w-full rounded-full bg-[#1E2F5D] text-[13px] font-semibold text-white active:scale-[0.98] transition disabled:opacity-60"
                >
                  Ir a la solicitud
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
