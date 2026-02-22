// src/pages/client/Search.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { listActiveServices } from "../../services/services";
import { supabase } from "../../services/supabase";
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

/** Debounce simple */
function useDebouncedValue(value, delay = 260) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
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
  { key: "Educación y habilidades", label: "Educación y\nhabilidades", icon: "school" },
  { key: "Cuidado y bienestar", label: "Cuidado y\nbienestar", icon: "lotus" },
  { key: "Eventos y entretenimiento", label: "Eventos y\nentretenimiento", icon: "party" },
];

function CategoryIcon({ name }) {
  const ICONS = {
    tools: "tabler:settings",
    school: "tabler:school",
    lotus: "lucide-lab:flower-lotus",
    party: "bx:party",
  };

  return (
    <div
      className="h-[36px] w-[36px] rounded-full grid place-items-center shrink-0"
      style={{ background: "rgba(44,72,148,0.18)" }} // #2C4894 con baja opacidad
    >
      <IconifyIcon
        icon={ICONS[name]}
        className="h-[21px] w-[21px]"
        style={{ color: "#1E2F5D" }}
      />
    </div>
  );
}

/** ✅ CardShell ahora pasa props (onClick, etc.) */
function CardShell({ children, className = "", ...props }) {
  return (
    <div
      {...props}
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

function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getServiceIcon(name = "", category = "") {
  const n = normalize(name);
  const c = normalize(category);

  if (n.includes("alban")) return "mdi:hammer";
  if (n.includes("carpinter")) return "mdi:tools";
  if (n.includes("electric")) return "mdi:lightning-bolt";
  if (n.includes("gas") || n.includes("calef")) return "mdi:fire";
  if (n.includes("jardin")) return "mdi:flower";
  if (n.includes("limpieza")) return "mdi:spray-bottle";
  if (n.includes("pintura") || n.includes("pintor")) return "mdi:format-paint";

  if (n.includes("masaj")) return "mdi:hand-heart";
  if (n.includes("adultos") || n.includes("mayores") || n.includes("cuidado"))
    return "mdi:account-heart";
  if (n.includes("entrenamiento") || n.includes("personal")) return "mdi:dumbbell";
  if (n.includes("paseador") || n.includes("mascota") || n.includes("perro"))
    return "mdi:dog-service";

  if (c.includes("educacion") || c.includes("habilidades")) {
    if (n.includes("ingles") || n.includes("italiano")) return "mdi:translate";
    if (n.includes("apoyo")) return "mdi:book-open-page-variant";
    if (n.includes("guit")) return "mdi:guitar-acoustic";
    if (n.includes("piano")) return "mdi:piano";
  }

  if (c.includes("eventos") || c.includes("entretenimiento")) {
    if (n.includes("dj")) return "mdi:music";
    if (n.includes("fot")) return "mdi:camera";
    if (n.includes("catering")) return "mdi:food";
  }

  return "mdi:briefcase-outline";
}

function RowIcon({ icon }) {
  return (
    <span className="h-[44px] w-[44px] rounded-full bg-[#D5E0F2] grid place-items-center shrink-0">
      <IconifyIcon icon={icon} className="h-[22px] w-[22px] text-[#2A4691]" />
    </span>
  );
}

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "en", "para", "por", "con", "a",
  "un", "una", "unos", "unas",
  "clase", "clases", "servicio", "servicios"
]);

function singularizeToken(t) {
  if (t.length <= 3) return t;
  if (t.endsWith("es") && t.length > 4) return t.slice(0, -2); // clases -> clase, masajes -> masaje
  if (t.endsWith("s") && t.length > 4) return t.slice(0, -1);
  return t;
}

function buildQueryTokens(raw) {
  const base = normalizeStr(raw);
  const tokens = base.split(" ").filter(Boolean).filter((t) => !STOPWORDS.has(t));

  const expanded = [];
  for (const t of tokens) {
    expanded.push(t);
    const s = singularizeToken(t);
    if (s && s !== t) expanded.push(s);
  }

  return Array.from(new Set(expanded));
}

