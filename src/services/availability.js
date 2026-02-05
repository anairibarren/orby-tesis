// src/services/availability.js
import { supabase } from "./supabase";

const TABLE = "provider_availability";

/* ---------------- Helpers time ---------------- */
const trimToHHMM = (t) => (t ? String(t).slice(0, 5) : "");
const toHHMMSS = (t) => {
  if (!t) return null;
  const s = String(t);
  return s.length === 5 ? `${s}:00` : s;
};

/* ---------------- Helpers schema detection ---------------- */
function isUnknownColumnError(msg, col) {
  const m = String(msg || "").toLowerCase();
  const c = String(col || "").toLowerCase();
  return (
    m.includes(`could not find the '${c}' column`) ||
    (m.includes(c) && m.includes("schema cache")) ||
    (m.includes("column") && m.includes(c) && m.includes("does not exist")) ||
    (m.includes("column") && m.includes(c) && m.includes("not found"))
  );
}

async function detectDayColumn() {
  const t1 = await supabase.from(TABLE).select("id, weekday").limit(1);
  if (!t1.error) return "weekday";
  if (!isUnknownColumnError(t1.error.message, "weekday")) throw t1.error;

  const t2 = await supabase.from(TABLE).select("id, day_of_week").limit(1);
  if (!t2.error) return "day_of_week";

  throw t2.error;
}

/* ---------------- Public API ---------------- */

/**
 * Lista disponibilidad de un prestador.
 * ✅ Devuelve weekday en ISO (1..7) tal cual DB.
 */
export async function listProviderAvailability(providerId, { includeInactive = false } = {}) {
  if (!providerId) return [];

  const dayCol = await detectDayColumn();

  let q = supabase
    .from(TABLE)
    .select(`id, provider_id, ${dayCol}, start_time, end_time, is_active, created_at`)
    .eq("provider_id", providerId)
    .order(dayCol, { ascending: true })
    .order("start_time", { ascending: true });

  if (!includeInactive) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r) => ({
    ...r,
    weekday: r?.weekday ?? r?.[dayCol],     // ✅ ISO 1..7
    day_of_week: r?.day_of_week ?? r?.[dayCol],
    start_time: trimToHHMM(r.start_time),
    end_time: trimToHHMM(r.end_time),
  }));
}

/**
 * Crea rango. Recibe weekday ISO 1..7 desde UI.
 */
export async function createAvailabilityRange(payload) {
  const dayCol = await detectDayColumn();

  const iso = Number(payload?.weekday ?? payload?.day_of_week);
  if (!Number.isFinite(iso) || iso < 1 || iso > 7) {
    throw new Error("Día inválido. Usá 1..7 (Lun..Dom).");
  }

  const body = {
    provider_id: payload.provider_id,
    [dayCol]: iso, // ✅ SIN conversión
    start_time: toHHMMSS(payload.start_time),
    end_time: toHHMMSS(payload.end_time),
    is_active: payload.is_active ?? true,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(body)
    .select(`id, provider_id, ${dayCol}, start_time, end_time, is_active, created_at`)
    .single();

  if (error) throw error;

  return {
    ...data,
    weekday: data?.weekday ?? data?.[dayCol],
    day_of_week: data?.day_of_week ?? data?.[dayCol],
    start_time: trimToHHMM(data.start_time),
    end_time: trimToHHMM(data.end_time),
  };
}

/**
 * Update rango por id.
 * patch puede traer weekday ISO (1..7) o day_of_week.
 */
export async function updateAvailabilityRange(id, patch) {
  const dayCol = await detectDayColumn();

  const body = { ...patch };

  if (body.weekday != null || body.day_of_week != null) {
    const iso = Number(body.weekday ?? body.day_of_week);
    if (!Number.isFinite(iso) || iso < 1 || iso > 7) {
      throw new Error("Día inválido. Usá 1..7 (Lun..Dom).");
    }
    delete body.weekday;
    delete body.day_of_week;
    body[dayCol] = iso; // ✅ SIN conversión
  }

  if (body.start_time) body.start_time = toHHMMSS(body.start_time);
  if (body.end_time) body.end_time = toHHMMSS(body.end_time);

  const { data, error } = await supabase
    .from(TABLE)
    .update(body)
    .eq("id", id)
    .select(`id, provider_id, ${dayCol}, start_time, end_time, is_active, created_at`)
    .single();

  if (error) throw error;

  return {
    ...data,
    weekday: data?.weekday ?? data?.[dayCol],
    day_of_week: data?.day_of_week ?? data?.[dayCol],
    start_time: trimToHHMM(data.start_time),
    end_time: trimToHHMM(data.end_time),
  };
}

export async function deleteAvailabilityRange(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * Activa / desactiva TODOS los rangos de ese día.
 * weekdayISO: 1..7
 */
export async function setDayActive(providerId, weekdayISO, isActive) {
  const dayCol = await detectDayColumn();

  const iso = Number(weekdayISO);
  if (!Number.isFinite(iso) || iso < 1 || iso > 7) {
    throw new Error("Día inválido. Usá 1..7 (Lun..Dom).");
  }

  const { error } = await supabase
    .from(TABLE)
    .update({ is_active: !!isActive })
    .eq("provider_id", providerId)
    .eq(dayCol, iso);

  if (error) throw error;
  return true;
}

/**
 * Guardar “tiempo entre turnos” en profiles.buffer_minutes
 */
export async function updateMyBufferMinutes(userId, bufferMinutes) {
  const n = Number(bufferMinutes);
  if (!Number.isFinite(n) || n < 0) throw new Error("Tiempo entre turnos inválido");

  // IMPORTANTE: lo forzamos a entero para no romper constraints
  const safe = Math.round(n);

  const { data, error } = await supabase
    .from("profiles")
    .update({ buffer_minutes: safe })
    .eq("id", userId)
    .select("id, buffer_minutes")
    .single();

  if (error) throw error;
  return data;
}
