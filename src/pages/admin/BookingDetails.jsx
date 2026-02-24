import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../services/supabase";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { Icon as IconifyIcon } from "@iconify/react";

/* ================= UI COMPONENTS ================= */
function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white overflow-hidden border border-black/10",
        "shadow-[0_8px_18px_rgba(0,0,0,0.02)]", // ✅ sombra más suave (0.02)
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* ================= AVATAR ================= */
function Avatar({ src, name }) {
  return (
    <div className="h-11 w-11 rounded-full overflow-hidden bg-black/[0.05] grid place-items-center">
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : <span className="text-black/40">{name?.[0] || "?"}</span>}
    </div>
  );
}

/* ================= VERIFIED ICON ================= */
function VerifiedIcon({ show }) {
  if (!show) return null;
  return <IconifyIcon icon="mdi:check-decagram" className="h-4 w-4 text-[#4368C5]" />;
}

/* ================= SECTION TITLE ================= */
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

/* ================= CLEAN DESCRIPTION ================= */
function cleanDescription(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";

  const cutByPin = text.split(/📍/)[0].trim();
  if (cutByPin) return cutByPin;

  const cutByUbi = text.split(/ubicaci[oó]n\s*:/i)[0].trim();
  if (cutByUbi) return cutByUbi;

  return text;
}

/* ================= FECHA Y HORA ================= */
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

/* ================= STATUS BADGE ================= */
function norm(status) {
  return String(status || "").toLowerCase();
}

