// src/services/notifications.js
import { supabase } from "./supabase";

const TABLE = "notifications";

function isOfflineLikeError(e) {
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return true;
  const msg = String(e?.message || e || "").toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
}

export async function listMyNotifications(userId, { limit = 50 } = {}) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function createNotification(payload) {
  try {
    const { data, error } = await supabase.from(TABLE).insert(payload).select("*").single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

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

export async function safeCreateNotification(payload) {
  // ✅ si estás offline, no intentes notificar
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return null;

  const p_user_id = payload?.user_id ?? null;
  const p_type = String(payload?.type ?? "").trim();
  const p_title = String(payload?.title ?? "").trim();

  if (!p_user_id || !p_type || !p_title) {
    console.warn("[notifications] invalid payload:", payload);
    return null;
  }

  const dedupe = payload?.dedupe_key ?? buildDedupeKey(payload);

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
    if (isOfflineLikeError(e1)) return null;

    const msg1 = String(e1?.message || e1 || "");
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
      if (isOfflineLikeError(e2)) return null;
      console.warn("[notifications] safeCreateNotification failed (no-dedupe):", e2?.message || e2);
      console.warn("[notifications] payload:", payload);
      return null;
    }
  }
}

export async function markNotificationRead(id, is_read = true) {
  try {
    const { data, error } = await supabase.from(TABLE).update({ is_read }).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function markAllMyNotificationsRead(userId) {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .is("deleted_at", null);

    if (error) throw error;
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return true;
    throw e;
  }
}

export async function countMyUnreadNotifications(userId) {
  try {
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .is("deleted_at", null);

    if (error) throw error;
    return Number(count || 0);
  } catch (e) {
    if (isOfflineLikeError(e)) return 0;
    throw e;
  }
}