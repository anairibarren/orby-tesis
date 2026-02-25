// src/pages/admin/Reviews.jsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";

import { Icon } from "@iconify/react";
import { FiInfo } from "react-icons/fi";
import { MdStar } from "react-icons/md";

/* ============ UI helpers ============ */
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

function Sheet({ open, onClose, title, subtitle, children, disabledClose = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={() => !disabledClose && onClose?.()}
        aria-label="Cerrar"
      />
      <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
        <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10 animate-sheetUp">
          <div className="pt-3 flex justify-center">
            <div className="h-1.5 w-14 rounded-full bg-black/10" />
          </div>

          <div className="px-6 pt-4 pb-4">
            <h3 className="text-[18px] font-extrabold text-[#3D3D3D]">{title}</h3>
            {subtitle ? <p className="mt-1 text-[12px] text-black/45">{subtitle}</p> : null}
          </div>

          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .animate-sheetUp { animation: sheetUp .18s ease-out both; }
      `}</style>
    </div>
  );
}

export default function Reviews() {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  const PAGE_SIZE = 20;

  const [reviews, setReviews] = useState([]);

  // loading
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // toolbar search
  const [search, setSearch] = useState("");

  // applied filters
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState("new");

  // sheet filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftRating, setDraftRating] = useState("all");
  const [draftSort, setDraftSort] = useState("new");

  // pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (ratingFilter !== "all") n += 1;
    if (sort !== "new") n += 1;
    return n;
  }, [ratingFilter, sort]);

  function openFilters() {
    setDraftRating(ratingFilter);
    setDraftSort(sort);
    setFiltersOpen(true);
  }

  function closeFilters() {
    setFiltersOpen(false);
  }

  function applyFilters() {
    setRatingFilter(draftRating);
    setSort(draftSort);
    setPage(1);
    setFiltersOpen(false);
  }

  function clearDraftFilters() {
  // resetea draft
  setDraftRating("all");
  setDraftSort("new");

  // aplica inmediatamente
  setRatingFilter("all");
  setSort("new");
  setPage(1);

  // cierra sheet
  setFiltersOpen(false);
}

  async function loadReviews({ silent = false } = {}) {
    if (silent) setIsFetching(true);
    else setInitialLoading(true);

    let orderCol = "created_at";
    let ascending = false;
    if (sort === "old") ascending = true;
    if (sort === "high" || sort === "low") {
      orderCol = "rating";
      ascending = sort === "low";
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("reviews")
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        client:profiles!reviews_client_id_fkey ( id, full_name ),
        provider:profiles!reviews_provider_id_fkey ( id, full_name )
      `,
        { count: "exact" }
      )
      .order(orderCol, { ascending })
      .range(from, to);

    if (ratingFilter !== "all") q = q.eq("rating", Number(ratingFilter));

    const { data, error, count } = await q;

    if (!error) {
      const arr = data || [];
      const s = search.trim().toLowerCase();
      const filteredPage =
        !s
          ? arr
          : arr.filter((r) => {
              const c = String(r?.client?.full_name || "").toLowerCase();
              const p = String(r?.provider?.full_name || "").toLowerCase();
              const cm = String(r?.comment || "").toLowerCase();
              return c.includes(s) || p.includes(s) || cm.includes(s);
            });

      setReviews(filteredPage);
      setTotal(Number(count || 0));
    }

    if (silent) setIsFetching(false);
    else setInitialLoading(false);
  }

  // initial + realtime
  useEffect(() => {
    if (!user || !isAdmin(user)) return;

    let alive = true;

    (async () => {
      if (!alive) return;
      await loadReviews({ silent: false });
    })();

    const channel = supabase
      .channel("reviews-realtime-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        if (!alive) return;
        loadReviews({ silent: true });
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // page / applied filters / search => silent refresh
  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    if (initialLoading) return;
    loadReviews({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ratingFilter, sort, search]);

  const totalPages = useMemo(() => {
    const t = Math.max(0, Number(total || 0));
    return Math.max(1, Math.ceil(t / PAGE_SIZE));
  }, [total]);

  const canPrev = page > 1 && !isFetching;
  const canNext = page < totalPages && !isFetching;

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0–0";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} de ${total}`;
  }, [page, total]);

  const canApply =
    draftRating !== ratingFilter || draftSort !== sort;

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  if (initialLoading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">
            Supervisión de reseñas
          </h1>
          <p className="mt-1 text-[13px] text-black/45">
            Gestión y monitoreo de valoraciones realizadas en la plataforma
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="mt-5 flex items-center gap-3">
        <div className="relative flex-1">
          <Icon
            icon="mdi:magnify"
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-black/35"
          />
          <input
            type="text"
            placeholder="Buscar por cliente o prestador..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className={[
              "w-full rounded-full bg-white",
              "py-[14px] px-[20px] pl-[52px]",
              "text-[14px] font-medium text-[#3D3D3D] placeholder:text-black/35",
              "border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.02)]",
              "outline-none focus:border-black/20 focus:ring-4 focus:ring-black/5 transition",
            ].join(" ")}
          />
        </div>

        <button
          type="button"
          onClick={openFilters}
          className={[
            "relative h-[52px] w-[52px] rounded-full border border-black/10",
            "bg-white shadow-[0_8px_18px_rgba(0,0,0,0.02)]",
            "grid place-items-center active:scale-[0.99] transition",
          ].join(" ")}
          aria-label="Filtros"
          title="Filtros"
        >
          <Icon icon="mdi:filter-variant" className="h-6 w-6 text-black/60" />          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[#1E2F5D] text-white text-[11px] font-extrabold grid place-items-center border border-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* TABLA */}
      <div className="mt-6 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-md text-gray-500">
            <tr>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3 text-left">Prestador</th>
              <th className="p-3 text-center">Puntaje</th>
              <th className="p-3 text-center">Info</th>
            </tr>
          </thead>

          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium text-black">{r.client?.full_name || "—"}</div>
                </td>

                <td className="p-3 text-black">{r.provider?.full_name || "—"}</td>

                <td className="p-3 text-center">
                  <span className="inline-flex items-center justify-center gap-1 font-semibold text-[#1E2F5D]">
                    <span>{r.rating ?? "—"}</span>
                    <MdStar size={18} className="text-[#E3B100]" />
                  </span>
                </td>

                <td className="p-3 text-center">
                  <button
                    onClick={() => navigate(`/admin/reviews/${r.id}`)}
                    className="h-10 w-10 rounded-full bg-black/[0.04] border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.02)] grid place-items-center active:scale-[0.99] transition"
                    aria-label="Ver detalle"
                    title="Ver detalle"
                  >
                    <FiInfo size={18} className="text-black/60" />
                  </button>
                </td>
              </tr>
            ))}

            {reviews.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-400">
                  No hay reseñas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer paginación minimalista */}
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
      </div>

      {/* SHEET FILTROS (con Limpiar / Guardar) */}
      <Sheet
        open={filtersOpen}
        onClose={closeFilters}
        title="Filtros"
        subtitle="Ajustá el listado de reseñas."
      >
        <div className="space-y-3">
          <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
            <p className="text-[12px] font-semibold text-black/45">Puntaje</p>
            <select
              value={draftRating}
              onChange={(e) => setDraftRating(e.target.value)}
              className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none appearance-none"
            >
              <option value="all">Todos</option>
              <option value="5">5 estrellas</option>
              <option value="4">4 estrellas</option>
              <option value="3">3 estrellas</option>
              <option value="2">2 estrellas</option>
              <option value="1">1 estrella</option>
            </select>
          </div>

          <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
            <p className="text-[12px] font-semibold text-black/45">Orden</p>
            <select
              value={draftSort}
              onChange={(e) => setDraftSort(e.target.value)}
              className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none appearance-none"
            >
              <option value="new">Más nuevas</option>
              <option value="old">Más antiguas</option>
              <option value="high">Mayor puntaje</option>
              <option value="low">Menor puntaje</option>
            </select>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={clearDraftFilters}
            className="h-[54px] rounded-full bg-white border border-black/10 text-[14px] font-extrabold text-[#3D3D3D] active:scale-[0.99] transition"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={applyFilters}
            disabled={!canApply}
            className={[
              "h-[54px] rounded-full text-[14px] font-extrabold active:scale-[0.99] transition",
              canApply
                ? "bg-[#1E2F5D] text-white shadow-[0_10px_24px_rgba(30,47,93,0.22)]"
                : "bg-black/[0.04] text-black/40 border border-black/10 shadow-none cursor-not-allowed active:scale-100",
            ].join(" ")}
          >
            Guardar
          </button>
        </div>
      </Sheet>
    </div>
  );
}