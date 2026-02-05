// src/services/notifications.js
import { supabase } from "./supabase";

const TABLE = "notifications";

export async function listMyNotifications(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null) // ✅ NUEVO: no traer borradas (soft-delete)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * ⚠️ createNotification por compat.
 * OJO: si tenés RLS estricto, puede fallar para insertar a otros usuarios.
 */
export async function createNotification(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Dedupe interno (no requiere columna en DB) */
function buildDedupeKey(payload) {
  const type = String(payload?.type ?? "").trim();
  const rid = payload?.metadata?.request_id ?? "";
  const aid = payload?.metadata?.appointment_id ?? "";
  const extra =
    payload?.metadata?.status ??
    payload?.metadata?.action ??
    payload?.metadata?.cancelled_by ??
    "";
  return `${type}:${rid}:${aid}:${extra}`;
}

/**
 * ✅ Inserta notificaciones vía RPC "orby_notify".
 * - NO requiere columna dedupe_key.
 * - Si el RPC NO soporta p_dedupe_key, hace fallback sin ese parámetro.
 */
export async function safeCreateNotification(payload) {
  const p_user_id = payload?.user_id ?? null;
  const p_type = String(payload?.type ?? "").trim();
  const p_title = String(payload?.title ?? "").trim();

  if (!p_user_id || !p_type || !p_title) {
    console.warn("[notifications] invalid payload:", payload);
    return null;
  }

  const dedupe = payload?.dedupe_key ?? buildDedupeKey(payload);

  // Intento 1: RPC con dedupe_key (si tu función lo soporta)
  const argsWithDedupe = {
    p_user_id,
    p_type,
    p_title,
    p_body: payload?.body ?? null,
    p_metadata: payload?.metadata ?? {},
    p_is_read: payload?.is_read ?? false,
    p_dedupe_key: dedupe,
  };

  try {
    const { data, error } = await supabase.rpc("orby_notify", argsWithDedupe);
    if (error) throw error;
    return data ?? null;
  } catch (e1) {
    const msg1 = String(e1?.message || e1 || "");

    // Si falla por firma/parametro inexistente, reintentamos sin dedupe
    const looksLikeSignatureMismatch =
      msg1.toLowerCase().includes("function") &&
      (msg1.toLowerCase().includes("does not exist") ||
        msg1.toLowerCase().includes("no function") ||
        msg1.toLowerCase().includes("rpc"));

    if (!looksLikeSignatureMismatch && !msg1.toLowerCase().includes("p_dedupe_key")) {
      console.warn("[notifications] safeCreateNotification failed:", msg1);
      console.warn("[notifications] payload:", payload);
      return null;
    }

    // Intento 2: RPC sin dedupe_key (firma vieja)
    const argsNoDedupe = {
      p_user_id,
      p_type,
      p_title,
      p_body: payload?.body ?? null,
      p_metadata: payload?.metadata ?? {},
      p_is_read: payload?.is_read ?? false,
    };

    try {
      const { data, error } = await supabase.rpc("orby_notify", argsNoDedupe);
      if (error) throw error;
      return data ?? null;
    } catch (e2) {
      console.warn(
        "[notifications] safeCreateNotification failed (no-dedupe):",
        e2?.message || e2
      );
      console.warn("[notifications] payload:", payload);
      return null;
    }
  }
}

export async function markNotificationRead(id, is_read = true) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_read })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markAllMyNotificationsRead(userId) {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null); // ✅ opcional: no tocar borradas

  if (error) throw error;
  return true;
}

export async function countMyUnreadNotifications(userId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null); // ✅ opcional: no contar borradas

  if (error) throw error;
  return Number(count || 0);
}
