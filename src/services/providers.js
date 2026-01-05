import { supabase } from "./supabase";

export async function getProviders({
  categoryId = null,
  serviceId = null,
  filters = null
}) {
  try {
    let query = supabase
      .from("providers")
      .select(`
        id,
        name,
        email,
        description,
        description_full,
        category_id,
        service_id,
        created_at,
        reviews,
        phone,
        image,
        verified,
        requests_count,
        price_min,
        price_max,
        rating,
        reviews_count,
        location
      `);

    if (categoryId) {
      query = query.eq("category_id", Number(categoryId));
    }

    if (serviceId) {
      query = query.eq("service_id", Number(serviceId));
    }

    /* Filtros */
    if (filters?.categoria) {
      query = query.eq("category_id", Number(filters.categoria));
    }

    if (filters?.servicio?.id) {
      query = query.eq("service_id", Number(filters.servicio.id));
    }

    if (filters?.verified) {
      query = query.eq("verified", true);
    }

    if (filters?.priceMin) {
      query = query.gte("price_min", Number(filters.priceMin));
    }

    if (filters?.priceMax) {
      query = query.lte("price_max", Number(filters.priceMax));
    }

    /* Orden */
    switch (filters?.orden) {
      case "rating":
        query = query.order("rating", { ascending: false });
        break;

      case "solicitados":
        query = query.order("requests_count", { ascending: false });
        break;

      case "experiencia":
        query = query
          .order("requests_count", { ascending: false })
          .order("rating", { ascending: false });
        break;

      case "nuevos":
        query = query.order("created_at", { ascending: false });
        break;

      case "precio":
        query = query.order("price_min", { ascending: true });
        break;

      default:
        break;
    }

    /* Ejecutar consulta */
    const { data, error } = await query;

    if (error) {
      console.error("Error en getProviders:", error.message);
      return [];
    }

    console.log("Prestadores obtenidos:", data);
    return data || [];

  } catch (err) {
    console.error("Error inesperado en getProviders:", err);
    return [];
  }
}