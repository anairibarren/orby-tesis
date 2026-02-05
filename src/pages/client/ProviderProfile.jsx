// src/pages/client/ProviderProfile.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { listProviderAvailability } from "../../services/availability";
import { getProviderServiceById } from "../../services/services";

/* ---------------- utils ---------------- */
const norm = (v) => String(v ?? "").trim();

function isSchemaCacheMissing(err, name) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("schema cache") && msg.includes(String(name).toLowerCase());
}

function weekdayLabel(iso) {
  const map = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo" };
  return map[iso] || "—";
}

function toISOWeekday(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  if (x >= 0 && x <= 6) return x === 0 ? 7 : x;
  if (x >= 1 && x <= 7) return x;
  return null;
}

function formatRange(start, end) {
  if (!start || !end) return "—";
  return `${start} – ${end}`;
}

function mergeAvailability(ranges = []) {
  const byDay = new Map();
  for (const r of ranges) {
    const dayISO = toISOWeekday(r.weekday ?? r.day_of_week);
    if (!dayISO) continue;
    const start = r.start_time;
    const end = r.end_time;
    if (!start || !end) continue;
    if (!byDay.has(dayISO)) byDay.set(dayISO, []);
    byDay.get(dayISO).push({ start, end });
  }

  const out = [];
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);
  for (const d of days) {
    const segs = (byDay.get(d) || []).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const merged = [];
    for (const s of segs) {
      const last = merged[merged.length - 1];
      if (!last) merged.push({ ...s });
      else {
        if (String(s.start) <= String(last.end)) {
          if (String(s.end) > String(last.end)) last.end = s.end;
        } else merged.push({ ...s });
      }
    }
    out.push({ dayISO: d, label: weekdayLabel(d), ranges: merged });
  }
  return out;
}

function pricingLabel(pricingType) {
  if (pricingType === "A") return "Precio fijo";
  if (pricingType === "B") return "Precio variable";
  return "Cotización";
}

function shareText({ providerName, serviceName }) {
  const p = providerName ? `Prestador: ${providerName}` : "Prestador en Orby";
  const s = serviceName ? `Servicio: ${serviceName}` : "";
  return [p, s, "Encontralo en Orby"].filter(Boolean).join("\n");
}

function initials(name) {
  const n = String(name || "").trim();
  if (!n) return "—";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || a.toUpperCase();
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------------- UI atoms ---------------- */
function Card({ children, className = "" }) {
  return (
    <div className={["w-full rounded-[22px] bg-white border border-black/10 shadow-[0_14px_28px_rgba(0,0,0,0.06)]", className].join(" ")}>
      {children}
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span className={["inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold", className].join(" ")}>
      {children}
    </span>
  );
}

function StarsStatic({ value }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.round(v);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <IconifyIcon
          key={i}
          icon={i + 1 <= full ? "solar:star-bold" : "solar:star-line-duotone"}
          className={["h-5 w-5", i + 1 <= full ? "text-[#E3B100]" : "text-black/20"].join(" ")}
        />
      ))}
    </div>
  );
}

function StatRow({ icon, children }) {
  return (
    <div className="inline-flex items-center gap-2 text-[12px] text-black/60">
      <IconifyIcon icon={icon} className="h-4 w-4 text-black/45" />
      <span className="leading-none">{children}</span>
    </div>
  );
}

