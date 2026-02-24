import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { FiInfo } from "react-icons/fi";
import Loading from "../../components/Loading";

export default function Reviews() {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;

    let isMounted = true;

    async function loadReviews() {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          client:profiles!reviews_client_id_fkey (
            id,
            full_name
          ),
          provider:profiles!reviews_provider_id_fkey (
            id,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && isMounted) {
        setReviews(data || []);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadReviews();

    // 🔥 REALTIME
    const channel = supabase
    .channel("reviews-realtime-admin")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "reviews",
      },
      () => {
        if (!isMounted) return;
        loadReviews();
      }
    )
    .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  if (loading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2 font-extrabold text-[#3D3D3D]">
            Supervisión de reseñas
          </h1>
          <p className="mb-4 text-md text-black/50 mr-14">
            Gestión y monitoreo de valoraciones realizadas en la plataforma
          </p>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-md text-gray-500">
            <tr>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3 text-left">Prestador</th>
              <th className="p-3 text-center">Puntaje</th>
              <th className="p-3 text-center">Info</th>
            </tr>
          </thead>

          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium text-black">
                    {r.client?.full_name || "—"}
                  </div>
                </td>

                <td className="p-3 text-black">
                  {r.provider?.full_name || "—"}
                </td>

                {/* ⭐ PUNTAJE PROFESIONAL */}
                <td className="p-3 text-center font-semibold text-[#1E2F5D]">
                  {r.rating} / 5
                </td>

                <td className="p-3 text-center">
                  <button
                    onClick={() =>
                      navigate(`/admin/reviews/${r.id}`)
                    }
                    className="text-black hover:opacity-70 transition"
                  >
                    <FiInfo size={20} />
                  </button>
                </td>
              </tr>
            ))}

            {reviews.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-400">
                  No hay reseñas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}