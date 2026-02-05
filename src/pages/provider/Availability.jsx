// src/pages/provider/Availability.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../hooks/useAuth";
import {
  listProviderAvailability,
  createAvailabilityRange,
  updateAvailabilityRange,
  deleteAvailabilityRange,
  setDayActive,
  updateMyBufferMinutes,
} from "../../services/availability";
import { hasFutureAppointmentsOnWeekday } from "../../services/appointments";
import { useToast } from "../../components/Toast";

// ISO weekday: 1=Lunes ... 7=Domingo
const DAYS = [
  { key: 1, label: "Lunes" },
  { key: 2, label: "Martes" },
  { key: 3, label: "Miércoles" },
  { key: 4, label: "Jueves" },
  { key: 5, label: "Viernes" },
  { key: 6, label: "Sábado" },
  { key: 7, label: "Domingo" },
];

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

/**
 * Slots preview
 * align="start" => el primero arranca en start
 * align="end"   => el último termina en end
 * gap solo ENTRE turnos
 */
function buildSlots({ startHHMM, endHHMM, durationMin, gapMin, align = "start" }) {
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

  if (align === "end") {
    let t = e - dur;
    while (t >= s) {
      out.push({ start: toHHMM(t), end: toHHMM(t + dur) });
      t -= step;
    }
    return out.reverse();
  }

  for (let t = s; t + dur <= e; t += step) {
    out.push({ start: toHHMM(t), end: toHHMM(t + dur) });
  }
  return out;
}

/* UI helpers */
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

function IconCircleButton({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children, className = "", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-12 rounded-full bg-[#1E2F5D] px-5 text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(30,47,93,0.22)] active:scale-[0.98] transition disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children, className = "", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-12 rounded-full bg-white border border-black/10 px-5 text-[13px] font-semibold text-[#3D3D3D] shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "on"
      ? "bg-[#2A4691]/10 text-[#2A4691]"
      : tone === "off"
      ? "bg-black/[0.04] text-black/55"
      : "bg-black/[0.04] text-black/55";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold",
        cls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/** ✅ compact segmented (fix: no recorta título) */
function SegmentedCompact({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-full border border-black/10 bg-black/[0.04] p-1 shrink-0">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            "px-3 py-2 text-[12px] rounded-full font-semibold transition whitespace-nowrap",
            value === o.value ? "bg-white shadow-sm text-[#3D3D3D]" : "text-black/55",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative h-7 w-12 rounded-full transition border border-black/10",
        disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]",
        checked ? "bg-[#1E2F5D]" : "bg-black/[0.12]",
      ].join(" ")}
      aria-label="Cambiar estado"
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}

/** Skeleton */
function SkeletonLine({ w = "w-full", h = "h-4" }) {
  return <div className={[w, h, "rounded-full bg-black/[0.06] animate-pulse"].join(" ")} />;
}
function SkeletonCard() {
  return (
    <CardShell className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <SkeletonLine w="w-28" h="h-5" />
          <div className="mt-3">
            <SkeletonLine w="w-full" h="h-4" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SkeletonLine w="w-20" h="h-7" />
          <SkeletonLine w="w-7" h="h-7" />
        </div>
      </div>
    </CardShell>
  );
}

/** Bottom sheet */
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
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.9 }}
              role="dialog"
              aria-modal="true"
              layout
            >
              <div className="h-1.5 w-12 bg-black/10 rounded-full mx-auto mt-3" />
              <div className="px-5 pb-5 pt-4 max-h-[78vh] overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Resumen para cards: muestra hasta 2 rangos + "+N" */
function rangesPills(activeRanges) {
  const list = (activeRanges || [])
    .slice()
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
    .map((r) => `${r.start_time}–${r.end_time}`);

  if (!list.length) return { items: [], more: 0 };

  const items = list.slice(0, 2);
  const more = Math.max(0, list.length - items.length);
  return { items, more };
}