/* ---------------- In-app Viewer (certificado) ---------------- */
function ViewerModal({ open, onClose, title, url }) {
  const isImg = useMemo(() => {
    const u = String(url || "").toLowerCase();
    return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp");
  }, [url]);

  const isPdf = useMemo(() => String(url || "").toLowerCase().includes(".pdf"), [url]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[9999]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Cerrar" />
          <motion.div
            className="absolute inset-x-0 top-10 bottom-10 mx-auto max-w-[520px] px-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          >
            <div className="h-full rounded-[24px] bg-white shadow-2xl overflow-hidden flex flex-col border border-black/10">
              <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
                <p className="text-[14px] font-semibold text-[#111827] truncate">{title || "Archivo"}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center"
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <IconifyIcon icon="solar:close-circle-linear" className="h-6 w-6 text-black/55" />
                </button>
              </div>

              <div className="flex-1 bg-black/[0.02]">
                {!url ? (
                  <div className="h-full grid place-items-center p-6 text-center">
                    <p className="text-sm text-black/50">No hay archivo para mostrar.</p>
                  </div>
                ) : isImg ? (
                  <div className="h-full w-full grid place-items-center p-3">
                    <img src={url} alt="Certificado" className="max-h-full max-w-full rounded-2xl object-contain" />
                  </div>
                ) : isPdf ? (
                  <iframe title="Certificado" src={url} className="h-full w-full" style={{ border: "none" }} />
                ) : (
                  <iframe title="Archivo" src={url} className="h-full w-full" style={{ border: "none" }} />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- page ---------------- */
export default function ProviderProfile() {
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { providerServiceId } = useParams();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("info"); // info | cert | reviews
  const [viewerOpen, setViewerOpen] = useState(false);

  // favorites
  const [favLoading, setFavLoading] = useState(false);
  const [isFav, setIsFav] = useState(false);

  // reviews
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState({ avg: null, count: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });

  const provider = offer?.provider || null;
  const catalog = offer?.catalog || null;

  const providerName = provider?.full_name || "Prestador";
  const serviceName = catalog?.name || "Servicio";
  const avatar = provider?.avatar_url;

  const about = useMemo(() => {
    const txt = provider?.about || provider?.bio || provider?.description || provider?.provider_description || "";
    return String(txt || "").trim();
  }, [provider]);

  const certUrl = useMemo(() => {
    const direct =
      provider?.certificate_url ||
      provider?.cert_url ||
      provider?.certificate_file_url ||
      provider?.cert_file_url ||
      provider?.certificate ||
      provider?.certificado_url ||
      "";

    if (norm(direct)) return String(direct);

    try {
      const arr = JSON.parse(provider?.certificate_urls || "[]");
      const first = Array.isArray(arr) ? arr.find((u) => norm(u)) : "";
      return first ? String(first) : "";
    } catch {
      return "";
    }
  }, [provider]);

  const isVerified = useMemo(() => !!norm(certUrl), [certUrl]);

  async function loadAvailability(providerId) {
    const av = await listProviderAvailability(providerId);
    setAvailability(mergeAvailability(av || []));
  }

  async function loadFavoriteState({ clientId, providerId }) {
    if (!clientId || !providerId) return;
    try {
      const { data, error } = await supabase.from("favorites").select("id").eq("client_id", clientId).eq("provider_id", providerId).limit(1);
      if (error) throw error;
      setIsFav((data || []).length > 0);
    } catch (e) {
      if (isSchemaCacheMissing(e, "favorites")) {
        setIsFav(false);
        return;
      }
      setIsFav(false);
    }
  }

  async function loadReviews(providerId) {
    if (!providerId) return;
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          request_id,
          provider_id,
          client_id,
          rating,
          comment,
          created_at,
          client:client_id ( id, full_name, avatar_url )
        `
        )
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) throw error;

      const arr = data || [];
      setReviews(arr);

      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let cnt = 0;

      for (const r of arr) {
        const rt = Number(r.rating);
        if (!Number.isFinite(rt)) continue;
        const clamped = Math.max(1, Math.min(5, Math.round(rt)));
        dist[clamped] = (dist[clamped] || 0) + 1;
        sum += rt;
        cnt += 1;
      }

      setReviewsSummary({
        avg: cnt ? sum / cnt : null,
        count: cnt,
        dist,
      });
    } catch {
      setReviews([]);
      setReviewsSummary({ avg: null, count: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    let chAv = null;
    let chReviews = null;

    (async () => {
      try {
        setErr("");
        setLoading(true);

        const data = await getProviderServiceById(providerServiceId);
        if (!alive) return;

        setOffer(data);

        const provId = data?.provider_id;
        if (provId) {
          await loadAvailability(provId);
          await loadReviews(provId);

          chAv = supabase
            .channel(`provider-av-${provId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "provider_availability", filter: `provider_id=eq.${provId}` }, () =>
              loadAvailability(provId).catch(() => null)
            )
            .subscribe();

          chReviews = supabase
            .channel(`provider-reviews-${provId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reviews", filter: `provider_id=eq.${provId}` }, () =>
              loadReviews(provId).catch(() => null)
            )
            .subscribe();

          await loadFavoriteState({ clientId: user?.id, providerId: provId });
        }
      } catch (e) {
        if (alive) setErr(e?.message || "No se pudo cargar el perfil.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (chAv) supabase.removeChannel(chAv);
      if (chReviews) supabase.removeChannel(chReviews);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerServiceId, user?.id]);

  async function toggleFavorite() {
    if (!user?.id) return toast.error("Error", "Tenés que iniciar sesión.");
    if (!offer?.provider_id) return toast.error("Error", "Falta prestador.");

    setFavLoading(true);
    try {
      if (!isFav) {
        const { error } = await supabase.from("favorites").insert({
          client_id: user.id,
          provider_id: offer.provider_id,
          provider_service_id: offer.id,
        });
        if (error) throw error;
        setIsFav(true);
        toast.success("Listo", "Agregado a favoritos.");
      } else {
        const { error } = await supabase.from("favorites").delete().eq("client_id", user.id).eq("provider_id", offer.provider_id);
        if (error) throw error;
        setIsFav(false);
        toast.success("Listo", "Quitado de favoritos.");
      }
    } catch (e) {
      if (isSchemaCacheMissing(e, "favorites")) toast.error("Falta configuración", "No existe la tabla favorites (schema cache).");
      else toast.error("Error", e?.message || "No se pudo actualizar favoritos.");
    } finally {
      setFavLoading(false);
    }
  }

  async function onShare() {
    try {
      const text = shareText({ providerName, serviceName });
      if (navigator.share) await navigator.share({ title: "Orby", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copiado", "Se copió al portapapeles.");
      }
    } catch {
      // noop
    }
  }

  function goBack() {
    try {
      nav(-1);
      window.setTimeout(() => {
        if (window.history.length <= 1) nav("/client", { replace: true, state: { disableHomeShared: true } });
      }, 0);
    } catch {
      nav("/client", { replace: true, state: { disableHomeShared: true } });
    }
  }

  function goSchedule() {
    nav(`/client/services/${offer?.id}`);
  }

  const avgLabel = useMemo(() => {
    const a = reviewsSummary.avg;
    return typeof a === "number" && Number.isFinite(a) ? a.toFixed(1) : "—";
  }, [reviewsSummary.avg]);

  const totalReviews = reviewsSummary.count || 0;

  if (loading) return <div className="min-h-screen bg-[#F5F5F5] p-6">Cargando…</div>;

  if (err) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6">
        <button type="button" onClick={goBack} className="text-sm text-[#2A4691]">
          ← Volver
        </button>
        <p className="mt-4 text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const tabItems = [
    { key: "info", label: "Info", icon: "solar:info-circle-linear" },
    { key: "cert", label: "Certif.", icon: "solar:diploma-verified-linear" },
    { key: "reviews", label: "Reseñas", icon: "solar:star-linear" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      {/* TOP BAR */}
      <div className="relative">
        <div className="h-[92px] w-full bg-[#F5F5F5]" />

        {/* ✅ Back exacto como tu snippet */}
        <button
          type="button"
          onClick={goBack}
          className="absolute left-6 top-6 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
          aria-label="Volver"
          title="Volver"
        >
          <span className="text-2xl leading-none">‹</span>
        </button>

        {/* ✅ Iconify (share/fav) - CAMBIAR ESTE BLOQUE */}
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            className="h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition"
            aria-label="Compartir"
            title="Compartir"
          >
            {/* icono nuevo */}
            <IconifyIcon icon="solar:upload-minimalistic-linear" className="h-6 w-6 text-black/70" />
          </button>

          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favLoading}
            className={[
              "h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition",
              favLoading ? "opacity-60" : "",
            ].join(" ")}
            aria-label="Favorito"
            title="Favorito"
          >
            {/* icono nuevo */}
            <IconifyIcon
              icon={isFav ? "solar:heart-bold-duotone" : "solar:heart-linear"}
              className={["h-6 w-6", isFav ? "text-[#E34848]" : "text-black/70"].join(" ")}
            />
          </button>
        </div>


        {/* HEADER (menos cargado) */}
        <div className="px-6 -mt-1">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-[70px] w-[70px] rounded-[18px] bg-black/[0.03] overflow-hidden grid place-items-center shrink-0 border border-black/10">
                {avatar ? (
                  <img src={avatar} alt={providerName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[14px] font-semibold text-[#1E2F5D]">{initials(providerName)}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center min-w-0">
                  <p className="text-[17px] font-semibold text-[#111827] truncate">{providerName}</p>
                  {isVerified ? <IconifyIcon icon="solar:verified-check-bold" className="ml-1 h-[18px] w-[18px] text-[#2A4691]" /> : null}
                </div>

                <p className="mt-0.5 text-[13px] text-black/55 truncate">{serviceName}</p>

                {/* ✅ SOLO ubicación - CAMBIAR ESTE BLOQUE */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {provider?.neighborhood ? (
                    <StatRow icon="solar:map-point-linear">{provider.neighborhood}</StatRow>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

<div className="px-6 mt-3">
            <div className="rounded-full bg-white border border-black/10 shadow-[0_12px_26px_rgba(0,0,0,0.06)] p-1">
              <div className="relative grid grid-cols-3">
                {tabItems.map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={[
                        "relative z-[2] h-11 rounded-full flex items-center justify-center gap-2 text-[13px] font-semibold transition",
                        active ? "text-[#1E2F5D]" : "text-black/55",
                      ].join(" ")}
                    >
                      <IconifyIcon icon={t.icon} className="h-5 w-5" />
                      <span>{t.label}</span>

                      {active && (
                        <motion.span
                          layoutId="tab-pill"
                          className="absolute inset-0 z-[-1] rounded-full bg-[#F2F6FF] border border-[#1E2F5D]/10"
                          transition={{ type: "spring", stiffness: 520, damping: 40 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>


      {/* ✅ NUEVO: Tabs “profesional” tipo top-nav + underline (sin pastillas) integrado a la misma card */}
      <div className="px-6 mt-2 pb-[220px]">
        <Card className="p-0 overflow-hidden">


          <div className="h-px bg-black/10" />

          <div className="p-5">
            <AnimatePresence mode="wait">
              {tab === "info" && (
                <motion.div
                  key="tab-info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="grid gap-6"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-black/[0.035] grid place-items-center border border-black/10 shrink-0">
                        <IconifyIcon icon="solar:user-linear" className="h-5 w-5 text-black/55" />
                      </span>
                      <p className="text-[14px] font-semibold text-[#111827]">Sobre mí</p>
                    </div>

                    <p className="mt-3 text-[13px] leading-relaxed text-black/60">
                      {about || "Este prestador todavía no agregó una descripción."}
                    </p>
                  </div>

                  <div className="h-px bg-black/10" />

                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-black/[0.035] grid place-items-center border border-black/10 shrink-0">
                        <IconifyIcon icon="solar:clock-circle-linear" className="h-5 w-5 text-black/55" />
                      </span>
                      <p className="text-[14px] font-semibold text-[#111827]">Horarios</p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {availability.length ? (
                        availability.map((d) => (
                          <div
                            key={d.dayISO}
                            className="rounded-[16px] border border-black/10 bg-[#F7F7F7] px-4 py-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="h-5 w-1.5 rounded-full bg-[#1E2F5D]" />
                              <p className="text-[14px] font-semibold text-[#1E2F5D]">{d.label}</p>
                            </div>

                            <p className="text-[13px] font-medium text-black/60">
                              {d.ranges.length ? formatRange(d.ranges[0].start, d.ranges[d.ranges.length - 1].end) : "—"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[16px] border border-black/10 bg-[#F7F7F7] p-4">
                          <p className="text-[13px] font-semibold text-[#111827]">Sin disponibilidad cargada</p>
                          <p className="mt-1 text-[12px] text-black/50">Este prestador todavía no publicó horarios.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "cert" && (
                <motion.div
                  key="tab-cert"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-black/[0.035] grid place-items-center border border-black/10 shrink-0">
                      <IconifyIcon icon="solar:diploma-linear" className="h-5 w-5 text-black/55" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#111827]">Certificaciones</p>
                      <p className="mt-1 text-[12px] text-black/50">{norm(certUrl) ? "Tocá para ver el archivo." : "No hay certificaciones cargadas."}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => norm(certUrl) && setViewerOpen(true)}
                    disabled={!norm(certUrl)}
                    className={[
                      "mt-4 w-full rounded-[18px] border border-black/10 bg-[#F7F7F7] px-4 py-4 flex items-center justify-between",
                      norm(certUrl) ? "active:scale-[0.99] transition" : "opacity-60 cursor-not-allowed",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-10 w-10 rounded-full bg-white grid place-items-center shrink-0 border border-black/10">
                        <IconifyIcon icon="solar:file-text-linear" className="h-5 w-5 text-[#2A4691]" />
                      </span>

                      <div className="min-w-0 text-left">
                        <p className="text-[13px] font-semibold text-[#111827] truncate">Certificado</p>
                        <p className="mt-0.5 text-[12px] text-black/50 truncate">{norm(certUrl) ? "Ver archivo" : "Sin archivo"}</p>
                      </div>
                    </div>

                    <IconifyIcon icon="solar:alt-arrow-right-linear" className="h-5 w-5 text-black/30 shrink-0" />
                  </button>
                </motion.div>
              )}

              {tab === "reviews" && (
              <motion.div
                key="tab-reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="grid gap-5"
              >
                {/* HEADER (igual a referencia) */}
                <div className="flex items-start justify-between gap-4">
                  {/* izquierda: número grande + subrayado */}
                  <div className="shrink-0">
                    <p className="text-[44px] leading-none font-semibold text-[#111827]">{avgLabel}</p>
                    <div className="mt-2 h-[3px] w-10 rounded-full bg-[#2A4691]" />
                  </div>

                  {/* centro: estrellas + “4.5 145 reseñas” */}
                  <div className="min-w-0 flex-1">
                    <div className="mt-1">
                      <StarsStatic value={reviewsSummary.avg || 0} />
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[12px] text-black/55">
                      <span className="font-medium text-black/60">{avgLabel}</span>
                      <span className="text-black/25">|</span>
                      <span>{totalReviews ? `${totalReviews} reseñas` : "Sin reseñas"}</span>
                    </div>
                  </div>

                  {/* derecha: botón circular (chevron) */}
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full border border-black/10 bg-white shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
                    aria-label="Opciones"
                    title="Opciones"
                  >
                    <IconifyIcon icon="solar:alt-arrow-down-linear" className="h-5 w-5 text-black/55" />
                  </button>
                </div>

                {/* BARRAS (igual a referencia) */}
                <div className="grid gap-3">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const cnt = reviewsSummary.dist?.[n] || 0;
                    const pct = totalReviews ? (cnt / totalReviews) * 100 : 0;

                    return (
                      <div key={n} className="flex items-center gap-4">
                        {/* barra */}
                        <div className="h-[8px] flex-1 rounded-full bg-black/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#E3B100]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* label derecha: “5.0 ★” */}
                        <div className="w-14 flex items-center justify-end gap-1 text-[12px] text-black/55">
                          <span className="tabular-nums">{Number(n).toFixed(1)}</span>
                          <IconifyIcon icon="solar:star-bold" className="h-4 w-4 text-[#E3B100]" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* (opcional) Lista de reseñas como venías: si querés la dejamos o la sacamos.
                    La dejo tal cual tu lógica previa para no tocar contenido: */}
                <div className="grid gap-3">
                  {reviewsLoading && (
                    <div className="rounded-[18px] border border-black/10 bg-white p-5 animate-pulse">
                      <div className="h-4 w-44 rounded bg-black/10" />
                      <div className="mt-3 h-3 w-72 rounded bg-black/10" />
                      <div className="mt-2 h-3 w-56 rounded bg-black/10" />
                    </div>
                  )}

                  {!reviewsLoading && reviews.length === 0 && (
                    <div className="rounded-[18px] border border-black/10 bg-white p-5">
                      <p className="text-[14px] font-semibold text-[#111827]">Todavía no hay reseñas</p>
                      <p className="mt-1 text-[12px] text-black/50">
                        Cuando complete turnos, van a aparecer automáticamente.
                      </p>
                    </div>
                  )}

                  {!reviewsLoading &&
                    reviews.map((r) => {
                      const clientName = r?.client?.full_name || "Cliente";
                      const clientAvatar = r?.client?.avatar_url || null;
                      const rating = Number(r?.rating);
                      const score = Number.isFinite(rating) ? Math.max(1, Math.min(5, Math.round(rating))) : null;
                      const comment = String(r?.comment || "").trim();

                      return (
                        <div key={r.id} className="rounded-[18px] border border-black/10 bg-white p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-full overflow-hidden border border-black/10 bg-black/[0.03] shrink-0 grid place-items-center">
                                {clientAvatar ? (
                                  <img src={clientAvatar} alt={clientName} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[12px] font-semibold text-[#1E2F5D]">{initials(clientName)}</span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-[#111827] truncate">{clientName}</p>
                                <p className="text-[12px] text-black/45">{formatDateShort(r?.created_at)}</p>
                              </div>
                            </div>

                            <div className="inline-flex items-center gap-1 text-[12px] text-black/55">
                              <span className="font-medium">{score ?? "—"}</span>
                              <IconifyIcon icon="solar:star-bold" className="h-4 w-4 text-[#E3B100]" />
                            </div>
                          </div>

                          {comment ? (
                            <p className="mt-3 text-[13px] text-black/60 leading-relaxed whitespace-pre-line">
                              {comment}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}



            </AnimatePresence>
          </div>
        </Card>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={goSchedule}
        className="
          fixed left-6 right-6 bottom-[90px] z-[50]
          h-[54px] rounded-full
          bg-[#1E2F5D] text-white
          text-[14px] font-semibold
          shadow-[0_18px_34px_rgba(30,47,93,0.26)]
          active:scale-[0.99] transition
          flex items-center justify-center gap-2
        "
      >
        <IconifyIcon icon="solar:calendar-linear" className="h-5 w-5" />
        Agendar
      </button>

      <ViewerModal open={viewerOpen} onClose={() => setViewerOpen(false)} title="Certificado" url={certUrl} />
    </div>
  );
}
