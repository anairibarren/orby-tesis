// src/pages/client/ProviderProfile.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";
import { listProviderAvailability } from "../../services/availability";
import { getProviderServiceById, listProviderServicesByProvider } from "../../services/services";

/* ---------------- utils ---------------- */
const norm = (v) => String(v ?? "").trim();

function uniqUrls(arr) {
  const out = [];
  const seen = new Set();
  for (const u of arr || []) {
    const x = String(u ?? "").trim();
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function isSchemaCacheMissing(err, name) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("schema cache") && msg.includes(String(name).toLowerCase());
}

function isMissingColumn(err, col) {
  const msg = String(err?.message || "").toLowerCase();
  const needle = String(col || "").toLowerCase();
  return msg.includes("does not exist") && msg.includes(needle);
}

function isSingleCoerceError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("cannot coerce the result to a single json object");
}

function weekdayLabel(iso) {
  const map = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
  };
  return map[iso] || "—";
}

function toISOWeekday(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  if (x >= 0 && x <= 6) return x === 0 ? 7 : x;
  if (x >= 1 && x <= 7) return x;
  return null;
}

/* ✅ hora sin segundos: 20:00:00 -> 20:00 */
function formatTimeHHMM(t) {
  const s = String(t ?? "").trim();
  if (!s) return "";
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
}

function formatRange(start, end) {
  if (!start || !end) return "—";
  return `${formatTimeHHMM(start)} – ${formatTimeHHMM(end)}`;
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
    const segs = (byDay.get(d) || [])
      .slice()
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));
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