function statusStyle(status) {
  const s = norm(status);
  const map = {
    solicitada: "bg-[#FFF5CC] text-[#7A5B00] border border-[#F3E4A5]",
    cotizada: "bg-[#F1E8FF] text-[#4B2A8A] border border-[#E3D6FF]",
    aceptada: "bg-[#E9FFF6] text-[#0F6B3D] border border-[#CFF4E3]",
    agendada: "bg-[#EAF2FF] text-[#1E2F5D] border border-[#CFE0FF]",
    rechazada: "bg-[#FFE6EA] text-[#9B1C1C] border border-[#FFC9D3]",
    cancelada: "bg-black/[0.05] text-black/70 border border-black/10",
    completada: "bg-[#E8FFF2] text-[#0F6B3D] border border-[#CFF4E3]",
    incumplida: "bg-[#FFE6EA] text-[#9B1C1C] border border-[#FFC9D3]",
  };
  return map[s] || "bg-black/[0.05] text-black/70 border border-black/10";
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

/* ================= MAIN COMPONENT ================= */
export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [request, setRequest] = useState(null);
  const [service, setService] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  /* ================= LOAD DATA ================= */
  async function loadData() {
    setLoading(true);

    const { data: reqData, error: reqError } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (reqError) {
      console.error(reqError);
      setLoading(false);
      return;
    }

    const { data: profData } = await supabase.from("profiles").select("*");

    let serviceData = null;
    if (reqData.catalog_id) {
      const { data } = await supabase
        .from("service_catalog")
        .select("id, name, category, pricing_type")
        .eq("id", reqData.catalog_id)
        .single();
      serviceData = data;
    }

    setRequest(reqData);
    setProfiles(profData || []);
    setService(serviceData);
    setNewStatus(reqData?.status || "");
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  /* ================= COMPUTED ================= */
  const computed = useMemo(() => {
    if (!request) return null;
    const client = profiles.find((p) => p.id === request.client_id);
    const provider = profiles.find((p) => p.id === request.provider_id);
    return { ...request, client, provider };
  }, [request, profiles]);

  const isFixedPrice = service?.pricing_type === "A";

  /* ================= UPDATE STATUS ================= */
  async function handleStatusChange() {
    if (!newStatus) return;
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: newStatus })
      .eq("id", id);
    setSaving(false);

    if (!error) {
      toast.success("Estado actualizado", "El cambio se guardó correctamente");
      loadData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      console.error(error);
    }
  }

  if (loading) return <Loading />;
  if (!computed) return null;

  const provider = computed.provider || {};
  const client = computed.client || {};

  const cleanedDesc = cleanDescription(computed.description);
  const canSave = !saving && newStatus && newStatus !== computed.status;

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="space-y-5 px-0 pt-4 pb-28">
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/admin/bookings");
            }}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow grid place-items-center"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">
            Detalle de solicitud
          </h1>
        </div>

        {/* Estado actual */}
        <CardShell className="p-5 flex items-center justify-between">
          <span className="text-[14px] font-extrabold text-[#3D3D3D]">Estado actual</span>
          <StatusBadge status={computed.status} />
          
        </CardShell>

        {/* Servicio + Prestador + Cliente */}
        <CardShell className="p-5 space-y-4">
          {/* Servicio */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/40">Servicio</p>
              <p className="mt-1 text-[16px] font-extrabold text-[#3D3D3D] leading-snug break-words">{service?.name || "—"}</p>
              {service?.category && <p className="mt-1 text-[12px] text-black/50">{service.category}</p>}
            </div>
          </div>

          {/* Prestador */}
          <div className="pt-4 border-t border-black/10">
            <p className="text-[12px] font-semibold text-black/40">Prestador</p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar src={provider.avatar_url} name={provider.full_name} />
              <div className="min-w-0">
                <div className="flex items-center gap-[2px]">
                  <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{provider.full_name || "—"}</p>
                  <VerifiedIcon show={provider.verified} />
                </div>
                {provider.neighborhood && <p className="mt-0.5 text-[12px] text-black/50 truncate">{provider.neighborhood}</p>}
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="pt-4 border-t border-black/10">
            <p className="text-[12px] font-semibold text-black/40">Cliente</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{client.full_name || "—"}</p>
                {client.neighborhood && <p className="mt-0.5 text-[12px] text-black/50 truncate">{client.neighborhood}</p>}
              </div>
            </div>
          </div>
        </CardShell>

        {/* Detalle de solicitud */}
        <CardShell className="p-5">
          <SectionTitle icon="mdi:clipboard-text-outline" title="Detalle" />

          <div className="mt-3 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
            <div className="grid gap-2 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Barrio</span>
                <span className="font-semibold text-black/70 text-right">{computed.neighborhood || "—"}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Dirección</span>
                <span className="font-semibold text-black/70 text-right">{computed.address || "—"}</span>
              </div>

              <div className="pt-2 mt-1 border-t border-black/10 flex items-start justify-between gap-3">
                <span className="text-black/45">Fecha</span>
                <span className="font-semibold text-black/70 text-right">{formatDateOnly(computed.preferred_datetime)}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-black/45">Hora</span>
                <span className="font-semibold text-black/70 text-right">{formatTimeOnly(computed.preferred_datetime)}</span>
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

        {/* Cambio estado */}
        <CardShell className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[14px] font-extrabold text-[#3D3D3D] leading-none">
                Cambiar estado
              </h3>
              <p className="mt-2 text-[12px] text-black/45 leading-snug">
                Seleccioná un nuevo estado y guardá el cambio.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-stretch gap-3">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40">
                <IconifyIcon icon="mdi:chevron-down" className="h-5 w-5" />
              </span>

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className={[
                  "h-14 w-full rounded-full",
                  "bg-black/[0.04] text-black/70",
                  "border border-black/10",
                  "px-5 pr-12 text-[14px] font-semibold",
                  "outline-none transition appearance-none",
                  "focus:border-[#1E2F5D]/30 focus:ring-2 focus:ring-[#1E2F5D]/10",
                  "active:scale-[0.99]",
                ].join(" ")}
              >
                <option value="solicitada">Solicitada</option>
                {!isFixedPrice && <option value="cotizada">Cotizada</option>}
                <option value="aceptada">Aceptada</option>
                <option value="agendada">Agendada</option>
                <option value="completada">Completada</option>
                <option value="incumplida">Incumplida</option>
                <option value="cancelada">Cancelada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>

            <button
              onClick={handleStatusChange}
              disabled={!canSave}
              className={[
                "h-14 flex-1 rounded-full",
                "text-[14px] font-extrabold",
                canSave
                  ? "bg-[#1E2F5D] text-white shadow-[0_10px_24px_rgba(30,47,93,0.22)]"
                  : "bg-black/[0.06] text-black/40 border border-black/10 shadow-none",
                "transition active:scale-[0.99]",
                "disabled:cursor-not-allowed",
                "min-w-[140px]",
              ].join(" ")}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </CardShell>
      </div>
    </div>
  );
}