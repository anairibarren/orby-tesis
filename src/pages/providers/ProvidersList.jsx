import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import Navbar from "../../components/Navbar";
import FiltersPanel from "../../components/FiltersPanel";
import { supabase } from "../../services/supabase";
import { getProviders } from "../../services/providers";

const ProvidersList = () => {
  const navigate = useNavigate();
  const { categoryId, serviceId } = useParams();

  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(null);

  /* Usuario logueado */
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };

    getUser();
  }, []);

  /* Fetch Providers */
  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);

      const data = await getProviders({
        categoryId: categoryId ? Number(categoryId) : null,
        serviceId: serviceId ? Number(serviceId) : null,
        filters
      });


      setProviders(data || []);
      setLoading(false);
    };

    fetchProviders();
  }, [categoryId, serviceId, filters]);

  /* Búsqueda por nombre */
  const filteredProviders = providers.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const goToCalendar = (provider) => {
    navigate("/calendar", {
      state: {
        providerId: provider.id,
        providerName: provider.name,
        price: provider.price_min
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-lg font-medium">
          Cargando prestadores...
        </span>
      </div>
    );
  }

  return (
    <div className="pb-32 bg-[#F5F5F5] min-h-screen">
      <header className="flex items-center gap-4 px-6 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-white w-10 h-10 rounded-full shadow flex items-center justify-center"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <div className="flex-1 flex items-center bg-white rounded-full shadow px-4 py-3">
          <input
            type="text"
            placeholder="Buscar servicio o prestador"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm placeholder:text-[#A4A4A4]"
          />
          <button onClick={() => setShowFilters(true)}>
            <Icon icon="mingcute:filter-2-fill" width="22" />
          </button>
        </div>
      </header>

      <section className="px-4 space-y-4">
        {filteredProviders.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            No se encontraron prestadores
          </div>
        )}

        {filteredProviders.map((prov) => (
          <div
            key={prov.id}
            onClick={() => navigate(`/provider/${prov.id}`)}
            className="bg-white rounded-xl shadow-md flex overflow-hidden cursor-pointer"
          >
            <div className="w-[30%] flex items-center justify-center p-2">
              <div className="w-full h-full rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {prov.image ? (
                  <img
                    src={prov.image}
                    alt={prov.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon
                    icon="mdi:account-circle-outline"
                    className="text-gray-300 w-16 h-16"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between p-4 w-[70%]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-black font-medium text-base">
                    {prov.name}
                  </h3>

                  {prov.verified && (
                    <Icon
                      icon="material-symbols:verified-rounded"
                      className="text-blue-600"
                      width="18"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm text-[#A4A4A4] mt-1">
                  <span className="font-bold">
                    ⭐ {prov.rating || "0.0"}
                  </span>
                  <span>{prov.reviews_count || 0} reseñas</span>
                  <span>| {prov.location || "Sin ubicación"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-[#2A4691] font-semibold">
                  Desde ${prov.price_min?.toLocaleString() || "-"}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToCalendar(prov);
                  }}
                  className="flex items-center gap-2 bg-[#1E2F5D] text-white px-4 py-2 rounded-full text-sm font-medium"
                >
                  <Icon icon="mingcute:calendar-line" width="18" />
                  Agendar
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <Navbar />

      {showFilters && (
        <FiltersPanel
          onClose={() => setShowFilters(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
};

export default ProvidersList;