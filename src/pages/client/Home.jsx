// src/pages/client/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { listActiveServices } from "../../services/services";
import { Icon as IconifyIcon } from "@iconify/react";
import { motion } from "framer-motion";
import { supabase } from "../../services/supabase";
import { countMyUnreadNotifications } from "../../services/notifications";
import patronBg from "../../assets/img/fondo-patron.png";

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
      className="h-[36px] w-[36px] rounded-full grid place-items-center"
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

function VerifiedBadgeIcon({ className = "h-[14px] w-[14px]" }) {
  return <IconifyIcon icon="mdi:check-decagram" className={`${className} text-[#4368C5] shrink-0`} />;
}

function StarIcon({ className = "h-[16px] w-[16px]" }) {
  return <IconifyIcon icon="mdi:star" className={`${className} text-[#E3B100] shrink-0`} />;
}

/** ✅ FIX: ahora acepta className para poder ponerla blanca en el header */
function BellIcon({ className = "h-6 w-6 text-[#3D3D3D]" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 10.2a5.5 5.5 0 0 1 11 0c0 5 2.2 6.1 2.2 6.1H4.3s2.2-1.1 2.2-6.1Z" />
      <path d="M9.4 19.2a2.8 2.8 0 0 0 5.2 0" />
    </svg>
  );
}

function PopularCardSkeleton() {
  return (
    <div
      className="w-[290px] h-[190px] my-2 flex-shrink-0 bg-white rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
      style={{ padding: 19 }}
    >
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded bg-black/10 animate-pulse" />
        <div className="h-4 w-10 rounded bg-black/10 animate-pulse" />
        <div className="h-4 w-20 rounded bg-black/10 animate-pulse" />
      </div>

      <div className="mt-[10px] h-6 w-[85%] rounded bg-black/10 animate-pulse" />
      <div className="mt-[6px] h-4 w-20 rounded bg-black/10 animate-pulse" />

      <div className="mt-[14px] h-px w-full bg-black/10" />

      <div className="mt-[12px] flex items-center gap-[10px]">
        <div className="h-[34px] w-[34px] rounded-full bg-black/10 animate-pulse" />
        <div className="h-4 w-28 rounded bg-black/10 animate-pulse" />
        <div className="h-4 w-4 rounded-full bg-black/10 animate-pulse" />
      </div>
    </div>
  );
}

// ✅ Verificado SOLO si hay certificación (certificate_url o certificate_urls con al menos 1 URL)
function hasCertification(prov) {
  const url = String(prov?.certificate_url || "").trim();
  if (url) return true;

  // compat: algunos lugares lo guardan como JSON string
  try {
    const arr = JSON.parse(prov?.certificate_urls || "[]");
    if (Array.isArray(arr) && arr.some((u) => String(u || "").trim())) return true;
  } catch {
    // noop
  }

  // ✅ tu schema real: cert_url (JSON string)
  try {
    const arr2 = JSON.parse(prov?.cert_url || "[]");
    if (Array.isArray(arr2) && arr2.some((u) => String(u || "").trim())) return true;
  } catch {
    // noop
  }

  return false;
}

