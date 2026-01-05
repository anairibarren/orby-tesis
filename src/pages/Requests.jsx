import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Navbar from "../components/Navbar";
import CancelModalEarly from "../components/CancelModalEarly";
import CancelModalLate from "../components/CancelModalLate";
import InfoCard from "../components/InfoCard";
import { supabase } from "../services/supabase";
import { getUserRequests, cancelRequest } from "../services/requests";

export default function Requests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pendientes");
  const [pendientes, setPendientes] = useState([]);
  const [terminadas, setTerminadas] = useState([]);
  const [showEarlyCancel, setShowEarlyCancel] = useState(false);
  const [showLateCancel, setShowLateCancel] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          setPendientes([]);
          setTerminadas([]);
          setLoading(false);
          return;
        }

        const requests = await getUserRequests(user.id);

        setPendientes(requests.filter((r) => r.status === "pendiente"));
        setTerminadas(requests.filter((r) => r.status === "terminada"));
      } catch (err) {
        console.error("Error al cargar solicitudes:", err.message || err);
        setPendientes([]);
        setTerminadas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleCancelClick = (e, req) => {
    e.stopPropagation();
    setSelectedRequest(req);
    const horasRestantes = 8;
    if (horasRestantes > 6) setShowEarlyCancel(true);
    else setShowLateCancel(true);
  };

  const handleConfirmCancel = async (req) => {
    try {
      await cancelRequest(req.id);
      setPendientes((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      console.error("Error al eliminar solicitud:", err.message || err);
    } finally {
      setShowEarlyCancel(false);
      setShowLateCancel(false);
      setSelectedRequest(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="loader mb-4"></div>
        <h2 className="text-xl font-semibold">Cargando solicitudes...</h2>
      </div>
    );
    

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="flex items-center p-4 px-6 mt-5">
        <button
          type="button"
          className="bg-white border border-gray-300 rounded-full w-10 h-10 flex items-center justify-center text-xl cursor-pointer shadow-md hover:bg-gray-100"
          onClick={() => navigate("/")}
          aria-label="Volver atrás"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <h1 className="flex-1 text-center text-2xl font-bold text-black">
          Solicitudes
        </h1>
      </header>

      <div className="flex justify-center gap-2 my-6">
        <button
          className={`px-6 py-2 rounded-full font-700 transition-colors ${
            activeTab === "pendientes"
              ? "bg-[#2A4691] text-white shadow-lg"
              : "bg-gray-200 text-black"
          }`}
          onClick={() => setActiveTab("pendientes")}
        >
          Pendientes
        </button>
        <button
          className={`px-6 py-2 rounded-full font-700 transition-colors ${
            activeTab === "terminadas"
              ? "bg-[#2A4691] text-white shadow-lg"
              : "bg-gray-200 text-black"
          }`}
          onClick={() => setActiveTab("terminadas")}
        >
          Terminadas
        </button>
      </div>

      <main className="flex-1 mb-24 px-4">
        {(activeTab === "pendientes" ? pendientes : terminadas).length > 0 ? (
          (activeTab === "pendientes" ? pendientes : terminadas).map((req) => (
            <div
              key={req.id}
              className="relative bg-white rounded-2xl shadow-md p-6 mb-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() =>
                navigate(`/provider-profile/${req.provider_id}`, {
                  state: {
                    providerId: req.provider_id,
                    subcategoryId: req.subcategory_id,
                    subcategoryName: req.subcategory_name || "Servicio desconocido", 
                    date: req.date,
                    time: req.time,
                    price: req.price,
                  },
                })
              }

            >
              <button
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#D0D0D0]"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoCard(true);
                }}
                aria-label="Más información"
              >
                <Icon icon="mdi:information" width="22" height="22" />
              </button>

              <div className="flex items-center gap-4">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/847/847969.png"
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-bold text-lg">
                    {req.providers?.name || req.provider_name || "Prestador desconocido"}
                  </h3>
                  <p className="text-gray-500">
                    {req.subcategory_name || "Servicio no encontrado"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4 text-black">
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:calendar-fill" className="text-[#2A4691]" />
                  <span>{formatDate(req.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:time-fill" className="text-[#2A4691]" />
                  <span>{req.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="mingcute:location-fill" className="text-[#2A4691]" />
                  <span>{req.location}</span>
                </div>

                <div className="mt-2 font-poppins">
                  <p>
                    <strong>Estado:</strong> {req.status}
                  </p>
                  <p>
                    <strong>Pago:</strong> {req.payment_status}
                  </p>
                </div>
              </div>

              {activeTab === "pendientes" && (
                <div className="flex items-center gap-6 mt-4">
                  <button
                    className="w-14 h-14 rounded-full bg-[#C1C9DF] text-[#2A4691] flex items-center justify-center text-lg "
                    onClick={(e) => {
                      e.stopPropagation(); 
                      navigate("/chat", {
                        state: {
                          providerId: req.provider_id,
                          providerName: req.providers?.name || req.provider_name || "Prestador desconocido",
                          service: req.subcategory_name || "Servicio desconocido"
                        }
                      });
                    }}
                  >
                    <Icon icon="mingcute:chat-1-line" width="24" height="24" />
                  </button>
                  <button
                    className="flex-1 bg-[#2A4691] text-white rounded-full py-2 px-4 font-poppins text-base"
                    onClick={(e) => handleCancelClick(e, req)}
                  >
                    Cancelar turno
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center mt-12">
            <h3 className="font-bold text-2xl text-black">
              {activeTab === "pendientes"
                ? "Aún no tenés solicitudes pendientes"
                : "No tienes solicitudes terminadas"}
            </h3>
            {activeTab === "pendientes" && (
              <p className="text-[#808080] mt-5 mr-2 ml-2">
                Haz tu primera solicitud para poder visualizar los detalles de tu servicio.
              </p>
            )}
          </div>
        )}
      </main>

      {showEarlyCancel && selectedRequest && (
        <CancelModalEarly
          onClose={() => setShowEarlyCancel(false)}
          onConfirm={() => handleConfirmCancel(selectedRequest)}
        />
      )}
      {showLateCancel && selectedRequest && (
        <CancelModalLate
          onClose={() => setShowLateCancel(false)}
          onConfirm={() => handleConfirmCancel(selectedRequest)}
        />
      )}
      {showInfoCard && <InfoCard onClose={() => setShowInfoCard(false)} />}

      <footer>
        <Navbar />
      </footer>
    </div>
  );
}