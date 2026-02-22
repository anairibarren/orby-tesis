// src/services/profiles.js
import { supabase } from "./supabase";

/* ---------------- helpers ---------------- */
function toNullIfEmptyString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

// acepta: null | "[]" | " [ ... ] " | [] | ["url"]
function normalizeCertUrlValue(v) {
  if (v == null) return null;

  // si llega array, lo guardamos como JSON string o null si vacío
  if (Array.isArray(v)) {
    const cleaned = v.map((x) => String(x || "").trim()).filter(Boolean);
    return cleaned.length ? JSON.stringify(cleaned) : null;
  }

  // si llega string, puede ser JSON o basura
  const s = String(v).trim();
  if (!s) return null;

  // si es "[]" -> null
  if (s === "[]") return null;

  // si es JSON válido
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.map((x) => String(x || "").trim()).filter(Boolean);
      return cleaned.length ? JSON.stringify(cleaned) : null;
    }
  } catch {
    // si no es JSON, lo dejamos como string (pero suele ser error del caller)
  }

  return s;
}

function addCompatFields(data) {
  if (!data) return data;

  // compat lectura
  if (data.cert_url != null && data.certificate_urls == null) {
    data.certificate_urls = data.cert_url;
  }
  return data;
}

/**
 * Trae el perfil del usuario logueado.
 */
export async function getMyProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;

  return addCompatFields(data);
}

/**
 * Actualiza el perfil del usuario logueado.
 * ✅ Normaliza certificados para que BORRAR realmente borre.
 * ✅ Hace read-back para evitar “quedó pegado” con RLS/cachés.
 */
export async function updateMyProfile(userId, patch) {
  const safePatch = { ...(patch || {}) };

  // compat: si el front manda certificate_urls, lo pasamos a cert_url
  if ("certificate_urls" in safePatch) {
    safePatch.cert_url = safePatch.certificate_urls;
    delete safePatch.certificate_urls;
  }

  // ✅ normalización fuerte (clave para tu bug)
  if ("certificate_url" in safePatch) {
    safePatch.certificate_url = toNullIfEmptyString(safePatch.certificate_url);
  }
  if ("cert_url" in safePatch) {
    safePatch.cert_url = normalizeCertUrlValue(safePatch.cert_url);
  }

  // 1) update
  const { error: upErr } = await supabase.from("profiles").update(safePatch).eq("id", userId);
  if (upErr) throw upErr;

  // 2) read-back (esto evita que “siga apareciendo” por estado viejo)
  const fresh = await getMyProfile(userId);

  // ✅ compat lectura nuevamente
  return addCompatFields(fresh);
}

/**
 * Helper opcional: limpiar certificaciones (por si querés llamarlo directo).
 */
export async function clearMyCertifications(userId) {
  return updateMyProfile(userId, {
    certificate_url: null,
    cert_url: null,
  });
}