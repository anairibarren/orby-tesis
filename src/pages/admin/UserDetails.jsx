import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  Navigate,
  useLocation,
} from "react-router-dom";
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

function StatusBadge({ status }) {
  const styles = {
    solicitada: "bg-[#FFF5CC] text-[#7A5B00]",
    cotizada: "bg-[#F1E8FF] text-[#4B2A8A]",
    aceptada: "bg-[#E9FFF6] text-[#0F6B3D]",
    agendada: "bg-[#EAF2FF] text-[#1E2F5D]",
    completada: "bg-[#E8FFF2] text-[#0F6B3D]",
    incumplida: "bg-[#FFE0B2] text-[#9A3412]",
    rechazada: "bg-[#FFE6EA] text-[#9B1C1C]",
    cancelada: "bg-black/[0.06] text-black/70",
  };

  const key = status?.toLowerCase();

  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${
        styles[key] || styles.cancelada
      }`}
    >
      {capitalize(status)}
    </span>
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
  }, [id]);

  /* ================= SAVE ================= */

  async function handleSave() {
    if (!formValues.full_name?.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (!formValues.email?.trim()) {
      toast.error("El email es obligatorio");
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
      <div className="max-w-3xl mx-auto space-y-10 pb-20">
        {/* HEADER */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate(location.state?.from || -1)}
            className="absolute left-0 h-10 w-10 rounded-full border border-black/10 bg-white shadow-sm grid place-items-center"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">
            Información del usuario
          </h1>

          <button
            onClick={() => setEditMode(true)}
            className="absolute right-0 h-10 w-10 rounded-full border border-black/10 bg-white grid place-items-center"
          >
            <Icon
              icon="mdi:pencil-outline"
              className="h-5 w-5"
            />
          </button>
        </div>

        {/* ================= INFORMACIÓN ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 space-y-4">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">
            Información
          </h3>

          <div className="flex justify-between items-center">
            <span className="text-sm text-black/40">
              Nombre <span className="text-red-500">*</span>
            </span>
            <span className="text-sm font-semibold text-black/80">
              {profile.full_name}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-black/40">
              Email <span className="text-red-500">*</span>
            </span>
            <span className="text-sm font-semibold text-black/80">
              {profile.email}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-black/40">Rol</span>
            <span className="text-sm font-semibold text-black/80">
              {translateRole(profile.role)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-black/40">Ubicación</span>
            <span className="text-sm font-semibold text-black/80">
              {profile.neighborhood || "—"}
            </span>
          </div>
        </div>

        {/* ================= SOLICITUDES ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 space-y-4">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">
            Solicitudes
          </h3>

          {requests.map((r) => (
            <div
              key={r.id}
              className="relative bg-black/[0.02] rounded-2xl px-5 py-4"
            >
              <div className="flex justify-between items-center pr-12">
                <span className="font-medium text-sm">
                  {r.service_catalog?.name || "Servicio"}
                </span>
                <StatusBadge status={r.status} />
              </div>

              <button
                onClick={() =>
                  navigate(`/admin/bookings/${r.id}`, {
                    state: { from: location.pathname },
                  })
                }
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/[0.04] grid place-items-center"
              >
                <Icon
                  icon="mdi:arrow-top-right"
                  className="h-4 w-4 text-black/50"
                />
              </button>
            </div>
          ))}
        </div>

        {/* ================= RESEÑAS ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 space-y-4">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">
            {isProvider ? "Reseñas recibidas" : "Reseñas realizadas"}
          </h3>

          {reviews.length === 0 && (
            <p className="text-sm text-black/40">
              No se encuentran reseñas disponibles.
            </p>
          )}

          {reviews.map((review) => (
            <div
              key={review.id}
              className="relative bg-black/[0.03] rounded-2xl p-5"
            >
              <div className="text-sm font-semibold">⭐ {review.rating}</div>

              <p className="text-sm text-black/70 mt-2">
                {review.comment || "Sin comentario"}
              </p>

              <p className="text-sm text-black/50 mt-2">
                {isProvider
                  ? `De: ${reviewUsers[review.client_id] || "Usuario"}`
                  : `Para: ${reviewUsers[review.provider_id] || "Usuario"}`}
              </p>

              <button
                onClick={() =>
                  navigate(`/admin/reviews/${review.id}`, {
                    state: { from: location.pathname },
                  })
                }
                className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/[0.04] grid place-items-center"
              >
                <Icon
                  icon="mdi:arrow-top-right"
                  className="h-4 w-4 text-black/50"
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODAL EDITAR ================= */}
      {editMode && (
        <div className="fixed inset-0 z-[999] flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditMode(false)}
          />

          <div className="relative w-full bg-white rounded-t-[28px] p-6 pb-8 max-w-[460px] mx-auto">
            <div className="w-10 h-1.5 bg-black/20 rounded-full mx-auto mb-6" />

            <h2 className="text-[18px] font-extrabold text-[#3D3D3D] mb-2">
              Editar perfil
            </h2>

            <p className="text-sm text-black/45 mb-6">
              Podés actualizar la información del usuario.
            </p>

            <div className="space-y-5">

              <div>
                <label className="text-sm text-black/45 block mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  value={formValues.full_name || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-black/45 block mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  value={formValues.email || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none"
                />
              </div>


              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm text-black/45 block mb-1">
                    Ubicación
                  </h3>
                </div>

                <p className="text-xs text-black/45 mb-3">
                  Seleccioná el barrio donde se encuentra el usuario.
                </p>

                <select
                  value={formValues.neighborhood || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      neighborhood: e.target.value,
                    }))
                  }
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none appearance-none"
                >
                  <option value="">Seleccionar barrio</option>
                  <option value="Florida">Florida</option>
                  <option value="Florida Oeste">Florida Oeste</option>
                  <option value="La Lucila">La Lucila</option>
                  <option value="Olivos">Olivos</option>
                  <option value="Vicente López">Vicente López</option>
                  <option value="Carapachay">Carapachay</option>
                  <option value="Munro">Munro</option>
                  <option value="Villa Adelina">Villa Adelina</option>
                </select>
              </div>
            </div>


            <div className="mt-8 space-y-3">
              <button
                onClick={handleSave}
                className="w-full h-14 rounded-full bg-[#1E2F5D] text-white font-medium shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition"
              >
                Guardar cambios
              </button>

              <button
                onClick={() => setEditMode(false)}
                className="w-full h-14 rounded-full bg-black/[0.04] text-black/70 font-medium active:scale-[0.99] transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}