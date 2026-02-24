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

// UI weekday (ISO): 1=Lunes ... 7=Domingo
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
function fmtHHMM(v) {
  if (!v) return "";
  const s = String(v);
  return s.length >= 5 ? s.slice(0, 5) : s;
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

function PrimaryButton({ onClick, children, className = "", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-12 rounded-full bg-[#1E2F5D] px-5 text-white text-[13px] font-semibold",
        "shadow-[0_10px_22px_rgba(30,47,93,0.22)] active:scale-[0.98] transition disabled:opacity-60",
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
        "h-12 rounded-full bg-white border border-black/10 px-5 text-[13px] font-semibold text-[#3D3D3D]",
        "shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition disabled:opacity-60",
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
    <span className={["inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold", cls].join(" ")}>
      {children}
    </span>
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <SkeletonLine w="w-28" h="h-5" />
          <div className="mt-3">
            <SkeletonLine w="w-full" h="h-4" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonLine w="w-20" h="h-7" />
          <SkeletonLine w="w-6" h="h-6" />
        </div>
      </div>
    </CardShell>
  );
}

/** Bottom sheet (editor de día) */
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
              <div className="px-5 pb-6 pt-4 max-h-[78vh] overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
        {subtitle ? <p className="mt-1 text-[12px] text-black/45">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={["rounded-[16px] bg-black/[0.04] border border-black/10 px-4 py-3", className].join(" ")}>
      <p className="text-[11px] font-semibold text-black/45">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Pills de rango (home semanal) */
function rangesPills(activeRanges) {
  const list = (activeRanges || [])
    .slice()
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
    .map((r) => `${fmtHHMM(r.start_time)}–${fmtHHMM(r.end_time)}`);

  if (!list.length) return { items: [], more: 0 };
  const items = list.slice(0, 4);
  const more = Math.max(0, list.length - items.length);
  return { items, more };
}

/** Validaciones: duplicados y solapamientos */
function overlaps(s1, e1, s2, e2) {
  return s1 < e2 && s2 < e1; // [s,e)
}
function validateAgainstRanges({ start, end, existing, ignoreId = null }) {
  const s = toMin(start);
  const e = toMin(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
    return { ok: false, reason: "Rango inválido: el fin debe ser mayor al inicio." };
  }

  for (const r of existing || []) {
    if (!r) continue;
    if (ignoreId && r.id === ignoreId) continue;

    const rs = toMin(r.start_time);
    const re = toMin(r.end_time);
    if (!Number.isFinite(rs) || !Number.isFinite(re)) continue;

    if (rs === s && re === e) return { ok: false, reason: "Ese rango ya existe en este día." };
    if (overlaps(s, e, rs, re)) return { ok: false, reason: `Se superpone con ${r.start_time}–${r.end_time}.` };
  }

  return { ok: true };
}

/** Custom selector (para evitar dropdown nativo feo) */
function PillButton({ label, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 w-full rounded-full bg-black/[0.04] border border-black/10 px-4",
        "flex items-center justify-center relative active:scale-[0.99] transition",
        className,
      ].join(" ")}
    >
      <span className="text-[13px] font-extrabold text-[#3D3D3D]">{label}</span>
      <span className="absolute right-4 text-black/30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 10l5 5 5-5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    </button>
  );
}

function PickerSheet({ open, title, subtitle, options, value, onPick, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10000]">
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
            >
              <div className="h-1.5 w-12 bg-black/10 rounded-full mx-auto mt-3" />
              <div className="px-5 pt-4 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
                    {subtitle ? <p className="mt-1 text-[12px] text-black/45">{subtitle}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-4 rounded-full bg-black/[0.04] border border-black/10 text-[12px] font-semibold text-black/60 active:scale-[0.98] transition"
                  >
                    Listo
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  {options.map((o) => {
                    const active = String(o.value) === String(value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => onPick(o.value)}
                        className={[
                          "h-12 rounded-[18px] border px-4 flex items-center justify-between transition",
                          active ? "border-[#1E2F5D] bg-[#1E2F5D]/[0.06]" : "border-black/10 bg-white",
                        ].join(" ")}
                      >
                        <span className="text-[13px] font-extrabold text-[#3D3D3D]">{o.label}</span>
                        <span
                          className={[
                            "text-[12px] font-extrabold",
                            active ? "text-[#1E2F5D]" : "text-black/25",
                          ].join(" ")}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Chip para rangos (se ordena, no se pisa, wrap prolijo) */
function RangeChip({ text, muted = false }) {
  return (
    <span
      className={[
        "max-w-full inline-flex items-center rounded-full px-3 py-1.5",
        "bg-black/[0.03] border border-black/10",
        "text-[12px] font-semibold",
        muted ? "text-black/45" : "text-[#3D3D3D]",
      ].join(" ")}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}

export default function ProviderAvailability() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  // Config turnos (persistencia local)
  const [durationMin, setDurationMin] = useState(() => localStorage.getItem("orby_av_duration") || "60");

  useEffect(() => localStorage.setItem("orby_av_duration", String(durationMin)), [durationMin]);

  // gap (buffer) persistido en perfil
  const initialGap = Number(profile?.buffer_minutes ?? 20);
  const [gapMin, setGapMin] = useState(String(Number.isFinite(initialGap) ? initialGap : 20));
  const [savingGap, setSavingGap] = useState(false);

  // ✅ baseline para mostrar "Guardar" solo si hay cambios
  const [cfgBaseline, setCfgBaseline] = useState(() => ({
  durationMin: localStorage.getItem("orby_av_duration") || "60",
  gapMin: String(Number.isFinite(initialGap) ? initialGap : 20),
}));

  useEffect(() => {
    const ig = Number(profile?.buffer_minutes ?? 20);
    const safeGap = String(Number.isFinite(ig) ? ig : 20);
    setGapMin(safeGap);
    setCfgBaseline((b) => ({ ...b, gapMin: safeGap }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.buffer_minutes]);

  const configDirty = useMemo(() => {
    return (
      String(durationMin) !== String(cfgBaseline.durationMin) ||
      String(gapMin) !== String(cfgBaseline.gapMin)
    );
  }, [durationMin, gapMin, cfgBaseline]);

  // Custom pickers (UI)
  const [picker, setPicker] = useState(null); // "duration" | "gap" | null

  const durationOptions = useMemo(
    () => [
      { value: "30", label: "30 min" },
      { value: "45", label: "45 min" },
      { value: "60", label: "60 min" },
      { value: "90", label: "90 min" },
      { value: "120", label: "120 min" },
    ],
    []
  );

  const gapOptions = useMemo(
    () => [
      { value: "0", label: "0 min" },
      { value: "10", label: "10 min" },
      { value: "15", label: "15 min" },
      { value: "20", label: "20 min" },
      { value: "30", label: "30 min" },
      { value: "45", label: "45 min" },
      { value: "60", label: "60 min" },
    ],
    []
  );

  const durationLabel =
    durationOptions.find((o) => String(o.value) === String(durationMin))?.label || `${durationMin} min`;
  const gapLabel = gapOptions.find((o) => String(o.value) === String(gapMin))?.label || `${gapMin} min`;

  // Editor de día en sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState(null);
  const [activeDay, setActiveDay] = useState(1); // 1..7
  const [deleteTarget, setDeleteTarget] = useState(null);

  // agregar rango
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("18:00");
  const [adding, setAdding] = useState(false);

  // UI sheet: simplificar
  const [addOpen, setAddOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // edición por rango
  const [editMap, setEditMap] = useState({});
  const [savingRangeId, setSavingRangeId] = useState(null);

  async function refresh({ silent = false } = {}) {
    if (!user?.id) return;
    setErr("");
    if (!silent) setLoading(true);

    try {
      const data = await listProviderAvailability(user.id, { includeInactive: true });
      setRows(data || []);
    } catch (e) {
      const msg = e?.message || "No se pudo cargar tu disponibilidad";
      setErr(msg);
      toast.error("Error", msg);
    } finally {
      if (!silent) setLoading(false);
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
      const k = Number(r.day_of_week ?? r.weekday);
      if (!Number.isFinite(k) || k < 1 || k > 7) continue;
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
    if (!user?.id) return false;

    const n = Number(gapMin);
    if (!Number.isFinite(n) || n < 0 || n > 240) {
      toast.warning("Valor inválido", "Ingresá un número válido (0 a 240).");
      return false;
    }

    setSavingGap(true);
    try {
      await updateMyBufferMinutes(user.id, Math.round(n));
      toast.success("Listo", "Se guardó el tiempo entre turnos.");
      return true;
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo guardar.");
      return false;
    } finally {
      setSavingGap(false);
    }
  }

  async function onSaveConfig() {
    const gapChanged = String(gapMin) !== String(cfgBaseline.gapMin);

    let ok = true;
    if (gapChanged) ok = await onSaveGap();
    else toast.success("Listo", "Se guardó la configuración.");

    if (!ok) return;

    setCfgBaseline({
      durationMin: String(durationMin),
      gapMin: String(gapMin),
    });
  }

  function openDayEditor(dayISO) {
    setActiveDay(dayISO);
    setSheetView("day");
    setSheetOpen(true);
    setDeleteTarget(null);
    setNewStart("09:00");
    setNewEnd("18:00");
    setEditMap({});
    setAddOpen(false);
    setShowPreview(false);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetView(null);
    setDeleteTarget(null);
    setEditMap({});
    setAddOpen(false);
    setShowPreview(false);
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
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo pausar el día.");
    }
  }

  async function enableDay() {
    try {
      await setDayActive(user.id, activeDay, true);
      toast.success("Listo", "Día activado.");
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo activar el día.");
    }
  }

  function startEdit(r) {
    setEditMap((m) => ({
      ...m,
      [r.id]:
        m[r.id] || {
          start_time: fmtHHMM(r.start_time) || "09:00",
          end_time: fmtHHMM(r.end_time) || "18:00",
        },
    }));
  }

  function updateEdit(rid, patch) {
    setEditMap((m) => ({
      ...m,
      [rid]: { ...(m[rid] || {}), ...patch },
    }));
  }

  function cancelEdit(rid) {
    setEditMap((m) => {
      const copy = { ...m };
      delete copy[rid];
      return copy;
    });
  }

  function isDirty(r) {
    const ed = editMap[r.id];
    if (!ed) return false;
    return (
      (fmtHHMM(ed.start_time) || "") !== (fmtHHMM(r.start_time) || "") ||
      (fmtHHMM(ed.end_time) || "") !== (fmtHHMM(r.end_time) || "")
    );
  }

  async function saveRange(r) {
    const ed = editMap[r.id];
    if (!ed) return;

    const v = validateAgainstRanges({
      start: ed.start_time,
      end: ed.end_time,
      existing: dayRows,
      ignoreId: r.id,
    });
    if (!v.ok) return toast.warning("No se puede guardar", v.reason);

    setSavingRangeId(r.id);
    try {
      await updateAvailabilityRange(r.id, { start_time: ed.start_time, end_time: ed.end_time });
      toast.success("Listo", "Rango actualizado.");

      cancelEdit(r.id);
      refresh({ silent: true });
    } catch (e2) {
      toast.error("Error", e2?.message || "No se pudo actualizar el rango.");
    } finally {
      setSavingRangeId(null);
    }
  }

  async function toggleRangeActive(r) {
    try {
      await updateAvailabilityRange(r.id, { is_active: !r.is_active });
      refresh({ silent: true });
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
      refresh({ silent: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo eliminar.");
    }
  }

  async function addRange() {
    if (!user?.id) return;

    const v = validateAgainstRanges({
      start: newStart,
      end: newEnd,
      existing: dayRows,
      ignoreId: null,
    });
    if (!v.ok) return toast.warning("No se puede agregar", v.reason);

    setAdding(true);
    try {
      const created = await createAvailabilityRange({
        provider_id: user.id,
        weekday: activeDay,
        start_time: newStart,
        end_time: newEnd,
        is_active: true,
      });

      setRows((prev) => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        if (created?.id && arr.some((x) => x?.id === created.id)) return arr;
        arr.push(created);
        return arr;
      });

      toast.success("Listo", "Se agregó el rango.");
      setNewStart("09:00");
      setNewEnd("18:00");
      setAddOpen(false);
      refresh({ silent: true });
    } catch (e2) {
      console.error("addRange error:", e2);
      toast.error("Error", e2?.message || "No se pudo guardar el rango.");
    } finally {
      setAdding(false);
    }
  }

  const weekCards = useMemo(() => {
    return DAYS.map((d) => {
      const list = (byDay.get(d.key) || []).slice();
      const act = list.filter((x) => x.is_active);
      const { items, more } = rangesPills(act.length ? act : list);
      return {
        key: d.key,
        label: d.label,
        isOn: act.length > 0,
        isEmpty: list.length === 0,
        items,
        more,
      };
    });
  }, [byDay]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[46px] pb-32">
        {/* Header (igual) */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="text-[18px] font-extrabold text-[#3D3D3D] leading-tight">Disponibilidad</h1>
            <p className="mt-0.5 text-[12px] text-black/40">Configurá tu semana en 1 minuto</p>
          </div>

          <div className="w-11" />
        </div>

        <CardShell className="mt-5 p-4 overflow-visible">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">Configuración</p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/45">Duración</p>
              <div className="mt-2">
                <PillButton label={durationLabel} onClick={() => setPicker("duration")} />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/45">Pausa entre turnos</p>
              <div className="mt-2">
                <PillButton label={gapLabel} onClick={() => setPicker("gap")} />
              </div>
            </div>
          </div>

          {/* ✅ Guardar sin espacio cuando no está */}
          <AnimatePresence initial={false}>
            {configDirty && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: 6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <PrimaryButton onClick={onSaveConfig} disabled={savingGap} className="mt-4 w-full">
                  {savingGap ? "Guardando..." : "Guardar"}
                </PrimaryButton>
              </motion.div>
            )}
          </AnimatePresence>
        </CardShell>

        {/* Días y horarios */}
        <div className="mt-7">
          <h2 className="text-[16px] font-extrabold text-[#3D3D3D]">Días y horarios</h2>
          <p className="mt-0.5 text-[12px] text-black/40">Tocá un día para agregar o editar rangos</p>
        </div>

        {loading && (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {/* ✅ Cards semana */}
        {!loading && (
          <CardShell className="mt-4">
            <div className="divide-y divide-black/[0.06]">
              {weekCards.map((d) => (
                <button key={d.key} type="button" onClick={() => openDayEditor(d.key)} className="w-full text-left">
                  <div className="px-4 py-4 hover:bg-black/[0.02] transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={["h-2 w-2 rounded-full", d.isOn ? "bg-[#1E2F5D]" : "bg-black/20"].join(" ")} />
                          <p className="text-[14px] font-extrabold text-[#3D3D3D]">{d.label}</p>
                        </div>
                        <p className="mt-1 text-[12px] text-black/45">{d.isEmpty ? "Sin horarios" : d.isOn ? "Activo" : "En pausa"}</p>
                      </div>

                      <span className="text-[12px] font-semibold text-black/35">{d.isEmpty ? "Agregar" : "Editar"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.isEmpty ? (
                        <RangeChip text="Agregá tus horarios" muted />
                      ) : (
                        <>
                          {d.items.map((txt) => (
                            <RangeChip key={`${d.key}-${txt}`} text={txt} muted={!d.isOn} />
                          ))}
                          {d.more > 0 && <RangeChip text={`+${d.more}`} muted />}
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardShell>
        )}
      </div>

      {/* Pickers */}
      <PickerSheet
        open={picker === "duration"}
        title="Duración"
        subtitle="Duración de cada turno."
        options={durationOptions}
        value={durationMin}
        onPick={(val) => {
          setDurationMin(String(val));
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      <PickerSheet
        open={picker === "gap"}
        title="Pausa entre turnos"
        subtitle="Tiempo recomendado entre turnos."
        options={gapOptions}
        value={gapMin}
        onPick={(val) => {
          setGapMin(String(val));
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      {/* SHEET */}
      <Sheet open={sheetOpen} onClose={closeSheet}>
        {sheetView === "day" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">{dayLabel}</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  {hasAnyRanges ? (isDayOn ? "Se ofrece en la app" : "Rangos guardados (pausa)") : "Agregá tu primer rango"}
                </p>
              </div>

              {hasAnyRanges ? (
                <Switch
                  checked={isDayOn}
                  disabled={false}
                  onChange={(next) => {
                    if (!next) requestDisableDay();
                    else enableDay();
                  }}
                />
              ) : (
                <Pill tone="off">Incompleto</Pill>
              )}
            </div>

            <div className="mt-6">
              <SectionTitle title="Rangos" subtitle="Editá horarios y activalos." />

              <div className="mt-3 grid gap-2">
                {dayRows.length === 0 ? (
                  <div className="rounded-[18px] bg-black/[0.04] p-4">
                    <p className="text-[13px] font-semibold text-black/55">Todavía no hay rangos.</p>
                    <p className="mt-1 text-[12px] text-black/45">Tocá “Agregar rango” para empezar.</p>
                  </div>
                ) : (
                  dayRows.map((r) => {
                    const ed = editMap[r.id] || null;
                    const dirty = isDirty(r);

                    return (
                      <div key={r.id} className="rounded-[18px] border border-black/10 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-extrabold text-[#3D3D3D]">
                              {fmtHHMM(r.start_time)} <span className="text-black/25 font-bold">—</span> {fmtHHMM(r.end_time)}
                            </p>
                            <p className="mt-0.5 text-[12px] text-black/45">{r.is_active ? "Activo" : "En pausa"}</p>
                          </div>

                          {/* ✅ botón a la izquierda de la cruz */}
                          <div className="flex items-center gap-2 shrink-0">
                            {!ed ? (
                              <button
                                type="button"
                                onClick={() => startEdit(r)}
                                className="h-10 rounded-full px-4 bg-black/[0.04] border border-black/10 text-[12px] font-semibold text-black/60 active:scale-[0.98] transition"
                              >
                                Editar horario
                              </button>
                            ) : (
                              <Pill tone="off">Editando</Pill>
                            )}

                            <button
                              type="button"
                              onClick={() => askDeleteRange(r)}
                              className="h-10 w-10 rounded-full bg-black/[0.03] border border-black/10 grid place-items-center text-black/60 active:scale-[0.98] transition"
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* ✅ ACA ESTABA EL BOTÓN DUPLICADO: ELIMINADO */}
                        {ed && (
                          <>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <Field label="Inicio" className="rounded-[18px]">
                                <input
                                  type="time"
                                  value={fmtHHMM(ed.start_time)}
                                  onChange={(e) => updateEdit(r.id, { start_time: e.target.value })}
                                  className="w-full bg-transparent outline-none text-[16px] font-extrabold text-[#3D3D3D]"
                                />
                              </Field>

                              <Field label="Fin" className="rounded-[18px]">
                                <input
                                  type="time"
                                  value={fmtHHMM(ed.end_time)}
                                  onChange={(e) => updateEdit(r.id, { end_time: e.target.value })}
                                  className="w-full bg-transparent outline-none text-[16px] font-extrabold text-[#3D3D3D]"
                                />
                              </Field>
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => cancelEdit(r.id)}
                                className="h-10 rounded-full px-4 bg-black/[0.04] border border-black/10 text-[12px] font-semibold text-black/60 active:scale-[0.98] transition"
                              >
                                Cancelar
                              </button>

                              <button
                                type="button"
                                onClick={() => saveRange(r)}
                                disabled={!dirty || savingRangeId === r.id}
                                className="h-10 rounded-full px-5 bg-[#1E2F5D] text-white text-[12px] font-semibold shadow-[0_10px_18px_rgba(30,47,93,0.18)] active:scale-[0.98] transition disabled:opacity-60"
                              >
                                {savingRangeId === r.id ? "Guardando..." : "Guardar"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4">
                {!addOpen ? (
                  <PrimaryButton onClick={() => setAddOpen(true)} className="w-full">
                    Agregar rango
                  </PrimaryButton>
                ) : (
                  <div className="rounded-[18px] border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-extrabold text-[#3D3D3D]">Nuevo rango</p>
                        <p className="mt-1 text-[12px] text-black/45">Elegí inicio y fin.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddOpen(false)}
                        className="h-10 px-4 rounded-full bg-black/[0.04] border border-black/10 text-[12px] font-semibold text-black/60 active:scale-[0.98] transition"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Field label="Inicio">
                        <input
                          type="time"
                          value={fmtHHMM(newStart)}
                          onChange={(e) => setNewStart(e.target.value)}
                          className="w-full bg-transparent outline-none text-[16px] font-extrabold text-[#3D3D3D]"
                        />
                      </Field>

                      <Field label="Fin">
                        <input
                          type="time"
                          value={fmtHHMM(newEnd)}
                          onChange={(e) => setNewEnd(e.target.value)}
                          className="w-full bg-transparent outline-none text-[16px] font-extrabold text-[#3D3D3D]"
                        />
                      </Field>
                    </div>

                    <PrimaryButton onClick={addRange} disabled={adding} className="mt-3 w-full">
                      {adding ? "Agregando..." : "Guardar rango"}
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ Tus turnos */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="w-full rounded-[18px] bg-black/[0.04] border border-black/10 px-4 py-3 flex items-center justify-between active:scale-[0.99] transition"
              >
                <span className="text-[13px] font-semibold text-[#3D3D3D]">Tus turnos</span>
                <span className="text-black/35 text-[14px]">{showPreview ? "—" : "+"}</span>
              </button>

              <AnimatePresence initial={false}>
                {showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: 6 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 grid gap-2">
                      {activeRanges.length === 0 ? (
                        <div className="rounded-[18px] bg-black/[0.04] p-4">
                          <p className="text-[13px] font-semibold text-black/55">No hay rangos activos.</p>
                          <p className="mt-1 text-[12px] text-black/45">Activá al menos un rango para ver tus turnos.</p>
                        </div>
                      ) : (
                        activeRanges
                          .slice()
                          .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
                          .map((r) => {
                            const slots = buildSlots({
                              startHHMM: fmtHHMM(r.start_time),
                              endHHMM: fmtHHMM(r.end_time),
                              durationMin,
                              gapMin: gapPreview,
                              align: "start",
                            });

                            return (
                              <div key={`preview-${r.id}`} className="rounded-[18px] bg-black/[0.04] p-3">
                                <p className="text-[12px] font-semibold text-black/45">
                                  {fmtHHMM(r.start_time)}–{fmtHHMM(r.end_time)}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {slots.length ? (
                                    slots.map((s) => (
                                      <span
                                        key={`${r.id}-${s.start}`}
                                        className="rounded-full bg-white border border-black/10 px-3 py-1 text-[12px] text-black/60"
                                      >
                                        {s.start}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[12px] text-black/45">No se generan turnos con esta configuración.</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* CONFIRM DISABLE DAY */}
        {sheetView === "confirmDisableDay" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Pausar día</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  Vas a pausar <b>{dayLabel}</b>. Los rangos quedan guardados pero no se ofrecen turnos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSheetView("day")}
                className="h-10 px-4 rounded-full bg-black/[0.04] border border-black/10 text-[12px] font-semibold text-black/60 active:scale-[0.98] transition"
              >
                Volver
              </button>
            </div>

            <div className="mt-4 rounded-[18px] bg-red-50 border border-red-200 p-4">
              <p className="text-[13px] font-semibold text-red-700">Atención</p>
              <p className="mt-1 text-[12px] text-red-700/90">Si tenés turnos futuros para ese día, no vas a poder pausarlo.</p>
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

        {/* CONFIRM DELETE RANGE */}
        {sheetView === "confirmDeleteRange" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Eliminar rango</h3>
                <p className="mt-1 text-[12px] text-black/45">
                  Vas a eliminar <b>{fmtHHMM(deleteTarget?.start_time)}–{fmtHHMM(deleteTarget?.end_time)}</b>. Esta acción no se puede deshacer.
                </p>
              </div>
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
