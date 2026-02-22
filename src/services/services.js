// src/services/services.js
import { supabase } from "./supabase";

const CATALOG = "service_catalog";
const PROVIDER_SERVICES = "provider_services";

function isOfflineLikeError(e) {
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) return true;
  const msg = String(e?.message || e || "").toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
}

function normalizeOffer(row) {
  if (!row) return row;
  return {
    ...row,
    catalog: row.service_catalog ?? row.catalog ?? null,
    provider: row.profiles ?? row.provider ?? null,
  };
}

function isMissingColumn(err, col) {
  const msg = String(err?.message || "").toLowerCase();
  const needle = String(col || "").toLowerCase();
  return msg.includes("does not exist") && msg.includes(needle);
}

function buildProfilesSelect(extras = {}) {
  const base = ["id", "full_name", "neighborhood", "avatar_url", "provider_verified"];
  const optional = [];

  if (extras.about) optional.push("about");
  if (extras.bio) optional.push("bio");
  if (extras.description) optional.push("description");
  if (extras.certificate_url) optional.push("certificate_url");
  if (extras.cert_url) optional.push("cert_url");

  return [...base, ...optional].join(",\n        ");
}

async function runWithProfilesFallback(makeQuery) {
  let extras = {
    about: true,
    bio: true,
    description: true,
    certificate_url: true,
    cert_url: true,
  };

  let res = await makeQuery(buildProfilesSelect(extras));

  const optionalKeys = ["cert_url", "certificate_url", "about", "bio", "description"];
  let guard = 0;

  while (res?.error && guard < 8) {
    guard += 1;

    let changed = false;
    for (const key of optionalKeys) {
      if (extras[key] && isMissingColumn(res.error, key)) {
        extras[key] = false;
        changed = true;
      }
    }

    if (!changed) break;
    res = await makeQuery(buildProfilesSelect(extras));
  }

  if (res?.error) throw res.error;
  return res.data ?? [];
}

