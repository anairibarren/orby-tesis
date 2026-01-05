import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function RegisterDetail() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-[#F5F5F5] relative">

      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 bg-white shadow-lg p-2 rounded-full"
      >
        <Icon
          icon="ep:arrow-left-bold"
          className="w-6 h-6 text-[#3B3B3B]"
        />
      </button>

      <h1 className="text-center text-xl pt-8 font-bold text-[#3B3B3B]">
        {step === 1 ? "Perfil público" : "Disponibilidad"}
      </h1>

      {step === 1 && (
        <div className="px-6 pt-10 max-w-md mx-auto">

          <div className="mb-8">
            <h2 className="font-semibold mb-1 ml-2">Presentación</h2>
            <p className="text-sm ml-2 text-[#7A7A7A] mb-3">
              Contá quién sos y qué ofrecés.
            </p>
            <textarea
              placeholder="¿Algo a tener en cuenta?"
              rows={4}
              className="w-full bg-white shadow-sm rounded-2xl px-4 py-4 outline-none resize-none"
            />
          </div>

          <div className="mb-8">
            <h2 className="font-semibold mb-1 ml-2">Experiencia</h2>
            <p className="text-sm ml-2 text-[#7A7A7A] mb-3">
              Años de experiencia
            </p>

            <div className="grid grid-cols-4">
              {["0-1", "2-4", "5-9", "10+"].map((exp) => (
                <div
                  key={exp}
                  className="bg-white rounded-full py-2 px-2 w-[90%] text-center shadow-md cursor-pointer"
                >
                  {exp}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="font-semibold mb-1 ml-2">Certificados / matrícula</h2>
            <p className="text-sm ml-2 text-[#7A7A7A] mb-3">
              Sumá documentación para generar confianza
            </p>
            

            <div className="bg-white rounded-2xl py-10 flex flex-col items-center shadow-md cursor-pointer mb-0">
              <Icon
                icon="ep:upload-filled"
                className="w-10 h-10 text-[#858585] mb-2"
              />
              <p className="text-[#474747] font-medium">
                Subí tus archivos aquí o arrastralos
              </p>
              <p className="text-sm text-[#938F8F] font-light">
                en formato PDF, JPG o PNG
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-[#1E2F5D] text-white py-3 rounded-full font-medium mb-6"
          >
            Continuar
          </button>

          <div className="w-full h-2 bg-[#DDE0E7] rounded-full mb-6">
            <div className="h-2 bg-[#1E2F5D] rounded-full w-[65%]" />
          </div>
        </div>
      )}


      {step === 2 && (
        <div className="px-6 pt-10 max-w-md mx-auto">

          <div className="mb-8">
            <h2 className="font-semibold mb-1 ml-2">Días disponibles</h2>
            <p className="text-sm ml-2 text-[#7A7A7A] mb-4">
              Seleccioná los días que ofrecés servicio            
            </p>

            <div className="grid grid-cols-3 gap-3">
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
                <div
                  key={day}
                  className="bg-white rounded-full py-3 text-center shadow-sm cursor-pointer"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-10">
             <h2 className="font-semibold mb-1 ml-2">Franja horaria</h2>
            <p className="text-sm ml-2 text-[#7A7A7A] mb-4">
              Elegí los horarios disponibles
            </p>


            <div className="grid grid-cols-2 gap-4">
              {[
                "Mañana (8-12)",
                "Tarde (13-17)",
                "Noche (18-20)",
              ].map((time) => (
                <div
                  key={time}
                  className="bg-white rounded-full py-3 text-center shadow-sm cursor-pointer"
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate("/register-verification")}
            className="w-full bg-[#1E2F5D] text-white py-3 rounded-full font-medium mb-8"
          >
            Continuar
          </button>

          <div className="w-full h-2 bg-[#DDE0E7] rounded-full">
            <div className="h-2 bg-[#1E2F5D] rounded-full w-[100%]" />
          </div>
        </div>
      )}
    </div>
  );
}