// /src/services/requests.js
import { supabase } from "./supabase";
import { safeCreateNotification } from "./notifications";

const TABLE = "service_requests";
const PROVIDER_SERVICES = "provider_services";
const PROFILES = "profiles";
const SERVICE_CATALOG = "service_catalog";

/* ---------------- Offline guard ---------------- */
function isOfflineLikeError(e) {
  // navegador reporta offline
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return true;

  const msg = String(e?.message || e || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("fetch") && msg.includes("failed")
  );
}

/* ---------------- Helpers ---------------- */
function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function getServiceRefId(r) {
  return r?.provider_service_id ?? r?.service_id ?? null;
}

function isUnknownColumnError(errOrMsg, col) {
  const m = String(errOrMsg?.message ?? errOrMsg ?? "").toLowerCase();
  const c = String(col || "").toLowerCase();
  if (!c) return false;

  if (m.includes("could not find the") && m.includes(`'${c}'`) && m.includes("schema cache")) return true;
  if (m.includes(`could not find the '${c}' column`)) return true;
  if (m.includes(`column "${c}" does not exist`)) return true;
  if (m.includes(c) && m.includes("schema cache")) return true;
  if (m.includes(c) && m.includes("does not exist")) return true;

  return false;
}

function stripUnknownColumnsByError(payload, err) {
  const cleaned = { ...payload };
  const msg = err?.message || err;

  // ids legacy
  if (isUnknownColumnError(msg, "provider_service_id")) delete cleaned.provider_service_id;
  if (isUnknownColumnError(msg, "service_id")) delete cleaned.service_id;
  if (isUnknownColumnError(msg, "catalog_id")) delete cleaned.catalog_id;

  // pagos (simulado - solo dejamos method/status/paid_at)
  if (isUnknownColumnError(msg, "payment_method")) delete cleaned.payment_method;
  if (isUnknownColumnError(msg, "payment_status")) delete cleaned.payment_status;
  if (isUnknownColumnError(msg, "paid_at")) delete cleaned.paid_at;

  // montos
  if (isUnknownColumnError(msg, "service_amount")) delete cleaned.service_amount;
  if (isUnknownColumnError(msg, "fee_percent")) delete cleaned.fee_percent;
  if (isUnknownColumnError(msg, "platform_fee")) delete cleaned.platform_fee;
  if (isUnknownColumnError(msg, "final_amount")) delete cleaned.final_amount;
  if (isUnknownColumnError(msg, "total_amount")) delete cleaned.total_amount;
  if (isUnknownColumnError(msg, "orby_fee_amount")) delete cleaned.orby_fee_amount;

  // cotización
  if (isUnknownColumnError(msg, "quote_amount")) delete cleaned.quote_amount;

  // ubicación (por si aún no existe)
  if (isUnknownColumnError(msg, "address")) delete cleaned.address;

  // completado con código
  if (isUnknownColumnError(msg, "completion_code_hash")) delete cleaned.completion_code_hash;
  if (isUnknownColumnError(msg, "completion_code_created_at")) delete cleaned.completion_code_created_at;
  if (isUnknownColumnError(msg, "completion_code_expires_at")) delete cleaned.completion_code_expires_at;
  if (isUnknownColumnError(msg, "completed_at")) delete cleaned.completed_at;
  if (isUnknownColumnError(msg, "completed_by")) delete cleaned.completed_by;

  return cleaned;
}

function truncateText(v, max = 110) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
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

/* ---------------- payment_method normalization ---------------- */
const CANONICAL = new Set(["cash", "mp", "card", "transfer"]);

function normalizePaymentMethod(v) {
  const m = String(v ?? "").trim().toLowerCase();
  if (!m) return null;

  if (m === "mercadopago" || m === "mercado_pago" || m === "mercado pago") return "mp";
  if (m === "efectivo") return "cash";
  if (m === "tarjeta") return "card";

  if (CANONICAL.has(m)) return m;

  return m;
}

function isPaymentMethodCheckError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("payment_method_check") || msg.includes("service_requests_payment_method_check");
}

function candidatesForPaymentMethod(input) {
  const m = String(input ?? "").trim().toLowerCase();
  const base = normalizePaymentMethod(m);

  const candidates = [];

  if (base) candidates.push(base);

  if (base === "cash" || base === "efectivo") candidates.push("cash", "efectivo");
  if (base === "mp" || base === "mercadopago" || base === "mercado_pago")
    candidates.push("mp", "mercadopago", "mercado_pago", "transfer");
  if (base === "transfer") candidates.push("transfer", "mp", "mercadopago", "mercado_pago");
  if (base === "card" || base === "tarjeta") candidates.push("card", "tarjeta");

  candidates.push("cash", "efectivo", "mp", "mercadopago", "mercado_pago", "transfer", "card", "tarjeta");

  return uniq(candidates.map((x) => String(x)));
}

