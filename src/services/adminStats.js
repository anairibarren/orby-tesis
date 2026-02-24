import { supabase } from "./supabase";

export async function getAdminDashboardStats() {
  try {
    const [
      { count: totalUsers },
      { count: totalProviders },
      { count: totalServices },
      { data: requests },
      { data: reviews },
      { data: services },
      { data: profiles },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),

      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "provider"),

      supabase
        .from("service_catalog")
        .select("*", { count: "exact", head: true }),

      supabase.from("service_requests").select(
        "status, catalog_id, provider_id"
      ),

      supabase.from("reviews").select("rating"),

      supabase.from("service_catalog").select("id, name, category"),

      supabase.from("profiles").select("id, full_name, email"),
    ]);

    // =============================
    // 📊 Requests por estado
    // =============================

    const requestsByStatus =
      requests?.reduce((acc, r) => {
        const status = r.status?.toLowerCase() || "sin_estado";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}) || {};

    // =============================
    // ⭐ Rating promedio
    // =============================

    const totalReviews = reviews?.length || 0;

    const avgRating =
      totalReviews > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) /
            totalReviews
          ).toFixed(1)
        : 0;

    // =============================
    // 🏆 Top Servicio
    // =============================

    let topService = null;

    if (requests?.length) {
      const counter = {};

      requests.forEach((r) => {
        counter[r.catalog_id] =
          (counter[r.catalog_id] || 0) + 1;
      });

      const topServiceId = Object.entries(counter).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      const service = services?.find(
        (s) => s.id === topServiceId
      );

      topService = service?.name || null;
    }

    // =============================
    // 🏆 Top Categoría
    // =============================

    let topCategory = null;

    if (requests?.length) {
      const counter = {};

      requests.forEach((r) => {
        const service = services?.find(
          (s) => s.id === r.catalog_id
        );

        if (service) {
          counter[service.category] =
            (counter[service.category] || 0) + 1;
        }
      });

      topCategory =
        Object.entries(counter).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || null;
    }

    // =============================
    // 🏆 Top Prestador
    // =============================

    let topProvider = null;

    if (requests?.length) {
      const counter = {};

      requests.forEach((r) => {
        counter[r.provider_id] =
          (counter[r.provider_id] || 0) + 1;
      });

      const topProviderId = Object.entries(counter).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      const provider = profiles?.find(
        (p) => p.id === topProviderId
      );

      topProvider =
        provider?.full_name ||
        provider?.email ||
        null;
    }

    return {
      totalUsers: totalUsers || 0,
      totalProviders: totalProviders || 0,
      totalServices: totalServices || 0,
      requestsByStatus: requestsByStatus || {},
      totalReviews: totalReviews || 0,
      avgRating: avgRating || 0,
      topService,
      topCategory,
      topProvider,
    };
  } catch (error) {
    console.error("Error en getAdminDashboardStats:", error);

    return {
      totalUsers: 0,
      totalProviders: 0,
      totalServices: 0,
      requestsByStatus: {},
      totalReviews: 0,
      avgRating: 0,
      topService: null,
      topCategory: null,
      topProvider: null,
    };
  }
}