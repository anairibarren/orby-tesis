// src/pages/client/Favorites.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";

function VerifiedBadge() {
  return <IconifyIcon icon="mdi:check-decagram" className="h-4 w-4 text-[#4368C5]" />;
}

function ServiceChip({ label }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-semibold text-black/55">
      {label}
    </span>
  );
}

export default function Favorites() {
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    if (!user?.id) return;
    setErr("");
    setLoading(true);

    try {
      // Traemos favoritos y el servicio específico (provider_service_id)
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          id,
          created_at,
          provider_service_id,
          provider_id,
          provider_services:provider_service_id (
            id,
            provider_id,
            base_price,
            created_at,
            service_catalog:catalog_id ( id, name, pricing_type ),
            profiles:provider_id ( id, full_name, neighborhood, avatar_url, provider_verified )
          )
        `
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const base = data || [];

      // ✅ Queremos mostrar TODOS los servicios publicados por ese provider (chips)
      // Hacemos una segunda query por provider_id para traer catálogos (simple, sin joins raros).
      const providerIds = Array.from(
        new Set(
          base
            .map((r) => r?.provider_services?.provider_id)
            .filter(Boolean)
            .map(String)
        )
      );

      let allServicesByProvider = {};
      if (providerIds.length) {
        const { data: psAll, error: psErr } = await supabase
          .from("provider_services")
          .select(
            `
            id,
            provider_id,
            service_catalog:catalog_id ( id, name )
          `
          )
          .in("provider_id", providerIds);

        if (!psErr && Array.isArray(psAll)) {
          for (const item of psAll) {
            const pid = String(item.provider_id || "");
            const name = item?.service_catalog?.name;
            if (!pid || !name) continue;
            if (!allServicesByProvider[pid]) allServicesByProvider[pid] = [];
            allServicesByProvider[pid].push(String(name));
          }

          // dedupe + orden
          for (const pid of Object.keys(allServicesByProvider)) {
            allServicesByProvider[pid] = Array.from(new Set(allServicesByProvider[pid])).sort((a, b) =>
              a.localeCompare(b, "es")
            );
          }
        }
      }

      // inyectamos servicios en cada row
      const merged = base.map((r) => {
        const pid = String(r?.provider_services?.provider_id || "");
        return {
          ...r,
          __allServiceNames: allServicesByProvider[pid] || [],
        };
      });

      setRows(merged);
    } catch (e) {
      setErr(e?.message || "No se pudieron cargar favoritos.");
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(favId) {
    try {
      const { error } = await supabase.from("favorites").delete().eq("id", favId);
      if (error) throw error;
      setRows((prev) => prev.filter((x) => x.id !== favId));
      toast.success("Listo", "Se quitó de favoritos.");
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo quitar.");
    }
  }

  useEffect(() => {
    load().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const count = rows.length;

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div
        className="w-full pb-24 box-border overflow-x-hidden"
        style={{
          paddingTop: "max(24px, env(safe-area-inset-top))",
        }}
      >
        <div
          className="mx-auto w-full max-w-[460px] box-border"
          style={{
            paddingLeft: "max(16px, env(safe-area-inset-left))",
            paddingRight: "max(16px, env(safe-area-inset-right))",
          }}
        >
          {/* Header (sin p debajo) */}
          <div className="relative flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="absolute left-0 h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-xl leading-none">‹</span>
            </button>

            <h1 className="text-[16px] font-extrabold text-[#3D3D3D]">Favoritos</h1>
          </div>

          {/* Contador a la derecha (no mostrar 0) */}
          {(loading || count > 0) && (
            <div className="mt-4 flex items-center justify-end">
              <p className="text-[12px] font-semibold text-black/45">
                {loading ? "Cargando…" : `${count} prestadores`}
              </p>
            </div>
          )}

          {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

          {/* Empty state (sin fondo blanco + centrado) */}
          {!loading && !err && count === 0 && (
            <div className="mt-8 min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
              <div className="h-12 w-12 rounded-[14px] bg-black/[0.04] grid place-items-center">
                <IconifyIcon icon="mdi:heart-outline" className="h-6 w-6 text-black/35" />
              </div>

              <p className="mt-4 text-[14px] font-extrabold text-[#3D3D3D]">
                Todavía no guardaste favoritos
              </p>
              <p className="mt-2 text-[12px] text-black/45 leading-relaxed max-w-[260px]">
                Cuando guardes un prestador, te va a aparecer acá.
              </p>

              <button
                type="button"
                onClick={() => nav("/client/search")}
                className="mt-5 h-11 px-5 rounded-full bg-[#1E2F5D] text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(30,47,93,0.18)] active:scale-[0.98] transition"
              >
                Explorar servicios
              </button>
            </div>
          )}

          {/* Listado */}
          {!loading && !err && count > 0 && (
            <div className="mt-4 grid gap-3">
              {rows.map((r) => {
                const ps = r.provider_services;
                const prov = ps?.profiles;

                const verified = !!prov?.provider_verified;
                const services = Array.isArray(r.__allServiceNames) ? r.__allServiceNames : [];

                return (
                  <div key={r.id} className="rounded-[24px]">
                    {/* ✅ Card SIN overflow-hidden para que no corte sombras internas */}
                    <div className="rounded-[24px] bg-white shadow-[0_12px_26px_rgba(0,0,0,0.08)] p-4">
                      <button
                        type="button"
                        onClick={() => nav(`/client/provider/${ps?.id}`)}
                        className="w-full flex items-start gap-3 text-left"
                      >
                        <div className="h-12 w-12 rounded-[18px] bg-black/[0.04] overflow-hidden grid place-items-center shrink-0">
                          {prov?.avatar_url ? (
                            <img
                              src={prov.avatar_url}
                              alt={prov?.full_name || "Prestador"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <IconifyIcon icon="mdi:account" className="h-6 w-6 text-black/25" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-[15px] font-extrabold text-[#3D3D3D] truncate">
                              {prov?.full_name || "Prestador"}
                            </p>
                            {verified && <VerifiedBadge />}
                          </div>

                          <p className="mt-1 text-[12px] text-black/45 truncate">
                            {prov?.neighborhood || "—"}
                          </p>

                          {/* ✅ Todos los servicios publicados (chips) */}
                          {services.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {services.slice(0, 8).map((name) => (
                                <ServiceChip key={name} label={name} />
                              ))}
                              {services.length > 8 ? (
                                <ServiceChip label={`+${services.length - 8}`} />
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-[12px] font-semibold text-black/50">
                              Servicios publicados: —
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => nav(`/client/services/${ps?.id}`)}
                          className="h-10 px-4 rounded-full bg-[#1E2F5D] text-white text-[12px] font-semibold active:scale-[0.98] transition flex items-center gap-2 shrink-0"
                        >
                          <IconifyIcon icon="mdi:calendar" className="h-4 w-4" />
                          Agendar
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFavorite(r.id)}
                          className="text-[12px] font-semibold text-black/45 hover:text-black/70"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
