import React from "react";
import { Icon } from "@iconify/react";

export default function NotificationModal({ onClose, onAllow }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000]">
      <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[400px] text-center relative shadow-xl">
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-white shadow-md rounded-full w-8 h-8 flex items-center justify-center font-bold"
        >
          ✕
        </button>
        <div className="bg-[#C1C9DF] text-[#2A4691] rounded-full w-14 h-14 mx-auto flex items-center justify-center text-3xl mb-4">
          <Icon icon="mingcute:notification-fill" width="25" />
        </div>

        <h2 className="text-black text-lg font-bold mb-2">
          Activá las notificaciones
        </h2>

        <p className="text-[#808080] text-sm leading-snug mb-6">
          Recibí alertas cuando se confirmen tus servicios, recordatorios antes
          de cada cita y mensajes importantes de tus prestadores.
        </p>

        <div className="flex gap-3">
          <button
            className="flex-1 bg-[#C1C9DF] text-[#2A4691] rounded-full py-2 font-semibold"
            onClick={onClose}
          >
            No permitir
          </button>
          <button
            className="flex-1 bg-[#2A4691] text-white rounded-full py-2 font-semibold"
            onClick={onAllow}
          >
            Permitir
          </button>
        </div>

      </div>
    </div>
  );
}