/* ---------------- Enrich ---------------- */
async function enrichRequests(requests) {
  try {
    const providerIds = uniq((requests ?? []).map((r) => r.provider_id));
    const clientIds = uniq((requests ?? []).map((r) => r.client_id));
    const serviceIds = uniq((requests ?? []).map((r) => getServiceRefId(r)));

    // ✅ NUEVO: catalog ids (para fallback cuando se borra provider_services)
    const catalogIds = uniq((requests ?? []).map((r) => r?.catalog_id ?? r?.service_id ?? null));

    let providersById = {};
    if (providerIds.length) {
      const { data, error } = await supabase
        .from(PROFILES)
        .select("id, full_name, neighborhood, avatar_url, provider_verified, certificate_url, cert_url")
        .in("id", providerIds);

      if (error) throw error;
      providersById = Object.fromEntries((data ?? []).map((p) => [p.id, p]));
    }

    // ✅ clientes para que no aparezca “Sin nombre” en Requests.jsx
    let clientsById = {};
    if (clientIds.length) {
      const { data, error } = await supabase
        .from(PROFILES)
        .select("id, full_name, neighborhood, avatar_url, role")
        .in("id", clientIds);

      if (error) throw error;
      clientsById = Object.fromEntries((data ?? []).map((p) => [p.id, p]));
    }

    let psById = {};
    if (serviceIds.length) {
      const { data, error } = await supabase
        .from(PROVIDER_SERVICES)
        .select(
          `
          id,
          provider_id,
          catalog_id,
          base_price,
          is_active,
          service_catalog:catalog_id (
            id,
            name,
            category,
            pricing_type,
            fixed_price,
            currency
          )
        `
        )
        .in("id", serviceIds);

      if (error) throw error;
      psById = Object.fromEntries((data ?? []).map((ps) => [ps.id, ps]));
    }

    // ✅ NUEVO: catálogo directo (fallback robusto)
    let catalogById = {};
    if (catalogIds.length) {
      const { data, error } = await supabase
        .from(SERVICE_CATALOG)
        .select("id, name, category, pricing_type, fixed_price, currency, is_active")
        .in("id", catalogIds);

      if (error) throw error;
      catalogById = Object.fromEntries((data ?? []).map((c) => [c.id, c]));
    }

    return (requests ?? []).map((r) => {
      const ps = psById[getServiceRefId(r)] ?? null;

      const catalog =
        ps?.service_catalog ??
        (r?.catalog_id ? catalogById[r.catalog_id] : null) ??
        (r?.service_id ? catalogById[r.service_id] : null) ??
        null;

      const provider = providersById[r.provider_id] ?? null;
      const clientProfile = clientsById[r.client_id] ?? null;

      return {
        ...r,
        provider_service: ps,
        catalog,
        provider,
        client_profile: clientProfile,
        client: clientProfile,
      };
    });
  } catch (e) {
    // ✅ Offline: devolvemos sin enrich (para no romper UI)
    if (isOfflineLikeError(e)) {
      return (requests ?? []).map((r) => ({
        ...r,
        provider_service: null,
        catalog: null,
        provider: null,
        client_profile: null,
        client: null,
      }));
    }
    throw e;
  }
}

/* ---------------- LISTADOS ---------------- */
export async function listMyRequestsAsClientRich(clientId) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return enrichRequests(data ?? []);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function listIncomingRequestsRich(providerId) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return enrichRequests(data ?? []);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

// compat
export async function listMyRequestsAsClient(clientId) {
  return listMyRequestsAsClientRich(clientId);
}
export async function listIncomingRequests(providerId) {
  return listIncomingRequestsRich(providerId);
}
export async function listMyRequestsAsProvider(providerId) {
  return listIncomingRequestsRich(providerId);
}
export async function listMyRequests(userId) {
  return listMyRequestsAsClientRich(userId);
}

/* ---------------- CREATE / UPDATE ---------------- */
async function tryInsertWithUnknownColumnFallback(payload) {
  const res1 = await supabase.from(TABLE).insert(payload).select("*").limit(1);
  if (!res1.error) return res1.data?.[0] ?? null;

  const cleaned1 = stripUnknownColumnsByError(payload, res1.error);
  const res2 = await supabase.from(TABLE).insert(cleaned1).select("*").limit(1);
  if (!res2.error) return res2.data?.[0] ?? null;

  const cleaned2 = stripUnknownColumnsByError(cleaned1, res2.error);
  const res3 = await supabase.from(TABLE).insert(cleaned2).select("*").limit(1);
  if (res3.error) throw res3.error;

  return res3.data?.[0] ?? null;
}

