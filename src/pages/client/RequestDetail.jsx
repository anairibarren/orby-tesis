// /src/pages/client/RequestDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import RequestChat from "../../components/RequestChat.jsx";
import {
  getRequestById,
  getProviderServiceById,
  getProfileById,
  setCompletionCode,
  updateRequestSafe, 
} from "../../services/requests";
import { supabase } from "../../services/supabase";
import Loading from "../../components/Loading";

// reviews
import { createReview, getReviewByRequestId, clampRating } from "../../services/reviews";

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden border border-black/10",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Badge con colores (igual que Requests) */
function statusStyle(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    solicitada: "bg-[#FFF5CC] text-[#7A5B00]",
    cotizada: "bg-[#F1E8FF] text-[#4B2A8A]",
    aceptada: "bg-[#E9FFF6] text-[#0F6B3D]",
    agendada: "bg-[#EAF2FF] text-[#1E2F5D]",
    rechazada: "bg-[#FFE6EA] text-[#9B1C1C]",
    cancelada: "bg-black/[0.06] text-black/70",
    completada: "bg-[#E8FFF2] text-[#0F6B3D]",
    incumplida: "bg-[#FFE6EA] text-[#9B1C1C]",
  };
  return map[s] || "bg-black/[0.06] text-black/70";
}

function StatusBadge({ status }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold capitalize",
        statusStyle(status),
      ].join(" ")}
    >
      {status || "—"}
    </span>
  );
}

function VerifiedIcon({ show }) {
  if (!show) return null;
  return <IconifyIcon icon="mdi:check-decagram" className="h-4 w-4 text-[#4368C5]" />;
}

// ✅ helpers robustos (cuando se borró provider_service o fallan joins)
function getServiceNameFromAny(req, ps, catalog) {
  return (
    ps?.service_catalog?.name ||
    catalog?.name ||
    req?.catalog?.name ||
    req?.provider_service?.service_catalog?.name ||
    req?.provider_service?.name ||
    req?.service_catalog?.name ||
    req?.service_name ||
    req?.service_title ||
    "Servicio"
  );
}

function getCategoryFromAny(req, ps, catalog) {
  return (
    ps?.service_catalog?.category ||
    catalog?.category ||
    req?.catalog?.category ||
    req?.provider_service?.service_catalog?.category ||
    req?.service_catalog?.category ||
    req?.category ||
    ""
  );
}

function getPricingTypeFromAny(req, ps, catalog) {
  return (
    ps?.service_catalog?.pricing_type ||
    catalog?.pricing_type ||
    req?.catalog?.pricing_type ||
    req?.provider_service?.service_catalog?.pricing_type ||
    req?.service_catalog?.pricing_type ||
    req?.pricing_type ||
    null
  );
}


// precio fijo “snapshot” (si existe) + base_price de provider_service
function getFixedPriceFromAny(req, ps) {
  return (
    req?.service_amount ??
    req?.fixed_price ??
    req?.catalog?.fixed_price ??
    req?.catalog?.price ??
    req?.catalog?.base_price ??
    ps?.base_price ??
    req?.provider_service?.base_price ??
    req?.provider_service?.price ??
    null
  );
}

function moneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("es-AR")}`;
}

function paymentLabel(method) {
  const m = String(method || "").toLowerCase();
  if (m === "cash" || m === "efectivo") return "Efectivo";
  if (m === "mp" || m === "mercadopago" || m === "mercado_pago") return "Mercado Pago";
  if (m === "transfer") return "Transferencia";
  return "—";
}


function makeCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isVerified(prov) {
  return !!prov?.provider_verified;
}

function formatDateOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function cleanDescriptionForDisplay(desc) {
  const raw = String(desc || "");
  const marker = "📍 Ubicación:";
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw.trim();
  return raw.slice(0, idx).trim();
}

function initials(name) {
  const n = String(name || "").trim();
  if (!n) return "—";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || a.toUpperCase();
}

function Avatar({ src, name }) {
  const fallback = initials(name);
  return (
    <div className="h-11 w-11 rounded-full overflow-hidden border border-black/10 bg-black/[0.03] shrink-0 grid place-items-center">
      {src ? (
        <img src={src} alt={name || "Prestador"} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[12px] font-extrabold text-[#1E2F5D]">{fallback}</span>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-xl bg-black/[0.04] grid place-items-center">
        <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
      </span>
      <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
    </div>
  );
}

// ✅ estrellas
function Stars({ value, onChange, disabled = false }) {
  const v = clampRating(value || 1);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= v;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(n)}
            className={[
              "h-10 w-10 rounded-full grid place-items-center transition",
              disabled ? "opacity-60" : "active:scale-[0.98] hover:bg-black/[0.03]",
            ].join(" ")}
            aria-label={`${n} estrellas`}
            title={`${n} estrellas`}
          >
            <IconifyIcon
              icon={filled ? "mdi:star" : "mdi:star-outline"}
              className={["h-6 w-6", filled ? "text-[#E3B100]" : "text-black/25"].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Sheet base (simple) ---------------- */
function Sheet({ open, onClose, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999]">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Cerrar" />

      <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
        <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10">
          <div className="pt-3 flex justify-center">
            <div className="h-1.5 w-14 rounded-full bg-black/10" />
          </div>

          <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[18px] font-extrabold text-[#3D3D3D]">{title}</p>
              {subtitle ? <p className="mt-1 text-[12px] text-black/45">{subtitle}</p> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
            </button>
          </div>

          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** ✅ NUEVO: valida si se puede marcar incumplida según horario + gracia */
function computeNoShowGate(req) {
  const st = String(req?.status || "").toLowerCase();
  if (st !== "agendada") return { allowed: false, reason: "Solo disponible para turnos agendados." };

  const iso = req?.preferred_datetime;
  if (!iso) return { allowed: false, reason: "Este turno no tiene horario asignado." };

  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return { allowed: false, reason: "Horario inválido." };

  const GRACE_MINUTES = 15; // ✅ ajustá: 0 / 15 / 30 / 60…
  const limit = ts + GRACE_MINUTES * 60 * 1000;

  if (Date.now() < limit) {
    return {
      allowed: false,
      reason: `Podés reclamar a partir de las ${new Date(limit).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}.`,
    };
  }

  return { allowed: true, reason: "" };
}

export default function ClientRequestDetail() {
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [req, setReq] = useState(null);
  const [ps, setPs] = useState(null);
  const [provider, setProvider] = useState(null);

  // ✅ fallback para nombre/categoría/pricing cuando no hay provider_service o no hay joins
  const [catalog, setCatalog] = useState(null);

  const [busyCode, setBusyCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);

  // ✅ review
  const [review, setReview] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  // ✅ ⋯ menú
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ confirmar incumplida
  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);
  const [busyNoShow, setBusyNoShow] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await getRequestById(requestId);

      if (!r) throw new Error("No se encontró la solicitud (o no tenés permisos para verla).");
      if (user?.id && r?.client_id && r.client_id !== user.id)
        throw new Error("No tenés permisos para ver esta solicitud.");

      const providerServiceId = r?.provider_service_id ?? r?.service_id ?? null;

      const [psData, providerData, existingReview, catalogData] = await Promise.all([
        providerServiceId
          ? getProviderServiceById(providerServiceId).catch(() => null)
          : Promise.resolve(null),

        r?.provider_id ? getProfileById(r.provider_id).catch(() => null) : Promise.resolve(null),

        getReviewByRequestId(r?.id).catch(() => null),

        // ✅ fallback: si el request tiene catalog_id, traemos el catalog directo
        r?.catalog_id
          ? supabase
              .from("service_catalog")
              .select("id, name, category, pricing_type")
              .eq("id", r.catalog_id)
              .maybeSingle()
              .then(({ data }) => data)
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      setReq(r);
      setPs(psData);
      setProvider(providerData);
      setReview(existingReview || null);
      setCatalog(catalogData);

      if (r?.completion_code) setGeneratedCode(String(r.completion_code));
    } catch (e) {
      setErr(e?.message || "No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshRequestOnly() {
    try {
      const r = await getRequestById(requestId);
      if (!r) return;
      if (user?.id && r?.client_id && r.client_id !== user.id) return;

      setReq(r);
      if (r?.completion_code) setGeneratedCode(String(r.completion_code));

      const st = String(r?.status || "").toLowerCase();
      if (st === "completada" || st === "incumplida") {
        const existingReview = await getReviewByRequestId(r.id).catch(() => null);
        setReview(existingReview || null);
      }
    } catch {
      // noop
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, user?.id]);

  /** ✅ realtime */
  useEffect(() => {
    if (!requestId) return;

    const ch = supabase
      .channel(`client-request-detail-${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `id=eq.${requestId}` },
        () => {
          refreshRequestOnly();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, user?.id]);

  const serviceName = getServiceNameFromAny(req, ps, catalog);
  const category = getCategoryFromAny(req, ps, catalog);
  const pricingType = getPricingTypeFromAny(req, ps, catalog);


  const providerName = provider?.full_name || "—";
  const providerNeighborhood = provider?.neighborhood || "";

  const hasCertification = !!provider?.certificate_url || !!provider?.cert_url;
  const providerVerified = isVerified(provider) && hasCertification;

  const providerAvatar =
    provider?.avatar_url ||
    provider?.photo_url ||
    provider?.profile_image ||
    provider?.image_url ||
    provider?.picture_url ||
    null;

  const paymentMethod = req?.payment_method ?? null;

  const amounts = useMemo(() => {
    if (!req) return null;

    const isQuote = String(pricingType || "").toUpperCase() === "B";

    const base = isQuote
      ? (req?.quote_amount != null ? Number(req.quote_amount) : null)
      : (() => {
          const fp = getFixedPriceFromAny(req, ps);
          const n = fp != null ? Number(fp) : null;
          return Number.isFinite(n) ? n : null;
        })();

    const fee =
      req?.platform_fee != null
        ? Number(req.platform_fee)
        : base != null
        ? Math.round(base * 0.07 * 100) / 100
        : null;

    const total =
      req?.total_amount != null
        ? Number(req.total_amount)
        : req?.final_amount != null
        ? Number(req.final_amount)
        : base != null && fee != null
        ? Math.round((base + fee) * 100) / 100
        : null;

    return { base, fee, total };
  }, [req, ps, pricingType]);


  const statusLower = String(req?.status || "").toLowerCase();

  const isCompleted = useMemo(() => statusLower === "completada", [statusLower]);
  const isNoShow = useMemo(() => statusLower === "incumplida", [statusLower]);

  // ✅ NUEVO: gate horario + gracia
  const noShowGate = useMemo(() => computeNoShowGate(req), [req?.status, req?.preferred_datetime]);
  const canMarkNoShow = noShowGate.allowed;

  async function confirmNoShow() {
    if (!req?.id) return;

    // ✅ Re-check antes de actualizar (por si cambia estado u hora)
    const gate = computeNoShowGate(req);
    if (!gate.allowed) {
      toast.warning("Todavía no", gate.reason || "Aún no podés marcar incumplida.");
      setNoShowConfirmOpen(false);
      return;
    }

    try {
      setBusyNoShow(true);

      // ✅ usamos tu service (fallback columns)
      await updateRequestSafe(req.id, { status: "incumplida" });

      toast.success("Listo", "La solicitud quedó marcada como incumplida.");
      setNoShowConfirmOpen(false);
      setMenuOpen(false);
      await refreshRequestOnly();
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo actualizar el estado.");
    } finally {
      setBusyNoShow(false);
    }
  }

  // ✅ reseñar si está completada O incumplida
  const canReview = useMemo(() => {
    const ok = statusLower === "completada" || statusLower === "incumplida";
    return ok && !review;
  }, [statusLower, review]);

  async function onGenerateCode() {
    if (!req?.id) return;
    try {
      setBusyCode(true);
      const code = makeCode6();
      await setCompletionCode(req.id, code, 180);
      setGeneratedCode(code);
      setCodeOpen(true);
      toast.success("Código generado", "Se lo mostrás al prestador para confirmar el turno.");
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo generar el código.");
    } finally {
      setBusyCode(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success("Copiado", "Código copiado al portapapeles.");
    } catch {
      toast.error("Error", "No se pudo copiar.");
    }
  }

  async function submitReview() {
    if (!req?.id || !user?.id) return;

    const st = String(req?.status || "").toLowerCase();
    if (st !== "completada" && st !== "incumplida") {
      toast.error("Todavía no", "Vas a poder reseñar cuando el turno esté completado o marcado como incumplido.");
      return;
    }

    try {
      setReviewBusy(true);

      const created = await createReview({
        request_id: req.id,
        provider_id: req.provider_id,
        client_id: user.id,
        rating: reviewRating,
        comment: reviewComment,
      });

      setReview(created);
      setReviewOpen(false);
      toast.success("¡Gracias!", "Tu reseña ayuda a generar confianza.");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        toast.error("Ya reseñaste", "Solo podés dejar una reseña por turno.");
        const existing = await getReviewByRequestId(req.id).catch(() => null);
        setReview(existing || null);
        setReviewOpen(false);
        return;
      }
      toast.error("Error", e?.message || "No se pudo guardar tu reseña.");
    } finally {
      setReviewBusy(false);
    }
  }

  if (loading) return <Loading />;

  if (err) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6">
        <button onClick={() => nav("/client/requests")} className="text-sm text-[#2A4691]">
          ← Volver
        </button>
        <p className="mt-4 text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const cleanedDesc = cleanDescriptionForDisplay(req?.description);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[46px] pb-28">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          {/* ⋯ */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="absolute right-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Opciones"
            title="Opciones"
          >
            <IconifyIcon icon="mdi:dots-horizontal" className="h-6 w-6 text-black/45" />
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Detalle de solicitud</h1>
        </div>

        {/* 1) Servicio + Prestador */}
        <CardShell className="mt-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/40">Servicio</p>
              <p className="mt-1 text-[16px] font-extrabold text-[#3D3D3D] leading-snug break-words">
                {serviceName}
              </p>
              {!!category && <p className="mt-1 text-[12px] text-black/50">{category}</p>}
            </div>

            <StatusBadge status={req?.status} />
          </div>

          <div className="mt-4 pt-4 border-t border-black/10">
            <p className="text-[12px] font-semibold text-black/40">Prestador</p>

            {/* ✅ Fila Prestador + botón chat dentro */}
            <div className="mt-2 flex items-center justify-between gap-3">
              <div
                className="flex items-center gap-3 min-w-0 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  const pid = req?.provider_id || provider?.id;
                  if (!pid) return;
                  nav(`/client/provider/${pid}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    const pid = req?.provider_id || provider?.id;
                    if (!pid) return;
                    nav(`/client/provider/${pid}`);
                  }
                }}
                aria-label="Ver perfil del prestador"
                title="Ver perfil"
              >
                <Avatar src={providerAvatar} name={providerName} />

                <div className="min-w-0">
                  <div className="flex items-center gap-[2px]">
                    <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{providerName}</p>
                    <VerifiedIcon show={providerVerified} />
                  </div>

                  {providerNeighborhood ? (
                    <p className="mt-0.5 text-[12px] text-black/50 truncate">{providerNeighborhood}</p>
                  ) : null}
                </div>
              </div>

              {["agendada", "completada", "incumplida"].includes(
                String(req?.status || "").toLowerCase()
              ) ? (
                <button
                  type="button"
                  onClick={() => nav(`/client/requests/${requestId}/chat`)}
                  className="shrink-0 h-11 w-11 rounded-full bg-[#F2F2F2] border border-black/10 grid place-items-center shadow-[0_8px_18px_rgba(0,0,0,0.05)] hover:bg-[#EAEAEA] active:scale-[0.98] transition"
                  aria-label="Abrir chat"
                  title="Abrir chat"
                >
                  <IconifyIcon icon="solar:chat-round-dots-linear" className="h-5 w-5 text-black/55" />
                </button>
              ) : null}
            </div>
          </div>
        </CardShell>


        {/* 2) Detalle */}
        <CardShell className="mt-4 p-5">
          <SectionTitle icon="mdi:clipboard-text-outline" title="Detalle" />

          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <div className="grid gap-2 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Barrio</span>
                <span className="font-semibold text-black/70 text-right">{req?.neighborhood || "—"}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Dirección</span>
                <span className="font-semibold text-black/70 text-right">{req?.address || "—"}</span>
              </div>

              <div className="pt-2 mt-1 border-t border-black/10 flex items-start justify-between gap-3">
                <span className="text-black/45">Fecha</span>
                <span className="font-semibold text-black/70 text-right">{formatDateOnly(req?.preferred_datetime)}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Hora</span>
                <span className="font-semibold text-black/70 text-right">{formatTimeOnly(req?.preferred_datetime)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <p className="text-[12px] font-semibold text-black/50">Descripción</p>
            {cleanedDesc ? (
              <p className="mt-2 text-[14px] text-black/70 leading-snug whitespace-pre-line">{cleanedDesc}</p>
            ) : (
              <p className="mt-2 text-[12px] text-black/45">—</p>
            )}
          </div>
        </CardShell>

        {/* 3) Pago */}
        <CardShell className="mt-4 p-5">
          <SectionTitle icon="mdi:credit-card-outline" title="Pago" />

          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <div className="grid gap-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-black/45">Método</span>
                <span className="font-semibold text-black/70">{paymentLabel(paymentMethod)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <div className="grid gap-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-black/45">{String(pricingType || "").toUpperCase() === "B" ? "Cotización" : "Servicio"}</span>
                <span className="font-semibold text-black/70">{moneyARS(amounts?.base)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-black/45">Tarifa Orby (7%)</span>
                <span className="font-semibold text-black/70">{moneyARS(amounts?.fee)}</span>
              </div>

              <div className="pt-2 mt-1 border-t border-black/10 flex items-center justify-between">
                <span className="text-black/60 font-extrabold">Total</span>
                <span className="text-[#1E2F5D] font-extrabold">{moneyARS(amounts?.total)}</span>
              </div>
            </div>

            {String(pricingType || "").toUpperCase() === "B" && amounts?.base == null && (
              <p className="mt-3 text-[12px] text-black/45">
                Este servicio es por <b>cotización</b>. El total aparece cuando el prestador cotiza.
              </p>
            )}
          </div>

          {/* CTA principal */}
          {isCompleted || isNoShow ? (
            <button
              type="button"
              onClick={() => {
                if (review) return;
                setReviewRating(5);
                setReviewComment("");
                setReviewOpen(true);
              }}
              disabled={!!review}
              className={[
                "mt-4 w-full h-[52px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.22)] active:scale-[0.99] transition",
                review ? "bg-black/20 text-black/50 shadow-none cursor-not-allowed" : "bg-[#111827]",
              ].join(" ")}
            >
              {review ? "Reseña enviada" : "Hacer reseña"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onGenerateCode}
              disabled={busyCode}
              className={[
                "mt-4 w-full h-[52px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.28)] active:scale-[0.99] transition",
                busyCode ? "bg-[#1E2F5D]/60" : "bg-[#1E2F5D]",
              ].join(" ")}
            >
              {busyCode ? "Generando..." : "Generar código de finalización"}
            </button>
          )}
        </CardShell>

        {/* ✅ Reseña */}
        <CardShell className="mt-4 p-5">
          <SectionTitle icon="mdi:star-outline" title="Reseña" />

          {review ? (
            <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
              <div className="flex items-center gap-2">
                <IconifyIcon icon="mdi:star" className="h-5 w-5 text-[#E3B100]" />
                <p className="text-[14px] font-extrabold text-[#3D3D3D]">{review.rating}/5</p>
              </div>
              {review.comment ? <p className="mt-2 text-[13px] text-black/60 leading-snug whitespace-pre-line">{review.comment}</p> : null}
              <p className="mt-2 text-[11px] text-black/35">Reseña enviada</p>
            </div>
          ) : canReview ? (
            <p className="mt-2 text-[13px] text-black/50">
              Ya podés dejar una reseña. Tocá <b>“Hacer reseña”</b>.
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-black/45">
              Vas a poder dejar una reseña cuando el turno esté <b>completado</b> o marcado como <b>incumplido</b>.
            </p>
          )}
        </CardShell>
      </div>

      {/* ✅ Sheet ⋯ */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Reportar problema" subtitle="Elegí una opción.">
        {/* ✅ Incumplida (visible siempre, pero puede estar disabled por horario/estado) */}
        <button
          type="button"
          onClick={() => {
            if (!canMarkNoShow || isNoShow || isCompleted) return;
            setNoShowConfirmOpen(true);
          }}
          disabled={!canMarkNoShow || isNoShow || isCompleted}
          className={[
            "w-full h-[54px] rounded-full border border-black/10 text-[14px] font-extrabold active:scale-[0.99] transition inline-flex items-center justify-center gap-2",
            !canMarkNoShow || isNoShow || isCompleted ? "bg-black/[0.04] text-black/40" : "bg-[#FFECEE] text-[#9B1C1C]",
          ].join(" ")}
        >
          <IconifyIcon
            icon="mdi:calendar-remove-outline"
            className={["h-5 w-5", !canMarkNoShow || isNoShow || isCompleted ? "text-black/30" : "text-[#9B1C1C]"].join(" ")}
          />
          Marcar como incumplida
        </button>

        {/* ✅ Mensaje aclaratorio cuando no se puede por horario */}
        {!canMarkNoShow && (
          <p className="mt-2 text-[12px] text-black/45 leading-snug">
            {noShowGate.reason || "Todavía no podés reclamar este turno."}
          </p>
        )}
        {(isCompleted || isNoShow) && (
          <p className="mt-2 text-[12px] text-black/45 leading-snug">
            Esta solicitud ya está <b>{isCompleted ? "completada" : "incumplida"}</b>.
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            nav("/client/help"); // ⬅️ si tenés esa ruta
          }}
          className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold active:scale-[0.99] transition inline-flex items-center justify-center gap-2"
        >
          <IconifyIcon icon="mdi:lifebuoy" className="h-5 w-5 text-black/45" />
          Ayuda y soporte
        </button>
      </Sheet>

      {/* ✅ Confirmación incumplida */}
      <Sheet
        open={noShowConfirmOpen}
        onClose={() => !busyNoShow && setNoShowConfirmOpen(false)}
        title="Marcar como incumplida"
        subtitle="Usalo solo si el turno no se realizó."
      >
        <div className="rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
          <p className="text-[13px] text-black/60 leading-snug">
            Esto cambiará el estado a <b>incumplida</b> y habilitará la reseña.
          </p>
        </div>

        <button
          type="button"
          onClick={confirmNoShow}
          disabled={busyNoShow}
          className={[
            "mt-4 w-full h-[54px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(155,28,28,0.22)] active:scale-[0.99] transition",
            busyNoShow ? "bg-[#9B1C1C]/60" : "bg-[#9B1C1C]",
          ].join(" ")}
        >
          {busyNoShow ? "Actualizando..." : "Confirmar incumplida"}
        </button>

        <button
          type="button"
          onClick={() => setNoShowConfirmOpen(false)}
          disabled={busyNoShow}
          className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold active:scale-[0.99] transition"
        >
          Volver
        </button>
      </Sheet>

      {/* Modal del código */}
      {codeOpen && (
        <div className="fixed inset-0 z-[9999]">
          <button className="absolute inset-0 bg-black/40" onClick={() => setCodeOpen(false)} aria-label="Cerrar" />
          <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-extrabold text-[#3D3D3D]">Código de confirmación</p>
                    <p className="mt-1 text-[12px] text-black/45">Se lo mostrás al prestador una vez que el turno fue finalizado.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCodeOpen(false)}
                    className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-[#1E2F5D]/[0.06] p-5 text-center">
                  <p className="text-[34px] font-extrabold text-[#1E2F5D] tracking-widest">{generatedCode}</p>
                </div>

                <button
                  type="button"
                  onClick={copyCode}
                  disabled={!generatedCode}
                  className="mt-4 w-full h-[54px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.28)] active:scale-[0.99] transition disabled:opacity-60"
                >
                  Copiar código
                </button>

                <button
                  type="button"
                  onClick={() => setCodeOpen(false)}
                  className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold active:scale-[0.99] transition"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal reseña */}
      {reviewOpen && (
        <div className="fixed inset-0 z-[9999]">
          <button className="absolute inset-0 bg-black/40" onClick={() => !reviewBusy && setReviewOpen(false)} aria-label="Cerrar" />

          <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-[520px] rounded-[30px] bg-white shadow-2xl overflow-hidden border border-black/10">
              <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-black/[0.03] to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-extrabold text-[#111827]">Tu reseña</p>
                    <p className="mt-1 text-[12px] text-black/45">Ayudás a que otros elijan con confianza.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => !reviewBusy && setReviewOpen(false)}
                    className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/45" />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="rounded-[22px] border border-black/10 bg-white p-4 shadow-[0_10px_22px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-semibold text-black/55">Calificación</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E3B100]/10 px-3 py-1 text-[12px] font-extrabold text-[#7A5B00]">
                      <IconifyIcon icon="mdi:star" className="h-4 w-4 text-[#E3B100]" />
                      {clampRating(reviewRating)}/5
                    </span>
                  </div>

                  <div className="mt-3 flex justify-center">
                    <Stars value={reviewRating} onChange={setReviewRating} disabled={reviewBusy} />
                  </div>

                  <div className="mt-4">
                    <p className="text-[12px] font-semibold text-black/55">Comentario (opcional)</p>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Contá cómo fue tu experiencia…"
                      className="mt-2 w-full min-h-[92px] rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm outline-none placeholder:text-black/30 focus:bg-white focus:border-black/20 transition"
                      disabled={reviewBusy}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={reviewBusy}
                  className={[
                    "mt-4 w-full h-[54px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(17,24,39,0.18)] active:scale-[0.99] transition",
                    reviewBusy ? "bg-[#111827]/60" : "bg-[#111827]",
                  ].join(" ")}
                >
                  {reviewBusy ? "Enviando..." : "Enviar reseña"}
                </button>

                <button
                  type="button"
                  onClick={() => !reviewBusy && setReviewOpen(false)}
                  disabled={reviewBusy}
                  className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold active:scale-[0.99] transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}