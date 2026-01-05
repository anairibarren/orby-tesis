import React from "react";
import { Icon } from "@iconify/react";

export default function CancelModalEarly({ onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-45 flex justify-center items-end z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[1500px] h-[440px] p-8 rounded-t-[3rem] text-center animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon
          icon="ep:warning-filled"
          className="bg-[#C1C9DF] text-[#2A4691] rounded-full p-4 text-5xl mx-auto mb-4"
        />
        <h3 className="text-xl font-bold mb-5 text-black">
          ¿Querés cancelar este turno?
        </h3>
        <p className="text-black text-md mb-6">
          Podés cancelar sin costo porque aún faltan más de 12 horas para el inicio del servicio. Recordá que el cargo temporal se anulará y no se realizará ningún cobro.
        </p>
        <div className="flex justify-center gap-4">
          <button
            className="bg-[#C1C9DF] text-[#2A4691] px-6 py-2 rounded-full font-medium"
            onClick={onClose}
          >
            No cancelar
          </button>
          <button
            className="bg-[#2A4691] text-white px-6 py-2 rounded-full font-medium"
            onClick={onConfirm}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
