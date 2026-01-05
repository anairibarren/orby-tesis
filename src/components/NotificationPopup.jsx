import React from "react";

export default function NotificationPopup({ title, text, buttonText, onAction, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-xl p-6 w-[85%] max-w-[380px] text-center animate-slideUp">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-800 mb-6">{text}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onAction}
            className="flex-1 bg-red-700 text-white font-semibold py-2 px-4 rounded-full transition-colors"
          >
            {buttonText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-black font-medium py-2 px-4 rounded-full transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}