export async function createRequest(payload) {
  // ✅ si estás offline, no intentes crear
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return null;

  const normalized = { ...payload };

  if (normalized.provider_service_id && !normalized.service_id) normalized.service_id = normalized.provider_service_id;
  if (!normalized.status) normalized.status = "solicitada";

  if (Object.prototype.hasOwnProperty.call(normalized, "payment_method")) {
    normalized.payment_method = normalizePaymentMethod(normalized.payment_method);
  }

  let inserted = null;

  try {
    inserted = await tryInsertWithUnknownColumnFallback(normalized);
  } catch (e) {
    // ✅ si se cayó la red a mitad de camino
    if (isOfflineLikeError(e)) return null;

    if (isPaymentMethodCheckError(e) && Object.prototype.hasOwnProperty.call(normalized, "payment_method")) {
      const list = candidatesForPaymentMethod(normalized.payment_method);

      for (const cand of list) {
        try {
          const next = { ...normalized, payment_method: cand };
          inserted = await tryInsertWithUnknownColumnFallback(next);
          break;
        } catch (e2) {
          if (isOfflineLikeError(e2)) return null;
          if (isPaymentMethodCheckError(e2)) continue;
          throw e2;
        }
      }
    } else {
      const cleaned1 = stripUnknownColumnsByError(normalized, e);
      inserted = await tryInsertWithUnknownColumnFallback(cleaned1);
    }
  }

  // ✅ NOTIFICACIÓN AL PRESTADOR: NUEVA SOLICITUD
  try {
    if (inserted?.provider_id) {
      // si estás offline al final, no notifiques
      if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return inserted;

      const actorId = (await getActorIdFallback()) || inserted?.client_id || null;

      const when = inserted?.preferred_datetime ? formatWhen(inserted.preferred_datetime) : null;
      const bodyParts = [];
      if (when) bodyParts.push(`Para: ${when}`);
      if (inserted?.description) bodyParts.push(truncateText(inserted.description, 90));

      await safeCreateNotification({
        user_id: inserted.provider_id,
        actor_id: actorId,
        type: "request_new",
        title: "Nueva solicitud",
        body: bodyParts.filter(Boolean).join(" · ") || "Te llegó una nueva solicitud.",
        metadata: {
          request_id: inserted.id,
          provider_id: inserted.provider_id,
          client_id: inserted.client_id,
          preferred_datetime: inserted.preferred_datetime ?? null,
        },
        is_read: false,
      });
    }
  } catch {
    // safeCreateNotification ya loguea si falla
  }

  return inserted;
}

export async function updateRequest(requestId, patch) {
  try {
    const { data, error } = await supabase.from(TABLE).update(patch).eq("id", requestId).select("*").limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function updateRequestSafe(requestId, patch) {
  try {
    return await updateRequest(requestId, patch);
  } catch (e) {
    if (isOfflineLikeError(e)) return null;

    const cleaned = stripUnknownColumnsByError(patch, e);
    if (!Object.keys(cleaned).length) return null;
    return await updateRequest(requestId, cleaned);
  }
}

export async function updateRequestStatus(requestId, status) {
  return updateRequestSafe(requestId, { status });
}

export async function deleteRequest(requestId) {
  try {
    const { data, error } = await supabase.from(TABLE).delete().eq("id", requestId).select("id");
    if (error) throw error;

    const deleted = Array.isArray(data) ? data.length : 0;
    if (!deleted) {
      throw new Error(
        "No se pudo eliminar (sin permisos o la solicitud ya no existe). Revisá las policies (RLS) de service_requests."
      );
    }
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return false;
    throw e;
  }
}

/* ---------------- Pago SIMULADO ---------------- */
export async function markRequestPaid(requestId) {
  return updateRequestSafe(requestId, {
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  });
}

/* ---------------- RPC: COMPLETADO CON CÓDIGO ---------------- */
export async function setCompletionCode(requestId, code, expiresMinutes = 180) {
  // ✅ offline: no intentes RPC
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return false;

  try {
    const { error } = await supabase.rpc("orby_set_completion_code", {
      p_request_id: requestId,
      p_code: code,
      p_expires_minutes: expiresMinutes,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return false;
    throw e;
  }
}

export async function completeWithCode(requestId, code) {
  // ✅ offline: no intentes RPC
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return null;

  try {
    const { data, error } = await supabase.rpc("orby_complete_request_with_code", {
      p_request_id: requestId,
      p_code: code,
    });
    if (error) throw error;
    return data;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

/* ---------------- Detail robusto (SIN .single) ---------------- */
export async function getRequestById(requestId) {
  if (!requestId) throw new Error("requestId inválido");

  try {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", requestId).limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function getProviderServiceById(providerServiceId) {
  if (!providerServiceId) return null;

  try {
    const { data, error } = await supabase
      .from(PROVIDER_SERVICES)
      .select(
        `
        id,
        provider_id,
        catalog_id,
        base_price,
        duration_minutes,
        service_catalog:catalog_id ( id, name, category, pricing_type, currency )
      `
      )
      .eq("id", providerServiceId)
      .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function getProfileById(profileId) {
  if (!profileId) return null;

  try {
    const { data, error } = await supabase
      .from(PROFILES)
      .select("id, full_name, neighborhood, avatar_url, provider_verified, certificate_url, cert_url")
      .eq("id", profileId)
      .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}