// ✅ Popularidad: intenta ordenar por campos comunes si existen
function getPopularityScore(o) {
  const candidates = [
    o?.scheduled_count,
    o?.bookings_count,
    o?.requests_count,
    o?.appointments_count,
    o?.times_booked,
    o?.agendados_count,
    o?.order_count,
    o?.completed_count,
    o?.popularity,
    o?.popular_score,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const k = String(x || "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export default function Home() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [popular, setPopular] = useState([]);
  const [err, setErr] = useState("");

  // ✅ notificaciones (badge)
  const [unread, setUnread] = useState(0);

  // ✅ stats reseñas por provider_id: { [providerId]: { count, avg } }
  const [reviewStats, setReviewStats] = useState({});

  const firstName = useMemo(() => {
    const full = profile?.full_name || "";
    return full.trim().split(" ")[0] || "Bienvenid@";
  }, [profile?.full_name]);

  async function refreshUnread({ silent = true } = {}) {
    if (!user?.id) return;
    try {
      const n = await countMyUnreadNotifications(user.id);
      if (Number.isFinite(n)) setUnread(n);
    } catch (e) {
      if (!silent) console.warn("count unread failed:", e?.message || e);
    }
  }

  async function loadReviewStatsForProviders(providerIds) {
    const ids = uniq(providerIds);
    if (!ids.length) return;

    try {
      // Traemos rating + provider_id para contar y promediar en JS (solo 6 providers => liviano)
      const { data, error } = await supabase.from("reviews").select("provider_id,rating").in("provider_id", ids);

      if (error) throw error;

      const map = {};
      for (const id of ids) map[id] = { count: 0, sum: 0 };

      for (const r of data || []) {
        const pid = r?.provider_id;
        const rt = Number(r?.rating);
        if (!pid || !Number.isFinite(rt)) continue;
        if (!map[pid]) map[pid] = { count: 0, sum: 0 };
        map[pid].count += 1;
        map[pid].sum += rt;
      }

      const out = {};
      for (const [pid, v] of Object.entries(map)) {
        out[pid] = {
          count: v.count,
          avg: v.count ? v.sum / v.count : null,
        };
      }

      setReviewStats(out);
    } catch (e) {
      // si por RLS o lo que sea falla, no rompemos UI
      console.warn("loadReviewStatsForProviders failed:", e?.message || e);
      setReviewStats({});
    }
  }

  // cargar servicios populares
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await listActiveServices();
        const arr = (data || []).slice();
        arr.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));

        const top = arr.slice(0, 6);
        if (!alive) return;

        setPopular(top);

        const providerIds = top.map((o) => o?.provider_id || o?.provider?.id).filter(Boolean);

        await loadReviewStatsForProviders(providerIds);
      } catch (e) {
        if (alive) setErr(e?.message || "Error cargando servicios");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, []);

  // badge: initial + interval backup
  useEffect(() => {
    refreshUnread({ silent: true });
    if (!user?.id) return;

    const t = setInterval(() => refreshUnread({ silent: true }), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ badge: realtime (robusto)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`client-notifications-badge-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshUnread({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshUnread({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshUnread({ silent: true })
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refreshUnread({ silent: true });
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (location.state?.disableHomeShared) {
      nav("/client", { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="min-h-[100dvh] bg-[#F5F5F5] px-6 pt-[40px] pb-[calc(24px+env(safe-area-inset-bottom)+90px)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <style>{`
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Header + Search (mock) */}
      <div
          className="-mx-6 -mt-[40px] px-6 pt-[max(40px,env(safe-area-inset-top))] pb-6 rounded-b-[34px] relative overflow-hidden"
          style={{
            backgroundColor: "#1E2F5D",
            backgroundImage: `url(${patronBg})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
        <div className="flex items-start justify-between gap-4">
          <div className="pt-1">
            <p className="text-[13px] text-white/70">Hola,</p>
            <h1 className="mt-1 text-[28px] font-extrabold text-white leading-tight">{firstName}</h1>
            <p className="mt-1 text-[13px] font-medium text-white/70">Te damos la bienvenida a orby</p>
          </div>

          <button
            type="button"
            className="relative h-14 w-14 mt-[26px] rounded-full bg-transparent grid place-items-center"
            style={{ background: "rgba(154, 200, 249, 0.07)" }} // más sutil
            aria-label="Notificaciones"
            title="Notificaciones"
            onClick={() => nav("/client/notifications")}
          >
            <BellIcon className="h-6 w-6 text-white" />

            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-white text-[#1E2F5D] text-[10px] font-extrabold grid place-items-center shadow">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        </div>

        <div className="mt-5">
          <div
            onClick={() => nav("/client/search")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && nav("/client/search")}
            className="w-full flex items-center gap-2 rounded-full bg-white px-5 py-3.5 shadow-[0_14px_28px_rgba(0,0,0,0.16)] cursor-text select-none"
          >
            <IconifyIcon icon="mdi:magnify" className="h-5 w-5 text-black/35 shrink-0" />
            <span className="text-[13px] text-black/35">Buscar servicio o prestador</span>
          </div>
        </div>
      </div>

      {/* Categorías */}
      <div className="mt-7 relative z-10">
        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">Explorá por categorías</h2>

          <button
            type="button"
            className="text-sm text-black/40 flex items-center gap-1 relative z-[50] pointer-events-auto"
            onPointerDownCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nav("/client/categories");
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nav("/client/categories");
            }}
          >
            Ver más <span className="text-lg leading-none">›</span>
          </button>
        </div>

        <div className="mt-3 -mx-6 px-6 flex gap-[11px] overflow-x-auto py-4 hide-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => nav(`/client/categories/${encodeURIComponent(c.key)}`)}
              className="w-[123px] h-[122px] flex-shrink-0 rounded-2xl bg-white shadow-[0_3px_10px_rgba(0,0,0,0.07)] p-4 text-left flex flex-col justify-between"
            >
              <CategoryIcon name={c.icon} />
              <p className="text-[12px] leading-[14px] font-semibold text-[#1E2F5D] whitespace-pre-line">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Populares */}
      <div className="mt-6 relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">Servicios populares</h2>
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-3 -mx-6 px-6 flex gap-3 overflow-x-auto hide-scrollbar pt-4 pb-10">
          {loading && Array.from({ length: 4 }).map((_, i) => <PopularCardSkeleton key={i} />)}

          {!loading &&
            !err &&
            popular.map((o) => {
              const cat = o?.catalog;
              const prov = o?.provider;
              const isA = cat?.pricing_type === "A";
              const price = isA && o?.base_price != null ? Number(o.base_price) : null;

              const verified = hasCertification(prov);

              const providerId = o?.provider_id || prov?.id;
              const stats = providerId ? reviewStats[providerId] : null;
              const reviewCount = stats?.count ?? 0;
              const reviewAvg = typeof stats?.avg === "number" && Number.isFinite(stats.avg) ? stats.avg : null;

              const ratingText = reviewAvg != null ? reviewAvg.toFixed(1) : "—";

              function goToRequest() {
                nav(`/client/services/${o.id}`);
              }

              function goToProviderProfile(e) {
                e?.stopPropagation?.();
                nav(`/client/provider/${o.id}`);
              }

              return (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={goToRequest}
                  onKeyDown={(e) => e.key === "Enter" && goToRequest()}
                  className="w-[290px] h-[190px] my-2 flex-shrink-0 bg-white rounded-[24px] shadow-[0_10px_22px_rgba(0,0,0,0.05)] cursor-pointer select-none"
                  style={{ padding: 19 }}
                >
                  <div className="h-full flex flex-col">
                    {/* TOP: título + rating */}
                  <div className="mt-[10px] flex items-start justify-between gap-3">
                    <p
                      className="min-w-0 text-[16px] leading-[22px] font-semibold text-black line-clamp-2"
                      style={{ fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
                      title={cat?.name || "Servicio"}
                    >
                      {cat?.name || "Servicio"}
                    </p>

                    {Number.isFinite(Number(o?.duration_minutes)) && Number(o.duration_minutes) > 0 ? (
                      <span
                        className="shrink-0 inline-flex items-center h-7 px-3 rounded-full text-[12px] font-extrabold"
                        style={{ background: "rgba(44,72,148,0.18)", color: "#1E2F5D" }}
                      >
                        {Number(o.duration_minutes)} min
                      </span>
                    ) : null}
                  </div>

                                  {/* Categoría (entre nombre y precio) */}
                  <p className="text-[12px] font-semibold text-black/35">
                    {cat?.category_name || cat?.category || cat?.category_label || "Categoría"}
                  </p>

                  {/* Bottom row: precio + RATING (en lugar de duración) */}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[14px] leading-[18px] text-black/70">
                      {price != null ? `$${price.toLocaleString("es-AR")}` : "Cotización"}
                    </p>


                  </div>

                    <div className="flex-1" />

                    <div className="h-px w-full bg-black/10" />

                    <div className="mt-[10px] flex items-center gap-[10px] min-w-0">
                      <span className="h-[34px] w-[34px] rounded-full bg-black/20 grid place-items-center overflow-hidden shrink-0">
                        {prov?.avatar_url ? (
                          <img
                            src={prov.avatar_url}
                            alt={prov?.full_name || "Prestador"}
                            className="h-full w-full object-cover"
                            draggable="false"
                          />
                        ) : (
                          <IconifyIcon icon="mdi:account" className="h-[18px] w-[18px] text-white/90" />
                        )}
                      </span>

                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={goToProviderProfile}
                          className="truncate text-left font-medium text-black"
                          style={{
                            fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                            fontSize: 15,
                            lineHeight: "14px",
                          }}
                          title={prov?.full_name || "Prestador"}
                        >
                          {prov?.full_name || "Prestador"}
                        </button>

                        {verified && <VerifiedBadgeIcon className="h-[14px] w-[14px]" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
}