export async function listCatalogServices() {
  try {
    const { data, error } = await supabase
      .from(CATALOG)
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function listMyProviderServices(providerId) {
  try {
    const { data, error } = await supabase
      .from(PROVIDER_SERVICES)
      .select(
        `
        id,
        provider_id,
        catalog_id,
        base_price,
        is_active,
        created_at,
        duration_minutes,
        service_catalog:catalog_id (
          id,
          name,
          category,
          pricing_type,
          is_active,
          currency,
          fixed_price
        )
      `
      )
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(normalizeOffer);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function listActiveProviderServices() {
  try {
    const data = await runWithProfilesFallback(async (profilesSelect) => {
      return await supabase
        .from(PROVIDER_SERVICES)
        .select(
          `
          id,
          provider_id,
          catalog_id,
          base_price,
          is_active,
          created_at,
          duration_minutes,
          service_catalog:catalog_id (
            id,
            name,
            category,
            pricing_type,
            currency,
            fixed_price
          ),
          profiles:provider_id (
            ${profilesSelect}
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });
    });

    return (data ?? []).map(normalizeOffer);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function getProviderServiceById(providerServiceId) {
  try {
    const data = await runWithProfilesFallback(async (profilesSelect) => {
      return await supabase
        .from(PROVIDER_SERVICES)
        .select(
          `
          id,
          provider_id,
          catalog_id,
          base_price,
          is_active,
          created_at,
          duration_minutes,
          service_catalog:catalog_id (
            id,
            name,
            category,
            pricing_type,
            currency,
            fixed_price
          ),
          profiles:provider_id (
            ${profilesSelect}
          )
        `
        )
        .eq("id", providerServiceId)
        .single();
    });

    const row = Array.isArray(data) ? data?.[0] : data;
    return normalizeOffer(row);
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function createProviderService(payload) {
  try {
    const { data, error } = await supabase
      .from(PROVIDER_SERVICES)
      .insert(payload)
      .select(
        `
        id,
        provider_id,
        catalog_id,
        base_price,
        is_active,
        created_at,
        duration_minutes,
        service_catalog:catalog_id (id, name, category, pricing_type, currency, fixed_price)
      `
      )
      .single();

    if (error) throw error;
    return normalizeOffer(data);
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function updateProviderService(providerServiceId, patch) {
  try {
    const { data, error } = await supabase
      .from(PROVIDER_SERVICES)
      .update(patch)
      .eq("id", providerServiceId)
      .select(
        `
        id,
        provider_id,
        catalog_id,
        base_price,
        is_active,
        created_at,
        duration_minutes,
        service_catalog:catalog_id (id, name, category, pricing_type, currency, fixed_price)
      `
      )
      .single();

    if (error) throw error;
    return normalizeOffer(data);
  } catch (e) {
    if (isOfflineLikeError(e)) return null;
    throw e;
  }
}

export async function deactivateProviderService(providerServiceId) {
  const res = await updateProviderService(providerServiceId, { is_active: false });
  return Boolean(res);
}

export async function reactivateProviderService(providerServiceId) {
  const res = await updateProviderService(providerServiceId, { is_active: true });
  return Boolean(res);
}

export async function deleteProviderService(providerServiceId) {
  try {
    const { error } = await supabase.from(PROVIDER_SERVICES).delete().eq("id", providerServiceId);
    if (error) throw error;
    return true;
  } catch (e) {
    if (isOfflineLikeError(e)) return false;
    throw e;
  }
}

export async function setServiceActive(providerServiceId, isActive) {
  return updateProviderService(providerServiceId, { is_active: isActive });
}

export async function listActiveServices() {
  return listActiveProviderServices();
}

export async function listMyServices(providerId) {
  return listMyProviderServices(providerId);
}

export async function listPopularProviderServices(limit = 6) {
  try {
    const { data, error } = await supabase.rpc("get_popular_offers", { p_limit: limit });
    if (error) throw error;
    return (data ?? []).map(normalizeOffer);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function listProviderServicesByCatalogId(catalogId) {
  async function run(duration = true) {
    const data = await runWithProfilesFallback(async (profilesSelect) => {
      const baseSelect = `
        id,
        provider_id,
        catalog_id,
        base_price,
        ${duration ? "duration_minutes," : ""}
        is_active,
        created_at,
        service_catalog:catalog_id (
          id,
          name,
          category,
          pricing_type,
          currency,
          fixed_price
        ),
        profiles:provider_id (
          ${profilesSelect}
        )
      `;

      let base = supabase.from(PROVIDER_SERVICES).select(baseSelect).eq("catalog_id", catalogId);

      let res = await base.eq("is_active", true).order("created_at", { ascending: false });

      if (res.error && isMissingColumn(res.error, "is_active")) {
        res = await base.order("created_at", { ascending: false });
      }

      return res;
    });

    return (data ?? []).map(normalizeOffer);
  }

  try {
    return await run(true);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    if (isMissingColumn(e, "duration_minutes")) return await run(false);
    throw e;
  }
}

export async function listProviderServicesByCatalog(catalogId) {
  try {
    const data = await runWithProfilesFallback(async (profilesSelect) => {
      return await supabase
        .from(PROVIDER_SERVICES)
        .select(
          `
          id,
          provider_id,
          catalog_id,
          base_price,
          is_active,
          created_at,
          duration_minutes,
          service_catalog:catalog_id (
            id,
            name,
            category,
            pricing_type,
            currency,
            fixed_price
          ),
          profiles:provider_id (
            ${profilesSelect}
          )
        `
        )
        .eq("is_active", true)
        .eq("catalog_id", catalogId)
        .order("created_at", { ascending: false });
    });

    return (data ?? []).map(normalizeOffer);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}

export async function listProviderServicesByProvider(providerId) {
  try {
    const { data, error } = await supabase
      .from(PROVIDER_SERVICES)
      .select(
        `
        id,
        provider_id,
        catalog_id,
        base_price,
        is_active,
        created_at,
        duration_minutes,
        service_catalog:catalog_id (
          id,
          name,
          category,
          pricing_type,
          currency,
          fixed_price
        )
      `
      )
      .eq("is_active", true)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(normalizeOffer);
  } catch (e) {
    if (isOfflineLikeError(e)) return [];
    throw e;
  }
}