import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { FiInfo } from "react-icons/fi";
import Loading from "../../components/Loading";

export default function Bookings() {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const statuses = [
    "all",
    "solicitada",
    "aceptada",
    "cotizada",
    "agendada",
    "completada",
    "incumplida",
    "cancelada",
    "rechazada",
  ];

  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    const channel = supabase
      .channel("admin-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => mountedRef.current && loadData()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: reqData } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: profData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (!mountedRef.current) return;

      setRequests(reqData || []);
      setProfiles(profData || []);
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setError("Error cargando solicitudes");
    } finally {
      mountedRef.current && setLoading(false);
    }
  }

  const computedRequests = useMemo(() => {
    return requests.map((r) => {
      const client = profiles.find((p) => p.id === r.client_id);

      return {
        ...r,
        clientName: client?.full_name || client?.email || "Usuario",
        clientEmail: client?.email || "",
        searchKey: `${client?.full_name || ""} ${client?.email || ""}`.toLowerCase(),
      };
    });
  }, [requests, profiles]);

  const filtered = computedRequests.filter((r) => {
    const matchStatus =
      statusFilter === "all" ? true : r.status === statusFilter;

    const matchSearch = r.searchKey.includes(search.toLowerCase());

    return matchStatus && matchSearch;
  });

  if (loading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#3D3D3D]">
            Supervisión de solicitudes
          </h1>
          <p className="mt-4 mb-4 text-md text-black/50 mr-10">
            Listado y gestión de las solicitudes realizadas en la plataforma
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="overflow-x-auto mb-6 no-scrollbar">
        <div className="flex gap-3 w-max pr-2">
          {statuses.map((status) => {
            const isActive = statusFilter === status;

            const count =
              status === "all"
                ? requests.length
                : requests.filter((r) => r.status === status).length;

            return (
              <FilterChip
                key={status}
                active={isActive}
                onClick={() => setStatusFilter(status)}
                label={
                  status === "all"
                    ? "Todos"
                    : capitalize(status)
                }
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* BUSCADOR */}
      <input
        type="text"
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-black/10 rounded-full px-4 py-3 text-sm shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none mb-4"
      />

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-black/50 text-sm">
            Solicitud no encontrada
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-md text-gray-500">
              <tr>
                <th className="p-3 text-left">Cliente</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Info</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium text-black">
                      {r.clientName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.clientEmail}
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() =>
                        navigate(`/admin/bookings/${r.id}`)
                      }
                    >
                      <FiInfo size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}

/* ================= COMPONENTES ================= */

function FilterChip({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]",
        active
          ? "bg-[#1E2F5D] text-white shadow-[0_6px_18px_rgba(30,47,93,0.18)]"
          : "bg-white text-[#3D3D3D] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-black/10",
      ].join(" ")}
    >
      <span>{label}</span>

      <span
        className={[
          "rounded-full px-2 py-[2px] text-[12px]",
          active
            ? "bg-white/20 text-white"
            : "bg-black/[0.04] text-black/50",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyle(
        status
      )}`}
    >
      {capitalize(status)}
    </span>
  );
}

/* ================= HELPERS ================= */

function norm(str) {
  return (str || "").toLowerCase();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function statusStyle(status) {
  const s = norm(status);
  const map = {
    solicitada: "bg-[#FFF5CC] text-[#7A5B00] border border-[#F3E4A5]",
    cotizada: "bg-[#F1E8FF] text-[#4B2A8A] border border-[#E3D6FF]",
    aceptada: "bg-[#E9FFF6] text-[#0F6B3D] border border-[#CFF4E3]",
    agendada: "bg-[#EAF2FF] text-[#1E2F5D] border border-[#CFE0FF]",
    rechazada: "bg-[#FFE6EA] text-[#9B1C1C] border border-[#FFC9D3]",
    cancelada: "bg-black/[0.05] text-black/70 border border-black/10",
    completada: "bg-[#E8FFF2] text-[#0F6B3D] border border-[#CFF4E3]",
    incumplida: "bg-[#FFE6EA] text-[#9B1C1C] border border-[#FFC9D3]",
  };
  return map[s] || "bg-black/[0.05] text-black/70 border border-black/10";
}