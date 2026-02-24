// src/pages/admin/Users.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { Icon } from "@iconify/react";
import { FiInfo } from "react-icons/fi";

/* ---------------- UI helpers ---------------- */
function PagerIconButton({ icon, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={[
        "h-11 w-11 rounded-full border border-black/10 grid place-items-center transition",
        "active:scale-[0.99]",
        disabled
          ? "bg-black/[0.04] text-black/35 cursor-not-allowed active:scale-100"
          : "bg-white text-black/60 shadow-[0_8px_18px_rgba(0,0,0,0.02)] hover:bg-black/[0.02]",
      ].join(" ")}
    >
      <Icon icon={icon} className="h-6 w-6" />
    </button>
  );
}

function InfoIconButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 w-10 rounded-full bg-black/[0.04] border border-black/10 grid place-items-center active:scale-[0.99] transition"
      aria-label="Ver detalle"
      title="Ver detalle"
    >
      <FiInfo size={18} className="text-black/60" />
    </button>
  );
}

function norm(str) {
  return (str || "").toLowerCase();
}

function roleStyle(role) {
  const s = norm(role);
  const map = {
    admin: "bg-[#F1E8FF] text-[#4B2A8A] border border-[#E3D6FF]",
    provider: "bg-[#E9FFF6] text-[#0F6B3D] border border-[#CFF4E3]",
    client: "bg-[#EAF2FF] text-[#1E2F5D] border border-[#CFE0FF]",
  };
  return map[s] || "bg-black/[0.05] text-black/70 border border-black/10";
}

function RoleBadge({ role }) {
  const labelMap = {
    admin: "Admin",
    provider: "Prestador",
    client: "Cliente",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-extrabold",
        roleStyle(role),
      ].join(" ")}
    >
      {labelMap[role] || role || "—"}
    </span>
  );
}

