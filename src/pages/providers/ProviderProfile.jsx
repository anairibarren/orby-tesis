import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Navbar from "../../components/Navbar";

import FixedForm from "../forms/FixedForm";
import QuoteForm from "../forms/QuoteForm";
import CalculatedForm from "../forms/CalculatedForm";

import { supabase } from "../../services/supabase";
import {
  addFavorite,
  removeFavorite,
  isFavorite
} from "../../services/favorites";

export default function ProviderProfile() {
  const { idPrestador } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("info");
  const [showPricingForm, setShowPricingForm] = useState(false);

  const [isFav, setIsFav] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const tabs = [
    { label: "Información", value: "info" },
    { label: "Certificaciones", value: "certs" },
    { label: "Reseñas", value: "reviews" }
  ];

  /* Usuario logueado */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  /* Fetch provider + servicio */
  useEffect(() => {
    const fetchProvider = async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(`
          *,
          service:services (
            id,
            name,
            pricing_type,
            icon
          )
        `)
        .eq("id", idPrestador)
        .single();

      if (error) {
        console.error(error);
      } else {
        setProvider(data);
      }

      setLoading(false);
    };

    fetchProvider();
  }, [idPrestador]);

  /* Favoritos */
  useEffect(() => {
    if (user && provider) {
      isFavorite(user.id, provider.id).then(setIsFav);
    }
  }, [user, provider]);

  const handleToggleFavorite = async () => {
    if (!user) {
      showToastMessage("Inicia sesión para guardar favoritos");
      return;
    }

    if (isFav) {
      await removeFavorite(user.id, provider.id);
      setIsFav(false);
      showToastMessage("Se quitó de favoritos");
    } else {
      await addFavorite(user.id, provider);
      setIsFav(true);
      showToastMessage("Se agregó a favoritos");
    }
  };

  const renderPricingForm = () => {
    if (!provider?.service) return null;

    switch (provider.service.pricing_type) {
      case "fixed":
        return (
          <FixedForm
            service={provider.service}
            provider={provider}
            onClose={() => setShowPricingForm(false)}
          />
        );

      case "quote":
        return (
          <QuoteForm
            service={provider.service}
            provider={provider}
            onClose={() => setShowPricingForm(false)}
          />
        );

      case "calculated":
        return (
          <CalculatedForm
            service={provider.service}
            provider={provider}
            onClose={() => setShowPricingForm(false)}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex justify-center min-h-screen">Cargando...</div>;
  }

  if (!provider) {
    return <p className="text-center mt-10">Prestador no encontrado</p>;
  }

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-40 font-poppins relative">

      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-200 text-green-800 px-4 py-2 rounded-xl shadow">
          {toastMessage}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pt-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
          >
            <Icon icon="ep:arrow-left-bold" width="22" />
          </button>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                const url = window.location.href;
                if (navigator.share) {
                  await navigator.share({
                    title: provider.name,
                    text: `Mirá el perfil de ${provider.name}`,
                    url
                  });
                } else {
                  await navigator.clipboard.writeText(url);
                  showToastMessage("Link copiado");
                }
              }}
              className="bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
            >
              <Icon icon="humbleicons:share" width="22" />
            </button>

            <button
              onClick={handleToggleFavorite}
              className="bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
            >
              <Icon
                icon="iconamoon:heart"
                width="22"
                className={isFav ? "text-[#2A4691]" : "text-black"}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 flex items-center gap-4">
          {provider.image ? (
            <img
              src={provider.image}
              alt={provider.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <Icon icon="mdi:account-circle" width="80" className="text-[#D0D0D0]" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{provider.name}</h1>
              {provider.verified && (
                <Icon icon="material-symbols:verified-rounded" className="text-[#2A4691]" />
              )}
            </div>

            <p className="text-[#4C4C4C] font-light">
              {provider.services?.join(" · ") || "Servicio"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl mt-6 p-4">
          <div className="flex border-b border-[#DBDBDB]">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-2 font-medium ${
                  activeTab === tab.value
                    ? "text-[#2A4691] border-b-2 border-[#2A4691]"
                    : "text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 ml-4">

            {activeTab === "info" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-black font-semibold">Sobre mí</h3>
                  <p className="text-[#808080] font-light mt-2">
                    {provider.description_full || "Sin descripción"}
                  </p>
                </div>

                <div>
                  <h3 className="text-black font-semibold mb-3">
                    Horarios de trabajo
                  </h3>

                  <div className="space-y-2">
                    {[
                      ["Lunes", "08:00 - 20:00"],
                      ["Martes", "08:00 - 20:00"],
                      ["Miércoles", "08:00 - 20:00"],
                      ["Jueves", "08:00 - 20:00"],
                      ["Viernes", "08:00 - 20:00"],
                      ["Sábado", "08:00 - 20:00"],
                      ["Domingo", "Cerrado"]
                    ].map(([day, time]) => (
                      <div
                        key={day}
                        className="bg-[#F5F5F5] rounded-xl px-4 py-3 flex justify-between"
                      >
                        <span className="text-[#2A4691] font-medium">
                          | {day}
                        </span>
                        <span
                          className={
                            day === "Domingo"
                              ? "text-black"
                              : "text-[#2A4691]"
                          }
                        >
                          {time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "certs" && (
              <div className="bg-gray-200 rounded-xl p-6 text-center font-medium">
                CV – {provider.name}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="text-center text-gray-500">
                Aún no hay reseñas disponibles
              </div>
            )}

          </div>
        </div>
      </div>

      <button
        onClick={() => navigate(`/booking/${provider.id}`)}
        className="fixed bottom-32 right-4 bg-[#1E2F5D] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2"
      >
        <Icon icon="mingcute:calendar-line" />
        Agendar
      </button>



      {showPricingForm && renderPricingForm()}

      <Navbar />
    </div>
  );
}