export default function Search() {
  const nav = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const fromHomeSearch = !!location.state?.fromHomeSearch;

  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);

  const debouncedQ = useDebouncedValue(q, 260);
  const hasQuery = !!debouncedQ.trim();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const loadingAny = loading || catalogLoading; // ✅ ACÁ (después de los states)

  const [recents, setRecents] = useState(() => loadRecents());
  const [showExtras] = useState(true);

  // Cargar data una sola vez
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

  // ✅ NUEVO: cargar catálogo (service_catalog) para que el servicio aparezca aunque no haya prestadores
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setCatalogLoading(true);

        const { data, error } = await supabase
          .from("service_catalog")
          .select("id, name, category, pricing_type, fixed_price, currency, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        if (alive) setCatalog(data || []);
      } catch (e) {
        console.warn("catalog fetch failed:", e?.message || e);
        if (alive) setCatalog([]);
      } finally {
        if (alive) setCatalogLoading(false);
      }
    })();

    return () => (alive = false);
  }, []);


  // Mantener URL q=... (el estado vive en la URL también)
  useEffect(() => {
    const value = debouncedQ.trim();
    const next = new URLSearchParams(params);

    if (!value) {
      if (next.has("q")) {
        next.delete("q");
        setParams(next, { replace: true });
      }
      return;
    }

    if (next.get("q") !== value) {
      next.set("q", value);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // Guardar recents cuando “se asentó” la búsqueda (no cada tecla)
  useEffect(() => {
    const value = debouncedQ.trim();
    if (!value) return;
    setRecents(upsertRecent(value));
  }, [debouncedQ]);

  function clearAll() {
    setQ("");
    const next = new URLSearchParams(params);
    next.delete("q");
    setParams(next, { replace: true });
  }

  // ✅ Separar resultados: servicios (desde service_catalog) vs prestadores (desde items)
const { matchedServices, matchedProviders } = useMemo(() => {
  const term = normalizeStr(debouncedQ);
  if (!term) return { matchedServices: [], matchedProviders: [] };

 const tokens = buildQueryTokens(debouncedQ);

  // ✅ SERVICIOS: buscar en catálogo (service_catalog)
  const services = [];
  for (const c of catalog || []) {
    const hay = [c?.name, c?.category].map(normalizeStr).filter(Boolean).join(" ");
    const ok = tokens.length > 0 && tokens.every((t) => hay.includes(t));    if (ok) services.push(c);
  }

  // ✅ PRESTADORES: buscar en lo que devuelve listActiveServices()
  const providersMap = new Map();
  for (const o of items || []) {
    const prov = o?.provider || o?.profiles;

    const providerHay = [prov?.full_name, prov?.neighborhood]
      .map(normalizeStr)
      .filter(Boolean)
      .join(" ");

    const matchProvider = tokens.every((t) => providerHay.includes(t));

    if (matchProvider && prov?.id && !providersMap.has(prov.id)) {
      providersMap.set(prov.id, {
        provider: prov,
        providerServiceId: o?.id,
      });
    }
  }

  return {
    matchedServices: services.sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), "es")
    ),
    matchedProviders: Array.from(providersMap.values()).sort((a, b) =>
      String(a?.provider?.full_name || "").localeCompare(String(b?.provider?.full_name || ""), "es")
    ),
  };
}, [catalog, items, debouncedQ]);



  const suggestedForYou = useMemo(
    () => ["Limpieza", "Electricidad", "Inglés", "Masajes", "Carpintería", "Pintura"],
    []
  );

  const searchBarWrapperProps = {};

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-6 box-border">
        <style>{`
          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        {/* Search bar */}
        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div className="w-full flex items-center gap-2 rounded-full bg-white px-5 py-4 shadow-[0_4px_4.8px_rgba(0,0,0,0.06)]">
              <IconifyIcon icon="mdi:magnify" className="h-5 w-5 text-black/35 shrink-0" />

              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
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
                  <IconifyIcon icon="mdi:close" className="h-5 w-5 text-black/40" />
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {/* Loading states */}
          {loadingAny && !hasQuery && <SearchHomeSkeleton />}

            {loadingAny && hasQuery && (
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

          {!loadingAny && !err && (
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
                            onClick={() => setQ(t)}
                            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] px-3 py-2 text-[12px] font-semibold text-[#3D3D3D] active:scale-[0.98]"
                          >
                            <IconifyIcon icon="mdi:history" className="h-4 w-4 text-black/35" />
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <CardShell className="mt-3 p-4">
                        <div className="flex items-center gap-3 text-black/55">
                          <span className="h-9 w-9 rounded-full bg-black/[0.04] grid place-items-center">
                            <IconifyIcon icon="mdi:history" className="h-5 w-5 text-black/35" />
                          </span>
                          <div className="text-[13px] leading-tight">
                            <p className="font-semibold text-[#3D3D3D]">Sin búsquedas aún</p>
                            <p className="text-black/45">Probá con un servicio o una zona</p>
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
                            <CategoryIcon name={c.icon} />

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
                          onClick={() => setQ(t)}
                          className={[
                            "inline-flex items-center gap-2 rounded-full",
                            "bg-white border border-black/5",
                            "shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
                            "px-3 py-2 text-[12px] font-semibold",
                            "text-black/55",
                            "active:scale-[0.98] transition",
                          ].join(" ")}
                        >
                          <IconifyIcon icon="mdi:magnify" className="h-4 w-4 text-black/35" />
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {hasQuery && (
                <>
                  <div className="mt-6">
                    <h2 className="text-[16px] font-extrabold text-[#3D3D3D]">Resultados</h2>
                    <p className="mt-1 text-[12px] text-black/40">
                      {matchedServices.length} servicios · {matchedProviders.length} prestadores
                    </p>
                  </div>

                 {/* Servicios */}
                  {matchedServices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[12px] font-semibold text-black/45 mb-2">Servicios</p>

                      <div className="grid gap-3">
                        {matchedServices.map((cat) => {
                          const categoryLabel = cat?.category?.name || cat?.category || "";
                          const icon = getServiceIcon(cat?.name, categoryLabel);

                          return (
                            <CardShell
                              key={cat.id}
                              role="button"
                              tabIndex={0}
                              className="p-4 cursor-pointer active:scale-[0.99] transition"
                              onClick={() => nav(`/client/services/catalog/${encodeURIComponent(cat.id)}`)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && nav(`/client/services/catalog/${encodeURIComponent(cat.id)}`)
                              }
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4 min-w-0">
                                  <RowIcon icon={icon} />

                                  <div className="min-w-0">
                                    <h3 className="text-[15px] font-extrabold text-[#3D3D3D] truncate">
                                      {cat?.name || "Servicio"}
                                    </h3>
                                    <p className="mt-1 text-[12px] text-black/45 truncate">
                                      {categoryLabel || "—"}
                                    </p>
                                  </div>
                                </div>

                                <IconifyIcon icon="mdi:chevron-right" className="h-5 w-5 text-black/35 shrink-0" />
                              </div>
                            </CardShell>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Prestadores */}
                  {matchedProviders.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[12px] font-semibold text-black/45 mb-2">Prestadores</p>

                      <div className="grid gap-3">
                        {matchedProviders.map(({ provider: prov, providerServiceId }) => (
                        <CardShell
                          key={prov.id}
                          role="button"
                          tabIndex={0}
                          className="p-4 cursor-pointer active:scale-[0.99] transition"
                          onClick={() => nav(`/client/provider/${encodeURIComponent(providerServiceId)}`)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && nav(`/client/provider/${encodeURIComponent(providerServiceId)}`)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-[16px] bg-white border border-black/10 overflow-hidden grid place-items-center shrink-0">
                              {prov.avatar_url ? (
                                <img
                                  src={prov.avatar_url}
                                  alt={prov.full_name || "Prestador"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <IconifyIcon icon="mdi:account" className="h-6 w-6 text-black/25" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">
                                {prov.full_name || "Prestador"}
                                {prov.provider_verified && (
                                  <span className="inline-flex ml-2 align-middle">
                                    <VerifiedBadgeIcon />
                                  </span>
                                )}
                              </p>

                              <p className="mt-1 text-[12px] text-black/45 truncate">{prov.neighborhood || "—"}</p>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  nav(`/client/services/${encodeURIComponent(providerServiceId)}/request`);
                                }}
                                className="h-9 px-4 rounded-full bg-[#1E2F5D] text-white text-[12px] font-semibold shadow-[0_10px_18px_rgba(30,47,93,0.18)] active:scale-[0.98] transition"
                              >
                                Solicitar
                              </button>
                            </div>
                          </div>
                        </CardShell>
                      ))}
                      </div>
                    </div>
                  )}

                  {matchedServices.length === 0 && matchedProviders.length === 0 && (
                    <CardShell className="mt-6 p-4 text-sm text-black/60">
                      No encontramos resultados para <b>{debouncedQ.trim()}</b>.
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