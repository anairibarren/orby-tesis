// src/services/reviews.js
import { supabase } from "./supabase";

const TABLE = "reviews";

export function clampRating(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function getReviewByRequestId(requestId) {
  if (!requestId) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("request_id", requestId)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function createReview({ request_id, provider_id, client_id, rating, comment }) {
  const payload = {
    request_id,
    provider_id,
    client_id,
    rating: clampRating(rating),
    comment: String(comment || "").trim() || null,
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select("*").limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}