function shareText({ providerName, serviceName }) {
  const p = providerName ? providerName : "Prestador";
  const s = serviceName ? `Servicio: ${serviceName}` : null;

  return [
    `Te comparto el perfil de ${p} en orby.`,
    s,
    "Podés ver el detalle y agendar desde el link 👇",
  ].filter(Boolean).join("\n");
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

function iconForService({ name = "", category = "" }) {
  const n = String(name).toLowerCase();
  const c = String(category).toLowerCase();

  if (n.includes("plomer") || n.includes("plomero") || n.includes("cañ") || n.includes("caner")) return "mdi:pipe-wrench";
  if (n.includes("electric") || n.includes("electricista")) return "mdi:flash";
  if (n.includes("cerrajer") || n.includes("cerrajero")) return "mdi:key";
  if (n.includes("pintur") || n.includes("pintor")) return "mdi:format-paint";
  if (n.includes("limpiez") || n.includes("limpieza")) return "mdi:spray-bottle";
  if (n.includes("jardin") || n.includes("parqu")) return "mdi:flower";
  if (n.includes("mudanz") || n.includes("flete")) return "mdi:truck-outline";
  if (n.includes("masaj") || n.includes("spa")) return "mdi:spa";
  if (n.includes("uñ") || n.includes("unas") || n.includes("manicur")) return "mdi:nail";
  if (n.includes("pelu") || n.includes("barber")) return "mdi:content-cut";
  if (n.includes("maquill")) return "mdi:face-woman-shimmer";
  if (n.includes("yoga") || n.includes("entren") || n.includes("personal")) return "mdi:dumbbell";
  if (n.includes("clase") || n.includes("tutor") || n.includes("apoyo") || n.includes("prof")) return "mdi:school-outline";
  if (n.includes("fotograf") || n.includes("foto")) return "mdi:camera-outline";
  if (n.includes("dj") || n.includes("musica")) return "mdi:music";
  if (n.includes("catering") || n.includes("comida")) return "mdi:food-outline";
  if (n.includes("animac") || n.includes("show") || n.includes("evento")) return "mdi:party-popper";

  if (c.includes("hogar")) return "mdi:home-outline";
  if (c.includes("educ")) return "mdi:school-outline";
  if (c.includes("belleza") || c.includes("bienestar")) return "mdi:spa-outline";
  if (c.includes("event")) return "mdi:party-popper";

  return "mdi:briefcase-outline";
}

/* ---------------- UI atoms ---------------- */
function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white border border-black/10 shadow-[0_14px_28px_rgba(0,0,0,0.06)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Chip({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full bg-black/[0.035] px-3 py-1 border border-black/5 text-[12px] text-black/60 max-w-full",
        className,
      ].join(" ")}
    >
      {children}
    </span>
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
            className="absolute inset-x-0 top-4 bottom-4 sm:top-10 sm:bottom-10 mx-auto w-full max-w-[520px] px-3 sm:px-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
          >
            <div className="h-full rounded-[22px] sm:rounded-[24px] bg-white shadow-2xl overflow-hidden flex flex-col border border-black/10">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-black/10 flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-[#111827] truncate">{title || "Archivo"}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0"
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
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const { providerServiceId } = useParams();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("info"); // info | cert | reviews

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerTitle, setViewerTitle] = useState("Certificado");

  const [ratingOpen, setRatingOpen] = useState(true);

  const [favLoading, setFavLoading] = useState(false);
  const [isFav, setIsFav] = useState(false);

  const [providerServices, setProviderServices] = useState([]);

  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState({
    avg: null,
    count: 0,
    dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const provider = offer?.provider || null;
  const catalog = offer?.catalog || offer?.service_catalog || offer?.service_catalog_id || null;

  const providerName = provider?.full_name || "Prestador";
  const avatar = provider?.avatar_url;

  const currentServiceName = offer?.catalog?.name || offer?.service_catalog?.name || "Servicio";

  const providerServicesList = useMemo(() => {
    const arr = (providerServices || [])
      .map((x) => ({
        id: x?.id,
        name: x?.catalog?.name || x?.service_catalog?.name || "",
        category: x?.catalog?.category || x?.service_catalog?.category || "",
      }))
      .filter((x) => x.id && norm(x.name));

    const out = [];
    const seen = new Set();
    for (const it of arr) {
      const k = String(it.name).trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...it, name: String(it.name).trim() });
    }
    return out;
  }, [providerServices]);

  const headerServiceLabel = useMemo(() => {
    const names = providerServicesList.map((x) => x.name);
    if (!names.length) return currentServiceName;
    if (names.length === 1) return names[0];
    const first = names.includes(currentServiceName) ? currentServiceName : names[0];
    return `${first} + ${names.length - 1} más`;
  }, [providerServicesList, currentServiceName]);

  const about = useMemo(() => {
    const txt = provider?.about || provider?.bio || provider?.description || provider?.provider_description || "";
    return String(txt || "").trim();
  }, [provider]);

  // certificados: certificate_url (1) + cert_url (JSON string array)
  const certUrls = useMemo(() => {
    const out = [];

    const main = provider?.certificate_url || "";
    if (norm(main)) out.push(String(main).trim());

    const raw = provider?.cert_url;
    if (raw != null && String(raw).trim() !== "") {
      const s = String(raw).trim();
      if (s.startsWith("[") && s.endsWith("]")) {
        try {
          const arr = JSON.parse(s);
          if (Array.isArray(arr)) for (const u of arr) if (norm(u)) out.push(String(u).trim());
        } catch {
          // noop
        }
      } else {
        if (norm(s)) out.push(s);
      }
    }

    return uniqUrls(out);
  }, [provider?.certificate_url, provider?.cert_url]);

  const isVerified = useMemo(() => certUrls.length > 0, [certUrls]);

  async function loadAvailability(providerId) {
    const av = await listProviderAvailability(providerId);
    setAvailability(mergeAvailability(av || []));
  }

  async function loadProviderServices(providerId) {
    try {
      const list = await listProviderServicesByProvider(providerId);
      setProviderServices(list || []);
      return list || [];
    } catch {
      setProviderServices([]);
      return [];
    }
  }

  async function loadFavoriteState({ clientId, providerId }) {
    if (!clientId || !providerId) return;
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("client_id", clientId)
        .eq("provider_id", providerId)
        .limit(1);
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

  // ✅ reseñas
  async function loadReviews({ providerId, providerServiceId: offerId }) {
    if (!providerId && !offerId) return;

    setReviewsLoading(true);
    try {
      const safeSelect = `
        id,
        request_id,
        provider_id,
        client_id,
        rating,
        comment,
        created_at,
        client:client_id ( id, full_name, avatar_url ),
        request:request_id (
          id,
          catalog_id,
          service_catalog:catalog_id ( name, category )
        )
      `;

    /* --- el resto de la lógica sigue EXACTA --- */
      let res = null;

      if (providerId) {
        res = await supabase
          .from("reviews")
          .select(safeSelect)
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(60);

        if (res.error && isMissingColumn(res.error, "provider_id")) {
          res = { data: [], error: null };
        }
      } else {
        res = { data: [], error: null };
      }

      if (!res.error && (res.data || []).length === 0 && offerId) {
        const tryCol = await supabase.from("reviews").select("id").eq("provider_service_id", offerId).limit(1);

        if (!(tryCol.error && isMissingColumn(tryCol.error, "provider_service_id"))) {
          const res2 = await supabase
            .from("reviews")
            .select(safeSelect)
            .eq("provider_service_id", offerId)
            .order("created_at", { ascending: false })
            .limit(60);

          if (!res2.error) res = res2;
        }
      }

      if (res?.error) throw res.error;

      const arr = res?.data || [];
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

      setReviewsSummary({ avg: cnt ? sum / cnt : null, count: cnt, dist });
    } catch (e) {
      console.error("[ProviderProfile] loadReviews error:", e);
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

        const param = providerServiceId;

        let data = null;
        try {
          data = await getProviderServiceById(param);
        } catch (e) {
          if (!isSingleCoerceError(e)) throw e;

          const providerId = param;

          const { data: prof, error: profErr } = await supabase.from("profiles").select("*").eq("id", providerId).maybeSingle();
          if (profErr) throw profErr;
          if (!prof) throw new Error("No se encontró el prestador.");

          const list = await loadProviderServices(providerId);
          const firstOfferId = list?.[0]?.id || null;

          data = {
            id: firstOfferId,
            provider_id: providerId,
            provider: prof,
            catalog: list?.[0]?.catalog || list?.[0]?.service_catalog || null,
          };
        }

        if (!alive) return;

        setOffer(data);

        const provId = data?.provider_id || data?.provider?.id || null;
        const provServiceId = data?.id || null;

        if (provId) {
          await Promise.all([
            loadAvailability(provId),
            loadProviderServices(provId),
            loadReviews({ providerId: provId, providerServiceId: provServiceId }),
          ]);

          await loadFavoriteState({ clientId: user?.id, providerId: provId });

          chAv = supabase
            .channel(`provider-av-${provId}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "provider_availability", filter: `provider_id=eq.${provId}` },
              () => loadAvailability(provId).catch(() => null)
            )
            .subscribe();

          chReviews = supabase
            .channel(`provider-reviews-${provId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () =>
              loadReviews({ providerId: provId, providerServiceId: provServiceId }).catch(() => null)
            )
            .subscribe();
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
    if (!offer?.provider_id && !offer?.provider?.id) return toast.error("Error", "Falta prestador.");

    const providerId = offer?.provider_id || offer?.provider?.id;

    setFavLoading(true);
    try {
      if (!isFav) {
        const { error } = await supabase.from("favorites").insert({
          client_id: user.id,
          provider_id: providerId,
          provider_service_id: offer?.id || null,
        });
        if (error) throw error;
        setIsFav(true);
        toast.success("Listo", "Agregado a favoritos.");
      } else {
        const { error } = await supabase.from("favorites").delete().eq("client_id", user.id).eq("provider_id", providerId);
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
    const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
    const url = `${baseUrl}/client/provider/${encodeURIComponent(providerServiceId)}`;

    const text = shareText({
      providerName,
      serviceName: currentServiceName,
    });

    if (navigator.share) {
      await navigator.share({ title: "orby", text, url });
      return;
    }

    // fallback: acá sí copiamos texto + link en una sola pieza
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success("Copiado", "Se copió el link para compartir.");
  } catch (e) {
    toast.error("No se pudo compartir", e?.message || "Probá de nuevo.");
  }
}

  function goBack() {
    const from = location?.state?.from;
    if (from && typeof from === "string") {
      nav(from);
      return;
    }

    try {
      nav(-1);
      window.setTimeout(() => {
        if (window.history.length <= 1) nav("/client", { replace: true, state: { disableHomeShared: true } });
      }, 0);
    } catch {
      nav("/client", { replace: true, state: { disableHomeShared: true } });
    }
  }

  function goSchedule(offerId = offer?.id) {
    if (!offerId) {
      toast.error("No disponible", "Este prestador todavía no tiene servicios publicados.");
      return;
    }
    nav(`/client/services/${offerId}`, { state: { from: location.pathname } });
  }

  const avgLabel = useMemo(() => {
    const a = reviewsSummary.avg;
    return typeof a === "number" && Number.isFinite(a) ? a.toFixed(1) : "—";
  }, [reviewsSummary.avg]);

  const totalReviews = reviewsSummary.count || 0;

  function openCert(url, idx) {
    if (!norm(url)) return;
    setViewerUrl(url);
    setViewerTitle(`Certificado ${idx + 1}`);
    setViewerOpen(true);
  }

  if (loading) return <Loading />;

  if (err) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-4 sm:p-6">
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
      <div
        className="min-h-screen bg-[#F5F5F5] overflow-x-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >      
      {/* ✅ wrapper mobile-first: centra y limita el ancho + paddings seguros */}
      <div
        className="mx-auto w-full max-w-[520px]"
        style={{
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
        }}
      >
        {/* TOP AREA */}
        <div className="relative">
          <div className="h-[78px] sm:h-[92px] w-full bg-[#F5F5F5]" />

          {/* back */}
          <button
            type="button"
            onClick={goBack}
            className="absolute left-0 top-4 sm:top-6 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-[26px] leading-none">‹</span>
          </button>

          {/* share/fav */}
          <div
              className="absolute right-0 flex items-center gap-2"
              style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
            >
            <button
              type="button"
              onClick={onShare}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-[0.98] transition"
              aria-label="Compartir"
              title="Compartir"
            >
              <IconifyIcon icon="lucide:upload" className="h-6 w-6 text-black" />
            </button>

            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favLoading}
              className={[
                "h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-[0.98] transition",
                favLoading ? "opacity-60" : "",
              ].join(" ")}
              aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
              title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <IconifyIcon icon={isFav ? "ph:heart-fill" : "ph:heart"} className={["h-6 w-6", isFav ? "text-red-500" : "text-black"].join(" ")} />
            </button>
          </div>

          {/* HEADER CARD */}
          <div className="pt-1">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-[60px] w-[60px] sm:h-[70px] sm:w-[70px] rounded-[16px] sm:rounded-[18px] bg-black/[0.03] overflow-hidden grid place-items-center shrink-0 border border-black/10">
                  {avatar ? (
                    <img src={avatar} alt={providerName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[14px] font-semibold text-[#1E2F5D]">{initials(providerName)}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center min-w-0">
                    <p className="text-[16px] sm:text-[17px] font-semibold text-[#111827] truncate">{providerName}</p>
                    {isVerified ? <IconifyIcon icon="solar:verified-check-bold" className="ml-1 h-[18px] w-[18px] text-[#2A4691]" /> : null}
                  </div>

                  <p className="mt-0.5 text-[12px] sm:text-[13px] text-black/55 line-clamp-1">{headerServiceLabel}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {provider?.neighborhood ? (
                      <Chip>
                        <IconifyIcon icon="solar:map-point-linear" className="h-4 w-4 text-black/45 shrink-0" />
                        <span className="truncate max-w-[190px] sm:max-w-[260px]">{provider.neighborhood}</span>
                      </Chip>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-4 sm:mt-5">
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
                      "relative z-[2] h-10 sm:h-11 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-semibold transition",
                      active ? "text-[#1E2F5D]" : "text-black/55",
                    ].join(" ")}
                  >
                    <IconifyIcon icon={t.icon} className="h-5 w-5" />
                    <span className="truncate">{t.label}</span>

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

        {/* ✅ CONTENT: ahora la “caja” queda dentro del wrapper (no más px-6 global) */}
        <div className="mt-4 pb-[180px] sm:pb-[190px]">
          <AnimatePresence mode="wait">
            {/* INFO */}
            {tab === "info" && (
              <motion.div
                key="tab-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="grid gap-4"
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] font-semibold text-[#111827]">Descripción</p>
                  </div>

                  <p className="mt-3 text-[13px] leading-relaxed text-black/60 break-words">
                    {about || "Este prestador todavía no agregó una descripción."}
                  </p>

                  <div className="my-5 h-px w-full bg-black/10" />

                  <div className="flex items-center gap-3">
                    <p className="text-[15px] font-semibold text-[#111827]">Horarios</p>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {availability.length ? (
                      availability.map((d) => (
                        <div
                          key={d.dayISO}
                          className="flex items-center justify-between gap-3 rounded-[20px] bg-white border border-black/5 px-4 py-3 shadow-[0_6px_14px_rgba(16,24,40,0.08)]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[13px] font-medium text-[#1E2F5D] truncate">{d.label}</span>
                          </div>

                          <span className="text-[13px] font-medium text-black/55 tabular-nums whitespace-nowrap">
                            {d.ranges.length ? formatRange(d.ranges[0].start, d.ranges[d.ranges.length - 1].end) : "—"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[14px] border border-black/10 bg-[#F7F7F7] p-4">
                        <p className="text-[13px] font-semibold text-[#111827]">Sin disponibilidad cargada</p>
                        <p className="mt-1 text-[12px] text-black/50">Este prestador todavía no publicó horarios.</p>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const others = (providerServicesList || []).filter((it) => {
                      const name = String(it?.name || "").trim().toLowerCase();
                      const current = String(currentServiceName || "").trim().toLowerCase();
                      if (it?.id && String(it.id) === String(offer?.id)) return false;
                      if (name && current && name === current) return false;
                      return true;
                    });

                    if (!others.length) return null;

                    return (
                      <>
                        <div className="my-5 h-px w-full bg-black/10" />

                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-[#111827]">Otros servicios que ofrece</p>
                          </div>
                        </div>

                        {/* ✅ dentro del wrapper: ya no necesitamos -mx */}
                        <div className="mt-4 overflow-x-auto overflow-y-visible hide-scrollbar">
                          <div className="flex gap-3 py-5 overflow-visible px-4 pr-4">
                            {others.map((it) => (
                              <button
                              key={it.id}
                              type="button"
                              onClick={() => nav(`/client/services/${it.id}`, { state: { from: location.pathname } })}
                              className={[
                                "w-fit shrink-0 inline-flex items-center gap-2.5",
                                "rounded-full bg-white",
                                "px-3 py-2",
                                "border border-black/5",
                                "shadow-[0_6px_14px_rgba(16,24,40,0.08)]",
                                "active:scale-[0.99] transition",
                              ].join(" ")}
                            >
                              <span className="h-9 w-9 rounded-full bg-[#EAF1FF] grid place-items-center shrink-0">
                                <IconifyIcon
                                  icon={iconForService({ name: it.name, category: it.category })}
                                  className="h-5 w-5 text-[#2A4691]"
                                />
                              </span>

                              <span
                                className="text-[13px] font-medium text-[#3D3D3D] leading-[16px] whitespace-nowrap"
                                style={{ maxWidth: 220 }} // ✅ ajustá si querés (ej: 180 mobile)
                                title={it.name}
                              >
                                {it.name}
                              </span>

                              <IconifyIcon icon="mdi:chevron-right" className="h-6 w-6 text-black/30 shrink-0" />
                            </button>
                            ))}
                          </div>
                        </div>

                        <style>{`
                          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
                          .hide-scrollbar::-webkit-scrollbar { display: none; }
                          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                          .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
                        `}</style>
                      </>
                    );
                  })()}
                </Card>
              </motion.div>
            )}

            {/* CERT */}
            {tab === "cert" && (
              <motion.div
                key="tab-cert"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="grid gap-4"
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#111827]">Certificaciones</p>
                      <p className="mt-1 text-[12px] text-black/50">
                        {certUrls.length ? `${certUrls.length} archivo(s) · Tocá para ver` : "No hay certificaciones cargadas."}
                      </p>
                    </div>
                  </div>

                  {certUrls.length ? (
                    <div className="mt-4 grid gap-2">
                      {certUrls.map((u, idx) => (
                        <button
                          key={`${u}-${idx}`}
                          type="button"
                          onClick={() => openCert(u, idx)}
                          className="w-full rounded-[18px] border border-black/10 bg-[#F7F7F7] px-4 py-4 flex items-center justify-between active:scale-[0.99] transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="h-10 w-10 rounded-full bg-white grid place-items-center shrink-0 border border-black/10">
                              <IconifyIcon icon="solar:file-text-linear" className="h-5 w-5 text-[#2A4691]" />
                            </span>

                            <div className="min-w-0 text-left">
                              <p className="text-[13px] font-semibold text-[#111827] truncate">{`Certificado ${idx + 1}`}</p>
                              <p className="mt-0.5 text-[12px] text-black/50 truncate">Ver archivo</p>
                            </div>
                          </div>

                          <IconifyIcon icon="solar:alt-arrow-right-linear" className="h-5 w-5 text-black/30 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 w-full rounded-[18px] border border-black/10 bg-[#F7F7F7] px-4 py-4 opacity-60">
                      <p className="text-[13px] font-semibold text-[#111827]">Sin archivos</p>
                      <p className="mt-1 text-[12px] text-black/50">Este prestador todavía no cargó certificaciones.</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* REVIEWS */}
            {tab === "reviews" && (
              <motion.div
                key="tab-reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="grid gap-3"
              >
                {/* Summary */}
                <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden p-4 sm:p-5">
                  {reviewsLoading ? (
                    <div className="animate-pulse">
                      <div className="h-10 w-24 rounded bg-black/10" />
                      <div className="mt-4 h-3 w-full rounded bg-black/10" />
                      <div className="mt-3 h-3 w-[92%] rounded bg-black/10" />
                      <div className="mt-3 h-3 w-[86%] rounded bg-black/10" />
                      <div className="mt-3 h-3 w-[78%] rounded bg-black/10" />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setRatingOpen((v) => !v)}
                        className="w-full flex items-center gap-3 sm:gap-4 text-left"
                        aria-expanded={ratingOpen}
                        aria-label="Mostrar u ocultar resumen"
                      >
                        <p className="text-[36px] sm:text-[40px] font-medium text-[#3D3D3D] leading-none">{avgLabel}</p>

                        <div className="h-11 sm:h-12 w-px bg-black/10" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <IconifyIcon
                                key={i}
                                icon={(i + 1) <= Math.round(Number(reviewsSummary.avg || 0)) ? "mdi:star" : "mdi:star-outline"}
                                className="text-[#F5B301]"
                                style={{ width: 18, height: 18 }}
                              />
                            ))}
                          </div>

                          <p className="mt-1 text-[12px] text-black/45">
                            {avgLabel} <span className="mx-1">|</span>{" "}
                            {totalReviews ? `${totalReviews} reseña(s)` : "0 reseñas"}
                          </p>
                        </div>

                        <span className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center shrink-0">
                          <IconifyIcon icon="mdi:chevron-down" className={["h-6 w-6 text-black/35 transition-transform", ratingOpen ? "rotate-180" : ""].join(" ")} />
                        </span>
                      </button>

                      {ratingOpen ? (
                        <div className="mt-5 border-t border-black/10 pt-4">
                          <div className="grid gap-3">
                            {[5, 4, 3, 2, 1].map((k) => {
                              const count = reviewsSummary?.dist?.[k] || 0;
                              const pct = totalReviews ? (count / totalReviews) * 100 : 0;

                              return (
                                <div key={k} className="flex items-center gap-4">
                                  <div className="flex-1 h-[8px] rounded-full bg-black/[0.10] overflow-hidden">
                                    <div className="h-full rounded-full bg-[#F5B301]" style={{ width: `${pct}%` }} />
                                  </div>

                                  <div className="w-[58px] shrink-0 flex items-center justify-end gap-2">
                                    <span className="text-[12px] font-semibold text-black/55">{k.toFixed(1)}</span>
                                    <IconifyIcon icon="mdi:star" className="h-4 w-4 text-[#F5B301]" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Lista */}
                {reviewsLoading ? (
                  <>
                    <div className="h-[140px] rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
                    <div className="h-[140px] rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
                  </>
                ) : reviews.length === 0 ? (
                  <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                        <IconifyIcon icon="mdi:star-outline" className="h-6 w-6 text-black/35" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-extrabold text-[#3D3D3D]">Todavía no hay reseñas</p>
                        <p className="mt-1 text-[12px] text-black/45 leading-relaxed">Cuando complete turnos, van a aparecer automáticamente.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  reviews.map((r) => {
                    const clientName = r?.client?.full_name || "Cliente";
                    const clientAvatar = r?.client?.avatar_url || "";
                    const rating = Math.max(0, Math.min(5, Number(r?.rating) || 0));
                    const full = Math.floor(rating);
                    const half = rating - full >= 0.5;

                    const serviceName = r?.request?.service_catalog?.name || r?.request?.catalog?.name || "";

                    return (
                      <div key={r.id} className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden p-4 sm:p-5">
                        <div className="flex items-start gap-4">
                          {clientAvatar ? (
                            <div className="h-12 w-12 rounded-full overflow-hidden bg-black/[0.04] shrink-0">
                              <img src={clientAvatar} alt={clientName} className="h-full w-full object-cover" draggable="false" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                              <span className="text-[12px] font-extrabold text-black/55">{initials(clientName)}</span>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{clientName}</p>
                              <p className="text-[12px] font-semibold text-black/40 shrink-0">{formatDateShort(r?.created_at)}</p>
                            </div>

                            <div className="mt-2 inline-flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const filled = i < full;
                                const isHalf = i === full && half;
                                const icon = filled ? "mdi:star" : isHalf ? "mdi:star-half-full" : "mdi:star-outline";
                                return <IconifyIcon key={i} icon={icon} className="text-[#F5B301]" style={{ width: 16, height: 16 }} />;
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 ml-[5px]">
                          {serviceName ? <p className="text-[12px] font-semibold text-black/45">{serviceName}</p> : null}

                          {String(r?.comment || "").trim() ? (
                            <p className="mt-2 text-[13px] text-black/65 leading-relaxed whitespace-pre-line break-words">{String(r.comment).trim()}</p>
                          ) : (
                            <p className="mt-2 text-[13px] text-black/40 italic">Sin comentario</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => goSchedule(offer?.id)}
        className="
          fixed left-3 right-3 sm:left-6 sm:right-6 z-[50]
          h-[54px] rounded-full
          bg-[#1E2F5D] text-white
          text-[14px] font-semibold
          shadow-[0_18px_34px_rgba(30,47,93,0.26)]
          active:scale-[0.99] transition
          flex items-center justify-center gap-2
        "
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <IconifyIcon icon="solar:calendar-linear" className="h-5 w-5" />
        Agendar
      </button>

      <ViewerModal open={viewerOpen} onClose={() => setViewerOpen(false)} title={viewerTitle} url={viewerUrl} />
    </div>
  );
}
