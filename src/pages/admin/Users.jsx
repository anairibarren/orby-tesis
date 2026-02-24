import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { FiInfo } from "react-icons/fi";
import Loading from "../../components/Loading";

export default function Users() {
  const { user, loading: authLoading } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get("role");
    if (role === "provider" || role === "client") {
      setFilter(role);
    } else {
      setFilter("all");
    }
  }, [location.search]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel("realtime-profiles-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (!active) return;
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const counts = useMemo(() => ({
    all: users.length,
    client: users.filter((u) => u.role === "client").length,
    provider: users.filter((u) => u.role === "provider").length,
    admin: users.filter((u) => u.role === "admin").length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => (filter === "all" ? true : u.role === filter))
      .filter((u) =>
        (u.full_name || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (u.email || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  }, [users, filter, search]);

  if (loading) return <Loading />;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#3D3D3D]">
          Gestión de usuarios
        </h1>
        <p className="mt-2 mb-4 text-md text-black/50 mr-20">
          Administración de clientes, prestadores y administradores
        </p>
      </div>

      {/* FILTROS MODERNOS */}
      <div className="overflow-x-auto mb-6 no-scrollbar">
        <div className="flex gap-3 w-max pr-2">
          {[
            { key: "all", label: "Todos", count: counts.all },
            { key: "client", label: "Clientes", count: counts.client },
            { key: "provider", label: "Prestadores", count: counts.provider },
            { key: "admin", label: "Admins", count: counts.admin },
          ].map((item) => (
            <FilterChip
              key={item.key}
              active={filter === item.key}
              onClick={() => setFilter(item.key)}
              label={item.label}
              count={item.count}
            />
          ))}
        </div>
      </div>

      {/* BUSCADOR */}
      <input
        type="text"
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-black/10 rounded-full px-4 py-3 text-sm mb-4 focus:outline-none shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
      />

      {/* TABLA */}
      <div className="bg-white w-[102%] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-x-auto no-scrollbar">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-black/50 mt-2">
              Usuario no encontrado
            </p>
          </div>
        ) : (
          <table className="min-w-[400px] w-full text-sm">
            <thead className="bg-gray-50 text-md text-gray-500">
              <tr>
                <th className="p-3 text-left w-2/3">Usuario</th>
                <th className="p-3 text-center w-1/6">Rol</th>
                <th className="p-3 text-center w-1/6">Info</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium text-black">
                      {u.full_name || "Sin nombre"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {u.email}
                    </div>
                  </td>

                  <td className="p-2 text-center">
                    <RoleBadge role={u.role} />
                  </td>

                  <td className="p-2 text-center">
                    <button
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="text-black"
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
          ? "bg-[#1E2F5D] text-white"
          : "bg-white text-[#3D3D3D] border border-black/10",
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

function RoleBadge({ role }) {
  const roleMap = {
    admin: "Admin",
    provider: "Prestador",
    client: "Cliente",
  };

  const styles = {
    admin: "bg-[#F1E8FF] text-[#4B2A8A] border border-[#E3D6FF]",
    provider: "bg-[#E9FFF6] text-[#0F6B3D] border border-[#CFF4E3]",
    client: "bg-[#EAF2FF] text-[#1E2F5D] border border-[#CFE0FF]",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${
        styles[role] || "bg-gray-100 text-gray-700"
      }`}
    >
      {roleMap[role] || role}
    </span>
  );
}