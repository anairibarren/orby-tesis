// src/pages/client/Search.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { listActiveServices } from "../../services/services";
import { Icon as IconifyIcon } from "@iconify/react";
import { motion } from "framer-motion";

function normalizeStr(v) {
  const s = (v == null ? "" : typeof v === "string" ? v : String(v))
    .trim()
    .toLowerCase();

  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const RECENTS_KEY = "orby_search_recents_v2";

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveRecents(list) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {}
}
function upsertRecent(term) {
  const value = String(term || "").trim();
  if (!value) return loadRecents();
  const prev = loadRecents();
  const next = [value, ...prev.filter((x) => x !== value)].slice(0, 10);
  saveRecents(next);
  return next;
}

function IconButton({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "h-11 w-11 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function VerifiedBadgeIcon({ className = "h-[14px] w-[14px]" }) {
  return (
    <IconifyIcon
      icon="mdi:check-decagram"
      className={`${className} text-[#4368C5] shrink-0`}
    />
  );
}

const CATEGORIES = [
  { key: "Hogar y reparaciones", label: "Hogar y\nreparaciones", icon: "tools" },
  {
    key: "Educación y habilidades",
    label: "Educación y\nhabilidades",
    icon: "school",
  },
  { key: "Cuidado y bienestar", label: "Cuidado y\nbienestar", icon: "lotus" },
  {
    key: "Eventos y entretenimiento",
    label: "Eventos y\nentretenimiento",
    icon: "party",
  },
];

function CategoryIcon({ name }) {
  const ICONS = {
    tools: new URL("../../assets/img/icono1.png", import.meta.url).href,
    school: new URL("../../assets/img/icono2.png", import.meta.url).href,
    lotus: new URL("../../assets/img/icono3.png", import.meta.url).href,
    party: new URL("../../assets/img/icono4.png", import.meta.url).href,
  };

  return (
    <img
      src={ICONS[name]}
      alt=""
      className="h-[25px] w-[25px] object-contain shrink-0 select-none"
      draggable="false"
    />
  );
}

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[16px] font-extrabold text-[#3D3D3D]">{children}</h2>
      {right ? <div>{right}</div> : <span />}
    </div>
  );
}

