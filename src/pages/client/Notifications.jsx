// src/pages/client/Notifications.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import { listMyNotifications, markNotificationRead } from "../../services/notifications";
import { useToast } from "../../components/Toast";

/* ---------------- helpers ---------------- */
const UNREAD_DOT = "#A0B8E1";
const BLUE = "#1E2F5D";

const ICON_BG_BLUE = "rgba(160,184,225,0.25)";
const ICON_FG_BLUE = "#1E2F5D";

const ICON_BG_RED = "rgba(220,38,38,0.14)";
const ICON_FG_RED = "#DC2626";

function safeDate(v) {
  const t = new Date(v || "").getTime();
  return Number.isFinite(t) ? new Date(v) : null;
}

function formatRelativeShort(dateISO) {
  const d = safeDate(dateISO);
  if (!d) return "";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;

  const days = Math.floor(h / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function isToday(d) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isYesterday(d) {
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
}
function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}
function isThisWeek(d) {
  const now = new Date();
  return startOfWeekMonday(now).getTime() === startOfWeekMonday(d).getTime();
}

function cleanDescription(body) {
  let s = String(body || "").trim();
  if (!s) return "";

  s = s.replace(/📍\s*[^·\n]+/gi, "").trim();
  s = s.replace(/\bubicación\b\s*:\s*[^·\n]+/gi, "").trim();
  s = s.replace(/\bbarrio\b\s*:\s*[^·\n]+/gi, "").trim();
  s = s.replace(/\bdirección\b\s*:\s*[^·\n]+/gi, "").trim();

  s = s.replace(/\s*(?:[-–—]\s*){2,}$/g, "").trim();
  s = s.replace(/\s*--\s*$/g, "").trim();
  s = s.replace(/\s*-\s*-\s*$/g, "").trim();

  s = s.replace(/\s{2,}/g, " ").trim();
  s = s.replace(/\s*·\s*·\s*/g, " · ").trim();
  s = s.replace(/·\s*$/g, "").trim();

  return s;
}

function extractMotive(body, metadata) {
  const metaReason = String(metadata?.cancelled_reason || "").trim();
  if (metaReason) return metaReason;
  const s = String(body || "");
  const m = s.match(/motivo\s*:\s*(.+)$/i);
  if (!m) return "";
  return String(m[1] || "").trim();
}

function stripMotiveFromText(text) {
  return String(text || "").replace(/\s*motivo\s*:\s*.+$/i, "").trim();
}

function splitWhenAndDescription(body) {
  const raw = cleanDescription(body);
  const s = String(raw || "").trim();
  if (!s) return { whenLine: "", descLine: "" };

  if (s.toLowerCase().startsWith("para:")) {
    const idx = s.indexOf("·");
    if (idx !== -1) {
      const whenLine = s.slice(0, idx).trim();
      const descLine = s.slice(idx + 1).trim();
      return { whenLine, descLine };
    }
    return { whenLine: s, descLine: "" };
  }

  return { whenLine: "", descLine: s };
}

  function getNotiUI(n) {
  const type = String(n?.type || "").toLowerCase();

  if (type === "appointment_reminder") {
  return { icon: "mdi:clock-alert-outline", bg: ICON_BG_BLUE, fg: ICON_FG_BLUE };
}

  if (type.includes("cancel")) {
    return { icon: "mdi:calendar-remove-outline", bg: ICON_BG_RED, fg: ICON_FG_RED };
  }

  if (type.includes("request_new") || type.includes("quote") || type.includes("request") || type.includes("appointment")) {
    return { icon: "mdi:calendar-check-outline", bg: ICON_BG_BLUE, fg: ICON_FG_BLUE };
  }

  return { icon: "mdi:bell-outline", bg: ICON_BG_BLUE, fg: ICON_FG_BLUE };
}

function isSoftDeleted(n) {
  return !!n?.deleted_at;
}

function isCancelledNoti(n) {
  return String(n?.type || "").toLowerCase().includes("cancel");
}

function SectionTitle({ children }) {
  return <p className="mt-5 mb-2 text-[13px] font-extrabold text-black/45">{children}</p>;
}

// ✅ NUEVO: chequeo previo para evitar navegar a pantalla de “no existe”
async function requestExistsForMe(requestId) {
  if (!requestId) return false;
  const { data, error } = await supabase.from("service_requests").select("id").eq("id", requestId).maybeSingle();
  if (error) return false;
  return !!data?.id;
}

/* ---------------- swipe row ---------------- */
function SwipeRow({ n, onOpen, onDelete, onLongPress }) {
  const ACTION_W = 72;
  const DELETE_AT = 120;
  const HOLD_MS = 420;

  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startXRef = useRef(0);
  const startTranslateRef = useRef(0);

  const holdTimerRef = useRef(null);
  const longPressedRef = useRef(false);

  const suppressClickRef = useRef(false);
  const didSwipeRef = useRef(false);

  const ui = getNotiUI(n);
  const body = cleanDescription(n.body);
  const timeText = formatRelativeShort(n.created_at);

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  function snapTo(val) {
    setX(val);
    startTranslateRef.current = val;
  }

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function startHold() {
    clearHoldTimer();
    longPressedRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      suppressClickRef.current = true;
      onLongPress?.(n);
    }, HOLD_MS);
  }

  function stopHold() {
    clearHoldTimer();
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    setDragging(true);
    startXRef.current = e.clientX;
    startTranslateRef.current = x;

    suppressClickRef.current = false;
    didSwipeRef.current = false;

    startHold();

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startXRef.current;

    // No permitir swipe a la derecha
    if (dx > 0 && x >= 0) {
      setX(0);
      return;
    }

    if (Math.abs(dx) > 6) {
      didSwipeRef.current = true;
      stopHold();
    }

    const next = startTranslateRef.current + dx;
    const clamped = clamp(next, -DELETE_AT, 0);
    setX(clamped);
  }

  async function onPointerUp() {
    setDragging(false);
    stopHold();

    if (didSwipeRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
        didSwipeRef.current = false;
      }, 0);
    }

    if (longPressedRef.current) return;

    if (x <= -DELETE_AT + 6) {
      await onDelete?.(n);
      snapTo(0);
      return;
    }

    if (x <= -40) {
      snapTo(-ACTION_W);
      return;
    }

    snapTo(0);
  }

  async function handleClick() {
    if (suppressClickRef.current) return;
    if (x < 0) return;
    await onOpen?.(n);
  }

  return (
    <div className="relative w-full select-none overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-[#DC2626] flex items-center justify-end pr-3">
        <button
          type="button"
          onClick={() => onDelete?.(n)}
          className="h-11 w-11 rounded-xl bg-white/15 grid place-items-center active:scale-[0.98] transition"
          aria-label="Eliminar"
          title="Eliminar"
        >
          <IconifyIcon icon="mdi:trash-can-outline" className="h-5 w-5 text-white" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={[
          "relative w-full text-left bg-white border border-black/10 px-4 py-4",
          "transition-[transform] duration-150",
          !n.is_read ? "shadow-[0_8px_22px_rgba(30,47,93,0.08)]" : "shadow-[0_6px_18px_rgba(0,0,0,0.04)]",
        ].join(" ")}
        style={{ transform: `translateX(${x}px)` }}
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl grid place-items-center shrink-0" style={{ background: ui.bg }} aria-hidden="true">
            <IconifyIcon icon={ui.icon} className="h-6 w-6" style={{ color: ui.fg }} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold text-[#3D3D3D] leading-snug line-clamp-1">
              {n.title || "Notificación"}
            </p>
            {body ? <p className="mt-1 text-[13px] text-black/55 leading-snug line-clamp-2">{body}</p> : null}
          </div>

          {/* ✅ “hace 2 min / ayer” más a la derecha (sin superponerse) */}
          <div className="relative w-[64px] shrink-0 self-stretch">
            <span className="absolute right-0 bottom-0 text-[11px] text-black/40">{timeText}</span>

            {!n.is_read ? (
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
                style={{ background: UNREAD_DOT }}
                aria-label="No leída"
              />
            ) : (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full opacity-0" aria-hidden="true" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function ClientNotifications() {
  const nav = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailNoti, setDetailNoti] = useState(null);

  const unreadCount = useMemo(() => (items || []).filter((n) => !n.is_read).length, [items]);

  async function refresh({ silent = false } = {}) {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    setErr("");
    try {
      const data = await listMyNotifications(user.id, { limit: 80 });
      const filtered = (data || []).filter((n) => !isSoftDeleted(n));
      setItems(filtered);
    } catch (e) {
      setErr(e?.message || "No se pudieron cargar notificaciones");
      if (!silent) toast.error("Error", e?.message || "No se pudieron cargar");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    refresh({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`client-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh({ silent: true })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function onOpen(n) {
    try {
      if (!n?.id) return;

      // 1) marcar leída siempre que se toque
      if (!n.is_read) await markNotificationRead(n.id, true);

      const rid = n?.metadata?.request_id;
      const type = String(n?.type || "").toLowerCase();

      // ✅ NUEVO: si es mensaje nuevo -> ir directo al chat
      if (type === "message_new" && rid) {
        const ok = await requestExistsForMe(rid);
        if (!ok) {
          toast.warning("Solicitud no disponible", "La solicitud ya no existe o no tenés permisos para verla.");
          refresh({ silent: true });
          return;
        }
        nav(`/client/requests/${rid}/chat`);
        refresh({ silent: true });
        return;
      }

      // ✅ NUEVO: recordatorio de turno -> ir a la solicitud
      if (type === "appointment_reminder" && rid) {
        const ok = await requestExistsForMe(rid);
        if (!ok) {
          toast.warning("Solicitud no disponible", "La solicitud ya no existe o no tenés permisos para verla.");
          refresh({ silent: true });
          return;
        }
        nav("/client/requests", { state: { focusRequestId: rid } });
        refresh({ silent: true });
        return;
      }

      // 2) Si es cancelada => abrir detalle
      if (isCancelledNoti(n)) {
        openDetail(n);
        refresh({ silent: true });
        return;
      }

      // 3) Si tiene request_id -> tu flujo actual
      if (rid) {
        const ok = await requestExistsForMe(rid);
        if (!ok) {
          toast.warning("Solicitud no disponible", "La solicitud ya no existe o no tenés permisos para verla.");
          refresh({ silent: true });
          return;
        }

        nav("/client/requests", { state: { focusRequestId: rid } });
      } else {
        openDetail(n);
      }

      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo abrir/marcar como leída.");
    }
  }

  //  marcar todas como leídas
  async function markAllAsRead() {
    try {
      const unread = (items || []).filter((n) => !n.is_read);
      if (unread.length === 0) return;

      // Optimista: actualiza UI al toque
      setItems((prev) => (prev || []).map((n) => ({ ...n, is_read: true })));

      // Marcar en DB
      await Promise.allSettled(unread.map((n) => markNotificationRead(n.id, true)));

      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudieron marcar como leídas.");
      refresh({ silent: true });
    }
  }

  async function deleteNotification(n) {
    try {
      if (!n?.id) return;

      setItems((prev) => (prev || []).filter((x) => x.id !== n.id));

      const { error } = await supabase.rpc("orby_delete_notification", { p_id: n.id });
      if (error) throw error;

      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo eliminar.");
      refresh({ silent: true });
    }
  }

  function openDetail(n) {
    setDetailNoti(n);
    setDetailOpen(true);
  }
  function closeDetail() {
    setDetailOpen(false);
    setDetailNoti(null);
  }

  async function goToRequestFromDetail() {
  const rid = detailNoti?.metadata?.request_id;
  if (!rid) return;

  const ok = await requestExistsForMe(rid);
  if (!ok) {
    toast.warning("Solicitud no disponible", "La solicitud ya no existe o no tenés permisos para verla.");
    return;
  }

  refresh({ silent: true });
  closeDetail();
  nav("/client/requests", { state: { focusRequestId: rid } });
}

  const grouped = useMemo(() => {
    const arr = [...(items || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const out = { hoy: [], ayer: [], semana: [], anteriores: [] };

    for (const n of arr) {
      const d = safeDate(n?.created_at);
      if (!d) {
        out.anteriores.push(n);
        continue;
      }
      if (isToday(d)) out.hoy.push(n);
      else if (isYesterday(d)) out.ayer.push(n);
      else if (isThisWeek(d)) out.semana.push(n);
      else out.anteriores.push(n);
    }
    return out;
  }, [items]);

  const hasAny = (items || []).length > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-8 box-border">
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-xl leading-none">‹</span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Notificaciones</h1>

            {unreadCount > 0 && (
              <span
                className="min-w-[22px] h-[22px] px-2 rounded-full text-[12px] font-extrabold grid place-items-center text-white"
                style={{ background: BLUE }}
                aria-label={`${unreadCount} no leídas`}
                title={`${unreadCount} no leídas`}
              >
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="absolute right-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_4px_10px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition"
              aria-label="Marcar todas como leídas"
              title="Marcar todas como leídas"
            >
          <IconifyIcon icon="lucide:clipboard-check" className="h-5 w-5 text-black/60" />            </button>
          )}
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {/* List */}
        <div className="mt-4">
          {loading && (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-black/10 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-40 bg-black/10 rounded animate-pulse" />
                      <div className="mt-2 h-3 w-56 bg-black/10 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-10 bg-black/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !err && !hasAny && (
            <div className="mt-[180px] px-2">
            <div className="flex flex-col items-center text-center">
              {/* icon (gris, sutil) */}
              <div
                className="h-[66px] w-[66px] rounded-[24px] grid place-items-center bg-black/[0.03]"
                aria-hidden="true"
              >
                <IconifyIcon icon="mdi:bell-outline" className="h-8 w-8 text-black/45" />
              </div>

              <p className="mt-5 text-[15px] font-extrabold text-[#3D3D3D]">
                Todavía no hay notificaciones
              </p>

              <p className="mt-2 text-[13px] text-black/45 leading-relaxed max-w-[250px]">
                Cuando haya una novedad, te va a aparecer acá.
              </p>

              {/* separador sutil */}
              <div className="mt-6 w-full max-w-[360px]">
                <div className="h-px w-full bg-black/5" />
              </div>
            </div>
          </div>
          )}

          {!loading && !err && hasAny && (
            <>
              {grouped.hoy.length > 0 && (
                <>
                  <SectionTitle>Hoy</SectionTitle>
                  <div className="grid gap-3">
                    {grouped.hoy.map((n) => (
                      <SwipeRow key={n.id} n={n} onOpen={onOpen} onDelete={deleteNotification} onLongPress={openDetail} />
                    ))}
                  </div>
                </>
              )}

              {grouped.ayer.length > 0 && (
                <>
                  <SectionTitle>Ayer</SectionTitle>
                  <div className="grid gap-3">
                    {grouped.ayer.map((n) => (
                      <SwipeRow key={n.id} n={n} onOpen={onOpen} onDelete={deleteNotification} onLongPress={openDetail} />
                    ))}
                  </div>
                </>
              )}

              {grouped.semana.length > 0 && (
                <>
                  <SectionTitle>Esta semana</SectionTitle>
                  <div className="grid gap-3">
                    {grouped.semana.map((n) => (
                      <SwipeRow key={n.id} n={n} onOpen={onOpen} onDelete={deleteNotification} onLongPress={openDetail} />
                    ))}
                  </div>
                </>
              )}

              {grouped.anteriores.length > 0 && (
                <>
                  <SectionTitle>Anteriores</SectionTitle>
                  <div className="grid gap-3">
                    {grouped.anteriores.map((n) => (
                      <SwipeRow key={n.id} n={n} onOpen={onOpen} onDelete={deleteNotification} onLongPress={openDetail} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {hasAny && (
          <p className="mt-6 text-center text-[12px] text-black/40">
            Deslizá una notificación hacia la izquierda para eliminar.
          </p>
        )}
      </div>

      {/* Modal detalle (long press) */}
      <AnimatePresence>
        {detailOpen && detailNoti && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" className="absolute inset-0 bg-black/45" onClick={closeDetail} aria-label="Cerrar" />

            <motion.div
              className="relative w-full max-w-[520px] bg-white rounded-t-[28px] border border-black/10 shadow-2xl px-6 pt-6"
              style={{ paddingBottom: "calc(36px + env(safe-area-inset-bottom))" }}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <div className="flex justify-center">
                <div className="h-1.5 w-14 rounded-full bg-black/10" />
              </div>

              <div className="mt-5 flex items-start gap-3">
                {(() => {
                  const ui = getNotiUI(detailNoti);
                  return (
                    <div className="h-12 w-12 rounded-2xl grid place-items-center shrink-0" style={{ background: ui.bg }}>
                      <IconifyIcon icon={ui.icon} className="h-6 w-6" style={{ color: ui.fg }} />
                    </div>
                  );
                })()}

                <div className="min-w-0 flex-1 relative pr-12">
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteNotification(detailNoti);
                      closeDetail();
                    }}
                    className="absolute right-0 top-0 h-10 w-10 rounded-full grid place-items-center bg-black/[0.04] active:scale-[0.98] transition"
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    <IconifyIcon icon="mdi:trash-can-outline" className="h-5 w-5 text-[#DC2626]" />
                  </button>

                  <p className="text-[18px] font-extrabold text-[#3D3D3D] leading-snug">{detailNoti.title || "Notificación"}</p>

                  {(() => {
                    const type = String(detailNoti?.type || "").toLowerCase();
                    const motive = type.includes("cancel") ? extractMotive(detailNoti.body, detailNoti.metadata) : "";

                    const { whenLine, descLine } = splitWhenAndDescription(detailNoti.body);
                    const descClean = motive ? stripMotiveFromText(descLine || "") : String(descLine || "").trim();

                    const fallback = cleanDescription(detailNoti.body);
                    const finalDesc = descClean || (!whenLine ? (motive ? stripMotiveFromText(fallback) : fallback) : "");

                    return (
                      <>
                        {whenLine ? <p className="mt-2 text-[14px] text-black/45 leading-relaxed">{whenLine}</p> : null}

                        {finalDesc ? (
                          <p className={["text-[14px] text-black/55 leading-relaxed whitespace-pre-line", whenLine ? "mt-3" : "mt-2"].join(" ")}>
                            {finalDesc}
                          </p>
                        ) : (
                          <p className={["text-[14px] text-black/40", whenLine ? "mt-3" : "mt-2"].join(" ")}>—</p>
                        )}

                        {type.includes("cancel") && motive ? (
                          <p className="mt-3 text-[13px] text-black/55 leading-relaxed">
                            <span className="font-extrabold text-black/45">Motivo:</span> {motive}
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              

                {detailNoti?.metadata?.request_id ? (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={goToRequestFromDetail}
                    className="w-full h-12 rounded-full bg-[#1E2F5D] text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(30,47,93,0.22)] active:scale-[0.98] transition"
                  >
                    Ver solicitud
                  </button>
                </div>
              ) : null}

            <div className="h-5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
