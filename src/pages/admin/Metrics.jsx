// src/pages/admin/Metrics.jsx
// ✅ SOLO UI / ESTILOS. No toca la lógica de datos.

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import Loading from "../../components/Loading";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { Icon } from "@iconify/react";

export default function Metrics() {
  const { user, loading: authLoading } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [topServices, setTopServices] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [requestsByMonth, setRequestsByMonth] = useState([]);

  /* ===== FINANZAS ===== */
  const [totalCommission, setTotalCommission] = useState(0);
  const [paidServicesCount, setPaidServicesCount] = useState(0);
  const [commissionMovements, setCommissionMovements] = useState([]);
  const [showMovements, setShowMovements] = useState(false);

  /* ================= SECURITY ================= */

  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  /* ================= INIT + REALTIME ================= */

  useEffect(() => {
    let mounted = true;

    const fetchMetricsSafe = async () => {
      if (!mounted) return;
      await fetchMetrics();
    };

    fetchMetricsSafe();

    const channel = supabase
      .channel("metrics-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => mounted && fetchMetricsSafe()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => mounted && fetchMetricsSafe())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= FETCH ================= */

  const fetchMetrics = async () => {
    if (!loading) setLoading(true);

    const { data: requests = [] } = await supabase.from("service_requests").select("*");
    const { data: services = [] } = await supabase.from("service_catalog").select("*");
    const { data: profiles = [] } = await supabase.from("profiles").select("*");
    const { data: reviews = [] } = await supabase.from("reviews").select("*");

    calculateTopServices(requests, services);
    calculateTopCategories(requests, services);
    calculateTopProviders(requests, profiles);
    calculateRequestsByMonth(requests, reviews);
    calculateCommission(requests, services);

    setLoading(false);
  };

  /* ================= COMISIÓN ================= */

  const calculateCommission = (requests, services) => {
    const commissionRequests = requests.filter((r) => Number(r.platform_fee) > 0);

    const movements = commissionRequests
      .map((r) => {
        const service = services.find((s) => String(s.id) === String(r.catalog_id));

        return {
          id: r.id,
          date: r.paid_at || r.created_at,
          serviceName: service?.name || "Servicio eliminado",
          totalAmount: Number(r.final_amount || r.total_amount || 0),
          commission: Number(r.platform_fee || 0),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = movements.reduce((acc, m) => acc + m.commission, 0);

    setTotalCommission(total);
    setPaidServicesCount(commissionRequests.length);
    setCommissionMovements(movements);
  };

  /* ================= Rankings ================= */

  const calculateTopServices = (requests, services) => {
    const counter = {};

    requests.forEach((r) => {
      counter[r.catalog_id] = (counter[r.catalog_id] || 0) + 1;
    });

    const result = Object.entries(counter)
      .map(([id, total]) => {
        const service = services.find((s) => String(s.id) === String(id));

        return {
          name: service?.name || "Servicio eliminado",
          total,
        };
      })
      .sort((a, b) => b.total - a.total);

    setTopServices(result);
  };

  const calculateTopCategories = (requests, services) => {
    const counter = {};

    requests.forEach((r) => {
      const service = services.find((s) => String(s.id) === String(r.catalog_id));

      if (service) {
        counter[service.category] = (counter[service.category] || 0) + 1;
      }
    });

    const result = Object.entries(counter)
      .map(([category, total]) => ({
        category,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    setTopCategories(result);
  };

  const calculateTopProviders = (requests, profiles) => {
    const counter = {};

    requests.forEach((r) => {
      counter[r.provider_id] = (counter[r.provider_id] || 0) + 1;
    });

    const result = Object.entries(counter)
      .map(([id, total]) => {
        const provider = profiles.find((p) => String(p.id) === String(id));

        return {
          name: provider?.full_name || provider?.email || "Prestador",
          total,
        };
      })
      .sort((a, b) => b.total - a.total);

    setTopProviders(result);
  };

  /* ================= EVOLUCIÓN ================= */

  const formatMonth = (key) => {
    const [year, month] = key.split("-");
    const date = new Date(year, month - 1);

    const short = date.toLocaleString("es-AR", { month: "short" }).replace(".", "");

    return `${short}/${year}`;
  };

  const calculateRequestsByMonth = (requests, reviews) => {
    const counter = {};

    requests.forEach((r) => {
      const date = new Date(r.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!counter[key]) {
        counter[key] = {
          month: key,
          label: formatMonth(key),
          totalRequests: 0,
          totalReviews: 0,
          providers: new Set(),
        };
      }

      counter[key].totalRequests++;
      counter[key].providers.add(r.provider_id);
    });

    reviews.forEach((r) => {
      const date = new Date(r.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (counter[key]) counter[key].totalReviews++;
    });

    const result = Object.values(counter)
      .map((m) => ({
        ...m,
        activeProviders: m.providers.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setRequestsByMonth(result);
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">Métricas y análisis</h1>
        <p className="mt-1 text-[13px] text-black/45">Análisis detallado del comportamiento y finanzas</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <KpiMiniCard
          icon="mdi:clipboard-text-outline"
          label="Servicio más solicitado"
          value={topServices[0]?.name || "—"}
          sub={`${topServices[0]?.total || 0} solicitudes`}
        />
        <KpiMiniCard
          icon="mdi:shape-outline"
          label="Categoría más utilizada"
          value={topCategories[0]?.category || "—"}
          sub={`${topCategories[0]?.total || 0} solicitudes`}
        />
        <KpiMiniCard
          icon="mdi:shield-check-outline"
          label="Prestador más activo"
          value={topProviders[0]?.name || "—"}
          sub={`${topProviders[0]?.total || 0} servicios`}
        />
      </div>

      {/* FINANZAS */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-[#3D3D3D]">Finanzas</h2>

        <div className="bg-white rounded-[22px] shadow-[0_10px_22px_rgba(0,0,0,0.06)] border border-black/5 overflow-hidden">
          {/* Header card */}
            <div className="px-6 pt-5 pb-4 border-b border-black/5 flex items-center justify-between gap-4">            
            <div className="flex items-center gap-3">

              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-black/45">Comisión total generada</p>

                <p className="mt-1 text-[30px] leading-none font-extrabold text-[#3D3D3D]">
                  ${totalCommission.toLocaleString("es-AR")}
                </p>

                <p className="mt-2 text-[12px] text-black/45">{paidServicesCount} servicios pagos</p>
              </div>
            </div>

            <button
              onClick={() => setShowMovements(!showMovements)}
              className="shrink-0 self-start mt-[-2px] h-10 px-4 rounded-full bg-black/5 hover:bg-black/[0.07] transition text-[12px] font-extrabold text-[#3D3D3D] inline-flex items-center gap-2"
            >
              <span>{showMovements ? "Ocultar" : "Ver"}</span>
              <Icon icon={showMovements ? "mdi:chevron-up" : "mdi:chevron-down"} className="h-5 w-5 text-black/45" />
            </button>
          </div>

          {/* Movimientos */}
          {showMovements && (
            <div className="divide-y divide-black/5">
              {commissionMovements.map((m) => (
                <div key={m.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] text-black/45">{new Date(m.date).toLocaleDateString("es-AR")}</p>
                    <p className="mt-1 text-[13px] font-extrabold text-[#3D3D3D] truncate">{m.serviceName}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[12px] text-black/45">${Number(m.totalAmount).toLocaleString("es-AR")}</p>
                    <p className="mt-1 text-[13px] font-extrabold text-[#1E2F5D]">
                      + ${Number(m.commission).toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
              ))}

              {commissionMovements.length === 0 && (
                <div className="px-6 py-6">
                  <p className="text-[13px] text-black/45">No hay comisiones registradas.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EVOLUCIÓN (sin barrita) */}
      <div className="space-y-6">
        <h2 className="text-lg font-extrabold text-[#3D3D3D]">Evolución mensual</h2>

        <EvolutionBlock title="Solicitudes" data={requestsByMonth} valueKey="totalRequests" icon="mdi:clipboard-text-outline" />
        <EvolutionBlock title="Prestadores activos" data={requestsByMonth} valueKey="activeProviders" icon="mdi:account-group-outline" />
        <EvolutionBlock title="Reseñas" data={requestsByMonth} valueKey="totalReviews" icon="mdi:star-outline" />
      </div>
    </div>
  );
}

/* ================= COMPONENTES UI ================= */

function KpiMiniCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-[22px] shadow-[0_10px_22px_rgba(0,0,0,0.06)] border border-black/5">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="h-11 w-11 rounded-full grid place-items-center bg-[#E9EEF8] border border-[#1E2F5D]/10 shrink-0">
          <Icon icon={icon} className="h-6 w-6 text-[#1E2F5D]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-black/45">{label}</p>
          <p className="mt-1 text-[15px] font-extrabold text-[#1E2F5D] truncate">{value}</p>
          {sub ? <p className="mt-1 text-[12px] text-black/35">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EvolutionBlock({ title, data, valueKey, icon }) {
  const safe = Array.isArray(data) ? data : [];
  const max = Math.max(1, ...safe.map((m) => Number(m?.[valueKey] || 0)));

  return (
    <div className="bg-white rounded-[22px] shadow-[0_10px_22px_rgba(0,0,0,0.06)] border border-black/5 overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-black/5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full grid place-items-center bg-black/5 shrink-0">
          <Icon icon={icon} className="h-5 w-5 text-black/55" />
        </div>
        <h3 className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</h3>
      </div>

      <div className="divide-y divide-black/5">
        {safe.map((m) => {
          const val = Number(m?.[valueKey] || 0);
          const pct = Math.round((val / max) * 100);

          return (
            <div key={`${title}-${m.month}`} className="px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-[13px] text-black/55">{m.label}</p>

              <span className="inline-flex items-center gap-2">
                <span className="text-[13px] font-extrabold text-[#1E2F5D]">{val}</span>
                <span className="text-[11px] font-semibold text-black/35">{pct}%</span>
              </span>
            </div>
          );
        })}

        {safe.length === 0 && (
          <div className="px-6 py-6">
            <p className="text-[13px] text-black/45">Todavía no hay datos para mostrar.</p>
          </div>
        )}
      </div>
    </div>
  );
}