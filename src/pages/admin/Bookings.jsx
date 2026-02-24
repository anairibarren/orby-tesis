// src/pages/admin/Bookings.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { Icon } from "@iconify/react";
import { FiInfo } from "react-icons/fi";

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

/* ✅ Chips iguales a Requests.jsx (con contador) */
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
        {Number.isFinite(Number(count)) ? Number(count) : 0}
      </span>
    </button>
  );
}

export default function Bookings() {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  const mountedRef = useRef(true);
  const profilesLoadedRef = useRef(false);

  const PAGE_SIZE = 10;

  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true); // solo primera carga
  const [isFetching, setIsFetching] = useState(false); // cambios de página/filtros

  // paginación
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ✅ counts para chips
  const [statusCounts, setStatusCounts] = useState({}); // { solicitada: 10, ... }
  const [countsLoading, setCountsLoading] = useState(false);

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

  function norm(str) {
    return (str || "").toLowerCase();
  }
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ✅ Trae counts por status (para mostrar en chips)
  async function loadStatusCounts({ silent = true } = {}) {
    try {
      if (!silent) setCountsLoading(true);

      // Nota: PostgREST no trae "group by" directo con el client de supabase de forma simple.
      // Para el admin (volumen chico/mediano), pedimos solo la columna status y calculamos acá.
      const { data, error } = await supabase
        .from("service_requests")
        .select("status");

      if (error) throw error;
      if (!mountedRef.current) return;

      const map = {};
      for (const row of data || []) {
        const s = norm(row?.status);
        if (!s) continue;
        map[s] = (map[s] || 0) + 1;
      }
      setStatusCounts(map);
    } catch (e) {
      // si falla, no rompemos la vista (chips quedan en 0)
      console.warn("No se pudieron cargar counts de estados:", e?.message || e);
      if (mountedRef.current) setStatusCounts({});
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setCountsLoading(false);
    }
  }

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setIsFetching(true);
      else setLoading(true);

      // ✅ pedir solo la página actual + count
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("service_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      // ✅ filtro de estado server-side
      if (statusFilter !== "all") q = q.eq("status", statusFilter);

      const { data: reqData, error: reqError, count } = await q;
      if (reqError) throw reqError;

      // ✅ perfiles: cargar una sola vez (cache)
      if (!profilesLoadedRef.current) {
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select("id, full_name, email");

        if (profError) throw profError;
        if (!mountedRef.current) return;

        setProfiles(profData || []);
        profilesLoadedRef.current = true;
      }

      if (!mountedRef.current) return;

      setRequests(reqData || []);
      setTotal(Number(count || 0));
      setError(null);

      // ✅ actualizar counts para chips (silencioso)
      loadStatusCounts({ silent: true });
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setError("Error cargando solicitudes");
    } finally {
      if (!mountedRef.current) return;
      if (silent) setIsFetching(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    // primera carga
    loadData({ silent: false });
    loadStatusCounts({ silent: true });

    const channel = supabase
      .channel("admin-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => mountedRef.current && loadData({ silent: true })
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ al cambiar página o filtro -> refetch silencioso
  useEffect(() => {
    if (!mountedRef.current) return;
    if (loading) return; // evita doble fetch durante primera carga
    loadData({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // ✅ si cambia el buscador -> volvemos a página 1 (UX)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

  // ✅ búsqueda: filtra SOLO la página (rápido)
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return computedRequests.filter((r) => r.searchKey.includes(s));
  }, [computedRequests, search]);

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

  function StatusBadge({ status }) {
    return (
      <span
        className={[
          "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-extrabold",
          statusStyle(status),
        ].join(" ")}
      >
        {capitalize(status)}
      </span>
    );
  }

  // ✅ Botón info: queda más “a la izquierda” dentro de su columna
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

  // ✅ counts para chips (sin depender del filtro)
  const chipCounts = useMemo(() => {
    const all = Object.values(statusCounts || {}).reduce((acc, n) => acc + (Number(n) || 0), 0);
    return {
      all,
      solicitada: statusCounts?.solicitada || 0,
      aceptada: statusCounts?.aceptada || 0,
      cotizada: statusCounts?.cotizada || 0,
      agendada: statusCounts?.agendada || 0,
      completada: statusCounts?.completada || 0,
      incumplida: statusCounts?.incumplida || 0,
      cancelada: statusCounts?.cancelada || 0,
      rechazada: statusCounts?.rechazada || 0,
    };
  }, [statusCounts]);

  if (loading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">
            Supervisión de solicitudes
          </h1>
          <p className="mt-1 text-[13px] text-black/45">
            Listado y gestión de las solicitudes realizadas.
          </p>
        </div>
      </div>

      {/* CHIPS (✅ ahora iguales a Requests.jsx, con contador) */}
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
          {statuses.map((st) => {
            const isActive = statusFilter === st;
            const label = st === "all" ? "Todos" : capitalize(st);
            const count = chipCounts[st] ?? 0;

            return (
              <FilterChip
                key={st}
                active={isActive}
                label={label}
                count={count}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
              />
            );
          })}

          {/* ✅ opcional: indicador muy sutil cuando está recalculando counts */}
          {countsLoading ? (
            <span className="ml-2 text-[12px] text-black/35 self-center">Actualizando…</span>
          ) : null}
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
        {filtered.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-black/[0.04] grid place-items-center">
              <Icon icon="mdi:clipboard-text-outline" className="h-7 w-7 text-black/35" />
            </div>

            <p className="mt-4 text-[15px] font-extrabold text-[#3D3D3D]">
              {statusFilter === "all"
                ? "No hay solicitudes para mostrar"
                : `No hay solicitudes ${capitalize(statusFilter)}`}
            </p>

            <p className="mt-2 text-[12px] text-black/45 leading-snug max-w-[320px] mx-auto">
              {search.trim()
                ? "Probá con otro nombre/email o borrá el buscador."
                : statusFilter === "all"
                ? "Cuando se creen nuevas solicitudes, van a aparecer acá."
                : "Cuando haya solicitudes en este estado, van a aparecer acá."}
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
                  <th className="p-3 text-left font-semibold w-[60%]">Cliente</th>
                  <th className="p-3 text-center font-semibold w-[28%]">Estado</th>
                  <th className="p-3 text-center font-semibold w-[72px]">Info</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="p-3 w-[60%]">
                      <div className="font-extrabold text-[#3D3D3D] leading-snug truncate">
                        {r.clientName}
                      </div>
                      <div className="mt-0.5 text-[12px] text-black/45 truncate">
                        {r.clientEmail}
                      </div>
                    </td>

                    <td className="p-3 text-center w-[28%]">
                      <StatusBadge status={r.status} />
                    </td>

                    {/* ✅ más a la izquierda: padding-left menor y alineación start */}
                    <td className="py-3 pr-3 pl-4 w-[72px]">
                      <div className="flex items-center justify-start translate-x-1">
                        <InfoIconButton onClick={() => navigate(`/admin/bookings/${r.id}`)} />
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