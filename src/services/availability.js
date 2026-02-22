// src/services/availability.js
import { supabase } from "./supabase";

function isOfflineLikeError(e) {
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return true;
  const msg = String(e?.message || e || "").toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
}

function uiDayToDb(day) {
  const n = Number(day);

  if (!Number.isFinite(n)) throw new Error("Día inválido. Usá 1..7 (Lun..Dom).");

  if (n >= 0 && n <= 6) return n === 0 ? 7 : n;
  if (n >= 1 && n <= 7) return n;

  throw new Error("Día inválido. Usá 1..7 (Lun..Dom).");
}

function dbDayToUi(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 7) return n;
  if (n >= 0 && n <= 6) return n === 0 ? 7 : n;
  return null;
}

export async function listProviderAvailability(providerId, { includeInactive = false } = {}) {
  try {
    let q = supabase
      .from("provider_availability")
      .select("*")
      .eq("provider_id", providerId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (!includeInactive) q = q.eq("is_active", true);

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map((r) => ({
      ...r,
      day_of_week: dbDayToUi(r.day_of_week),
      weekday: dbDayToUi(r.day_of_week),
    }));
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function createAvailabilityRange(payload) {
  const dayDb = uiDayToDb(payload.weekday ?? payload.day_of_week);

  try {
    const { data, error } = await supabase
      .from("provider_availability")
      .insert([
        {
          provider_id: payload.provider_id,
          day_of_week: dayDb,
          start_time: payload.start_time,
          end_time: payload.end_time,
          is_active: payload.is_active ?? true,
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    return {
      ...data,
      day_of_week: dbDayToUi(data.day_of_week),
      weekday: dbDayToUi(data.day_of_week),
    };
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function updateAvailabilityRange(id, patch) {
  const next = { ...patch };

  if (next.weekday != null || next.day_of_week != null) {
    const uiVal = next.weekday ?? next.day_of_week;
    delete next.weekday;
    next.day_of_week = uiDayToDb(uiVal);
  }

  try {
    const { data, error } = await supabase
      .from("provider_availability")
      .update(next)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ...data,
      day_of_week: dbDayToUi(data.day_of_week),
      weekday: dbDayToUi(data.day_of_week),
    };
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function deleteAvailabilityRange(id) {
  try {
    const { error } = await supabase.from("provider_availability").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return false;
    throw e;
  }
}

export async function setDayActive(providerId, weekdayUi, active) {
  const dayDb = uiDayToDb(weekdayUi);

  try {
    const { error } = await supabase
      .from("provider_availability")
      .update({ is_active: !!active })
      .eq("provider_id", providerId)
      .eq("day_of_week", dayDb);

    if (error) throw error;
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return false;
    throw e;
  }
}

export async function updateMyBufferMinutes(providerId, buffer_minutes) {
  try {
    const { error } = await supabase.from("profiles").update({ buffer_minutes }).eq("id", providerId);
    if (error) throw error;
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return false;
    throw e;
  }
}