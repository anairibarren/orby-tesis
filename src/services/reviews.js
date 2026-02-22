// src/services/reviews.js
import { supabase } from "./supabase";

const TABLE = "reviews";

function isOfflineLikeError(e) {
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return true;
  const msg = String(e?.message || e || "").toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
}

export function clampRating(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function getReviewByRequestId(requestId) {
  if (!requestId) return null;

  try {
    const { data, error } = await supabase.from(TABLE).select("*").eq("request_id", requestId).limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function createReview({ request_id, provider_id, client_id, rating, comment }) {
  const payload = {
    request_id,
    provider_id,
    client_id,
    rating: clampRating(rating),
    comment: String(comment || "").trim() || null,
  };

  try {
    const { data, error } = await supabase.from(TABLE).insert(payload).select("*").limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}