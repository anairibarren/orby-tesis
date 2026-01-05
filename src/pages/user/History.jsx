import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import ReviewModal from "../../components/ReviewModal";

export default function History() {
  const navigate = useNavigate();
  const [hasHistory, setHasHistory] = useState(true);

  const historyData = [
    {
      id: 1,
      name: "Valentina Ruiz",
      service: "Masajes relajantes",
      avatar: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    },
    {
      id: 2,
      name: "Diego Fernández",
      service: "Estilista",
      avatar: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    },
  ];

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);

  const dateFilters = [
    "Última semana",
    "Últimos 15 días",
    "Últimos 30 días",
    "Últimos 3 meses",
    "Últimos 6 meses",
  ];

  const statusFilters = ["Pendientes", "Terminados"];

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({ estrellas: 0, reseña: "" });

  const handleOpenReview = (service) => {
    setSelectedService(service);
    setShowReviewModal(true);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    setForm({ estrellas: 0, reseña: "" });
    setShowReviewModal(false);
    setTimeout(() => setShowConfirm(true), 300);
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("history-overlay")) {
      setShowFilterPanel(false);
      setShowReviewModal(false);
    }
  };

  const resetFilter = () => {
    setSelectedDateFilter(null);
    setSelectedStatusFilter(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="flex justify-between items-center px-6 py-4 mt-4">
        <button
          className="bg-white border border-gray-300 rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-gray-100"
          onClick={() => navigate("/profile")}
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>
        <h1 className="text-2xl font-bold text-black">Historial</h1>
        <button
          className="bg-white border border-gray-300 rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-gray-100"
          onClick={() => setShowFilterPanel(true)}
        >
          <Icon icon="mingcute:filter-2-fill" width="22" />
        </button>
      </header>

      <main className="flex-1 px-6 pb-24">
        {!hasHistory ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-black mb-4">
              ¡Ups! Todavía no tenés servicios realizados
            </h2>
            <p className="text-gray-400 mb-6">
              Cuando empieces a usar Orby, vas a poder ver acá todos tus pedidos y reservas.
            </p>
            <button
              className="bg-[#2A4691] text-white px-6 py-2 rounded-full font-medium hover:bg-[#1c3070] transition-colors"
              onClick={() => navigate("/category")}
            >
              Explorar servicios
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {historyData.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-black">{item.name}</h3>
                    <p className="text-black text-[1rem]">{item.service}</p>
                  </div>
                </div>
                <div className="flex gap-4 justify-center mt-2">
                  <button
                    className="bg-[#C1C9DF] text-[#1c3070] px-4 py-2 rounded-full flex items-center gap-1 font-800"
                    onClick={() =>
                      navigate("/service-detail", { state: { service: item } })
                    }
                  >
                    <Icon icon="bxs:message-square-detail" width="18" /> Ver detalle
                  </button>
                  <button
                    className="bg-[#2A4691] text-white px-4 py-2 rounded-full flex items-center gap-1 font-800"
                    onClick={() => handleOpenReview(item)}
                  >
                    <Icon icon="material-symbols:star-rounded" width="18" /> Calificar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showFilterPanel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-45 flex justify-center items-end z-50 history-overlay"
          onClick={handleOverlayClick}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-black font-bold text-xl">
                <Icon icon="mingcute:filter-2-fill" width="24" />
                <span>Filtros</span>
              </div>
              <button
                className="text-sm text-black underline"
                onClick={resetFilter}
              >
                Resetear
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <h3 className="font-semibold text-black text-[1.1rem]">Ordenar por</h3>
              <hr className="border-t border-[#ECECEC]" />
              {dateFilters.map((filter) => (
                <div
                  key={filter}
                  className="flex justify-between items-center p-3 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedDateFilter(filter)}
                >
                  <span className="text-black">{filter}</span>
                  <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      selectedDateFilter === filter
                        ? "bg-[#2A4691] border-[#2A4691] text-white"
                        : "bg-[#F0F0F0] border-gray-300 text-transparent"
                    }`}
                  >
                    {selectedDateFilter === filter && <Icon icon="charm:tick" width="16" />}
                  </button>
                </div>
              ))}
            </div>
          

            <div className="flex flex-col gap-3 mb-4">
              <h3 className="font-semibold text-black text-[1.1rem]">Estado</h3>
              <hr className="border-t border-[#ECECEC]" />
              {statusFilters.map((status) => (
                <div
                  key={status}
                  className="flex justify-between items-center p-3 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedStatusFilter(status)}
                >
                  <span className="text-black">{status}</span>
                  <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      selectedStatusFilter === status
                        ? "bg-[#2A4691] border-[#2A4691] text-white"
                        : "bg-[#F0F0F0] border-gray-300 text-transparent"
                    }`}
                  >
                    {selectedStatusFilter === status && <Icon icon="charm:tick" width="16" />}
                  </button>
                </div>
              ))}
            </div>

            <button className="w-full py-2 mt-4 rounded-full bg-[#2A4691] text-white font-medium hover:bg-[#1c3070] transition-colors">
              Aplicar
            </button>
          </div>
        </div>

        
      )}

      {showReviewModal && selectedService && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex justify-center items-center p-4">

          <div className="relative w-[90%] h-[90%] max-w-md bg-white rounded-xl shadow-lg p-6 animate-fade-in">

            <button
              className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center"
              onClick={() => setShowReviewModal(false)}
            >
              <Icon icon="codex:cross" width="26" />
            </button>

            <h2 className="mt-[3rem] text-2xl font-semibold text-black text-left">
              Contanos tu experiencia
            </h2>

            <p className="text-md text-black mt-2 mb-5 text-left">
              Tu opinión ayuda a otros usuarios a elegir con confianza.
            </p>

            <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">

              <h3 className="text-lg font-semibold">Calificación general</h3>
              <div className="flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    icon="mdi:star"
                    width="28"
                    className={`cursor-pointer transition ${
                      i < form.estrellas ? "text-yellow-400" : "text-gray-200"
                    }`}
                    onClick={() =>
                      setForm({ ...form, estrellas: i + 1 })
                    }
                  />
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-2">
                Comentarios
              </h3>

              <textarea
                value={form.reseña}
                onChange={(e) =>
                  setForm({ ...form, reseña: e.target.value })
                }
                placeholder="Escribí tu reseña..."
                className="w-full min-h-[6rem] p-3 rounded-xl bg-gray-100 border resize-none"
              />

              {form.archivos?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.archivos.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="preview"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="mt-4 py-3 bg-[#2A4691] text-white rounded-full font-800"
              >
                Enviar reseña
              </button>

            </form>
          </div>
        </div>
      )}

    </div>

  );
}
