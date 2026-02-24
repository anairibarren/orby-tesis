// src/pages/admin/ReviewDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { Icon } from "@iconify/react";

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

function VerifiedIcon({ show }) {
  if (!show) return null;
  return <Icon icon="mdi:check-decagram" className="h-4 w-4 text-[#4368C5]" />;
}

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

/* ================= HELPERS ================= */
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

/* ================= STARS (ICONOS, NO EMOJI) ================= */
function RatingStars({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < v;
        return (
          <Icon
            key={i}
            icon={filled ? "mdi:star" : "mdi:star-outline"}
            className={["h-4 w-4", filled ? "text-[#E3B100]" : "text-black/20"].join(" ")}
          />
        );
      })}
    </span>
  );
}

/* ================= MAIN ================= */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const computed = useMemo(() => {
    if (!review) return null;
    const client = profiles.find((p) => p.id === review.client_id);
    const provider = profiles.find((p) => p.id === review.provider_id);
    return { ...review, client, provider };
  }, [review, profiles]);

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

  function goBack() {
    // Si hay historial real, volvemos. Si no, fallback al listado.
    if (window.history.length > 1) navigate(-1);
    else navigate("/admin/reviews", { replace: true });
  }

  if (loading) return <Loading />;

  if (notFound) {
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
  }

  const client = computed?.client || {};
  const provider = computed?.provider || {};

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="space-y-5 px-0 pt-4 pb-28">
        {/* HEADER */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={goBack}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>
          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Detalle de reseña</h1>
        </div>

        {/* CLIENTE / PRESTADOR */}
        <CardShell className="p-5">
          <div>
            <p className="text-[12px] font-semibold text-black/40">Prestador</p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar src={provider.avatar_url} name={provider.full_name} />
              <div className="min-w-0">
                <div className="flex items-center gap-[2px]">
                  <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">
                    {provider.full_name || "—"}
                  </p>
                  <VerifiedIcon show={provider.verified} />
                </div>
                {provider.neighborhood ? (
                  <p className="mt-0.5 text-[12px] text-black/50 truncate">{provider.neighborhood}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/10">
            <p className="text-[12px] font-semibold text-black/40">Cliente</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">
                  {client.full_name || "—"}
                </p>
                {client.neighborhood ? (
                  <p className="mt-0.5 text-[12px] text-black/50 truncate">{client.neighborhood}</p>
                ) : null}
              </div>
            </div>
          </div>
        </CardShell>

        {/* RESEÑA */}
        <CardShell className="p-5">
          <SectionTitle icon="mdi:star-outline" title="Reseña" />

          <div className="flex items-start justify-between gap-3 mt-2">
            <span className="text-[13px] text-black/45">Puntaje</span>

            <span className="inline-flex items-center gap-2 text-right">
              <RatingStars value={review?.rating} />
              <span className="text-[13px] font-semibold text-black/70">({review?.rating ?? "—"})</span>
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 mt-2">
            <span className="text-[13px] text-black/45">Fecha</span>
            <span className="text-[13px] font-semibold text-black/70 text-right">
              {formatDateOnly(review?.created_at)}
            </span>
          </div>

          <div className="mt-4">
            <span className="text-[13px] text-black/45">Comentario</span>
            <div className="mt-2 rounded-xl bg-black/[0.02] border border-black/10 p-4 text-sm text-[#3D3D3D]">
              {review?.comment || "Sin comentario"}
            </div>
          </div>
        </CardShell>

        {/* ELIMINAR (minimal, alineado) */}
        <CardShell className="p-5">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-black/[0.04] grid place-items-center">
              <Icon icon="mdi:trash-can-outline" className="h-4 w-4 text-black/45" />
            </span>
            <p className="text-[14px] font-extrabold text-[#3D3D3D]">Eliminar reseña</p>
          </div>

          <p className="mt-2 text-[12px] text-black/45 leading-snug">
            Esta acción es permanente y no se puede deshacer.
          </p>

          <button
            type="button"
            onClick={() => setShowSheet(true)}
            disabled={deleting}
            className={[
              "mt-4 h-[54px] w-full rounded-full text-white text-[14px] font-extrabold",
              "shadow-[0_14px_30px_rgba(198,40,40,0.18)] active:scale-[0.99] transition",
              deleting ? "bg-[#C62828]/60" : "bg-[#C62828]",
            ].join(" ")}
          >
            {deleting ? "Eliminando..." : "Eliminar reseña"}
          </button>
        </CardShell>
      </div>

      {/* ================= BOTTOM SHEET (Confirmación) ================= */}
      {showSheet && (
        <div className="fixed inset-0 z-[9999]">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => !deleting && setShowSheet(false)}
            aria-label="Cerrar"
          />

          {/* sheet */}
          <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10 animate-sheetUp">
              {/* handle */}
              <div className="pt-3 flex justify-center">
                <div className="h-1.5 w-14 rounded-full bg-black/10" />
              </div>

              <div className="px-6 pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">Eliminar reseña</h3>
                    <p className="mt-1 text-[12px] text-black/45 leading-snug">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className={[
                      "h-[54px] w-full rounded-full text-white text-[14px] font-extrabold",
                      "shadow-[0_14px_30px_rgba(198,40,40,0.20)] active:scale-[0.99] transition",
                      deleting ? "bg-[#C62828]/60" : "bg-[#C62828]",
                    ].join(" ")}
                  >
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSheet(false)}
                    disabled={deleting}
                    className="h-[54px] w-full rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold shadow-[0_8px_18px_rgba(0,0,0,0.06)] active:scale-[0.99] transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* animación del sheet */}
          <style>{`
            @keyframes sheetUp {
              from { transform: translateY(16px); opacity: 0; }
              to   { transform: translateY(0); opacity: 1; }
            }
            .animate-sheetUp { animation: sheetUp .18s ease-out both; }
          `}</style>
        </div>
      )}
    </div>
  );
}