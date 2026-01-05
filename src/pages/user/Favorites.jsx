import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { getFavorites, removeFavorite } from "../../services/favorites";
import { supabase } from "../../services/supabase";

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);

  // Obtener usuario actual
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  // Cargar favoritos
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;
      const favs = await getFavorites(user.id);
      setFavorites(favs);
    };
    loadFavorites();
  }, [user]);

  // Eliminar favorito
  const handleRemove = async (provider_id) => {
    if (!user) return;
    await removeFavorite(user.id, provider_id);
    setFavorites((prev) =>
      prev.filter((f) => f.provider_id !== provider_id)
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">

      <header className="flex items-center px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 ml-5 flex items-center justify-center rounded-full bg-white shadow-md"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <h1 className="flex-1 text-2xl font-semibold text-center mr-[4rem] text-black">
          Favoritos
        </h1>
      </header>

      <main className="px-6">

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12">

            <h2 className="text-2xl font-bold text-black mb-4">
              ¡Ups! No tenés prestadores favoritos todavía
            </h2>

            <p className="text-md text-[#B1B1B1] mb-10 mr-4 ml-4">
              Guardá tus prestadores de confianza para encontrarlos más rápido la próxima vez.
            </p>

            <button
              onClick={() => navigate("/")}
              className="bg-[#2A4691] ml-4 text-white px-8 py-4 rounded-full font-medium flex items-center justify-center gap-3"
            >
              Explorar prestadores
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-10">

            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="bg-white rounded-2xl shadow-md p-5"
              >

                {/* FILA SUPERIOR */}
                <div className="flex items-center justify-between">

                  <div
                    onClick={() => navigate(`/provider/${fav.provider_id}`)}
                    className="flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-[60px] h-[60px] rounded-full bg-[#ECECEC] flex items-center justify-center">
                      <Icon
                        icon="mdi:account"
                        className="text-[#D0D0D0]"
                        width="34"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold leading-5">
                        {fav.provider_name}
                      </h3>
                      <p className="text-sm text-[#808080] mt-1">
                        {fav.provider_category}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(fav.provider_id)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md"
                  >
                    <Icon
                      icon="iconamoon:heart-fill"
                      color="#2A4691"
                      width="22"
                    />
                  </button>

                </div>

                <div className="flex items-center justify-between mt-6">

                  <div className="flex items-center gap-1 text-sm text-[#808080] font-medium">
                    <Icon
                      icon="material-symbols:star"
                      className="text-yellow-400"
                      width="18"
                    />
                    <span>{fav.rating || "4.8"}</span>
                    <span className="font-normal ml-1">
                      ({fav.reviews || "120"} reseñas)
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/calendar/${fav.provider_id}`)
                    }
                    className="bg-[#2A4691] text-white px-5 py-2 rounded-full text-sm hover:bg-[#1c3070] transition"
                  >
                    Agendar
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}

      </main>
    </div>
  );
}