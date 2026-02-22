// src/services/messages.js
import { supabase } from "./supabase";

export async function listMessagesByRequest(requestId) {
  const { data, error } = await supabase
    .from("request_messages")
    .select("id, request_id, sender_id, body, created_at, seen_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage({ requestId, senderId, body }) {
  const { error } = await supabase.from("request_messages").insert([
    { request_id: requestId, sender_id: senderId, body },
  ]);

  if (error) throw error;
}

/**
 * Marca como "visto" todos los mensajes del otro (no míos) que aún no tengan seen_at.
 * Si la columna no existe, la query puede fallar → por eso hicimos el SQL de arriba.
 */
export async function markMessagesSeen({ requestId, myUserId }) {
  const { error } = await supabase
    .from("request_messages")
    .update({ seen_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .neq("sender_id", myUserId)
    .is("seen_at", null);

  if (error) throw error;
}
