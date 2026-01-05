import React from "react";
import { Icon } from "@iconify/react";

export default function CancelModalLate({ onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-45 flex justify-center items-end z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[1500px] h-60 p-8 rounded-t-[3rem] text-center animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon
          icon="ep:warning-filled"
          className="bg-[#C1C9DF] text-[#2A4691] rounded-full p-4 text-5xl mx-auto mb-4"
        />
        <h3 className="text-xl md:text-2xl font-bold mb-2 text-black">
          Cancelar turno con penalización
        </h3>
        <p className="text-gray-500 mb-6">
          Faltan menos de 12 horas para el inicio del servicio. En este caso, se
          cobrará el 10% del monto total, que se destinará al prestador. El
          resto del cargo temporal será liberado automáticamente.
        </p>
        <div className="flex justify-center gap-4">
          <button
            className="bg-[#C1C9DF] text-[#2A4691] px-6 py-2 rounded-2xl font-medium hover:bg-[#2A4691] hover:text-[#C1C9DF] transition-colors"
            onClick={onClose}
          >
            No cancelar
          </button>
          <button
            className="bg-[#2A4691] text-white px-6 py-2 rounded-2xl font-medium hover:bg-[#C1C9DF] hover:text-[#2A4691] transition-colors"
            onClick={onConfirm}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
