// src/pages/provider/RequestDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { getRequestById, getProviderServiceById, getProfileById, completeWithCode } from "../../services/requests";

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

/** ✅ Badge igual que client */
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

function formatDateOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}
function formatTimeOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function paymentLabel(method) {
  const m = String(method || "").toLowerCase();
  if (m === "cash" || m === "efectivo") return "Efectivo";
  if (m === "transfer") return "Transferencia";
  if (m === "card" || m === "tarjeta") return "Tarjeta";
  if (m === "mp" || m === "mercadopago" || m === "mercado_pago") return "Mercado Pago";
  return "—";
}

/** ✅ payment_status en español */
function paymentStatusLabel(v) {
  const s = String(v || "").toLowerCase().trim();
  const map = {
    pending: "Pendiente",
    in_process: "En proceso",
    inprocess: "En proceso",
    authorized: "Autorizado",
    approved: "Aprobado",
    paid: "Pagado",
    rejected: "Rechazado",
    cancelled: "Cancelado",
    canceled: "Cancelado",
    refunded: "Reintegrado",
    chargeback: "Contracargo",
    in_mediation: "En mediación",
    inmediation: "En mediación",
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
}

function moneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("es-AR")}`;
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

/** ✅ barrio/dirección robustos */
function getBarrio(req) {
  const candidates = [req?.barrio, req?.neighborhood, req?.neighbourhood, req?.district, req?.zona, req?.area]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return candidates[0] || "—";
}
function getDireccion(req) {
  const candidates = [
    req?.direccion,
    req?.address,
    req?.address_line,
    req?.addressLine,
    req?.street_address,
    req?.street,
    req?.calle,
    req?.location_address,
    req?.client_address,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return candidates[0] || "—";
}

/** ✅ SOLO descripción: si viene pegada con "📍 Ubicación..." lo recortamos */
function cleanDescription(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  // si la app guardó algo como:
  // "Mi problema...\n\n📍 Ubicación: Barrio: ... Dirección: ..."
  const cutByPin = t.split(/\n\s*📍/)[0]?.trim();
  if (cutByPin && cutByPin.length > 0) return cutByPin;

  // fallback: si viene sin emoji pero con "Ubicación:" en otra línea
  const cutByUbi = t.split(/\n\s*ubicaci[oó]n\s*:/i)[0]?.trim();
  return cutByUbi && cutByUbi.length > 0 ? cutByUbi : t;
}

export default function ProviderRequestDetail() {
  const nav = useNavigate();
  const toast = useToast();
  const { requestId } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [req, setReq] = useState(null);
  const [ps, setPs] = useState(null);
  const [client, setClient] = useState(null);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const [successOpen, setSuccessOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await getRequestById(requestId);

      if (user?.id && r?.provider_id && r.provider_id !== user.id) {
        throw new Error("No tenés permisos para ver esta solicitud.");
      }

      const providerServiceId = r?.provider_service_id ?? r?.service_id ?? null;

      const [psData, clientData] = await Promise.all([
        providerServiceId ? getProviderServiceById(providerServiceId).catch(() => null) : Promise.resolve(null),
        r?.client_id ? getProfileById(r.client_id).catch(() => null) : Promise.resolve(null),
      ]);

      setReq(r);
      setPs(psData);
      setClient(clientData);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, user?.id]);

  const serviceName = ps?.service_catalog?.name || "Servicio";
  const category = ps?.service_catalog?.category || "";
  const pricingType = ps?.service_catalog?.pricing_type || null;
  const clientName = client?.full_name || "Cliente";

  const paymentMethod = req?.payment_method ?? null;

  const amounts = useMemo(() => {
    if (!req || !ps) return null;

    const base =
      String(pricingType || "").toUpperCase() === "B"
        ? req?.quote_amount != null
          ? Number(req.quote_amount)
          : null
        : ps?.base_price != null
        ? Number(ps.base_price)
        : null;

    const fee =
      req?.platform_fee != null
        ? Number(req.platform_fee)
        : base != null
        ? Math.round(base * 0.07 * 100) / 100
        : null;

    const total =
      req?.final_amount != null
        ? Number(req.final_amount)
        : base != null && fee != null
        ? Math.round((base + fee) * 100) / 100
        : null;

    return { base, fee, total };
  }, [req, ps, pricingType]);

  const canComplete = useMemo(() => String(req?.status || "").toLowerCase() === "agendada", [req]);

  async function onComplete() {
    if (!req?.id) return;
    const c = String(code || "").trim();
    if (c.length < 4) return toast.warning("Falta código", "Ingresá el código que te dio el cliente.");

    try {
      setBusy(true);
      await completeWithCode(req.id, c);
      toast.success("Completado", "La solicitud quedó marcada como completada.");
      setCode("");
      await load();
      setSuccessOpen(true);
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo completar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F5] p-6">Cargando…</div>;

  if (err) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6">
        <button onClick={() => nav(-1)} className="text-sm text-[#2A4691]">
          ← Volver
        </button>
        <p className="mt-4 text-sm text-red-600">{err}</p>
      </div>
    );
  }

  const barrio = getBarrio(req);
  const direccion = getDireccion(req);
  const onlyDesc = cleanDescription(req?.description);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[46px] pb-10">
        {/* Header igual client */}
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

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Detalle de solicitud</h1>
        </div>

        {/* 1) Servicio + Estado */}
        <CardShell className="mt-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/40">Servicio</p>
              <p className="mt-1 text-[16px] font-extrabold text-[#3D3D3D] leading-snug break-words">{serviceName}</p>
              {!!category && <p className="mt-1 text-[12px] text-black/50">{category}</p>}
            </div>

            <StatusBadge status={req?.status} />
          </div>

          <div className="mt-4 pt-4 border-t border-black/10">
            <p className="text-[12px] font-semibold text-black/40">Cliente</p>
            <p className="mt-1 text-[14px] font-extrabold text-[#3D3D3D]">{clientName}</p>
          </div>
        </CardShell>

        {/* 2) Detalle (orden pedido) */}
        <CardShell className="mt-4 p-5">
          <SectionTitle icon="mdi:clipboard-text-outline" title="Detalle" />

          {/* ✅ 1er cajita: barrio, dirección —— fecha, hora */}
          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <div className="grid gap-2 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Barrio</span>
                <span className="font-semibold text-black/70 text-right">{barrio}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Dirección</span>
                <span className="font-semibold text-black/70 text-right">{direccion}</span>
              </div>

              <div className="pt-3 mt-1 border-t border-black/10 grid gap-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-black/45">Fecha</span>
                  <span className="font-semibold text-black/70 text-right">{formatDateOnly(req?.preferred_datetime)}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-black/45">Hora</span>
                  <span className="font-semibold text-black/70 text-right">{formatTimeOnly(req?.preferred_datetime)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ 2da caja aparte: SOLO descripción */}
          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <p className="text-[12px] font-semibold text-black/50">Descripción</p>
            {onlyDesc ? (
              <p className="mt-2 text-[14px] text-black/70 leading-snug whitespace-pre-line">{onlyDesc}</p>
            ) : (
              <p className="mt-2 text-[12px] text-black/45">—</p>
            )}
          </div>
        </CardShell>

        {/* 3) Pago + montos */}
        <CardShell className="mt-4 p-5">
          <SectionTitle icon="mdi:credit-card-outline" title="Pago" />

          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <div className="grid gap-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-black/45">Método</span>
                <span className="font-semibold text-black/70">{paymentLabel(paymentMethod)}</span>
              </div>

              {req?.payment_status ? (
                <div className="flex items-center justify-between">
                  <span className="text-black/45">Estado</span>
                  <span className="font-semibold text-black/70">{paymentStatusLabel(req.payment_status)}</span>
                </div>
              ) : null}
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
                Este servicio es por <b>cotización</b>. El total aparece cuando se cotiza.
              </p>
            )}
          </div>
        </CardShell>

        {/* ✅ Finalizar turno */}
        {canComplete && (
          <CardShell className="mt-4 p-5">
            <SectionTitle icon="mdi:shield-check-outline" title="Finalizar turno" />

            <div className="mt-3 rounded-[22px] border border-black/10 overflow-hidden">
              {/* ✅ fondo gris clarito (sin gradient) */}
              <div className="p-4 bg-[#F3F4F6]">
                <p className="text-[12px] font-extrabold text-[#1E2F5D]">Código de verificación</p>
                <p className="mt-1 text-[12px] text-black/50 leading-snug">
                  Pedile al cliente el código de 6 dígitos y cargalo para completar el turno.
                </p>

                <div className="mt-4">
                  <input
                    value={code}
                    onChange={(e) => {
                      const onlyDigits = String(e.target.value || "").replace(/\D/g, "").slice(0, 6);
                      setCode(onlyDigits);
                    }}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    className="w-full h-[56px] rounded-2xl border border-black/10 bg-white px-4 text-center text-[22px] font-extrabold tracking-[0.35em] text-[#1E2F5D] outline-none placeholder:text-black/20 shadow-[0_8px_18px_rgba(0,0,0,0.06)]"
                  />

                  <button
                    type="button"
                    onClick={onComplete}
                    disabled={busy}
                    className={[
                      "mt-3 w-full h-[54px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.24)] active:scale-[0.99] transition",
                      busy ? "bg-[#1E2F5D]/60" : "bg-[#1E2F5D]",
                    ].join(" ")}
                  >
                    {busy ? "Validando..." : "Confirmar y finalizar"}
                  </button>

                  <p className="mt-3 text-[11px] text-black/45">
                    Si el código es incorrecto o venció, pedile al cliente que genere uno nuevo.
                  </p>
                </div>
              </div>
            </div>
          </CardShell>
        )}

        {/* ❌ Sacado el botón de “volver a solicitudes” */}
      </div>

      {/* ✅ Modal de éxito (bottom sheet estilo Orby) */}
      {successOpen && (
        <div className="fixed inset-0 z-[9999]">
          <button className="absolute inset-0 bg-black/40" onClick={() => setSuccessOpen(false)} aria-label="Cerrar" />

          <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-extrabold text-[#3D3D3D]">Turno completado</p>
                    <p className="mt-1 text-[12px] text-black/45">
                      La solicitud quedó marcada como <b>completada</b>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSuccessOpen(false)}
                    className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-[#1E2F5D]/[0.06] p-5 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-white border border-black/10 grid place-items-center shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                    <IconifyIcon icon="mdi:check" className="h-7 w-7 text-[#1E2F5D]" />
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-black/60">¡Listo! Ya podés seguir con tus próximas solicitudes.</p>
                </div>

                <button
                  type="button"
                  onClick={() => nav("/provider/requests", { replace: true })}
                  className="mt-4 w-full h-[54px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.28)] active:scale-[0.99] transition"
                >
                  Volver a solicitudes
                </button>

                <button
                  type="button"
                  onClick={() => setSuccessOpen(false)}
                  className="mt-3 w-full h-[54px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold active:scale-[0.99] transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
