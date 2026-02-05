// src/pages/client/Favorites.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";

function IconButton({ onClick, title, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="h-11 w-11 rounded-full bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] grid place-items-center active:scale-[0.98] transition"
    >
      <IconifyIcon icon={icon} className="h-7 w-7 text-black/60" />
    </button>
  );
}

function VerifiedBadge() {
  return <IconifyIcon icon="mdi:check-decagram" className="h-4 w-4 text-[#4368C5]" />;
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
      // ⚠️ Sin certificate_url en el select para que NO explote si no existe la columna.
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
      setRows(data || []);
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
      <div className="px-6 pt-[40px] pb-6">
        <div className="flex items-center justify-between">
          <IconButton onClick={() => nav(-1)} title="Volver" icon="mdi:chevron-left" />
          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Favoritos</h1>
          <div className="h-11 w-11" />
        </div>

        <p className="mt-4 text-[12px] font-semibold text-black/45">{loading ? "Cargando…" : `${count} prestadores`}</p>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {!loading && !err && count === 0 && (
          <div className="mt-4 rounded-[24px] bg-white shadow-[0_12px_26px_rgba(0,0,0,0.08)] p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-black/[0.04] grid place-items-center">
              <IconifyIcon icon="mdi:heart-outline" className="h-7 w-7 text-black/35" />
            </div>
            <p className="mt-3 text-[14px] font-extrabold text-[#3D3D3D]">Todavía no guardaste favoritos</p>
            <p className="mt-1 text-[12px] text-black/50">Cuando guardes un prestador, aparece acá.</p>
            <button
              type="button"
              onClick={() => nav("/client/search")}
              className="mt-4 h-11 px-5 rounded-full bg-[#1E2F5D] text-white text-[13px] font-semibold active:scale-[0.98] transition"
            >
              Explorar servicios
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-3">
          {rows.map((r) => {
            const ps = r.provider_services;
            const prov = ps?.profiles;
            const cat = ps?.service_catalog;

            const verified = !!prov?.provider_verified;
            const price =
              cat?.pricing_type === "A" && ps?.base_price != null
                ? `$${Number(ps.base_price).toLocaleString("es-AR")}`
                : "Cotización";

            return (
              <div
                key={r.id}
                className="rounded-[24px] bg-white shadow-[0_12px_26px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => nav(`/client/provider/${ps?.id}`)}
                  className="w-full px-4 pt-4 pb-3 flex items-start gap-3 text-left"
                >
                  <div className="h-12 w-12 rounded-[18px] bg-black/[0.04] overflow-hidden grid place-items-center shrink-0">
                    {prov?.avatar_url ? (
                      <img src={prov.avatar_url} alt={prov?.full_name || "Prestador"} className="h-full w-full object-cover" />
                    ) : (
                      <IconifyIcon icon="mdi:account" className="h-6 w-6 text-black/25" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[15px] font-extrabold text-[#3D3D3D] truncate">{prov?.full_name || "Prestador"}</p>
                      {verified && <VerifiedBadge />}
                    </div>
                    <p className="mt-1 text-[12px] text-black/45 truncate">{prov?.neighborhood || "—"}</p>
                    <p className="mt-2 text-[12px] font-semibold text-black/50 truncate">{cat?.name || "Servicio"}</p>
                  </div>

                  <span className="text-[13px] font-extrabold text-[#2A4691] shrink-0">{price}</span>
                </button>

                <div className="px-4 py-3 bg-black/[0.02] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => nav(`/client/services/${ps?.id}`)}
                    className="h-10 px-4 rounded-full bg-[#1E2F5D] text-white text-[12px] font-semibold active:scale-[0.98] transition flex items-center gap-2"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
