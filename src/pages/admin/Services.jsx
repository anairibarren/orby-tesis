// src/pages/admin/Services.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { FiInfo } from "react-icons/fi";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";

/* ---------------- UI helpers (mismos que Users) ---------------- */
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
export default function Services() {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const toast = useToast();

  const mountedRef = useRef(true);
  const relationsLoadedRef = useRef(false);

  const PAGE_SIZE = 10;

  const [services, setServices] = useState([]);
  const [relations, setRelations] = useState([]);
  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(true); // primera carga
  const [isFetching, setIsFetching] = useState(false); // paginado/filtros

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  // paginación (server-side)
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // counts chips (siempre visibles) — igual lógica que Users con counts dedicados
  const [counts, setCounts] = useState({ all: 0 });

  // MODAL NUEVO SERVICIO
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [pricingType, setPricingType] = useState("");
  const [creating, setCreating] = useState(false);

  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  async function loadRelationsOnce() {
    if (relationsLoadedRef.current) return;
    const { data, error: relErr } = await supabase
      .from("provider_services")
      .select("id, catalog_id, is_active");

    if (relErr) throw relErr;
    if (!mountedRef.current) return;

    setRelations(data || []);
    relationsLoadedRef.current = true;
  }

  async function loadServicesPage({ silent = false } = {}) {
    try {
      if (silent) setIsFetching(true);
      else setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // ✅ traemos relaciones una sola vez (cache)
      await loadRelationsOnce();

      let q = supabase
        .from("service_catalog")
        .select("id, name, category, pricing_type, is_active, created_at", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to);

      // ✅ filtro server-side
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);

      const { data, error: svcErr, count } = await q;
      if (svcErr) throw svcErr;

      if (!mountedRef.current) return;

      setServices(data || []);
      setTotal(Number(count || 0));
      setError(null);
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setError("Error cargando servicios");
    } finally {
      if (!mountedRef.current) return;
      if (silent) setIsFetching(false);
      else setLoading(false);
    }
  }

  // ✅ counts reales por categoría (para chips), siempre visibles
  async function loadCounts() {
    try {
      // 1) count total
      const allRes = await supabase
        .from("service_catalog")
        .select("id", { count: "exact", head: true });

      if (allRes.error) throw allRes.error;

      // 2) categorías únicas (para saber qué chips renderizar)
      // (esto trae pocas filas; si preferís RPC/group, lo hacemos después)
      const catsRes = await supabase.from("service_catalog").select("category");
      if (catsRes.error) throw catsRes.error;

      const cats = Array.from(
        new Set((catsRes.data || []).map((r) => r?.category).filter(Boolean))
      );

      // 3) count por categoría con head:true
      const perCat = await Promise.all(
        cats.map(async (cat) => {
          const res = await supabase
            .from("service_catalog")
            .select("id", { count: "exact", head: true })
            .eq("category", cat);
          return { cat, count: Number(res.count || 0), error: res.error };
        })
      );

      const bad = perCat.find((x) => x.error);
      if (bad?.error) throw bad.error;

      if (!mountedRef.current) return;

      const map = { all: Number(allRes.count || 0) };
      for (const row of perCat) map[row.cat] = row.count;

      setCounts(map);
    } catch (e) {
      console.error("loadCounts error:", e);
      // fallback: no rompe UI
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    loadServicesPage({ silent: false });
    loadCounts();

    const ch1 = supabase
      .channel("admin-services-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_catalog" },
        () => {
          if (!mountedRef.current) return;
          loadServicesPage({ silent: true });
          loadCounts();
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel("admin-provider-services-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "provider_services" },
        async () => {
          // si cambia relación, refrescamos cache + tabla (counts de categorías no cambian por esto)
          try {
            relationsLoadedRef.current = false;
            await loadRelationsOnce();
            if (mountedRef.current) loadServicesPage({ silent: true });
          } catch (e) {
            console.error(e);
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ al cambiar página o filtro -> refetch silencioso
  useEffect(() => {
    if (!mountedRef.current) return;
    if (loading) return;
    loadServicesPage({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryFilter]);

  // ✅ si cambia el buscador -> volvemos a página 1
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const computedServices = useMemo(() => {
    return services.map((service) => {
      const providers = relations.filter(
        (r) => r.catalog_id === service.id && r.is_active
      );
      return { ...service, providersCount: providers.length };
    });
  }, [services, relations]);

  // categorías para chips (a partir de counts)
  const categories = useMemo(() => {
    const cats = Object.keys(counts || {}).filter((k) => k !== "all");
    cats.sort((a, b) => a.localeCompare(b, "es"));
    return ["all", ...cats];
  }, [counts]);

  const modalCategories = useMemo(
    () => categories.filter((c) => c !== "all"),
    [categories]
  );

  // búsqueda: filtra SOLO la página actual (igual estilo Users)
  const filtered = useMemo(() => {
    const s = (search || "").toLowerCase().trim();
    if (!s) return computedServices;

    return computedServices.filter((x) => {
      const key = `${x.name || ""} ${x.category || ""}`.toLowerCase();
      return key.includes(s);
    });
  }, [computedServices, search]);

  /* ================= ACTIONS ================= */
  async function handleCreateService(e) {
    e.preventDefault();

    if (!name.trim() || !category || !pricingType) {
      toast.warning("Completa todos los campos");
      return;
    }

    setCreating(true);

    const { error } = await supabase.from("service_catalog").insert({
      name: name.trim(),
      category,
      pricing_type: pricingType,
      is_active: true,
    });

    setCreating(false);

    if (error) {
      console.error(error);
      toast.error("Error al crear servicio");
      return;
    }

    toast.success("Servicio creado correctamente");
    setShowModal(false);
    setName("");
    setCategory("");
    setPricingType("");
    // refresco
    relationsLoadedRef.current = false;
    await loadServicesPage({ silent: true });
    await loadCounts();
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

  if (loading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">
            Supervisión de servicios
          </h1>
          <p className="mt-1 mb-4 text-[13px] text-black/45">
            Listado y control del catálogo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-12 w-12 rounded-full bg-[#1E2F5D] text-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.02)] grid place-items-center active:scale-[0.99] transition"
          aria-label="Agregar servicio"
          title="Agregar servicio"
        >
          <Icon icon="mdi:plus" className="h-7 w-7 text-white" />
        </button>
      </div>

      {/* CHIPS (mismo estilo Users) */}
      <div className="-mx-6 px-6 overflow-x-auto hide-scrollbar py-3 scroll-px-6 mb-3">
        <style>{`
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        <div className="flex gap-3 w-max pr-6">
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              active={categoryFilter === cat}
              onClick={() => {
                setCategoryFilter(cat);
                setPage(1);
              }}
              label={cat === "all" ? "Todas" : cat}
              count={Number(counts?.[cat] || 0)}
            />
          ))}
        </div>
      </div>

      {/* BUSCADOR (mismo estilo Users) */}
      <div className="relative mb-4">
        <Icon
          icon="mdi:magnify"
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-black/35"
        />
        <input
          type="text"
          placeholder="Buscar por servicio o categoría..."
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

      {/* TABLA (mismo estilo Users) */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-black/[0.04] grid place-items-center">
              <Icon icon="mdi:clipboard-text-outline" className="h-7 w-7 text-black/35" />
            </div>

            <p className="mt-4 text-[15px] font-extrabold text-[#3D3D3D]">
              Servicio no encontrado
            </p>

            <p className="mt-2 text-[12px] text-black/45 leading-snug max-w-[320px] mx-auto">
              Probá con otro nombre/categoría o borrá el buscador.
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
                  <th className="p-3 text-left font-semibold w-[60%]">Servicio</th>
                  <th className="p-3 text-center font-semibold w-[28%]">Prestadores</th>
                  <th className="p-3 text-center font-semibold w-[72px]">Info</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-black/5">
                    <td className="p-3 w-[60%]">
                      <div className="font-extrabold text-[#3D3D3D] leading-snug truncate">
                        {s.name}
                      </div>
                      <div className="mt-0.5 text-[12px] text-black/45 truncate">
                        {s.category}
                      </div>
                    </td>

                    <td className="p-3 text-center w-[28%]">
                      <span className="font-extrabold text-[#3D3D3D]">
                        {s.providersCount}
                      </span>
                    </td>

                    <td className="py-3 pr-3 pl-4 w-[72px]">
                      <div className="flex items-center justify-start translate-x-1">
                        <InfoIconButton onClick={() => navigate(`/admin/services/${s.id}`)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer paginación (mismo estilo Users) */}
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

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      {/* ================= MODAL NUEVO SERVICIO ================= */}
      {showModal && (
        <div className="fixed inset-0 z-[9999]">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
            aria-label="Cerrar"
          />

          {/* sheet */}
          <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10 animate-sheetUp">
              {/* handle */}
              <div className="pt-3 flex justify-center">
                <div className="h-1.5 w-14 rounded-full bg-black/10" />
              </div>

              {/* header */}
              <div className="px-6 pt-4 pb-4">
                <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">
                  Nuevo servicio
                </h2>
                <p className="mt-1 text-[12px] text-black/45">
                  Completá los campos para crear un nuevo servicio.
                </p>
              </div>

              {/* content */}
              <form className="px-6 pb-6 space-y-4" onSubmit={handleCreateService}>
                {/* Nombre */}
                <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-black/45">
                    <p className="text-[12px] font-semibold">
                      Nombre <span className="text-red-500">*</span>
                    </p>
                  </div>

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none placeholder:text-black/30"
                    placeholder="Ingresá el nombre"
                  />
                </div>

                {/* Categoría */}
                <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-black/45">
                    <p className="text-[12px] font-semibold">
                      Categoría <span className="text-red-500">*</span>
                    </p>
                  </div>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none appearance-none"
                  >
                    <option value="">Seleccionar</option>
                    {modalCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cotización */}
                <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                  <p className="text-[12px] font-semibold text-black/45">
                    Cotización <span className="text-red-500">*</span>
                  </p>

                  <div className="mt-3 flex gap-3">
                    {[
                      { value: "A", label: "Cotizada" },
                      { value: "B", label: "Fijo" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPricingType(option.value)}
                        className={[
                          "flex-1 h-[46px] rounded-full text-[14px] font-extrabold transition active:scale-[0.99]",
                          pricingType === option.value
                            ? "bg-[#D6DDEB] text-[#1E2F5D] shadow-[0_6px_16px_rgba(30,47,93,0.12)]"
                            : "bg-white/60 text-black/70 border border-black/10",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* footer */}
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="h-[54px] rounded-full bg-white border border-black/10 text-[14px] font-extrabold text-[#3D3D3D] active:scale-[0.99] transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    className={[
                      "h-[54px] rounded-full text-[14px] font-extrabold active:scale-[0.99] transition",
                      creating
                        ? "bg-[#1E2F5D]/60 text-white cursor-not-allowed shadow-none"
                        : "bg-[#1E2F5D] text-white shadow-[0_10px_24px_rgba(30,47,93,0.22)]",
                    ].join(" ")}
                  >
                    {creating ? "Creando..." : "Crear servicio"}
                  </button>
                </div>
              </form>
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
      )}
    </div>
  );
}