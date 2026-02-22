// src/pages/client/Schedule.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon as IconifyIcon } from "@iconify/react";

import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabase";
import { listProviderAvailability } from "../../services/availability";
import { createRequest } from "../../services/requests";
import { ensureAppointmentForRequest } from "../../services/appointments";
import Loading from "../../components/Loading";

function draftKey(id) {
  return `orby_request_draft_${id}`;
}
function successKey() {
  return `orby_last_success`;
}

function extractMissingColumn(err) {
  const msg = String(err?.message || "");
  let m = msg.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (m?.[1]) return m[1];
  m = msg.match(/find the '([^']+)' column/i);
  if (m?.[1]) return m[1];
  return null;
}

function toMin(hhmm) {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}
function toHHMM(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isoWeekdayFromDateStr(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function formatDMY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}-${m}-${y}`;
}

function normalizeWeekdayToISO(w) {
  const n = Number(w);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 6) return n === 0 ? 7 : n;
  if (n >= 1 && n <= 7) return n;
  return null;
}

function buildSlotsForRange({ startHHMM, endHHMM, durationMin, gapMin }) {
  const s = toMin(startHHMM);
  const e = toMin(endHHMM);
  const dur = Number(durationMin);
  const gap = Number(gapMin);

  if (![s, e].every((x) => Number.isFinite(x))) return [];
  if (!Number.isFinite(dur) || dur <= 0) return [];
  if (!Number.isFinite(gap) || gap < 0) return [];
  if (e <= s) return [];

  const step = dur + gap;
  const out = [];
  for (let t = s; t + dur <= e; t += step) {
    out.push({ start: toHHMM(t), end: toHHMM(t + dur) });
  }
  return out;
}

function formatMonthTitle(d) {
  const fmt = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
  const s = fmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildMonthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const last = endOfMonth(monthDate);

  const firstIso = normalizeWeekdayToISO(first.getDay());
  const offset = (firstIso ?? 1) - 1;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);

  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (cells.length < 42) cells.push(null);
  return cells;
}

const ACTIVE_LOCK_STATUSES = ["solicitada", "cotizada", "aceptada", "agendada"];
const PAST_GUARD_MINUTES = 1;

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden border border-black/10",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function formatDateOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

/** 24h SIEMPRE */
function formatTimeOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Bottom sheet (ahora overflow visible para que el confetti sobresalga) */
function Sheet({ open, onClose, dismissible = true, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {dismissible ? (
            <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Cerrar" />
          ) : (
            <div className="absolute inset-0 bg-black/50" />
          )}

          <motion.div
            className="absolute left-0 right-0 bottom-0"
            initial={{ y: 220, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 220, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 520, damping: 22, mass: 0.9 }}
          >
            <div className="mx-auto w-full max-w-[520px] px-4 pb-6">
              {/* ✅ overflow-visible para que el confetti salga del recuadro */}
              <div className="rounded-[28px] bg-white shadow-2xl border border-black/10 relative overflow-visible">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** ✅ Confetti azul más explosivo y visible (sobresale de la modal) */
function PaperConfetti({ active }) {
  const pieces = useMemo(() => {
    const out = [];
    const colors = ["#1E2F5D", "#3F568F", "#A0B8E1", "rgba(30,47,93,0.55)", "rgba(63,86,143,0.55)"];

    // determinístico (para que no cambie en cada render)
    for (let i = 0; i < 34; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 140 + (i % 6) * 18; // explosivo
      const up = -220 - (i % 7) * 18;
      const rot = -40 + (i % 9) * 10;
      const delay = (i % 10) * 0.02;
      const dur = 1.05 + (i % 7) * 0.08; // duradera sin slow
      const w = 8 + (i % 4) * 2;
      const h = 14 + (i % 5) * 3;

      out.push({
        i,
        w,
        h,
        color: colors[i % colors.length],
        dx: side * (spread - (i % 5) * 10),
        dy: up,
        rot,
        delay,
        dur,
        spin: side * (160 + (i % 5) * 40),
        drift: side * (24 + (i % 4) * 10),
      });
    }
    return out;
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute -inset-12 overflow-visible">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="absolute rounded-[4px]"
          style={{
            left: "50%",
            top: "38%",
            width: p.w,
            height: p.h,
            background: p.color,
            transform: `translate(-50%,-50%) rotate(${p.rot}deg)`,
            boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.95 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: [0, p.dx, p.dx + p.drift],
            y: [0, p.dy, p.dy + 60],
            rotate: [p.rot, p.rot + p.spin],
            scale: [0.95, 1.12, 1],
          }}
          transition={{ duration: p.dur, ease: "easeOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

/** ✅ FX de celebración más visible */
function CelebrationFX({ active }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <motion.div
        className="absolute left-1/2 top-6 -translate-x-1/2 h-56 w-56 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(30,47,93,0.18) 0%, rgba(30,47,93,0.00) 70%)",
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0, 1, 0.9], scale: [0.85, 1.22, 1] }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-[56px] -translate-x-1/2 h-24 w-24 rounded-full border border-black/10"
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: [0, 1, 0], scale: [0.75, 1.9, 2.2] }}
        transition={{ duration: 1.0, ease: "easeOut" }}
      />

      <PaperConfetti active={true} />
    </div>
  );
}

function SuccessSheet({ open, summary, onGoDetail, onGoBack }) {
  if (!summary) return null;

  return (
    <Sheet open={open} dismissible={false}>
      <div className="relative px-6 pt-6 pb-6">
        <CelebrationFX active={open} />

        <div className="relative flex flex-col items-center text-center">
          <motion.span
            className="h-14 w-14 rounded-full bg-black/[0.06] grid place-items-center"
            initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
            animate={{ scale: [0.7, 1.18, 1], rotate: [-10, 8, 0], opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
          >
            <IconifyIcon icon="mdi:party-popper" className="h-7 w-7 text-black/55" />
          </motion.span>

          <motion.h3
            className="mt-4 text-[22px] font-extrabold text-[#3D3D3D] leading-tight"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.25 }}
          >
            Turno confirmado
          </motion.h3>

          <motion.p
            className="mt-2 text-[13px] text-black/55 leading-snug max-w-[36ch]"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.25 }}
          >
            Ya quedó registrado tu turno. Podés ver el detalle cuando quieras.
          </motion.p>

          <motion.div
            className="mt-5 w-full rounded-[18px] border border-black/10 bg-black/[0.02] p-4 text-left"
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.14, type: "spring", stiffness: 520, damping: 24 }}
          >
            <p className="text-[12px] font-semibold text-black/45">Resumen</p>

            <p className="mt-1 text-[15px] font-extrabold text-[#3D3D3D] leading-snug break-words">{summary.serviceName}</p>
            {summary.providerName ? <p className="mt-1 text-[12px] text-black/55">{summary.providerName}</p> : null}

            <div className="mt-3 grid gap-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-black/45">Fecha</span>
                <span className="font-semibold text-black/75 text-right">{summary.dateLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-black/45">Hora</span>
                <span className="font-semibold text-black/75 text-right">{summary.timeLabel}</span>
              </div>
            </div>
          </motion.div>

          <div className="mt-5 w-full grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onGoBack}
              className="h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold"
            >
              Volver
            </button>

            <button
              type="button"
              onClick={onGoDetail}
              className="h-[54px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.28)]"
            >
              Ver detalle
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export default function ClientSchedule() {
  const nav = useNavigate();
  const toast = useToast();
  const { id } = useParams(); // provider_service_id
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ps, setPs] = useState(null);
  const [ranges, setRanges] = useState([]);
  const [takenRequests, setTakenRequests] = useState([]);
  const [err, setErr] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successSummary, setSuccessSummary] = useState(null);

  // confirm UI (solo texto + bloqueo)
  const [confirming, setConfirming] = useState(false);

  const draft = useMemo(() => {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [id]);

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const maxStr = useMemo(() => toDateStr(addDays(new Date(), 29)), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));

  async function refreshTaken(providerId) {
    const startISO = new Date(`${todayStr}T00:00:00`).toISOString();
    const endISO = new Date(`${maxStr}T23:59:59`).toISOString();

    const { data, error } = await supabase
      .from("service_requests")
      .select("id, provider_id, preferred_datetime, status")
      .eq("provider_id", providerId)
      .gte("preferred_datetime", startISO)
      .lte("preferred_datetime", endISO)
      .in("status", ACTIVE_LOCK_STATUSES)
      .order("preferred_datetime", { ascending: true });

    if (error) throw error;
    setTakenRequests(data ?? []);
  }

  useEffect(() => {
    if (!draft?.description) {
      nav(`/client/services/${id}/request`, { replace: true });
      return;
    }

    let alive = true;

    (async () => {
      try {
        setErr("");

        let res = await supabase
          .from("provider_services")
          .select(
            `
            id,
            provider_id,
            catalog_id,
            base_price,
            duration_minutes,
            service_catalog:catalog_id ( id, name, category, pricing_type, currency ),
            profiles:provider_id ( id, full_name, neighborhood, provider_verified, buffer_minutes )
          `
          )
          .eq("id", id)
          .single();

        if (res.error && String(res.error?.message || "").toLowerCase().includes(`column "duration_minutes" does not exist`)) {
          res = await supabase
            .from("provider_services")
            .select(
              `
              id,
              provider_id,
              catalog_id,
              base_price,
              service_catalog:catalog_id ( id, name, category, pricing_type, currency ),
              profiles:provider_id ( id, full_name, neighborhood, provider_verified, buffer_minutes )
            `
            )
            .eq("id", id)
            .single();
        }

        if (res.error) throw res.error;

        const av = await listProviderAvailability(res.data.provider_id);
        if (!alive) return;

        setPs(res.data);
        setRanges(av || []);
        await refreshTaken(res.data.provider_id);
      } catch (e) {
        if (alive) setErr(e?.message || "No se pudo cargar disponibilidad");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [id, nav, draft?.description, todayStr, maxStr]);

  const durationMin = Number(ps?.duration_minutes ?? 60);
  const gapMin = Number(ps?.profiles?.buffer_minutes ?? 0);

  const activeWeekdays = useMemo(() => {
    const set = new Set();
    for (const r of ranges || []) {
      const iso = normalizeWeekdayToISO(r.weekday ?? r.day_of_week);
      if (iso) set.add(iso);
    }
    return set;
  }, [ranges]);

  const takenByDate = useMemo(() => {
    const map = new Map();
    for (const r of takenRequests || []) {
      if (!r?.preferred_datetime) continue;
      const dt = new Date(r.preferred_datetime);
      const dStr = toDateStr(dt);
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      const key = `${hh}:${mm}`;
      if (!map.has(dStr)) map.set(dStr, new Set());
      map.get(dStr).add(key);
    }
    return map;
  }, [takenRequests]);

  const slotsByDate = useMemo(() => {
    const map = new Map();
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = addDays(today, i);
      const ds = toDateStr(d);
      const weekdayISO = isoWeekdayFromDateStr(ds);

      if (!activeWeekdays.has(weekdayISO)) continue;

      const dayRanges = (ranges || []).filter((r) => {
        const iso = normalizeWeekdayToISO(r.weekday ?? r.day_of_week);
        return iso === weekdayISO;
      });

      const all = [];
      for (const r of dayRanges) {
        const part = buildSlotsForRange({
          startHHMM: r.start_time,
          endHHMM: r.end_time,
          durationMin,
          gapMin,
        });
        for (const s of part) all.push(s);
      }

      map.set(ds, { all });
    }

    return map;
  }, [ranges, activeWeekdays, durationMin, gapMin]);

  const isPastSlot = (dateStr, hhmm) => {
    if (!dateStr || !hhmm) return false;
    if (dateStr !== todayStr) return false;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + PAST_GUARD_MINUTES;

    const sMin = toMin(hhmm);
    if (!Number.isFinite(sMin)) return false;

    return sMin <= nowMin;
  };

  const dayIsSelectable = (ds) => {
    if (ds < todayStr) return false;
    if (ds > maxStr) return false;

    const info = slotsByDate.get(ds);
    if (!info) return false;

    const all = info.all || [];
    const taken = takenByDate.get(ds) || new Set();

    return all.some((s) => {
      const takenOrPast = taken.has(s.start) || isPastSlot(ds, s.start);
      return !takenOrPast;
    });
  };

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return slotsByDate.get(selectedDate)?.all || [];
  }, [selectedDate, slotsByDate]);

  const takenSet = useMemo(() => {
    if (!selectedDate) return new Set();
    return takenByDate.get(selectedDate) || new Set();
  }, [selectedDate, takenByDate]);

  const monthCells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);

  function goPrevMonth() {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1));
  }

  async function createRequestWithFallback(payload) {
    let p = { ...payload };
    let lastErr = null;

    for (let i = 0; i < 3; i++) {
      try {
        return await createRequest(p);
      } catch (e) {
        lastErr = e;
        const col = extractMissingColumn(e);

        if (col && Object.prototype.hasOwnProperty.call(p, col)) {
          const next = { ...p };
          delete next[col];
          p = next;
          continue;
        }

        throw e;
      }
    }

    throw lastErr;
  }

  async function onConfirm() {
    if (confirming) return;

    if (!user?.id) return toast.error("Error", "Tenés que iniciar sesión.");
    if (!ps?.provider_id) return toast.error("Error", "Falta prestador.");
    if (!draft?.description) return toast.error("Error", "Falta descripción.");
    if (!selectedDate || !selectedTime) return toast.warning("Falta info", "Elegí día y horario.");

    if (takenSet.has(selectedTime)) {
      toast.warning("Ocupado", "Ese horario ya fue tomado. Elegí otro.");
      return;
    }
    if (isPastSlot(selectedDate, selectedTime)) {
      toast.warning("Horario no válido", "Ese horario ya pasó. Elegí otro.");
      return;
    }

    const startLocal = new Date(`${selectedDate}T${selectedTime}`);
    const startISO = startLocal.toISOString();

    const now = new Date();
    if (startLocal.getTime() <= now.getTime() + PAST_GUARD_MINUTES * 60 * 1000) {
      toast.warning("Horario no válido", "Ese horario ya pasó. Elegí otro.");
      return;
    }

    setConfirming(true);

    try {
      const { data: existing, error: exErr } = await supabase
        .from("service_requests")
        .select("id")
        .eq("provider_id", ps.provider_id)
        .eq("preferred_datetime", startISO)
        .in("status", ACTIVE_LOCK_STATUSES)
        .limit(1);

      if (exErr) throw exErr;
      if ((existing ?? []).length > 0) {
        toast.warning("Ocupado", "Alguien tomó ese horario recién. Elegí otro.");
        await refreshTaken(ps.provider_id);
        return;
      }

      const end = new Date(startISO);
      end.setMinutes(end.getMinutes() + durationMin);
      const endISO = end.toISOString();

      const serviceName = ps?.service_catalog?.name || "Servicio";
      const providerName = ps?.profiles?.full_name || "";

      const pricingType = ps?.service_catalog?.pricing_type || null;
      const basePrice = ps?.base_price != null ? Number(ps.base_price) : null;
      const serviceAmountForDB = pricingType === "A" && Number.isFinite(basePrice) ? basePrice : null;

      const paymentMethod = draft?.payment_method || "cash";
      const neighborhood = draft?.neighborhood ?? profile?.neighborhood ?? null;
      const address = draft?.address ?? null;

      const descriptionCompiled = String(draft?.description_compiled || draft?.description || "").trim();

      const payload = {
        client_id: user.id,
        provider_id: ps.provider_id,

        provider_service_id: ps.id,
        service_id: ps.id,
        catalog_id: ps.catalog_id,

        description: descriptionCompiled,
        neighborhood: neighborhood || null,
        address: address || null,

        preferred_datetime: startISO,
        status: "solicitada",

        payment_method: paymentMethod,
        payment_status: String(paymentMethod || "").toLowerCase() === "mp" ? "pending" : "not_required",

        service_amount: serviceAmountForDB,
        fee_percent: 7.0,
      };

      const req = await createRequestWithFallback(payload);

      await ensureAppointmentForRequest({
        request_id: req.id,
        provider_id: ps.provider_id,
        client_id: user.id,
        start_at: startISO,
        end_at: endISO,
      });

      await refreshTaken(ps.provider_id);

      const summary = {
        requestId: req.id,
        providerServiceId: ps.id,
        serviceName,
        providerName,
        datetimeISO: startISO,
        paymentMethod,
        dateLabel: formatDateOnly(startISO),
        timeLabel: selectedTime, // ✅ exacto
      };

      localStorage.setItem(successKey(), JSON.stringify(summary));
      localStorage.removeItem(draftKey(id));

      setSuccessSummary(summary);
      setSuccessOpen(true);
      toast.success("Listo", "Turno confirmado.");
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo crear la solicitud.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <Loading />;

  if (err) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6">
        <button onClick={() => nav(-1)} className="text-sm text-[#2A4691]">
          ← Volver
        </button>
        <p className="mt-4 text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const serviceName = ps?.service_catalog?.name || "Servicio";
  const serviceCategory = ps?.service_catalog?.category || "";

  const canPress = !!selectedDate && !!selectedTime && !confirming;

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[46px] pb-10">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Elegí tu turno</h1>
        </div>

        {/* Resumen */}
        <CardShell className="mt-5 p-5">
          <div className="relative">
            <span className="absolute right-0 top-0 inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold bg-[#EAF2FF] text-[#1E2F5D]">
              {durationMin} min
            </span>

            <p className="text-[12px] font-semibold text-black/40">Resumen</p>
            <p className="mt-1 pr-20 text-[15px] font-extrabold text-[#3D3D3D] leading-snug break-words">{serviceName}</p>
            {serviceCategory ? <p className="mt-1 text-[12px] text-black/45">{serviceCategory}</p> : null}
          </div>
        </CardShell>

        {/* Calendar */}
        <CardShell className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="h-10 w-10 rounded-full bg-black/[0.03] grid place-items-center active:scale-[0.98] transition"
              aria-label="Mes anterior"
              title="Mes anterior"
            >
              ‹
            </button>

            <p className="text-[14px] font-extrabold text-[#3D3D3D]">{formatMonthTitle(monthCursor)}</p>

            <button
              type="button"
              onClick={goNextMonth}
              className="h-10 w-10 rounded-full bg-black/[0.03] grid place-items-center active:scale-[0.98] transition"
              aria-label="Mes siguiente"
              title="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-[11px] text-black/45 font-semibold">
            {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
              <div key={w} className="text-center">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthCells.map((cell, idx) => {
              if (!cell) return <div key={idx} />;

              const ds = toDateStr(cell);
              const inWindow = ds >= todayStr && ds <= maxStr;
              const selectable = inWindow && dayIsSelectable(ds);
              const selected = selectedDate === ds;

              const cls = [
                "h-10 w-10 rounded-full grid place-items-center text-[13px] transition",
                selected ? "bg-[#1E2F5D] text-white" : "bg-white",
                selectable
                  ? (selected
                      ? "border border-[#1E2F5D] hover:bg-[#1E2F5D] hover:text-white active:scale-[0.98]"
                      : "border border-black/10 hover:bg-black/[0.03] active:scale-[0.98]")
                  : "border border-black/5 bg-black/[0.04] text-black/30 cursor-not-allowed",
              ].join(" ");

              return (
                <button
                  key={`${ds}-${idx}`}
                  type="button"
                  disabled={!selectable}
                  onClick={() => {
                    setSelectedDate(ds);
                    setSelectedTime("");
                  }}
                  className={cls}
                  title={selectable ? "Disponible" : "No disponible"}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[12px] text-black/45">
            Mostramos hasta <b>30 días</b>.
          </p>
        </CardShell>

        {/* Slots */}
        <CardShell className="mt-4 p-4">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">Horarios</p>

          {!selectedDate && <p className="mt-2 text-sm text-black/50">Elegí un día en el calendario.</p>}

          {selectedDate && (
            <>
              <p className="mt-2 text-[12px] text-black/45">{formatDMY(selectedDate)}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {slots.length ? (
                  slots.map((s) => {
                    const isTaken = takenSet.has(s.start);
                    const isPast = isPastSlot(selectedDate, s.start);
                    const active = selectedTime === s.start;
                    const visualDisabled = isTaken || isPast;

                    return (
                      <button
                        key={`${selectedDate}-${s.start}`}
                        type="button"
                        disabled={visualDisabled}   
                        onClick={() => {
                          if (isTaken) return toast.warning("Ocupado", "Ese horario ya se ocupó. Elegí otro.");
                          if (isPast) return toast.warning("No válido", "Ese horario ya pasó. Elegí otro.");
                          setSelectedTime(s.start);
                        }}
                        className={[
                          "rounded-full px-3 py-2 text-xs transition border select-none",
                        active
                          ? "bg-[#1E2F5D] text-white font-semibold border-[#1E2F5D] hover:bg-[#1E2F5D] hover:text-white"
                          : "bg-white text-black/70 border-black/10 hover:bg-black/[0.02]",
                          visualDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "active:scale-[0.99]",
                        ].join(" ")}
                        aria-disabled={visualDisabled}
                        title={isTaken ? "Ocupado" : isPast ? "Ya pasó" : `${s.start}–${s.end}`}
                      >
                        {s.start}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-black/50">No hay rangos para ese día.</p>
                )}
              </div>
            </>
          )}
        </CardShell>

        {/* ✅ CTA simple (sin efectos) */}
        <div className="mt-5">
          <button
            onClick={onConfirm}
            disabled={!canPress}
            className={[
              "w-full h-[54px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.28)] disabled:opacity-60",
            ].join(" ")}
          >
            {confirming ? "Confirmando…" : "Confirmar turno"}
          </button>
        </div>

        <div className="h-10" />
      </div>

      <SuccessSheet
        open={successOpen}
        summary={successSummary}
        onGoDetail={() => {
          if (successSummary?.requestId) nav(`/client/requests/${successSummary.requestId}`, { replace: true });
        }}
        onGoBack={() => nav("/client/requests")}
      />
    </div>
  );
}
