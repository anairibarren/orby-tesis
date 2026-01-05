import React from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

export default function SuccessModal({ onClose }) {
  const navigate = useNavigate();

  const handleViewRequest = () => {
    onClose();
    navigate("/requests");
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-45 flex justify-center items-end z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-[1500px] p-8 rounded-t-[3rem] text-center animate-moveUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 w-16 h-16 bg-[#C1C9DF] rounded-full flex items-center justify-center">
          <Icon icon="charm:tick" width="32" height="32" color="#2A4691" />
        </div>

        <h3 className="text-2xl font-bold text-black mb-4 font-poppins">
          ¡Turno reservado con éxito!
        </h3>

        <p className="text-black font-poppins mb-6">
          Tu turno ha sido registrado correctamente. Podrás ver los detalles de
          tu reserva y gestionar tus solicitudes pendientes en cualquier momento
          desde Solicitudes.
        </p>

        <button
          className="bg-[#2A4691] text-white rounded-full px-6 py-2 font-poppins text-base"
          onClick={handleViewRequest}
        >
          Ver Solicitud
        </button>
      </div>
    </div>
  );
}
