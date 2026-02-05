// src/services/services.js
import { supabase } from "./supabase";

// Tablas (Opción A)
const CATALOG = "service_catalog";
const PROVIDER_SERVICES = "provider_services";

/** Normaliza el shape para el frontend */
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

/**
 * Construye el select de profiles con extras opcionales.
 * - Si tu tabla profiles todavía no tiene certificate_url/about/bio/description,
 *   el código reintenta sin esos campos.
 */
function buildProfilesSelect(extras = {}) {
  const base = ["id", "full_name", "neighborhood", "avatar_url", "provider_verified"];
  const optional = [];

  if (extras.about) optional.push("about");
  if (extras.bio) optional.push("bio");
  if (extras.description) optional.push("description");
  if (extras.certificate_url) optional.push("certificate_url");

  return [...base, ...optional].join(",\n        ");
}

/**
 * Helper: ejecuta una query que incluye join a profiles,
 * y si falla por columnas faltantes (certificate_url/about/bio/description),
 * reintenta sin esos campos.
 */
async function runWithProfilesFallback(makeQuery) {
  // Orden de “extras” (arranca con todo)
  let extras = {
    about: true,
    bio: true,
    description: true,
    certificate_url: true,
  };

  // Intento 1
  let res = await makeQuery(buildProfilesSelect(extras));

  // Si falla por columna faltante, vamos apagando campos y reintentando
  const optionalKeys = ["certificate_url", "about", "bio", "description"];
  let guard = 0;

  while (res?.error && guard < 6) {
    guard += 1;

    // si falta alguna columna, la apagamos
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

/**
 * Catálogo global (para que el prestador elija)
 */
export async function listCatalogServices() {
  const { data, error } = await supabase
    .from(CATALOG)
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Mis ofertas como prestador (provider_services + join catálogo)
 */
export async function listMyProviderServices(providerId) {
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
      service_catalog:catalog_id (
        id,
        name,
        category,
        pricing_type,
        is_active
      )
    `
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeOffer);
}

/**
 * Ofertas activas para clientes (provider_services + join catálogo + join provider profile)
 * ✅ ahora intenta traer about/bio/description/certificate_url con fallback
 */
export async function listActiveProviderServices() {
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
        service_catalog:catalog_id (
          id,
          name,
          category,
          pricing_type
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
}

/**
 * Traer 1 oferta para el detalle (por id de provider_services)
 * ✅ ahora intenta traer about/bio/description/certificate_url con fallback
 */
export async function getProviderServiceById(providerServiceId) {
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
        service_catalog:catalog_id (
          id,
          name,
          category,
          pricing_type
        ),
        profiles:provider_id (
          ${profilesSelect}
        )
      `
      )
      .eq("id", providerServiceId)
      .single();
  });

  // runWithProfilesFallback devuelve array para los casos “normales”.
  // pero acá usamos .single(), entonces "data" viene como objeto en res.data
  // Para mantener compatibilidad: detectamos shape.
  const row = Array.isArray(data) ? data?.[0] : data;
  return normalizeOffer(row);
}

/**
 * Crear oferta del prestador (elige del catálogo)
 */
export async function createProviderService(payload) {
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
      service_catalog:catalog_id (id, name, category, pricing_type)
    `
    )
    .single();

  if (error) throw error;
  return normalizeOffer(data);
}

/**
 * Editar oferta (precio, activar/desactivar, etc.)
 */
export async function updateProviderService(providerServiceId, patch) {
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
      service_catalog:catalog_id (id, name, category, pricing_type)
    `
    )
    .single();

  if (error) throw error;
  return normalizeOffer(data);
}

export async function deleteProviderService(providerServiceId) {
  const { error } = await supabase
    .from(PROVIDER_SERVICES)
    .delete()
    .eq("id", providerServiceId);

  if (error) throw error;
  return true;
}

/** Helpers compatibles */
export async function setServiceActive(providerServiceId, isActive) {
  return updateProviderService(providerServiceId, { is_active: isActive });
}

// Alias para Home/Search (cliente)
export async function listActiveServices() {
  return listActiveProviderServices();
}

// Alias por si algo viejo usa listMyServices
export async function listMyServices(providerId) {
  return listMyProviderServices(providerId);
}

/**
 * Populares (más solicitados) - DB driven
 */
export async function listPopularProviderServices(limit = 6) {
  const { data, error } = await supabase.rpc("get_popular_offers", {
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []).map(normalizeOffer);
}

/**
 * ✅ EXPORT CLAVE: ofertas por catálogo (para ProvidersByService)
 * - Tiene fallback si en tu tabla no existe is_active o duration_minutes
 * - ✅ y fallback para extras de profiles (about/bio/description/certificate_url)
 */
export async function listProviderServicesByCatalogId(catalogId) {
  // Helper para armar query con o sin duration_minutes
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
          currency
        ),
        profiles:provider_id (
          ${profilesSelect}
        )
      `;

      let base = supabase
        .from(PROVIDER_SERVICES)
        .select(baseSelect)
        .eq("catalog_id", catalogId);

      // Intento con is_active true
      let res = await base.eq("is_active", true).order("created_at", { ascending: false });

      // si is_active no existe
      if (res.error && isMissingColumn(res.error, "is_active")) {
        res = await base.order("created_at", { ascending: false });
      }

      return res;
    });

    return (data ?? []).map(normalizeOffer);
  }

  // Intento 1: con duration_minutes
  try {
    return await run(true);
  } catch (e) {
    // Si duration_minutes no existe, reintenta sin ese campo
    if (isMissingColumn(e, "duration_minutes")) {
      return await run(false);
    }
    throw e;
  }
}

/**
 * (compat) Tu función vieja por si se usa en otros lados
 * ✅ ahora con fallback de extras de profiles
 */
export async function listProviderServicesByCatalog(catalogId) {
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
        service_catalog:catalog_id (
          id,
          name,
          category,
          pricing_type
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
}

/**
 * ✅ Ofertas activas de un prestador (para su perfil)
 */
export async function listProviderServicesByProvider(providerId) {
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
      service_catalog:catalog_id (
        id,
        name,
        category,
        pricing_type
      )
    `
    )
    .eq("is_active", true)
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeOffer);
}
