// src/pages/client/ProvidersByService.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { listProviderServicesByCatalogId } from "../../services/services";
import { supabase } from "../../services/supabase";
import { createPortal } from "react-dom";

function IconButton({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "h-11 w-11 rounded-full bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] grid place-items-center shrink-0 active:scale-[0.98] transition",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function VerifiedBadgeIcon({ className = "h-4 w-4" }) {
  return <IconifyIcon icon="mdi:check-decagram" className={`${className} text-[#4368C5] shrink-0`} />;
}

function RatingChip({ value, count }) {
  const has = typeof value === "number" && Number.isFinite(value);
  const label = has ? value.toFixed(1) : "—";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-semibold text-black/55 shrink-0">
      <IconifyIcon icon="mdi:star" className="h-4 w-4 text-[#E3B100]" />
      <span className="leading-none">{label}</span>
      {has && typeof count === "number" ? <span className="text-black/35">({count})</span> : null}
    </span>
  );
}

function ProviderCardSkeletonB() {
  return (
    <div className="w-full rounded-[24px] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.07)] overflow-hidden animate-pulse">
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="h-12 w-12 rounded-[18px] bg-black/10 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-44 rounded bg-black/10" />
          <div className="mt-2 h-3 w-28 rounded bg-black/10" />
        </div>
        <div className="h-7 w-16 rounded-full bg-black/10" />
      </div>
      <div className="px-4 py-3 bg-black/[0.02] flex items-center justify-between gap-3">
        <div className="h-4 w-28 rounded bg-black/10" />
        <div className="h-10 w-28 rounded-full bg-black/10" />
      </div>
    </div>
  );
}

function Sheet({ open, onClose, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Bloquear scroll del body cuando abre (iOS PWA lo agradece)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0"
          // ✅ z-index “absurdo” para ganarle a cualquier navbar
          style={{ zIndex: 2147483647 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* fondo / cerrar tocando fuera */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-label="Cerrar"
          />

          <motion.div
            className="absolute left-0 right-0 bottom-0"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            {/* evita que el click dentro cierre */}
            <div
              className="mx-auto w-full max-w-[520px] px-4 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-[28px] bg-white shadow-2xl overflow-hidden">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function RadioRow({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full px-6 py-3 flex items-center justify-between">
      <p className="text-[14px] font-semibold text-[#3D3D3D]">{label}</p>
      <span className={["h-5 w-5 rounded-full border", active ? "border-[#1E2F5D]" : "border-black/20"].join(" ")}>
        <span className={["block h-full w-full rounded-full", active ? "bg-[#1E2F5D] scale-[0.55]" : "bg-transparent"].join(" ")} />
      </span>
    </button>
  );
}

// ✅ Verificado SOLO si hay certificación (certificate_url o certificate_urls con al menos 1 URL)
function hasCertification(prov) {
  const url = String(prov?.certificate_url || "").trim();
  if (url) return true;

  try {
    const arr = JSON.parse(prov?.certificate_urls || "[]");
    if (Array.isArray(arr) && arr.some((u) => String(u || "").trim())) return true;
  } catch {
    // noop
  }
  return false;
}

export default function ProvidersByService() {
  const nav = useNavigate();
  const { catalogId } = useParams();
  const [sp] = useSearchParams();

  const [q, setQ] = useState(sp.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [ratingsByProvider, setRatingsByProvider] = useState({}); // { [provider_id]: { avg, count } }

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [zone, setZone] = useState("all");
  const [sort, setSort] = useState("new"); // new | price_asc | price_desc

  const decodedId = useMemo(() => decodeURIComponent(catalogId || ""), [catalogId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await listProviderServicesByCatalogId(decodedId);
        if (!alive) return;
        const arr = data || [];
        setItems(arr);

        try {
          const providerIds = Array.from(
            new Set(
              (arr || [])
                .map((o) => (o?.provider || o?.profiles)?.id || o?.provider_id || null)
                .filter(Boolean)
            )
          );

          if (!providerIds.length) {
            setRatingsByProvider({});
          } else {
            const { data: rows, error } = await supabase.from("reviews").select("provider_id, rating").in("provider_id", providerIds);
            if (error) throw error;

            const acc = {};
            for (const r of rows || []) {
              const pid = r.provider_id;
              const rt = Number(r.rating);
              if (!pid || !Number.isFinite(rt)) continue;
              if (!acc[pid]) acc[pid] = { sum: 0, count: 0 };
              acc[pid].sum += rt;
              acc[pid].count += 1;
            }

            const out = {};
            Object.entries(acc).forEach(([pid, v]) => {
              out[pid] = { avg: v.count ? v.sum / v.count : null, count: v.count || 0 };
            });

            setRatingsByProvider(out);
          }
        } catch {
          setRatingsByProvider({});
        }
      } catch (e) {
        if (alive) setErr(e?.message || "Error cargando prestadores");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [decodedId]);

  const title = useMemo(() => {
    const first = items?.[0];
    const cat = first?.catalog || first?.service_catalog;
    return cat?.name || "Prestadores";
  }, [items]);

  const zones = useMemo(() => {
    const set = new Set();
    for (const o of items || []) {
      const prov = o?.provider || o?.profiles;
      const z = (prov?.neighborhood || "").trim();
      if (z) set.add(z);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (onlyVerified) n++;
    if (zone !== "all") n++;
    if (sort !== "new") n++;
    return n;
  }, [onlyVerified, zone, sort]);

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = (items || []).slice();

    if (term) {
      arr = arr.filter((o) => {
        const prov = o?.provider || o?.profiles;
        const cat = o?.catalog || o?.service_catalog;
        const providerName = (prov?.full_name || "").toLowerCase();
        const serviceName = (cat?.name || "").toLowerCase();
        const z = (prov?.neighborhood || "").toLowerCase();
        return providerName.includes(term) || serviceName.includes(term) || z.includes(term);
      });
    }

    if (onlyVerified) {
      arr = arr.filter((o) => {
        const prov = o?.provider || o?.profiles;
        return hasCertification(prov);
      });
    }

    if (zone !== "all") {
      arr = arr.filter((o) => {
        const prov = o?.provider || o?.profiles;
        return String(prov?.neighborhood || "") === String(zone);
      });
    }

    if (sort === "price_asc" || sort === "price_desc") {
      arr.sort((a, b) => {
        const pa = Number(a?.base_price);
        const pb = Number(b?.base_price);
        const aOk = Number.isFinite(pa) ? pa : Infinity;
        const bOk = Number.isFinite(pb) ? pb : Infinity;
        return sort === "price_asc" ? aOk - bOk : bOk - aOk;
      });
    } else {
      arr.sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
    }

    return arr;
  }, [items, q, onlyVerified, zone, sort]);

  // ✅ flecha “esta misma” + volver siempre atrás
  function goBack() {
    nav(-1);
  }

  function goProfile(providerServiceId) {
    nav(`/client/provider/${providerServiceId}`);
  }

  function goSchedule(providerServiceId) {
    nav(`/client/services/${providerServiceId}`);
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-6 box-border">
        {/* Top bar */}
        <div className="flex items-center gap-3 w-full overflow-visible">
          {/* ✅ CAMBIO: flecha */}
          <button
            type="button"
            onClick={goBack}
            className="h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-xl leading-none">‹</span>
          </button>


          <div className="flex-1 min-w-0 rounded-full bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-2">
            <IconifyIcon icon="mdi:magnify" className="h-5 w-5 text-black/35 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar prestador o zona"
              className="min-w-0 w-full bg-transparent outline-none text-[16px] text-[#3D3D3D] placeholder:text-black/35"
            />
          </div>

          <div className="relative shrink-0 overflow-visible">
            <IconButton onClick={() => setFiltersOpen(true)} title="Filtros">
              <IconifyIcon icon="mdi:filter-variant" className="h-6 w-6 text-black/60" />
            </IconButton>

            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-[#1E2F5D] text-white text-[11px] font-extrabold grid place-items-center shadow-[0_8px_18px_rgba(30,47,93,0.22)]">
                {activeFiltersCount}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mt-6 flex items-center justify-between">
          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">{title}</h1>
          {!loading && !err && <span className="text-[12px] font-semibold text-black/40">{filteredItems.length} prestadores</span>}
        </div>

        {loading && (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProviderCardSkeletonB key={i} />
            ))}
          </div>
        )}

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {!loading && !err && (
          <div className="mt-4 grid gap-3">
            {filteredItems.map((o) => {
              const prov = o?.provider || o?.profiles;
              const cat = o?.catalog || o?.service_catalog;

              const isA = cat?.pricing_type === "A";
              const price = isA && o?.base_price != null ? `$${Number(o.base_price).toLocaleString("es-AR")}` : null;

              const avatar = prov?.avatar_url;

              const pid = prov?.id || o?.provider_id || null;
              const ratingObj = pid ? ratingsByProvider[pid] : null;
              const rating = ratingObj?.avg != null ? Number(ratingObj.avg) : null;
              const ratingCount = ratingObj?.count ?? null;

              const verified = hasCertification(prov);

              return (
                <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => goProfile(o.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goProfile(o.id);
                  }
                }}
                className="w-full text-left rounded-[24px] bg-white shadow-[0_12px_26px_rgba(0,0,0,0.08)] overflow-hidden active:scale-[0.995] transition cursor-pointer"
              >
                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                  <div className="h-12 w-12 rounded-[18px] bg-black/[0.04] overflow-hidden shrink-0 grid place-items-center">
                    {avatar ? (
                      <img src={avatar} alt={prov?.full_name || "Prestador"} className="h-full w-full object-cover" />
                    ) : (
                      <IconifyIcon icon="mdi:account" className="h-6 w-6 text-black/25" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[16px] font-extrabold text-[#3D3D3D] truncate">{prov?.full_name || "Prestador"}</p>
                      {verified && <VerifiedBadgeIcon />}
                    </div>

                    <p className="mt-1 text-[12px] text-black/45 truncate">{prov?.neighborhood || "—"}</p>
                  </div>

                  <RatingChip value={rating} count={ratingCount} />
                </div>

                <div className="px-4 py-3 bg-black/[0.02] flex items-center justify-between gap-3">
                  <span className="text-[14px] font-extrabold text-[#2A4691]">{price ? `Desde ${price}` : "Cotización"}</span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // ✅ mantiene click del card separado
                      goSchedule(o.id);
                    }}
                    className="h-10 px-5 rounded-full bg-[#1E2F5D] text-white text-[13px] font-semibold active:scale-[0.98] shrink-0 flex items-center gap-2"
                  >
                    <IconifyIcon icon="mdi:calendar" className="h-4 w-4" />
                    Agendar
                  </button>
                </div>
              </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="min-h-[55vh] w-full flex flex-col items-center justify-center text-center">
                <div className="mx-auto h-14 w-14 rounded-[18px] bg-black/[0.04] grid place-items-center">
                  <IconifyIcon icon="mdi:account-search-outline" className="h-8 w-8 text-black/35" />
                </div>

                <p className="mt-4 text-[15px] font-extrabold text-[#3D3D3D]">Sin resultados</p>
                <p className="mt-2 max-w-[320px] text-[12px] leading-relaxed text-black/45">
                  No hay prestadores activos para este servicio con los filtros actuales.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <div className="pt-3 flex justify-center">
          <div className="h-1.5 w-14 rounded-full bg-black/10" />
        </div>

        <div className="px-6 pt-5 pb-4">
          {/* ✅ CAMBIO: alineado a la izquierda + sin cruz */}
          <div className="flex items-start justify-between gap-3">
            <div className="text-left">
              <h3 className="text-[20px] font-extrabold text-[#3D3D3D]">Filtros</h3>
              <p className="mt-1 text-[12px] text-black/45">Ajustá la lista de prestadores.</p>
            </div>

            {/* ✅ CAMBIO: Reset -> Resetear */}
            <button
              type="button"
              onClick={() => {
                setOnlyVerified(false);
                setZone("all");
                setSort("new");
              }}
              className="text-[12px] font-semibold text-black/45"
            >
              Resetear
            </button>
          </div>
        </div>

        <div className="divide-y divide-black/10">
          <button
            type="button"
            onClick={() => setOnlyVerified((v) => !v)}
            className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-[#3D3D3D]">Solo verificados</p>
              <p className="mt-1 text-[12px] text-black/45">Prestadores con certificación cargada.</p>
            </div>

            <span className={["h-7 w-12 rounded-full p-1 flex items-center transition", onlyVerified ? "bg-[#1E2F5D]" : "bg-black/10"].join(" ")}>
              <span className={["h-5 w-5 rounded-full bg-white transition", onlyVerified ? "translate-x-5" : "translate-x-0"].join(" ")} />
            </span>
          </button>

          <div className="py-3">
            <p className="px-6 pb-1 text-[12px] font-semibold text-black/45">Zona</p>
            <RadioRow label="Todas" active={zone === "all"} onClick={() => setZone("all")} />
            {zones.map((z) => (
              <RadioRow key={z} label={z} active={zone === z} onClick={() => setZone(z)} />
            ))}
          </div>

          <div className="py-3">
            <p className="px-6 pb-1 text-[12px] font-semibold text-black/45">Orden</p>
            <RadioRow label="Recomendados" active={sort === "new"} onClick={() => setSort("new")} />
            <RadioRow label="Menor precio" active={sort === "price_asc"} onClick={() => setSort("price_asc")} />
            <RadioRow label="Mayor precio" active={sort === "price_desc"} onClick={() => setSort("price_desc")} />
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="w-full h-[52px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-extrabold shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition"
          >
            Ver resultados
          </button>
        </div>
      </Sheet>
    </div>
  );
}
