import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function RegisterProfile() {
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
        Creá tu cuenta
      </h1>

      {step === 1 && (
        <div className="px-6 pt-10 max-w-md mx-auto">

          <div className="flex flex-col items-center mb-8">
            <div className="relative w-28 h-28 rounded-full bg-[#E5E5E5] flex items-center justify-center mb-2">
              <Icon icon="mdi:account" className="w-12 h-12 text-[#9A9A9A]" />
              <div className="absolute bottom-0 right-0 bg-[#1E2F5D] p-2 rounded-full">
                <Icon icon="tabler:plus" className="text-white w-4 h-4" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[#A7A7A7] font-light">
              Agregá tu foto de perfil
            </p>
          </div>

          <div className="mb-6">
            <p className="font-semibold mb-2 ml-2">Datos Básicos</p>
            <input
              type="text"
              placeholder="Nombre completo"
              className="w-full bg-white shadow-sm rounded-full px-4 py-4 outline-none"
            />
          </div>

          <div className="mb-6">
            <p className="font-semibold mb-2 ml-2">Contacto</p>
            <div className="flex gap-3">
              <select className="bg-white shadow-sm rounded-full px-3 py-3">
                <option>+54</option>
              </select>
              <input
                type="tel"
                placeholder="Escribí tu número"
                className="flex-1 bg-white shadow-sm rounded-full px-4 py-4 outline-none"
              />
            </div>
          </div>

          <div className="mb-10">
            <p className="font-semibold mb-2 ml-2">Ubicación</p>
            <select className="w-full bg-white shadow-sm rounded-full px-4 py-4 text-[#7A7A7A]">
              <option>Elegí tu barrio</option>
              <option>Olivos</option>
              <option>Florida</option>
              <option>La Lucila</option>
              <option>Munro</option>
              <option>Vicente López</option>
            </select>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-[80%] bg-[#1E2F5D] text-white py-3 rounded-full font-medium"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="pt-32 px-8 max-w-md mx-auto text-left">

          <h2 className="text-[2.1rem] font-bold text-[#1E2F5D] text-left mb-6 ">
            Un último paso antes de comenzar
          </h2>

          <p className="text-[#4C4C4C] font-light mb-10">
            Terminá tu perfil para poder publicar servicios y recibir solicitudes.
          </p>

          

          <button
            onClick={() => navigate("/register/provider/detail")}
            className="mt-48 mb-10 w-full bg-[#1E2F5D] text-white py-3 rounded-full font-medium"
          >
            Continuar
          </button>

          <div className="w-full h-2 bg-[#DDE0E7] rounded-full">
            <div className="h-2 bg-[#1E2F5D] rounded-full w-[35%]" />
          </div>
        </div>
      )}
    </div>
  );
}