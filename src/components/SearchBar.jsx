import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import FiltersPanel from "../components/FiltersPanel";

export default function SearchBar({ onBack }) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Para los iconos de subcategorías
  const iconMap = {
    Plomería: "temaki:plumber",
    Electricidad: "mage:electricity-fill",
    Jardinería: "material-symbols:garden-cart",
    Cerrajería: "mdi:lock-outline",
    Mecánica: "mdi:wrench",
    Limpieza: "material-symbols:home-rounded",
    "Fletes y Mudanzas": "mdi:truck-fast",
    "Clases de guitarra": "mdi:guitar-electric",
    "Clases de piano": "mdi:piano",
    "Clases de batería": "mdi:drum",
    "Clases de inglés": "mdi:alphabet-latin",
    "Clases de portugués": "mdi:alphabet-latin",
    "Clases de alemán": "mdi:alphabet-latin",
    Cocina: "mdi:chef-hat",
    "Apoyo escolar": "mdi:school",
    "Talleres artísticos": "mdi:palette",
    Estilista: "mdi:hair-dryer",
    Masajes: "mdi:hand-heart",
    "Entrenamiento personal": "mdi:arm-flex",
    "Cuidado de mascotas": "mdi:paw",
    "Cuidado de adultos mayores": "mdi:account-heart",
    Animadores: "mdi:emoticon-happy",
    Decoradores: "mdi:balloon",
    Catering: "mdi:food",
    "Organización de eventos": "mdi:calendar-multiselect",
  };

  useEffect(() => {
    const fetchProviders = async () => {
      if (!searchText) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data: providersData } = await supabase
          .from("providers")
          .select(
            "id, name, description, image, rating, reviews_count, price_min, price_max, location"
          )
          .or(`name.ilike.%${searchText}%,description.ilike.%${searchText}%`);

        const { data: subcategoriesData } = await supabase
          .from("subcategories")
          .select("id, name, category_id")
          .ilike("name", `%${searchText}%`);

        const combined = [
          ...(providersData || []).map((p) => ({ type: "provider", ...p })),
          ...(subcategoriesData || []).map((s) => ({
            type: "subcategory",
            ...s,
          })),
        ];

        setResults(combined);
      } catch (error) {
        console.error("Error al buscar:", error);
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(fetchProviders, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  return (
    <div className="flex flex-col h-screen font-[Poppins] bg-[#F5F5F5]">
      <div className="flex items-center gap-3 p-4">
        <button
          className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md"
          onClick={onBack}
        >
          <Icon icon="ep:arrow-left-bold" width={24} />
        </button>

        <div className="flex flex-1 items-center bg-white rounded-full px-4 py-4 shadow-sm">
          <input
            type="text"
            placeholder="¿A quién estás buscando?"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent outline-none text-md"
          />
        </div>

        <button
          className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Icon icon="mingcute:filter-2-fill" width={24} />
        </button>
      </div>

      {showFilters && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-center items-start pt-16 z-50"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="bg-white rounded-xl p-4 w-[90%] max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <FiltersPanel onClose={() => setShowFilters(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {loading &&
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
            ></div>
          ))}

        {!loading &&
          results.map((item) =>
            item.type === "provider" ? (
              <div
                key={item.id}
                className="bg-white rounded-xl p-6 shadow-md cursor-pointer hover:shadow-lg transition"
                onClick={() => navigate(`/provider/${item.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-2xl mb-2">{item.name}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-md">
                      <Icon
                        icon="material-symbols:star-rounded"
                        className="text-yellow-400 w-4 h-4"
                      />
                      <span>
                        {item.rating?.toFixed(1) || "N/A"} ({item.reviews_count || 0})
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                <div className="flex flex-col gap-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Icon icon="mingcute:location-fill" className="text-gray-600 w-5 h-5" />
                    <span>{item.location || "Sin ubicación"}</span>
                  </div>

                  {item.price_min && item.price_max && (
                    <div className="flex items-center gap-2">
                      <Icon icon="lineicons:cash-app" className="text-gray-600 w-5 h-5" />
                      <span>
                        Estimado: ${item.price_min.toLocaleString()} - $
                        {item.price_max.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <p className="text-gray-400">{item.description}</p>

                  <div className="flex gap-3 mt-2 justify-center">
                    <button
                      className="flex-1 bg-gray-300 text-blue-900 font-medium rounded-full py-2 px-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/provider/${item.id}`);
                      }}
                    >
                      Ver perfil
                    </button>
                    <button
                      className="flex-1 bg-blue-900 text-white font-medium rounded-full py-2 px-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/calendar", { state: { provider: item } });
                      }}
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={`sub-${item.id}`}
                className="flex justify-between items-center bg-white rounded-full py-3 px-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300"
                onClick={() => navigate(`/providers/${item.category_id}/${item.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#C1C9DF] flex items-center justify-center">
                    <Icon icon={iconMap[item.name]} width={20} className="text-[#1F315C]" />
                  </div>
                  <p className="text-black font-medium">{item.name}</p>
                </div>
                <Icon icon="ep:arrow-right-bold" width={22} className="text-[#818181]" />
              </div>
            )
          )}

        {!loading && results.length === 0 && searchText && (
          <p className="text-center text-gray-500 mt-4">No se encontraron resultados</p>
        )}
      </div>
    </div>
  );
}