/** Skeleton del “estado sin query” */
function SearchHomeSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      {/* Recientes */}
      <div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-black/10" />
          <div className="h-3 w-14 rounded bg-black/10" />
        </div>

        <CardShell className="mt-3 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-black/10" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-44 rounded bg-black/10" />
              <div className="mt-2 h-3 w-56 rounded bg-black/10" />
            </div>
          </div>
        </CardShell>
      </div>

      {/* Explorá rápido */}
      <div className="mt-6">
        <div className="h-4 w-32 rounded bg-black/10" />

        <div className="mt-3 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardShell key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-black/10" />
                <div className="flex-1">
                  <div className="h-3 w-28 rounded bg-black/10" />
                  <div className="mt-2 h-3 w-20 rounded bg-black/10" />
                </div>
              </div>
            </CardShell>
          ))}
        </div>
      </div>

      {/* Sugeridos */}
      <div className="mt-6">
        <div className="h-4 w-24 rounded bg-black/10" />

        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-[108px] rounded-full bg-white border border-black/5 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  const nav = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [recents, setRecents] = useState(() => loadRecents());

  const fromHomeSearch = !!location.state?.fromHomeSearch;
  const [showExtras, setShowExtras] = useState(!fromHomeSearch);

  // Servicio abierto en resultados (para ver prestadores debajo)
  const [openServiceKey, setOpenServiceKey] = useState(null);

  useEffect(() => {
    setQ(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  useEffect(() => {
    if (!fromHomeSearch) return;
    const t = setTimeout(() => setShowExtras(true), 260);
    return () => clearTimeout(t);
  }, [fromHomeSearch]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await listActiveServices();
        if (alive) setItems(data || []);
      } catch (e) {
        if (alive) setErr(e?.message || "Error cargando servicios");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const hasQuery = !!q.trim();

  function applyQuery(nextQ) {
    const value = (nextQ ?? q).trim();

    if (value) setRecents(upsertRecent(value));

    if (!value) {
      const next = new URLSearchParams(params);
      next.delete("q");
      setParams(next, { replace: true });
      return;
    }

    setParams({ q: value }, { replace: true });
  }

  function clearAll() {
    setQ("");
    const next = new URLSearchParams(params);
    next.delete("q");
    setParams(next, { replace: true });
  }

  function goBackClean() {
    nav("/client", { replace: true, state: { disableHomeShared: true } });
  }

  const filteredProviders = useMemo(() => {
    const term = normalizeStr(q);
    if (!term) return [];

    const tokens = term.split(" ").filter(Boolean);

    return (items || []).filter((o) => {
      const cat = o?.catalog || o?.service_catalog;
      const prov = o?.provider || o?.profiles;

      const hay = [
        cat?.name,
        cat?.category?.name,
        cat?.category,
        cat?.subcategory?.name,
        cat?.subcategory,
        prov?.full_name,
        prov?.neighborhood,
      ]
        .map(normalizeStr)
        .filter(Boolean)
        .join(" ");

      return tokens.every((t) => hay.includes(t));
    });
  }, [items, q]);

  // Agrupar por servicio y listar prestadores debajo
  const groupedResults = useMemo(() => {
    const map = new Map();

    for (const o of filteredProviders || []) {
      const cat = o?.catalog || o?.service_catalog;

      const key =
        cat?.id ??
        normalizeStr(cat?.name) ??
        o?.catalog_id ??
        o?.service_catalog_id ??
        o?.id;

      if (!map.has(key)) {
        map.set(key, { key, cat, rows: [] });
      }
      map.get(key).rows.push(o);
    }

    return Array.from(map.values()).sort(
      (a, b) => (b.rows?.length || 0) - (a.rows?.length || 0)
    );
  }, [filteredProviders]);

  // Cuando cambia el query, reseteamos el desplegado; cuando hay resultados, abrimos el primero
  useEffect(() => {
    if (!hasQuery) {
      setOpenServiceKey(null);
      return;
    }
    setOpenServiceKey(null);
  }, [hasQuery, q]);

  useEffect(() => {
    if (!hasQuery) return;
    if (openServiceKey != null) return;
    if (groupedResults.length > 0) setOpenServiceKey(groupedResults[0].key);
  }, [hasQuery, groupedResults, openServiceKey]);

  const suggestedForYou = useMemo(
    () => ["Limpieza", "Electricidad", "Inglés", "Masajes", "Carpintería", "Pintura"],
    []
  );

  const showEmptyResults =
    !loading && !err && hasQuery && filteredProviders.length === 0;

  const SearchBarWrapper = fromHomeSearch ? motion.div : "div";
  const searchBarWrapperProps = fromHomeSearch
    ? {
        layoutId: "orby-searchbar",
        transition: {
          layout: { type: "spring", stiffness: 520, damping: 42, mass: 0.9 },
        },
      }
    : {};

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-6 box-border">
        <style>{`
          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        {/* Search bar */}
        <div className="relative">
          <SearchBarWrapper {...searchBarWrapperProps}>
            <div className="w-full flex items-center gap-2 rounded-full bg-white px-5 py-4 shadow-[0_4px_4.8px_rgba(0,0,0,0.06)]">
              <IconifyIcon
                icon="mdi:magnify"
                className="h-5 w-5 text-black/35 shrink-0"
              />

              <input
                autoFocus={fromHomeSearch}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyQuery()}
                placeholder="Buscar servicio o prestador"
                className="min-w-0 w-full bg-transparent outline-none text-sm text-[#3D3D3D] placeholder:text-black/35"
              />

              {showExtras && !!q.trim() && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-8 w-8 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] shrink-0"
                  aria-label="Limpiar"
                  title="Limpiar"
                >
                  <IconifyIcon
                    icon="mdi:close"
                    className="h-5 w-5 text-black/40"
                  />
                </button>
              )}
            </div>
          </SearchBarWrapper>

          {/* Flecha */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[54px]">
            <IconButton onClick={goBackClean} title="Volver">
              <span className="text-xl leading-none">‹</span>
            </IconButton>
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {loading && !hasQuery && <SearchHomeSkeleton />}

          {loading && hasQuery && (
            <div className="mt-6 grid gap-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardShell key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-[52px] w-[52px] rounded-[18px] bg-black/10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-4 w-40 rounded bg-black/10" />
                        <div className="h-6 w-20 rounded-full bg-black/10" />
                      </div>
                      <div className="mt-2 h-3 w-28 rounded bg-black/10" />
                      <div className="mt-3 h-3 w-56 rounded bg-black/10" />
                      <div className="mt-3 h-4 w-24 rounded bg-black/10" />
                    </div>
                  </div>
                </CardShell>
              ))}
            </div>
          )}

          {!loading && !err && (
            <>
              {!hasQuery && (
                <>
                  {/* Recientes */}
                  <div className="mt-6">
                    <SectionTitle
                      right={
                        recents.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              saveRecents([]);
                              setRecents([]);
                            }}
                            className="text-[12px] font-semibold text-black/40"
                          >
                            Borrar
                          </button>
                        ) : null
                      }
                    >
                      Recientes
                    </SectionTitle>

                    {recents.length > 0 ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                        {recents.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setQ(t);
                              applyQuery(t);
                            }}
                            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] px-3 py-2 text-[12px] font-semibold text-[#3D3D3D] active:scale-[0.98]"
                          >
                            <IconifyIcon
                              icon="mdi:history"
                              className="h-4 w-4 text-black/35"
                            />
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <CardShell className="mt-3 p-4">
                        <div className="flex items-center gap-3 text-black/55">
                          <span className="h-9 w-9 rounded-full bg-black/[0.04] grid place-items-center">
                            <IconifyIcon
                              icon="mdi:history"
                              className="h-5 w-5 text-black/35"
                            />
                          </span>
                          <div className="text-[13px] leading-tight">
                            <p className="font-semibold text-[#3D3D3D]">
                              Sin búsquedas aún
                            </p>
                            <p className="text-black/45">
                              Probá con un servicio o una zona
                            </p>
                          </div>
                        </div>
                      </CardShell>
                    )}
                  </div>

                  {/* Explorá rápido */}
                  <div className="mt-6">
                    <SectionTitle>Explorá rápido</SectionTitle>

                    <div className="mt-3 grid grid-cols-2 gap-[12px]">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => nav(`/client/categories/${encodeURIComponent(c.key)}`)}
                          className="rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-3.5 py-4 text-left active:scale-[0.99] transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-9 w-9 rounded-full bg-[#DDE6F7] grid place-items-center shrink-0">
                              <CategoryIcon name={c.icon} />
                            </span>

                            <p
                              className={[
                                "flex-1 min-w-0 font-semibold text-[#1E2F5D] whitespace-pre-line break-normal",
                                "leading-[15px]",
                                c.key === "Eventos y entretenimiento" ? "text-[12px]" : "text-[13px]",
                              ].join(" ")}
                            >
                              {c.label}
                            </p>
                          </div>
                        </button>

                      ))}
                    </div>
                  </div>

                  {/* Sugeridos */}
                  <div className="mt-6">
                    <SectionTitle>Sugeridos</SectionTitle>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestedForYou.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setQ(t);
                            applyQuery(t);
                          }}
                          className={[
                            "inline-flex items-center gap-2 rounded-full",
                            "bg-white border border-black/5",
                            "shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
                            "px-3 py-2 text-[12px] font-semibold",
                            "text-black/55",
                            "active:scale-[0.98] transition",
                          ].join(" ")}
                        >
                          <IconifyIcon
                            icon="mdi:magnify"
                            className="h-4 w-4 text-black/35"
                          />
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {hasQuery && (
                <>
                  <div className="mt-6 flex items-center justify-between">
                    <h2 className="text-[16px] font-extrabold text-[#3D3D3D]">
                      Resultados
                    </h2>

                    <span className="text-[12px] font-semibold text-black/35">
                      {groupedResults.length} servicios · {filteredProviders.length} prestadores
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {groupedResults.map((g) => {
                      const cat = g.cat;
                      const rows = g.rows || [];
                      const isOpen = openServiceKey === g.key;

                      const isA = cat?.pricing_type === "A";
                      const basePrices = rows
                        .map((r) =>
                          r?.base_price != null ? Number(r.base_price) : null
                        )
                        .filter((n) => Number.isFinite(n));
                      const minPrice = basePrices.length
                        ? Math.min(...basePrices)
                        : null;

                      const headerPrice =
                        isA && minPrice != null
                          ? `Desde $${minPrice.toLocaleString("es-AR")}`
                          : "Cotización";

                      const categoryLabel =
                        cat?.category?.name || cat?.category || "—";

                      return (
                        <CardShell key={g.key} className="p-4">
                          {/* Header Servicio */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenServiceKey(isOpen ? null : g.key)
                            }
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-[15px] font-semibold text-[#3D3D3D] truncate">
                                  {cat?.name || "Servicio"}
                                </h3>
                                <p className="mt-1 text-[12px] text-black/45 truncate">
                                  {categoryLabel}
                                </p>

                                <p className="mt-2 text-[12px] font-semibold text-black/45">
                                  {rows.length} prestador
                                  {rows.length === 1 ? "" : "es"}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-[11px] text-black/40 font-semibold">
                                  Precio
                                </p>
                                <p className="text-[14px] font-extrabold text-[#2A4691]">
                                  {headerPrice}
                                </p>

                                <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-black/45">
                                  <span>{isOpen ? "Ocultar" : "Ver"}</span>
                                  <span className="text-base leading-none">
                                    {isOpen ? "˄" : "˅"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Lista Prestadores */}
                          {isOpen && (
                            <div className="mt-4 grid gap-2">
                              {rows.map((o) => {
                                const prov = o?.provider || o?.profiles;
                                const avatar = prov?.avatar_url;

                                const isArow = cat?.pricing_type === "A";
                                const price =
                                  isArow && o?.base_price != null
                                    ? `$${Number(o.base_price).toLocaleString(
                                        "es-AR"
                                      )}`
                                    : null;

                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={() =>
                                      nav(`/client/services/${o.id}/request`)
                                    }
                                    className="w-full rounded-[18px] bg-black/[0.02] border border-black/5 px-3 py-3 text-left active:scale-[0.99] transition"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-[44px] w-[44px] rounded-[14px] bg-white overflow-hidden shrink-0 grid place-items-center border border-black/5">
                                        {avatar ? (
                                          <img
                                            src={avatar}
                                            alt={prov?.full_name || "Prestador"}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <IconifyIcon
                                            icon="mdi:account"
                                            className="h-6 w-6 text-black/25"
                                          />
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <p className="text-[13px] text-[#3D3D3D] font-semibold truncate">
                                          {prov?.full_name || "Prestador"}
                                          {prov?.provider_verified && (
                                            <span className="inline-flex ml-2 align-middle">
                                              <VerifiedBadgeIcon />
                                            </span>
                                          )}
                                        </p>

                                        <p className="mt-1 text-[12px] text-black/45 flex items-center gap-2 truncate">
                                          <IconifyIcon
                                            icon="mdi:map-marker"
                                            className="h-4 w-4 text-black/30 shrink-0"
                                          />
                                          <span className="truncate">
                                            {prov?.neighborhood || "—"}
                                          </span>
                                        </p>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <span
                                          className={[
                                            "inline-flex rounded-full px-3 py-1 text-[12px] font-semibold",
                                            isArow
                                              ? "bg-[#2A4691]/10 text-[#2A4691]"
                                              : "bg-black/[0.04] text-black/55",
                                          ].join(" ")}
                                        >
                                          {isArow ? "Precio fijo" : "Cotización"}
                                        </span>

                                        <p className="mt-2 text-[13px] font-extrabold text-[#2A4691]">
                                          {price ? `Desde ${price}` : "Cotización"}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </CardShell>
                      );
                    })}
                  </div>

                  {showEmptyResults && (
                    <CardShell className="mt-6 p-4 text-sm text-black/60">
                      No encontramos resultados para <b>{q.trim()}</b>.
                    </CardShell>
                  )}
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
