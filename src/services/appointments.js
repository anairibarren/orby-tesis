// src/services/appointments.js
import { supabase } from "./supabase";
import { safeCreateNotification } from "./notifications";

const TABLE = "appointments";

export const APPOINTMENT_STATUS = {
  PENDIENTE: "pendiente",
  CONFIRMADA: "confirmada",
  CANCELADA: "cancelada",
};

/* ---------------- Helpers ---------------- */
function toISOWeekday(date) {
  const d = date.getDay(); // 0 dom ... 6 sab
  return d === 0 ? 7 : d; // 1..7
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

async function getActorIdFallback() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Si por algún motivo vinieran client_id/provider_id invertidos desde DB,
 * esto lo corrige en runtime (sin tocar la DB).
 */
function normalizeParticipants(row, actorId, expectedActor /* 'client' | 'provider' | null */) {
  let client_id = row?.client_id ?? null;
  let provider_id = row?.provider_id ?? null;

  if (!actorId || !client_id || !provider_id) return { client_id, provider_id, swapped: false };

  let swapped = false;

  if (expectedActor === "client") {
    if (client_id !== actorId && provider_id === actorId) {
      [client_id, provider_id] = [provider_id, client_id];
      swapped = true;
    }
  }

  if (expectedActor === "provider") {
    if (provider_id !== actorId && client_id === actorId) {
      [client_id, provider_id] = [provider_id, client_id];
      swapped = true;
    }
  }

  if (swapped) {
    console.warn("[appointments] client_id/provider_id estaban invertidos. Corregido en runtime.", {
      actorId,
      expectedActor,
      original: { client_id: row?.client_id, provider_id: row?.provider_id },
      fixed: { client_id, provider_id },
      request_id: row?.request_id,
      appointment_id: row?.id,
    });
  }

  return { client_id, provider_id, swapped };
}

/* ---------------- CRUD ---------------- */
export async function createAppointment(payload) {
  const { data, error } = await supabase.from(TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function listMyAppointmentsAsProvider(providerId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("provider_id", providerId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listMyAppointmentsAsClient(clientId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("client_id", clientId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateAppointment(appointmentId, patch) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", appointmentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listFutureAppointmentsAsProvider(providerId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("provider_id", providerId)
    .gte("start_at", now)
    .order("start_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listProviderAppointmentsBetween(providerId, startISO, endISO, options = {}) {
  const excludeStatuses = Array.isArray(options.excludeStatuses) ? options.excludeStatuses : [];

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("provider_id", providerId)
    .gte("start_at", startISO)
    .lte("start_at", endISO)
    .order("start_at", { ascending: true });

  if (excludeStatuses.length) {
    const inList = `(${excludeStatuses.map((s) => `"${s}"`).join(",")})`;
    q = q.not("status", "in", inList);
  }

  const { data, error } = await q;
  if (error) throw error;

  return data ?? [];
}

export async function hasFutureAppointmentsOnWeekday(providerId, isoWeekday, options = {}) {
  const w = Number(isoWeekday);
  if (!providerId) return false;
  if (!Number.isFinite(w) || w < 1 || w > 7) return false;

  const excludeStatuses = Array.isArray(options.excludeStatuses)
    ? options.excludeStatuses
    : [APPOINTMENT_STATUS.CANCELADA];

  const nowISO = new Date().toISOString();

  let q = supabase
    .from(TABLE)
    .select("id, start_at, status")
    .eq("provider_id", providerId)
    .gte("start_at", nowISO)
    .order("start_at", { ascending: true });

  if (excludeStatuses.length) {
    const inList = `(${excludeStatuses.map((s) => `"${s}"`).join(",")})`;
    q = q.not("status", "in", inList);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).some((a) => toISOWeekday(new Date(a.start_at)) === w);
}

/* ---------------- Por request_id ---------------- */
export async function getAppointmentByRequestId(requestId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

export async function ensureAppointmentForRequest({ request_id, provider_id, client_id, start_at, end_at }) {
  const existing = await getAppointmentByRequestId(request_id);
  if (existing) return existing;

  return createAppointment({
    request_id,
    provider_id,
    client_id,
    start_at,
    end_at,
    status: APPOINTMENT_STATUS.PENDIENTE,
  });
}

/**
 * Confirmar appointment
 * ✅ NOTI: solo cliente
 */
export async function confirmAppointmentByRequestId(requestId) {
  const ap = await getAppointmentByRequestId(requestId);
  if (!ap) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: APPOINTMENT_STATUS.CONFIRMADA,
      cancelled_at: null,
      cancelled_reason: null,
      cancelled_by: null,
    })
    .eq("id", ap.id)
    .select("*")
    .single();

  if (error) throw error;

  // ✅ Notificación al CLIENTE (con actor_id sí o sí)
  try {
    const actorId = (await getActorIdFallback()) || null;
    if (!actorId) return data; // si no hay actor, tu RLS / RPC no tiene forma de validar

    const { client_id, provider_id } = normalizeParticipants(data, actorId, "provider");
    const when = formatWhen(data?.start_at);

    await safeCreateNotification({
      user_id: client_id,
      actor_id: actorId, // ✅ importante
      type: "appointment_confirmed",
      title: "Turno confirmado",
      body: `Tu turno fue confirmado para ${when}.`,
      metadata: {
        request_id: data.request_id,
        appointment_id: data.id,
        start_at: data.start_at,
        end_at: data.end_at,
        provider_id,
        client_id,
      },
      is_read: false,
      dedupe_key: `appointment_confirmed:${data.request_id}:${data.id}`,
    });
  } catch (e) {
    console.warn("[appointments] notify confirm failed:", e?.message || e);
  }

  return data;
}

/**
 * Cancela el appointment por request
 * ✅ NOTI: solo al otro (no al que cancela)
 */
export async function cancelAppointmentByRequestId(
  requestId,
  { cancelled_by = null, cancelled_reason = null } = {}
) {
  const ap = await getAppointmentByRequestId(requestId);
  if (!ap) return null;

  const actorId = (await getActorIdFallback()) || null;

  // inferir quién canceló si no viene
  let inferredBy = cancelled_by;
  if (!inferredBy) {
    if (actorId && actorId === ap.client_id) inferredBy = "client";
    else if (actorId && actorId === ap.provider_id) inferredBy = "provider";
    else inferredBy = null;
  }

  const patch = {
    status: APPOINTMENT_STATUS.CANCELADA,
    cancelled_at: new Date().toISOString(),
    cancelled_by: inferredBy,
    cancelled_reason,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", ap.id)
    .select("*")
    .single();

  if (error) throw error;

  // ✅ Notificación SOLO al "otro"
  try {
    if (!actorId) return data;

    const by = String(data?.cancelled_by || "").toLowerCase();
    if (by !== "client" && by !== "provider") return data;

    const expectedActor = by === "client" ? "client" : "provider";
    const { client_id, provider_id } = normalizeParticipants(data, actorId, expectedActor);

    const recipientId = by === "provider" ? client_id : provider_id;

    // nunca mandar a uno mismo
    if (!recipientId || recipientId === actorId) return data;

    const when = formatWhen(data?.start_at);
    const reasonText = String(data?.cancelled_reason || "").trim();
    const reasonSuffix = reasonText ? ` Motivo: ${reasonText}` : "";

    await safeCreateNotification({
      user_id: recipientId,
      actor_id: actorId, // ✅ importante
      type: "appointment_cancelled",
      title: "Turno cancelado",
      body:
        by === "provider"
          ? `El prestador canceló el turno del ${when}.${reasonSuffix}`
          : `El cliente canceló el turno del ${when}.${reasonSuffix}`,
      metadata: {
        request_id: data.request_id,
        appointment_id: data.id,
        start_at: data.start_at,
        end_at: data.end_at,
        provider_id,
        client_id,
        cancelled_by: data.cancelled_by,
        cancelled_reason: data.cancelled_reason,
      },
      is_read: false,
      dedupe_key: `appointment_cancelled:${data.request_id}:${data.id}:${by}`,
    });
  } catch (e) {
    console.warn("[appointments] notify cancel failed:", e?.message || e);
  }

  return data;
}

export async function completeAppointmentByRequestId(requestId) {
  const ap = await getAppointmentByRequestId(requestId);
  if (!ap) throw new Error("No existe appointment para esta solicitud.");

  const now = new Date();
  const end = new Date(ap.end_at || ap.start_at);

  if (now < end) throw new Error("Todavía no terminó el turno. Podés completarlo cuando finalice.");
  if (ap.completed_at) return ap;

  const { data, error } = await supabase
    .from(TABLE)
    .update({ completed_at: new Date().toISOString() })
    .eq("id", ap.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markRequestCompleted(requestId) {
  const { data, error } = await supabase
    .from("service_requests")
    .update({ status: "completada" })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