function FilterChip({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]",
        active
          ? "bg-[#1E2F5D] text-white shadow-[0_4px_12px_rgba(30,47,93,0.16)]"
          : "bg-white text-[#3D3D3D] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-black/10",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-2 py-[2px] text-[12px]",
          active ? "bg-white/20 text-white" : "bg-black/[0.04] text-black/50",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

/* ---------------- Page ---------------- */
export default function Users() {
  const { user, loading: authLoading } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  const mountedRef = useRef(true);

  const PAGE_SIZE = 10;

  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true); // primera carga
  const [isFetching, setIsFetching] = useState(false); // paginado/filtros
  const [error, setError] = useState(null);

  // paginación
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ✅ NUEVO: contadores reales por chip (siempre visibles)
  const [counts, setCounts] = useState({
    all: 0,
    client: 0,
    provider: 0,
    admin: 0,
  });

  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  // Lee role desde querystring (?role=provider|client|admin)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get("role");
    if (role === "provider" || role === "client" || role === "admin") {
      setFilter(role);
      setPage(1);
    } else {
      setFilter("all");
      setPage(1);
    }
  }, [location.search]);

  async function loadUsers({ silent = false } = {}) {
    try {
      if (silent) setIsFetching(true);
      else setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      // ✅ filtro server-side
      if (filter !== "all") q = q.eq("role", filter);

      const { data, error: qErr, count } = await q;
      if (qErr) throw qErr;

      if (!mountedRef.current) return;
      setUsers(data || []);
      setTotal(Number(count || 0));
      setError(null);
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setError("No se pudieron cargar los usuarios");
    } finally {
      if (!mountedRef.current) return;
      if (silent) setIsFetching(false);
      else setLoading(false);
    }
  }

  // ✅ NUEVO: contadores reales (head:true => no trae filas, solo count)
  async function loadCounts() {
    try {
      const [allRes, clientRes, providerRes, adminRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "provider"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      ]);

      const err = allRes.error || clientRes.error || providerRes.error || adminRes.error;
      if (err) throw err;

      if (!mountedRef.current) return;

      setCounts({
        all: Number(allRes.count || 0),
        client: Number(clientRes.count || 0),
        provider: Number(providerRes.count || 0),
        admin: Number(adminRes.count || 0),
      });
    } catch (e) {
      console.error("loadCounts error:", e);
    }
  }

  // primera carga + realtime
  useEffect(() => {
    mountedRef.current = true;
    loadUsers({ silent: false });
    loadCounts(); // ✅ NUEVO

    const channel = supabase
      .channel("realtime-profiles-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (!mountedRef.current) return;
          loadUsers({ silent: true });
          loadCounts(); // ✅ NUEVO
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // al cambiar página o filtro: refetch silencioso
  useEffect(() => {
    if (!mountedRef.current) return;
    if (loading) return;
    loadUsers({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  // si cambia el search: volvemos a página 1
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // búsqueda sobre la página actual (como Bookings)
  const filteredUsers = useMemo(() => {
    const s = (search || "").toLowerCase().trim();
    if (!s) return users;

    return users.filter((u) => {
      const key = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
      return key.includes(s);
    });
  }, [users, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)),
    [total]
  );
  const canPrev = page > 1 && !isFetching;
  const canNext = page < totalPages && !isFetching;

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0–0";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} de ${total}`;
  }, [page, total]);

  if (loading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">
            Gestión de usuarios
          </h1>
          <p className="mt-1 text-[13px] text-black/45">
            Administración de clientes, prestadores y administradores.
          </p>
        </div>
      </div>

      {/* CHIPS */}
      <div className="mt-2 -mx-6 px-6 overflow-x-auto hide-scrollbar py-3 scroll-px-6 mb-3">
        <style>{`
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        <div className="flex gap-3 w-max pr-6">
          {[
            { key: "all", label: "Todos", count: counts.all },
            { key: "client", label: "Clientes", count: counts.client },
            { key: "provider", label: "Prestadores", count: counts.provider },
            { key: "admin", label: "Admins", count: counts.admin },
          ].map((item) => (
            <FilterChip
              key={item.key}
              active={filter === item.key}
              onClick={() => {
                setFilter(item.key);
                setPage(1);
              }}
              label={item.label}
              count={item.count}
            />
          ))}
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="relative mb-4">
        <Icon
          icon="mdi:magnify"
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-black/35"
        />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={[
            "w-full rounded-full bg-white",
            "py-[14px] px-[20px] pl-[52px]",
            "text-[14px] font-medium text-[#3D3D3D] placeholder:text-black/35",
            "border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.02)]",
            "outline-none focus:border-black/20 focus:ring-4 focus:ring-black/5 transition",
          ].join(" ")}
        />
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-black/[0.04] grid place-items-center">
              <Icon icon="mdi:account-search-outline" className="h-7 w-7 text-black/35" />
            </div>

            <p className="mt-4 text-[15px] font-extrabold text-[#3D3D3D]">
              Usuario no encontrado
            </p>

            <p className="mt-2 text-[12px] text-black/45 leading-snug max-w-[320px] mx-auto">
              Probá con otro nombre/email o borrá el buscador.
            </p>

            {search.trim() ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 h-[46px] px-5 rounded-full bg-white border border-black/10 text-[14px] font-extrabold text-[#3D3D3D] shadow-[0_8px_18px_rgba(0,0,0,0.02)] active:scale-[0.99] transition"
              >
                Limpiar búsqueda
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 text-[13px] text-gray-500">
                <tr>
                  <th className="p-3 text-left font-semibold w-[60%]">Usuario</th>
                  <th className="p-3 text-center font-semibold w-[28%]">Rol</th>
                  <th className="p-3 text-center font-semibold w-[72px]">Info</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-black/5">
                    <td className="p-3 w-[60%]">
                      <div className="font-extrabold text-[#3D3D3D] leading-snug truncate">
                        {u.full_name || "Sin nombre"}
                      </div>
                      <div className="mt-0.5 text-[12px] text-black/45 truncate">
                        {u.email || ""}
                      </div>
                    </td>

                    <td className="p-3 text-center w-[28%]">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="py-3 pr-3 pl-4 w-[72px]">
                      <div className="flex items-center justify-start translate-x-1">
                        <InfoIconButton onClick={() => navigate(`/admin/users/${u.id}`)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer paginación */}
            <div className="p-4 border-t border-black/10 bg-white flex items-center justify-between gap-3">
              <PagerIconButton
                icon="mdi:chevron-left"
                title="Anterior"
                onClick={() => canPrev && setPage((p) => p - 1)}
                disabled={!canPrev}
              />

              <p className="text-[12px] text-black/45">
                Mostrando <span className="font-semibold text-black/70">{rangeLabel}</span>
                {isFetching ? <span className="ml-2 text-black/35">Actualizando…</span> : null}
              </p>

              <PagerIconButton
                icon="mdi:chevron-right"
                title="Siguiente"
                onClick={() => canNext && setPage((p) => p + 1)}
                disabled={!canNext}
              />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}