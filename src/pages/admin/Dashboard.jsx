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
  const [accountOpen, setAccountOpen] = useState(false);

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
function MetricCard({ icon, label, value, hint }) {
  return (
    <div className="bg-white rounded-[22px] shadow-[0_10px_22px_rgba(0,0,0,0.06)] border border-black/5">
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Icono estilo orby (círculo + outline) */}
        <div className="h-11 w-11 rounded-full grid place-items-center bg-[#E9EEF8] border border-[#1E2F5D]/10">
          <Icon icon={icon} className="h-6 w-6 text-[#1E2F5D]" />
        </div>

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-black/45">{label}</p>
          <p className="mt-1 text-[15px] font-extrabold text-[#3D3D3D] truncate">
            {value}
          </p>
          {hint ? <p className="mt-1 text-[12px] text-black/35">{hint}</p> : null}
        </div>

        {/* Flechita */}
        <div className="h-10 w-10 rounded-full bg-black/5 grid place-items-center">
          <Icon icon="mdi:chevron-right" className="h-5 w-5 text-black/45" />
        </div>
      </div>
    </div>
  );
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
        {/* Cuenta / menú */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Opciones"
            title="Opciones"
          >
            <Icon icon="mdi:dots-horizontal" className="h-6 w-6 text-black/45" />
          </button>

          {/* Popover */}
          {accountOpen && (
            <>
              {/* overlay click para cerrar */}
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setAccountOpen(false)}
                aria-label="Cerrar menú"
              />

              <div className="absolute right-0 mt-3 z-50 w-[280px] rounded-[18px] bg-white border border-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.18)] overflow-hidden">
                {/* Header mini */}
                <div className="px-4 py-3 flex items-center gap-3 bg-[#F5F7FB] border-b border-black/5">
                  <div className="h-10 w-10 rounded-full bg-[#F5F5F5] border border-black/10 grid place-items-center">
                    <Icon icon="mdi:account-outline" className="h-6 w-6 text-black/45" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-[#3D3D3D] truncate">
                      {user?.user_metadata?.full_name || "Administrador"}
                    </p>
                    <p className="text-[12px] text-black/45 truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      handleLogout(); // ✅ misma lógica
                    }}
                    className="w-full flex items-center gap-3 rounded-[14px] px-3 py-3 hover:bg-black/5 transition"
                  >
                    <div className="h-9 w-9 rounded-full bg-black/5 grid place-items-center">
                      <Icon icon="mdi:logout" className="h-5 w-5 text-[#3D3D3D]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-extrabold text-[#3D3D3D]">Cerrar sesión</p>
                      <p className="text-[12px] text-black/45">Salir del panel de administración</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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

        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            icon="mdi:clipboard-text-outline"
            label="Servicio más solicitado"
            value={stats.topService || "Sin datos"}
            hint="Top del mes"
          />
          <MetricCard
            icon="mdi:shape-outline"
            label="Categoría más activa"
            value={stats.topCategory || "Sin datos"}
            hint={`Total categorías: ${categoriesCount}`}
          />
          <MetricCard
            icon="mdi:shield-check-outline"
            label="Prestador más activo"
            value={stats.topProvider || "Sin datos"}
            hint="Mayor volumen"
          />
        </div>
      </div>
    </div>
  );
}

