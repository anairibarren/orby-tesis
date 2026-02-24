import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { getAdminDashboardStats } from "../../services/adminStats";
import { Icon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import Loading from "../../components/Loading";

const INITIAL_STATS = {
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

export default function Dashboard() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState(INITIAL_STATS);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  const safeLoadStats = useCallback(async () => {
    try {
      const data = await getAdminDashboardStats();
      if (!mountedRef.current) return;
      setStats({ ...INITIAL_STATS, ...data });
    } catch (e) {
      console.error("Error cargando estadísticas:", e);
      if (mountedRef.current) setStats(INITIAL_STATS);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  async function loadCategoriesCount() {
    const { data, error } = await supabase.from("service_catalog").select("category");
    if (!error && data) {
      const unique = new Set(data.map((s) => s.category));
      setCategoriesCount(unique.size);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    safeLoadStats();
    loadCategoriesCount();

    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => mountedRef.current && safeLoadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => mountedRef.current && safeLoadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => mountedRef.current && safeLoadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_catalog" },
        () => mountedRef.current && loadCategoriesCount()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [safeLoadStats]);

  if (loading) return <Loading />;

  const totalRequests = Object.values(stats.requestsByStatus || {}).reduce((a, b) => a + b, 0);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-[#3D3D3D]">Panel de Administración</h1>
          <p className="mt-1 text-md text-black/50">Monitoreo general de la plataforma</p>
        </div>

        {/* Botón de cerrar sesión estilo "círculo con sombra" */}
        <button
          type="button"
          onClick={handleLogout}
          className="h-11 w-11 rounded-full bg-white border border-black/10 shadow grid place-items-center"
        >
          <Icon icon="mdi:logout" className="text-2xl text-[#3D3D3D]" />
        </button>
      </div>

      {/* 🔢 CARDS PRINCIPALES */}
      <div className="grid grid-cols-2 gap-5">
        <MiniStatCard label="Usuarios" value={stats.totalUsers} to="/admin/users" />
        <MiniStatCard label="Prestadores" value={stats.totalProviders} to="/admin/users?role=provider" />
        <MiniStatCard label="Servicios" value={stats.totalServices} to="/admin/services" />
        <MiniStatCard label="Solicitudes" value={totalRequests} to="/admin/bookings" />
      </div>

      {/* 📊 INDICADORES DESTACADOS */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-[#3D3D3D]">Métricas</h2>
          <button
            onClick={() => navigate("/admin/metrics")}
            className="text-sm text-gray-500 font-medium flex items-center gap-1"
          >
            Ver más <Icon icon="mdi:arrow-right" />
          </button>
        </div>

        <div className="bg-white rounded-[22px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] divide-y">
          <MetricRow
            icon="mdi:clipboard-text-outline"
            label="Servicio más solicitado"
            value={stats.topService || "Sin datos"}
          />
          <MetricRow
            icon="mdi:shape-outline"
            label="Categoría más activa"
            value={stats.topCategory || "Sin datos"}
          />
          <MetricRow
            icon="mdi:account-outline"
            label="Prestador más activo"
            value={stats.topProvider || "Sin datos"}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- COMPONENTES ---------- */

function MiniStatCard({ label, value, to }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(to)}
      className="relative bg-white rounded-[22px] p-5 shadow-[0_4px_14px_rgba(0,0,0,0.08)] cursor-pointer transition hover:shadow-lg"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(to);
        }}
        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/5 grid place-items-center"
      >
        <Icon icon="mdi:arrow-top-right" className="h-4 w-4 text-black/50" />
      </button>

      <p className="text-sm font-medium text-black/45">{label}</p>
      <p className="mt-4 text-3xl font-extrabold text-[#1E2F5D]">{value ?? 0}</p>
    </div>
  );
}

/* ---------- ROW DE MÉTRICAS CON ICONO ---------- */
function MetricRow({ icon, label, value }) {
  return (
    <div className="px-6 py-5 gap-3 flex items-center justify-between relative">
      {/* Icono de fondo */}
      {icon && (
        <Icon
          icon={icon}
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(44,72,148,0.44)]"
        />
      )}

      <p className="text-sm text-black/50 pl-4">{label}</p>
      <p className="text-sm font-semibold text-right text-[#3D3D3D]">{value}</p>
    </div>
  );
}