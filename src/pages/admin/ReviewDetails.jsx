import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { Icon } from "@iconify/react"; // ✅ Import corregido para Iconify

/* ================= UI COMPONENTS ================= */
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

function Avatar({ src, name }) {
  return (
    <div className="h-11 w-11 rounded-full overflow-hidden bg-black/[0.05] grid place-items-center">
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-black/40">{name?.[0] || "?"}</span>
      )}
    </div>
  );
}

/* ================= VERIFIED ICON ================= */
function VerifiedIcon({ show }) {
  if (!show) return null;
  return <Icon icon="mdi:check-decagram" className="h-4 w-4 text-[#4368C5]" />;
}

/* ================= SECTION TITLE ================= */
function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-8 w-8 rounded-xl bg-black/[0.04] grid place-items-center">
        <Icon icon={icon} className="h-5 w-5 text-black/45" />
      </span>
      <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
    </div>
  );
}

/* ================= FORMATEO DE FECHA ================= */
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

/* ================= MAIN COMPONENT ================= */
export default function ReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const toast = useToast();

  const [review, setReview] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  /* ================= LOAD REVIEW + PROFILES ================= */
  async function loadReview() {
    setLoading(true);
    setNotFound(false);

    const { data: reviewData, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (reviewError || !reviewData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: profData } = await supabase.from("profiles").select("*");
    setReview(reviewData);
    setProfiles(profData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadReview();
  }, [id]);

  /* ================= COMPUTED ================= */
  const computed = useMemo(() => {
    if (!review) return null;
    const client = profiles.find((p) => p.id === review.client_id);
    const provider = profiles.find((p) => p.id === review.provider_id);
    return { ...review, client, provider };
  }, [review, profiles]);

  /* ================= DELETE REVIEW ================= */
  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);

    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar reseña");
      setDeleting(false);
      return;
    }

    toast.success("Reseña eliminada correctamente");
    navigate("/admin/reviews");
  }

  if (loading) return <Loading />;
  if (notFound)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F5]">
        <h2 className="text-xl font-bold text-[#1E2F5D] mb-2">Reseña no encontrada</h2>
        <button
          onClick={() => navigate("/admin/reviews")}
          className="rounded-full bg-[#1E2F5D] px-6 py-2 text-sm font-medium text-white"
        >
          Volver al listado
        </button>
      </div>
    );

  const client = computed.client || {};
  const provider = computed.provider || {};

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="space-y-5 p-4">
        {/* HEADER */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow grid place-items-center"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>
          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Detalle de reseña</h1>
        </div>

        {/* CLIENTE / PRESTADOR */}
        <CardShell className="p-5">
          <div>
            <p className="text-[12px] font-semibold text-black/40">Prestador</p>
            <div className="mt-2 flex items-center gap-3 mb-2">
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

          <div className="pt-4 border-t border-black/10">
            <p className="text-[12px] font-semibold text-black/40">Cliente</p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar src={client.avatar_url} name={client.full_name} />
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{client.full_name || "—"}</p>
                {client.neighborhood && <p className="mt-0.5 text-[12px] text-black/50 truncate">{client.neighborhood}</p>}
              </div>
            </div>
          </div>
        </CardShell>

        {/* RESEÑA */}
        <CardShell className="p-5">
          <SectionTitle icon="mdi:star" title="Reseña" />

          <div className="flex items-start justify-between gap-3 mt-2">
            <span className="text-[13px] text-black/45">Puntaje</span>
            <span className="text-[13px] font-semibold text-[3D3D3D] text-right">
              {"⭐".repeat(review.rating)} ({review.rating})
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 mt-2">
            <span className="text-[13px] text-black/45">Fecha</span>
            <span className="text-[13px] font-semibold text-black/70 text-right">{formatDateOnly(review.created_at)}</span>
          </div>

          <div className="mt-4">
            <span className="text-[13px] text-black/45">Comentario</span>
            <div className="mt-2 rounded-xl bg-black/[0.02] border border-black/10 p-4 text-sm text-[#3D3D3D]">
              {review.comment || "Sin comentario"}
            </div>
          </div>
        </CardShell>

        {/* ELIMINAR */}
        <CardShell className="p-5">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D] mb-3">Eliminar reseña</h3>
          <button
            onClick={() => setShowSheet(true)}
            disabled={deleting}
            className="h-12 w-full rounded-full bg-red-600 text-white font-semibold shadow-[0_10px_22px_rgba(220,38,38,0.22)] active:scale-[0.98] transition disabled:opacity-60"
          >
            Eliminar
          </button>
        </CardShell>
      </div>

      {/* ================= BOTTOM SHEET ================= */}
      {showSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] animate-slideUp">
            <div>
              <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Eliminar reseña</h3>
              <p className="mt-1 text-[12px] text-black/45">Esta acción no se puede deshacer.</p>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-12 w-full rounded-full bg-red-600 text-white font-semibold shadow-[0_10px_22px_rgba(220,38,38,0.22)] active:scale-[0.98] transition disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>

              <button
                type="button"
                onClick={() => setShowSheet(false)}
                disabled={deleting}
                className="h-12 w-full rounded-full bg-white border border-black/10 text-[#3D3D3D] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.98] transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}