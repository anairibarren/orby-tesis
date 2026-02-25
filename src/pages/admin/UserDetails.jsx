import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { Icon } from "@iconify/react";

/* ================= UTIL ================= */

function translateRole(role) {
  const map = {
    admin: "Administrador",
    provider: "Prestador",
    client: "Cliente",
  };
  return map[role] || role;
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
      className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle(
        status
      )}`}
    >
      {capitalize(status)}
    </span>
  );
}

/* ================= UI ================= */
function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white overflow-hidden",
        "shadow-[0_8px_18px_rgba(0,0,0,0.02)]", // ✅ 0.02
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-xl bg-black/[0.04] grid place-items-center">
        <Icon icon={icon} className="h-5 w-5 text-black/45" />
      </span>
      <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center text-center">
      <p className="mt-4 text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>

      <p className="mt-1 text-[12px] text-black/45 leading-snug max-w-[280px]">
        {description}
      </p>
    </div>
  );
}

/* ================= COMPONENT ================= */

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuthContext();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewUsers, setReviewUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formValues, setFormValues] = useState({});

  // UI: ver más / ver menos (solo presentación)
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const REQUESTS_PREVIEW = 4;
  const REVIEWS_PREVIEW = 3;

  const visibleRequests = showAllRequests
    ? requests
    : requests.slice(0, REQUESTS_PREVIEW);
  const visibleReviews = showAllReviews
    ? reviews
    : reviews.slice(0, REVIEWS_PREVIEW);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  /* ================= LOAD ================= */

  async function loadUser() {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (!profileData) {
      setLoading(false);
      return;
    }

    const { data: requestData } = await supabase
      .from("service_requests")
      .select(`id, status, service_catalog ( name )`)
      .or(`provider_id.eq.${id},client_id.eq.${id}`);

    const reviewColumn =
      profileData.role === "provider" ? "provider_id" : "client_id";

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("*")
      .eq(reviewColumn, id)
      .order("created_at", { ascending: false });

    const relatedIds =
      profileData.role === "provider"
        ? reviewData?.map((r) => r.client_id)
        : reviewData?.map((r) => r.provider_id);

    const uniqueIds = [...new Set(relatedIds || [])];

    if (uniqueIds.length > 0) {
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueIds);

      const map = {};
      usersData?.forEach((u) => {
        map[u.id] = u.full_name;
      });

      setReviewUsers(map);
    }

    setProfile(profileData);
    setRequests(requestData || []);
    setReviews(reviewData || []);
    setFormValues(profileData || {});
    setLoading(false);
  }

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ================= SAVE ================= */

  async function handleSave() {
    // ✅ TODOS obligatorios: nombre, email, ubicación
    if (!formValues.full_name?.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (!formValues.email?.trim()) {
      toast.error("El email es obligatorio");
      return;
    }

    if (!formValues.neighborhood?.trim()) {
      toast.error("La ubicación es obligatoria");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .update({
        full_name: formValues.full_name,
        email: formValues.email,
        neighborhood: formValues.neighborhood,
      })
      .eq("id", id)
      .select()
      .single();

    setProfile(data);
    setEditMode(false);
    toast.success("Perfil actualizado correctamente");
  }

  if (loading) return <Loading />;
  if (!profile) return null;

  const isProvider = profile.role === "provider";

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
        <div className="max-w-3xl mx-auto space-y-5 px-0 pt-4 pb-28">
          {/* HEADER */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(location.state?.from || -1)}
              className="absolute left-0 h-11 w-11 rounded-full border border-black/10 bg-white shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-2xl leading-none">‹</span>
            </button>

            <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">
              Información del usuario
            </h1>

            <button
              onClick={() => setEditMode(true)}
              className="absolute right-0 h-11 w-11 rounded-full border border-black/10 bg-white shadow-[0_8px_18px_rgba(0,0,0,0.02)] grid place-items-center"
              aria-label="Editar"
              title="Editar"
            >
              <Icon icon="mdi:pencil" className="h-6 w-6 text-black/45" />
            </button>
          </div>

          {/* ================= INFORMACIÓN ================= */}
          <CardShell className="p-5">
            <SectionTitle icon="mdi:account-circle-outline" title="Información" />

            <div className="mt-4 rounded-[18px] bg-black/[0.02] border border-black/10 p-4">
              <div className="grid gap-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-black/45">
                    Nombre <span className="text-red-500">*</span>
                  </span>
                  <span className="font-semibold text-black/70 text-right">
                    {profile.full_name || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-black/45">
                    Email <span className="text-red-500">*</span>
                  </span>
                  <span className="font-semibold text-black/70 text-right">
                    {profile.email || "—"}
                  </span>
                </div>

                <div className="pt-2 mt-1 border-t border-black/10 flex items-center justify-between gap-3">
                  <span className="text-black/45">Rol</span>
                  <span className="font-semibold text-black/70 text-right">
                    {translateRole(profile.role)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-black/45">
                    Ubicación <span className="text-red-500">*</span>
                  </span>
                  <span className="font-semibold text-black/70 text-right">
                    {profile.neighborhood || "—"}
                  </span>
                </div>
              </div>
            </div>
          </CardShell>

          {/* ================= SOLICITUDES ================= */}
          <CardShell className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionTitle icon="mdi:clipboard-text-outline" title="Solicitudes" />

              {requests.length > REQUESTS_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllRequests((v) => !v)}
                  className="h-9 px-4 rounded-full bg-black/[0.04] border border-black/10 text-[12px] font-extrabold text-[#3D3D3D] inline-flex items-center gap-2 active:scale-[0.99] transition"
                >
                  <span>{showAllRequests ? "Ver menos" : "Ver más"}</span>
                  <Icon
                    icon={showAllRequests ? "mdi:chevron-up" : "mdi:chevron-down"}
                    className="h-5 w-5 text-black/45"
                  />
                </button>
              )}
            </div>

            {requests.length === 0 ? (
              <EmptyState
                icon="mdi:clipboard-text-outline"
                title="Todavía no hay solicitudes"
                description="Cuando haya una novedad, las vas a ver acá."
              />
            ) : (
              <div className="mt-4 space-y-3">
                {visibleRequests.map((r) => (
                  <div
                    key={r.id}
                    className="relative rounded-[18px] bg-black/[0.03] px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3 pr-11">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-black/45">
                          Servicio
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold text-[#3D3D3D] truncate">
                          {r.service_catalog?.name || "Servicio"}
                        </p>
                      </div>

                      <div className="shrink-0 pt-1">
                        <StatusBadge status={r.status} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/admin/bookings/${r.id}`, {
                          state: { from: location.pathname },
                        })
                      }
                      className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
                      aria-label="Ver detalle"
                      title="Ver detalle"
                    >
                      <Icon
                        icon="mdi:arrow-top-right"
                        className="h-4 w-4 text-black/50"
                      />
                    </button>
                  </div>
                ))}

                {/* hint si está colapsado */}
                {!showAllRequests && requests.length > REQUESTS_PREVIEW && (
                  <p className="pt-1 text-[12px] text-black/40">
                    Mostrando {REQUESTS_PREVIEW} de {requests.length}.
                  </p>
                )}
              </div>
            )}
          </CardShell>

          {/* ================= RESEÑAS ================= */}
          <CardShell className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionTitle
                icon="mdi:star-outline"
                title={isProvider ? "Reseñas recibidas" : "Reseñas realizadas"}
              />

              {reviews.length > REVIEWS_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((v) => !v)}
                  className="h-9 px-4 rounded-full bg-black/[0.04] border border-black/10 text-[12px] font-extrabold text-[#3D3D3D] inline-flex items-center gap-2 active:scale-[0.99] transition"
                >
                  <span>{showAllReviews ? "Ver menos" : "Ver más"}</span>
                  <Icon
                    icon={showAllReviews ? "mdi:chevron-up" : "mdi:chevron-down"}
                    className="h-5 w-5 text-black/45"
                  />
                </button>
              )}
            </div>

            {reviews.length === 0 ? (
              <EmptyState
                icon="mdi:comment-text-outline"
                title="Todavía no hay reseñas"
                description="Cuando haya una novedad, las vas a acá."
              />
            ) : (
              <div className="mt-4 space-y-3">
                {visibleReviews.map((review) => (
                  <div
                    key={review.id}
                    className="relative rounded-[18px] bg-black/[0.03] p-5"
                  >
                    <div className="flex items-start justify-between gap-3 pr-11">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2">
                          <Icon icon="mdi:star" className="h-5 w-5 text-[#E3B100]" />
                          <span className="text-[13px] font-extrabold text-[#3D3D3D]">
                            {review.rating}/5
                          </span>
                        </div>

                        <p className="mt-2 text-[12px] text-black/45">
                          {isProvider
                            ? `De: ${reviewUsers[review.client_id] || "Usuario"}`
                            : `Para: ${reviewUsers[review.provider_id] || "Usuario"}`}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-[13px] text-black/70 leading-snug">
                      {review.comment || "Sin comentario"}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/admin/reviews/${review.id}`, {
                          state: { from: location.pathname },
                        })
                      }
                      className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
                      aria-label="Ver reseña"
                      title="Ver reseña"
                    >
                      <Icon
                        icon="mdi:arrow-top-right"
                        className="h-4 w-4 text-black/50"
                      />
                    </button>
                  </div>
                ))}

                {!showAllReviews && reviews.length > REVIEWS_PREVIEW && (
                  <p className="pt-1 text-[12px] text-black/40">
                    Mostrando {REVIEWS_PREVIEW} de {reviews.length}.
                  </p>
                )}
              </div>
            )}
          </CardShell>
        </div>
      </div>

      {/* ================= MODAL EDITAR (Sheet) ================= */}
      {editMode && (
        <div className="fixed inset-0 z-[9999]">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditMode(false)}
            aria-label="Cerrar"
          />

          {/* sheet */}
          <div className="absolute left-0 right-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-[520px] rounded-[30px] bg-white shadow-2xl overflow-hidden border border-black/10">
              {/* handle */}
              <div className="pt-3 flex justify-center">
                <div className="h-1.5 w-14 rounded-full bg-black/10" />
              </div>

              {/* header */}
              <div className="px-6 pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">
                      Editar perfil
                    </h2>
                    <p className="mt-1 text-[12px] text-black/45">
                      Mantené tu perfil actualizado.
                    </p>
                  </div>
                </div>
              </div>

              {/* content */}
              <div className="px-6 pb-4 space-y-3">
                {/* Campo: Nombre */}
                <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-black/45">
                    <Icon icon="mdi:account-outline" className="h-5 w-5" />
                    <p className="text-[12px] font-semibold">
                      Nombre y apellido <span className="text-red-500">*</span>
                    </p>
                  </div>

                  <input
                    value={formValues.full_name || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none placeholder:text-black/30"
                    placeholder="Ingresá el nombre"
                  />
                </div>

                {/* Campo: Email */}
                <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-black/45">
                    <Icon icon="mdi:email-outline" className="h-5 w-5" />
                    <p className="text-[12px] font-semibold">
                      Email <span className="text-red-500">*</span>
                    </p>
                  </div>

                  <input
                    value={formValues.email || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none placeholder:text-black/30"
                    placeholder="Ingresá el email"
                  />
                </div>

                {/* Campo: Barrio */}
                <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2 text-black/45">
                    <Icon icon="mdi:map-marker-outline" className="h-5 w-5" />
                    <p className="text-[12px] font-semibold">
                      Barrio <span className="text-red-500">*</span>
                    </p>
                  </div>

                  <select
                    value={formValues.neighborhood || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        neighborhood: e.target.value,
                      }))
                    }
                    className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none appearance-none"
                  >
                    {(() => {
                    const current = String(formValues.neighborhood || "").trim();
                    const LIST = [
                      "Vicente López",
                      "Olivos",
                      "Florida",
                      "Florida Oeste",
                      "La Lucila",
                      "Villa Martelli",
                      "Munro",
                      "Carapachay",
                      "Villa Adelina",
                    ];

                    const hasCurrent = current && LIST.includes(current);

                    return (
                      <>
                        {!current ? (
                          <option value="">Seleccionar barrio</option>
                        ) : !hasCurrent ? (
                          <option value={current}>{current}</option>
                        ) : null}

                        {LIST.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </>
                    );
                  })()}
                  </select>
                </div>
              </div>

              {/* footer fixed */}
              <div className="px-6 pb-6 pt-3 border-t border-black/10 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="h-14 rounded-full bg-black/[0.04] text-[#3D3D3D] font-extrabold border border-black/10 active:scale-[0.99] transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="h-14 rounded-full bg-[#1E2F5D] text-white font-extrabold shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}