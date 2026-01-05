import React, { useState } from "react";
import { Icon } from "@iconify/react";

export default function ReviewModal({ showModal, setShowModal, onAddReview }) {
  const [form, setForm] = useState({ estrellas: 0, reseña: "", archivos: [] });
  const [showConfirm, setShowConfirm] = useState(false);

  const handleStarClick = (value) => setForm({ ...form, estrellas: value });

  const handleFileChange = (e) => {
    const filesArray = Array.from(e.target.files).map((file) =>
      URL.createObjectURL(file)
    );
    setForm({ ...form, archivos: [...form.archivos, ...filesArray] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddReview({ ...form, fecha: "Hace un momento" });
    setForm({ estrellas: 0, reseña: "", archivos: [] });
    setShowModal(false);
    setTimeout(() => setShowConfirm(true), 200);
  };

  if (!showModal && !showConfirm) return null;

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex justify-center items-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
            <button
              className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center  hover:bg-gray-100 hover:rounded-full transition-all"
              onClick={() => setShowModal(false)}
            >
              <Icon icon="codex:cross" width="26" />
            </button>

            <h2 className="mt-10 text-xl font-semibold text-black text-left">
              Contanos tu experiencia
            </h2>
            <p className="text-sm text-gray-400 mt-1 mb-4 text-left">
              Tu opinión ayuda a otros usuarios a elegir con confianza y a los prestadores a seguir mejorando su servicio.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-black">Calificación general</h3>
              <div className="flex justify-center gap-2 cursor-pointer">
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    icon="mdi:star"
                    width="28"
                    className={`${i < form.estrellas ? "text-yellow-400" : "text-gray-200"} transition-colors hover:text-yellow-300`}
                    onClick={() => handleStarClick(i + 1)}
                  />
                ))}
              </div>

              <h3 className="text-lg font-semibold text-black mt-2">Comentarios (opcional)</h3>
              <textarea
                name="reseña"
                placeholder="Escribí tu reseña..."
                value={form.reseña}
                onChange={(e) => setForm({ ...form, reseña: e.target.value })}
                className="w-full min-h-[6rem] p-3 rounded-xl bg-gray-200 border border-gray-200 resize-none font-sans"
              />

              <h3 className="text-lg font-semibold text-black mt-2">Adjuntar imágenes (opcional)</h3>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-200 text-gray-700 text-center cursor-pointer">
                <Icon icon="ep:upload-filled" width="36" />
                <span className="text-sm mt-1 mb-1">Subí tus archivos aquí o arrastralos</span>
                <span className="text-xs">en formato JPG o PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {form.archivos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.archivos.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`preview-${idx}`}
                      className="w-16 h-16 object-cover rounded-xl border border-gray-300"
                    />
                  ))}
                </div>
              )}

              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-full font-semibold bg-gray-300 text-blue-900 hover:bg-blue-900 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-full font-semibold bg-blue-900 text-white hover:bg-gray-300 hover:text-blue-900 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/30 flex justify-center items-center z-[1000]"
          onClick={() => setShowConfirm(false)}
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 text-center animate-moveUp">
            <Icon
              icon="charm:tick"
              width="48"
              className="bg-[#C1C9DF] text-[#1F315C] p-4 rounded-lg mb-3 inline-block"
            />
            <h3 className="text-xl font-semibold mb-2">¡Gracias por tu reseña!</h3>
            <p className="text-gray-700 text-sm">
              Tu opinión se publicó correctamente y ayudará a más personas a elegir mejor.
            </p>
          </div>
        </div>
      )}

      
    </>
  );
}
