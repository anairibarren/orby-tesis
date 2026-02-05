// src/pages/client/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { listActiveServices } from "../../services/services";
import { Icon as IconifyIcon } from "@iconify/react";
import { motion } from "framer-motion";
import { supabase } from "../../services/supabase";
import { countMyUnreadNotifications } from "../../services/notifications";

const CATEGORIES = [
  { key: "Hogar y reparaciones", label: "Hogar y\nreparaciones", icon: "tools" },
  { key: "Educación y habilidades", label: "Educación y\nhabilidades", icon: "school" },
  { key: "Cuidado y bienestar", label: "Cuidado y\nbienestar", icon: "lotus" },
  { key: "Eventos y entretenimiento", label: "Eventos y\nentretenimiento", icon: "party" },
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

function VerifiedBadgeIcon({ className = "h-[14px] w-[14px]" }) {
  return <IconifyIcon icon="mdi:check-decagram" className={`${className} text-[#4368C5] shrink-0`} />;
}

function StarIcon({ className = "h-[16px] w-[16px]" }) {
  return <IconifyIcon icon="mdi:star" className={`${className} text-[#E3B100] shrink-0`} />;
}

function BellIcon() {
  return (
    <svg
      className="h-6 w-6 text-[#3D3D3D]"
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
    <div className="w-[257px] h-[286px] flex-shrink-0 rounded-[28px] bg-white shadow-[0_3px_10px_rgba(0,0,0,0.07)] p-[7px]">
      <div className="h-[118px] w-full rounded-[22px] bg-black/10 animate-pulse" />
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-16 rounded bg-black/10 animate-pulse" />
          <div className="h-3 w-20 rounded bg-black/10 animate-pulse" />
        </div>
        <div className="mt-3 h-6 w-40 rounded bg-black/10 animate-pulse" />
        <div className="mt-2 h-4 w-24 rounded bg-black/10 animate-pulse" />
        <div className="mt-4 h-px w-full bg-black/10" />
        <div className="mt-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-black/10 animate-pulse" />
          <div className="h-4 w-32 rounded bg-black/10 animate-pulse" />
          <div className="h-4 w-4 rounded-full bg-black/10 animate-pulse" />
        </div>
      </div>
    </div>
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

export default function Home() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [popular, setPopular] = useState([]);
  const [err, setErr] = useState("");

  // ✅ notificaciones (badge)
  const [unread, setUnread] = useState(0);

  const firstName = useMemo(() => {
    const full = profile?.full_name || "";
    return full.trim().split(" ")[0] || "¡Bienvenid@!";
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

  // cargar servicios populares
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listActiveServices();
        const arr = (data || []).slice();
        arr.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
        if (alive) setPopular(arr.slice(0, 6));
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

  const enableShared = !location.state?.disableHomeShared;

  function goSearchFromHome() {
    nav("/client/search", { state: { fromHomeSearch: true } });
  }

  const SearchBar = enableShared ? motion.div : "div";
  const sharedProps = enableShared
    ? {
        layoutId: "orby-searchbar",
        transition: { layout: { type: "spring", stiffness: 520, damping: 42, mass: 0.9 } },
      }
    : {};

  return (
    <motion.div
      className="min-h-screen bg-[#F5F5F5] px-6 pt-[40px] pb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <style>{`
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black/50">Hola,</p>
          <h1 className="text-3xl font-extrabold text-[#3D3D3D] leading-tight">{firstName}!</h1>
          <p className="mt-1 text-md font-medium text-[#3D3D3D]">Te damos la bienvenida a orby</p>
        </div>

        <button
          type="button"
          className="relative h-14 w-14 mt-[8px] rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.10)] grid place-items-center"
          aria-label="Notificaciones"
          title="Notificaciones"
          onClick={() => nav("/client/notifications")}
        >
          <BellIcon />

          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-[#1E2F5D] text-white text-[11px] font-extrabold grid place-items-center shadow">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div className="mt-6 -mx-6 px-6 relative z-0">
        <SearchBar
          {...sharedProps}
          onClick={goSearchFromHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && goSearchFromHome()}
          className="w-full flex items-center gap-2 rounded-full bg-white px-5 py-4 shadow-[0_4px_14px_rgba(0,0,0,0.10)] cursor-text select-none"
        >
          <IconifyIcon icon="mdi:magnify" className="h-5 w-5 text-black/35 shrink-0" />
          <span className="text-sm text-black/35">Buscar servicio o prestador</span>
        </SearchBar>
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

        <div className="mt-3 -mx-6 px-6 flex gap-[11px] overflow-x-auto overflow-y-visible py-4 hide-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => nav(`/client/categories/${encodeURIComponent(c.key)}`)}
              className="w-[123px] h-[122px] flex-shrink-0 rounded-2xl bg-white shadow-[0_3px_10px_rgba(0,0,0,0.07)] p-4 text-left flex flex-col justify-between"
            >
              <CategoryIcon name={c.icon} />
              <p className="text-[12px] leading-[14px] font-semibold text-[#1E2F5D] whitespace-pre-line">
                {c.label}
              </p>
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

        <div className="mt-3 -mx-6 px-6 flex gap-3 overflow-x-auto overflow-y-visible py-4 hide-scrollbar items-stretch">
          {loading && Array.from({ length: 4 }).map((_, i) => <PopularCardSkeleton key={i} />)}

          {!loading &&
            !err &&
            popular.map((o) => {
              const cat = o?.catalog;
              const prov = o?.provider;
              const isA = cat?.pricing_type === "A";
              const price = isA && o?.base_price != null ? Number(o.base_price) : null;

              const verified = hasCertification(prov);
              const cover = cat?.image_url || cat?.cover_url || cat?.banner_url || "";

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
                  className="w-[257px] h-[286px] flex-shrink-0 rounded-[28px] bg-white shadow-[0_3px_10px_rgba(0,0,0,0.07)] p-[7px] text-left cursor-pointer select-none"
                >
                  <div className="h-full w-full rounded-[22px] overflow-hidden flex flex-col">
                    <div className="h-[118px] w-full bg-[#E6E6E6] overflow-hidden shrink-0">
                      {cover ? (
                        <img
                          src={cover}
                          alt={cat?.name || "Servicio"}
                          className="h-full w-full object-cover"
                          draggable="false"
                        />
                      ) : null}
                    </div>

                    <div className="px-3 pt-3 pb-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-xs text-black/45">
                        <span className="inline-flex items-center gap-1">
                          <StarIcon />
                          <span>—</span>
                        </span>
                        <span className="text-black/35">Sin reseñas</span>
                      </div>

                      <p className="mt-2 text-[15px] leading-[20px] font-semibold text-[#3D3D3D] line-clamp-2">
                        {cat?.name || "Servicio"}
                      </p>

                      <p className="mt-2 text-sm text-black/60">
                        {price != null ? `$${price.toLocaleString("es-AR")}` : "Cotización"}
                      </p>

                      <div className="mt-3 h-px w-full bg-black/10" />

                      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-8 w-8 rounded-full bg-black/10 grid place-items-center overflow-hidden shrink-0">
                            {prov?.avatar_url ? (
                              <img
                                src={prov.avatar_url}
                                alt={prov?.full_name || "Prestador"}
                                className="h-full w-full object-cover"
                                draggable="false"
                              />
                            ) : (
                              <IconifyIcon icon="mdi:account" className="h-5 w-5 text-black/35" />
                            )}
                          </span>

                          <div className="flex items-center gap-1 min-w-0">
                            <button
                              type="button"
                              onClick={goToProviderProfile}
                              className="text-sm font-semibold text-[#3D3D3D] truncate text-left"
                              title={prov?.full_name || "Prestador"}
                            >
                              {prov?.full_name || "Prestador"}
                            </button>
                            {verified && <VerifiedBadgeIcon />}
                          </div>
                        </div>
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
