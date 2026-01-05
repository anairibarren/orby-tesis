import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { services } from "../../services/services"; 

const ServiceDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  let { service } = location.state || {};

  if (service && !service.providerImg) {
    const fullService = services.find((s) => s.id === service.id);
    if (fullService) service = fullService;
  }

  const [showReviewModal, setShowReviewModal] = useState(false);

  const [form, setForm] = useState({
    estrellas: 0,
    reseña: "",
    archivos: [],
  });

  const handleSubmitReview = (e) => {
    e.preventDefault();
    console.log("Reseña enviada:", form);
    setShowReviewModal(false);
  };

  if (!service) {
    return (
      <div className="p-6 text-center bg-[#F5F5F5] min-h-screen">
        <p>No se encontró el servicio</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-[#2A4691] text-white rounded-full"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      
      {/* CAMBIO: position relative */}
      <section className="max-w-2xl mx-auto overflow-hidden shadow-md relative">

        <div
          className="flex items-center gap-4 px-6 pt-6 pb-28"
          style={{
            backgroundImage: `url(${TramaImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderBottomLeftRadius: "2rem",
            borderBottomRightRadius: "2rem",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="text-white w-10 h-10 flex items-center justify-center"
          >
            <Icon icon="ep:arrow-left-bold" width="25" />
          </button>

          <h1 className="text-2xl ml-5 font-semibold text-white">
            Detalle del servicio
          </h1>
        </div>

        <div className="bg-white w-[90%] p-6 space-y-6 mx-auto -mt-20 relative z-10 rounded-2xl shadow-lg">
          
          <div className="flex items-center gap-4">
            <img
              src={service.providerImg || "/default-user.jpg"}
              alt={service.providerName}
              className="w-20 h-20 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-bold text-black">
                {service.providerName}
              </h2>
              <p className="text-sm text-[#4C4C4C]">
                {service.subcategory}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className=" text-[#808080] flex items-center gap-2">
              <Icon
                icon="material-symbols:star-rounded"
                width="20"
                className="text-yellow-400"
              />
              <span>{service.rating} ({service.reviewsCount})</span>
            </div>
            <button
              className="bg-[#2A4691] text-white px-8 py-4 rounded-full flex text-lg items-center gap-2 font-lg"
              onClick={() =>
                navigate("/reservation", { state: { providerId: service.id } })
              }
            >
              <Icon icon="fa:repeat" width="22" /> Repetir
            </button>
          </div>

          <hr className="border-t border-[#ECECEC]" />

          <div className="space-y-1 text-black">
            <h2 className="font-semibold mb-2 mt-2 text-xl ">
              Información del servicio
            </h2>
            <p><strong>Fecha:</strong> {service.date}</p>
            <p><strong>Hora:</strong> {service.time}</p>
            <p><strong>Duración:</strong> {service.duration}</p>
            <p><strong>Dirección:</strong> {service.address}</p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold mb-2 mt-4 text-xl ">
              Tu pago
            </h2>
            <div className="flex justify-between">
              <span>Servicio</span>
              <span>${service.servicePrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Tarifa de servicio</span>
              <span>${service.fee}</span>
            </div>
          </div>

          <hr className="border-t border-[#ECECEC]" />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${service.servicePrice + service.fee}</span>
          </div>
        </div>

        <div className="bg-white w-[90%] p-6 space-y-6 mx-auto -mt-[-3rem] mb-10 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold">Tu reseña</h2>
          {service.userReview ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    icon="mdi:star"
                    width="20"
                    className={
                      i < service.userReview.estrellas
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <p>{service.userReview.reseña}</p>
            </div>
          ) : (
            <button
              className="w-full bg-transparent text-[#67686C] border-[#67686C] border-2 py-3 rounded-full flex items-center justify-center gap-2 font-semibold"
              onClick={() => setShowReviewModal(true)}
            >
              <Icon icon="mingcute:pencil-fill" width="18" /> Escribí una reseña
            </button>
          )}
        </div>
      </section>

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex justify-center items-center p-4">
          <div className="relative w-[90%] h-[90%] max-w-md bg-white rounded-xl shadow-lg p-6 animate-fade-in overflow-y-auto">
            <button
              className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center"
              onClick={() => setShowReviewModal(false)}
            >
              <Icon icon="codex:cross" width="26" />
            </button>

            <h2 className="mt-[4rem] text-2xl font-semibold text-black text-left">
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
                      i < form.estrellas
                        ? "text-yellow-400"
                        : "text-gray-200 mb-10"
                    }`}
                    onClick={() =>
                      setForm({ ...form, estrellas: i + 1 })
                    }
                  />
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-2">Comentarios</h3>
              <textarea
                value={form.reseña}
                onChange={(e) =>
                  setForm({ ...form, reseña: e.target.value })
                }
                placeholder="Escribí tu reseña..."
                className="w-full min-h-[6rem] p-3 rounded-xl bg-gray-100 border resize-none mb-10"
              />

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
    </main>
  );
};

export default ServiceDetail;