export default function ProviderAvailability() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  // ✅ Config turnos (persistencia local)
  const [durationMin, setDurationMin] = useState(() => localStorage.getItem("orby_av_duration") || "60");
  const [alignMode, setAlignMode] = useState(() => localStorage.getItem("orby_av_align") || "start"); // start | end

  useEffect(() => {
    localStorage.setItem("orby_av_duration", String(durationMin));
  }, [durationMin]);

  useEffect(() => {
    localStorage.setItem("orby_av_align", String(alignMode));
  }, [alignMode]);

  // gap (buffer) persistido en perfil
  const initialGap = Number(profile?.buffer_minutes ?? 20);
  const [gapMin, setGapMin] = useState(String(Number.isFinite(initialGap) ? initialGap : 20));
  const [savingGap, setSavingGap] = useState(false);

  // ✅ Editor de día en sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState(null);
  // views: "day" | "confirmDisableDay" | "confirmDeleteRange"
  const [activeDay, setActiveDay] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // agregar rango
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("18:00");
  const [adding, setAdding] = useState(false);

  // edición por rango
  const [editMap, setEditMap] = useState({});
  const [savingRangeId, setSavingRangeId] = useState(null);

  async function refresh() {
    if (!user?.id) return;
    setErr("");
    setLoading(true);
    try {
      const data = await listProviderAvailability(user.id, { includeInactive: true });
      setRows(data || []);
    } catch (e) {
      const msg = e?.message || "No se pudo cargar tu disponibilidad";
      setErr(msg);
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const d of DAYS) map.set(d.key, []);
    for (const r of rows || []) {
      const k = Number(r.weekday ?? r.day_of_week);
      if (!Number.isFinite(k)) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    for (const d of DAYS) {
      map.set(
        d.key,
        (map.get(d.key) || [])
          .slice()
          .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
      );
    }
    return map;
  }, [rows]);

  const dayRows = useMemo(() => byDay.get(activeDay) || [], [byDay, activeDay]);
  const activeRanges = useMemo(() => dayRows.filter((r) => r.is_active), [dayRows]);

  const isDayOn = activeRanges.length > 0;
  const hasAnyRanges = dayRows.length > 0;

  const dayLabel = DAYS.find((d) => d.key === activeDay)?.label || "Día";

  const gapPreview = useMemo(() => {
    const n = Number(gapMin);
    if (Number.isFinite(n)) return n;
    const fallback = Number(profile?.buffer_minutes ?? 20);
    return Number.isFinite(fallback) ? fallback : 20;
  }, [gapMin, profile?.buffer_minutes]);

  async function onSaveGap() {
    if (!user?.id) return;
    const n = Number(gapMin);
    if (!Number.isFinite(n) || n < 0 || n > 240) {
      return toast.warning("Valor inválido", "Ingresá un número válido (0 a 240).");
    }

    setSavingGap(true);
    try {
      await updateMyBufferMinutes(user.id, Math.round(n));
      toast.success("Listo", "Se guardó el tiempo entre turnos.");
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo guardar.");
    } finally {
      setSavingGap(false);
    }
  }

  function openDayEditor(dayISO) {
    setActiveDay(dayISO);
    setSheetView("day");
    setSheetOpen(true);
    setDeleteTarget(null);
    setNewStart("09:00");
    setNewEnd("18:00");
    setEditMap({});
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetView(null);
    setDeleteTarget(null);
    setEditMap({});
  }

  async function requestDisableDay() {
    try {
      const has = await hasFutureAppointmentsOnWeekday(user.id, activeDay);
      if (has) {
        return toast.warning(
          "No se puede pausar",
          "Tenés turnos futuros ese día. Primero deberías cancelarlos o reprogramarlos."
        );
      }
    } catch (e) {
      return toast.error("Error", e?.message || "No se pudo validar turnos futuros.");
    }

    setSheetView("confirmDisableDay");
  }

  async function confirmDisableDay() {
    try {
      await setDayActive(user.id, activeDay, false);
      toast.success("Listo", "Día pausado.");
      setSheetView("day");
      refresh();
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo pausar el día.");
    }
  }

  async function enableDay() {
    try {
      await setDayActive(user.id, activeDay, true);
      toast.success("Listo", "Día activado.");
      refresh();
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo activar el día.");
    }
  }

  function ensureEdit(r) {
    setEditMap((m) => ({
      ...m,
      [r.id]: m[r.id] || { start_time: r.start_time || "09:00", end_time: r.end_time || "18:00" },
    }));
  }

  function updateEdit(rid, patch) {
    setEditMap((m) => ({
      ...m,
      [rid]: { ...(m[rid] || {}), ...patch },
    }));
  }

  function isDirty(r) {
    const ed = editMap[r.id];
    if (!ed) return false;
    return (ed.start_time || "") !== (r.start_time || "") || (ed.end_time || "") !== (r.end_time || "");
  }

  async function saveRange(r) {
    const ed = editMap[r.id];
    if (!ed) return;

    const s = toMin(ed.start_time);
    const e = toMin(ed.end_time);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
      return toast.warning("Rango inválido", "El fin debe ser mayor al inicio.");
    }

    setSavingRangeId(r.id);
    try {
      await updateAvailabilityRange(r.id, { start_time: ed.start_time, end_time: ed.end_time });
      toast.success("Listo", "Rango actualizado.");
      setEditMap((m) => {
        const copy = { ...m };
        delete copy[r.id];
        return copy;
      });
      refresh();
    } catch (e2) {
      toast.error("Error", e2?.message || "No se pudo actualizar el rango.");
    } finally {
      setSavingRangeId(null);
    }
  }

  async function toggleRangeActive(r) {
    try {
      await updateAvailabilityRange(r.id, { is_active: !r.is_active });
      refresh();
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo actualizar.");
    }
  }

  function askDeleteRange(r) {
    setDeleteTarget(r);
    setSheetView("confirmDeleteRange");
  }

  async function confirmDeleteRange() {
    if (!deleteTarget) return;
    try {
      await deleteAvailabilityRange(deleteTarget.id);
      toast.success("Eliminado", "Se eliminó el rango.");
      setDeleteTarget(null);
      setSheetView("day");
      refresh();
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo eliminar.");
    }
  }

  async function addRange() {
    if (!user?.id) return;
    const s = toMin(newStart);
    const e = toMin(newEnd);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
      return toast.warning("Rango inválido", "El fin debe ser mayor al inicio.");
    }

    setAdding(true);
    try {
      await createAvailabilityRange({
        provider_id: user.id,
        weekday: activeDay,
        start_time: newStart,
        end_time: newEnd,
        is_active: true,
      });
      toast.success("Listo", "Se agregó el rango.");
      setNewStart("09:00");
      setNewEnd("18:00");
      refresh();
    } catch (e2) {
      toast.error("Error", e2?.message || "No se pudo guardar el rango.");
    } finally {
      setAdding(false);
    }
  }

  const weekCards = useMemo(() => {
    return DAYS.map((d) => {
      const list = (byDay.get(d.key) || []).slice();
      const act = list.filter((x) => x.is_active);
      const { items, more } = rangesPills(act);
      return {
        key: d.key,
        label: d.label,
        isOn: act.length > 0,
        items,
        more,
        activeCount: act.length,
        totalCount: list.length,
      };
    });
  }, [byDay]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[46px] pb-32">
        {/* Header */}
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

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Disponibilidad</h1>
        </div>

        {/* Configuración de turnos */}
        <CardShell className="mt-4 p-4">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">Configuración de turnos</p>

          {/* ✅ (A) reacomodo: 2 columnas “chiquitas” arriba (duración + alineación), gap abajo */}
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Duración */}
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-black/45">Duración</p>
                <div className="mt-2 rounded-[18px] bg-black/[0.04] px-4 py-3">
                  <select
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D] appearance-none"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                  </select>
                </div>
              </div>

              {/* Alineación (mini) */}
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-black/45">Alineación</p>
                <div className="mt-2 flex justify-end">
                  <SegmentedCompact
                    value={alignMode}
                    onChange={setAlignMode}
                    options={[
                      { value: "start", label: "Inicio" },
                      { value: "end", label: "Final" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Gap */}
            <div>
              <p className="text-[12px] font-semibold text-black/45">Tiempo entre turnos</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 rounded-[18px] bg-black/[0.04] px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={gapMin}
                    onChange={(e) => setGapMin(e.target.value)}
                    className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D] placeholder:text-black/35"
                    placeholder="Ej: 20"
                  />
                </div>
                <PrimaryButton onClick={onSaveGap} disabled={savingGap} className="h-[46px] px-4">
                  {savingGap ? "..." : "Guardar"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </CardShell>

        {/* ✅ (B) título “Días y horarios” sin segmented al lado (ya está en config) */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-extrabold text-[#3D3D3D]">Días y horarios</h2>
        </div>

        {/* Skeletons */}
        {loading && (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {!loading && (
          <div className="mt-4 grid gap-3">
            {weekCards.map((d) => (
              <button key={d.key} type="button" onClick={() => openDayEditor(d.key)} className="text-left">
                <CardShell className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold text-[#3D3D3D]">{d.label}</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {d.items.length === 0 ? (
                          <span className="text-[12px] text-black/45">Sin horarios</span>
                        ) : (
                          <>
                            {d.items.map((txt) => (
                              <span
                                key={`${d.key}-${txt}`}
                                className="rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-semibold text-black/60"
                              >
                                {txt}
                              </span>
                            ))}
                            {d.more > 0 && (
                              <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-semibold text-black/55">
                                +{d.more}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Pill tone={d.isOn ? "on" : "off"}>{d.isOn ? "Activa" : "En pausa"}</Pill>
                      <span className="text-[28px] text-black/30 leading-none">›</span>
                    </div>
                  </div>
                </CardShell>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SHEET: Editor de día / Confirmaciones */}
      <Sheet open={sheetOpen} onClose={closeSheet}>
        {/* VIEW: DAY */}
        {sheetView === "day" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">{dayLabel}</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  Duración <b>{durationMin} min</b> · Pausa <b>{gapPreview} min</b> ·{" "}
                  {alignMode === "start" ? "Alinear al inicio" : "Alinear al final"}
                </p>
              </div>

              <IconCircleButton onClick={closeSheet} title="Cerrar" className="h-10 w-10">
                ✕
              </IconCircleButton>
            </div>

            {/* Estado del día */}
            <div className="mt-4 rounded-[18px] border border-black/10 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-black/45">Estado del día</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#3D3D3D]">
                    {hasAnyRanges ? (isDayOn ? "Activa" : "En pausa") : "Sin horarios"}
                  </p>
                </div>

                {hasAnyRanges ? (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isDayOn}
                      disabled={false}
                      onChange={(next) => {
                        if (!next) requestDisableDay();
                        else enableDay();
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-[12px] text-black/45">Agregá un rango</span>
                )}
              </div>
            </div>

            {/* Rangos */}
            <div className="mt-4">
              <p className="text-[13px] font-extrabold text-[#3D3D3D]">Rangos</p>
            </div>

            <div className="mt-3 grid gap-2">
              {dayRows.length === 0 ? (
                <div className="rounded-[18px] bg-black/[0.04] p-4">
                  <p className="text-[13px] font-semibold text-black/55">Todavía no hay rangos.</p>
                  <p className="mt-1 text-[12px] text-black/45">Creá uno para que el día quede activo.</p>
                </div>
              ) : (
                dayRows.map((r) => {
                  const ed = editMap[r.id] || null;
                  const startVal = ed?.start_time ?? r.start_time ?? "";
                  const endVal = ed?.end_time ?? r.end_time ?? "";
                  const dirty = isDirty(r);

                  const slotsPreview = r.is_active
                    ? buildSlots({
                        startHHMM: r.start_time,
                        endHHMM: r.end_time,
                        durationMin,
                        gapMin: gapPreview,
                        align: alignMode,
                      }).slice(0, 6)
                    : [];

                  return (
                    <div key={r.id} className="rounded-[18px] border border-black/10 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleRangeActive(r)}
                          className={[
                            "rounded-full px-3 py-1.5 text-[12px] font-semibold",
                            r.is_active ? "bg-[#2A4691]/10 text-[#2A4691]" : "bg-black/5 text-black/60",
                          ].join(" ")}
                        >
                          {r.is_active ? "Activo" : "Pausado"}
                        </button>

                        <button
                          type="button"
                          onClick={() => askDeleteRange(r)}
                          className="h-9 w-9 rounded-full border border-black/10 grid place-items-center"
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-[46%] rounded-full bg-black/[0.04] border border-black/10 px-4 py-3">
                          <input
                            type="time"
                            value={startVal}
                            onFocus={() => ensureEdit(r)}
                            onChange={(e) => updateEdit(r.id, { start_time: e.target.value })}
                            className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D]"
                          />
                        </div>

                        <span className="text-black/30">—</span>

                        <div className="w-[46%] rounded-full bg-black/[0.04] border border-black/10 px-4 py-3">
                          <input
                            type="time"
                            value={endVal}
                            onFocus={() => ensureEdit(r)}
                            onChange={(e) => updateEdit(r.id, { end_time: e.target.value })}
                            className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D]"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <GhostButton
                          onClick={() => {
                            setEditMap((m) => {
                              const copy = { ...m };
                              delete copy[r.id];
                              return copy;
                            });
                          }}
                          disabled={!dirty}
                          className="flex-1 h-11"
                        >
                          Cancelar
                        </GhostButton>

                        <PrimaryButton
                          onClick={() => saveRange(r)}
                          disabled={!dirty || savingRangeId === r.id}
                          className="flex-1 h-11"
                        >
                          {savingRangeId === r.id ? "Guardando..." : "Guardar"}
                        </PrimaryButton>
                      </div>

                      {r.is_active && (
                        <div className="mt-3 rounded-[16px] bg-black/[0.04] p-3">
                          <p className="text-[12px] font-semibold text-black/45">Ejemplo de horarios</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {slotsPreview.length ? (
                              slotsPreview.map((s) => (
                                <span
                                  key={`${r.id}-${s.start}`}
                                  className="rounded-full bg-white border border-black/10 px-3 py-1 text-[12px] text-black/60"
                                >
                                  {s.start}
                                </span>
                              ))
                            ) : (
                              <span className="text-[12px] text-black/45">
                                No se generan turnos con esta configuración.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ✅ (C) Agregar rango: más intuitivo (2 “cards” con label + un CTA claro) */}
            <div className="mt-4 rounded-[18px] border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-[#3D3D3D]">Agregar rango</p>
                  <p className="mt-1 text-[12px] text-black/45">Elegí inicio y fin.</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[18px] bg-black/[0.04] border border-black/10 px-4 py-3">
                  <p className="text-[11px] font-semibold text-black/45">Inicio</p>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="mt-2 w-full bg-transparent outline-none text-[14px] font-extrabold text-[#3D3D3D]"
                  />
                </div>

                <div className="rounded-[18px] bg-black/[0.04] border border-black/10 px-4 py-3">
                  <p className="text-[11px] font-semibold text-black/45">Fin</p>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="mt-2 w-full bg-transparent outline-none text-[14px] font-extrabold text-[#3D3D3D]"
                  />
                </div>
              </div>

              <PrimaryButton onClick={addRange} disabled={adding} className="mt-3 w-full">
                {adding ? "Agregando..." : "Agregar rango"}
              </PrimaryButton>
            </div>
          </>
        )}

        {/* VIEW: CONFIRM DISABLE DAY */}
        {sheetView === "confirmDisableDay" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Pausar día</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  Vas a pausar <b>{dayLabel}</b>. Los rangos quedan guardados, pero no se ofrecen turnos.
                </p>
              </div>

              <IconCircleButton onClick={() => setSheetView("day")} title="Volver" className="h-10 w-10">
                ‹
              </IconCircleButton>
            </div>

            <div className="mt-4 rounded-[18px] bg-red-50 border border-red-200 p-3">
              <p className="text-[13px] font-semibold text-red-700">Atención</p>
              <p className="mt-1 text-[12px] text-red-700/90">
                Si tenés turnos futuros para ese día, no vas a poder pausarlo.
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <GhostButton onClick={() => setSheetView("day")} className="flex-1">
                Cancelar
              </GhostButton>
              <button
                type="button"
                onClick={confirmDisableDay}
                className="flex-1 h-12 rounded-full bg-red-600 text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(220,38,38,0.22)] active:scale-[0.98] transition"
              >
                Pausar
              </button>
            </div>
          </>
        )}

        {/* VIEW: CONFIRM DELETE RANGE */}
        {sheetView === "confirmDeleteRange" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Eliminar rango</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  Vas a eliminar{" "}
                  <b>
                    {deleteTarget?.start_time}–{deleteTarget?.end_time}
                  </b>
                  . Esta acción no se puede deshacer.
                </p>
              </div>

              <IconCircleButton onClick={() => setSheetView("day")} title="Volver" className="h-10 w-10">
                ‹
              </IconCircleButton>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={confirmDeleteRange}
                className="h-12 w-full rounded-full bg-red-600 text-white font-semibold shadow-[0_10px_22px_rgba(220,38,38,0.22)] active:scale-[0.98] transition"
              >
                Eliminar
              </button>

              <button
                type="button"
                onClick={() => setSheetView("day")}
                className="h-12 w-full rounded-full bg-white border border-black/10 text-[#3D3D3D] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
