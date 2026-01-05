import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function AuthChoice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F5] relative">

      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 bg-white shadow-lg p-2 rounded-full"
      >
        <Icon
          icon="ep:arrow-left-bold"
          className="w-6 h-6 text-[#3B3B3B]"
        />
      </button>

      <div className="pt-32 px-8 max-w-md mx-auto">

        <h1 className="text-[2.2rem] font-bold text-[#1E2F5D] text-left mb-8 mr-6">
          ¿Cómo vas a usar orby?
        </h1>

        <p className="text-[1rem] font-light text-[#4C4C4C] text-left mb-12">
          Elegí el perfil con el que querés comenzar. Podés cambiarlo más adelante.
        </p>

        <div className="flex flex-col gap-4 mb-8 mt-48">
          <button
            onClick={() => navigate("/register")}
            className="w-full bg-[#1E2F5D] text-white py-3 rounded-full text-[1rem] font-light"
          >
            Quiero <span className="font-semibold">contratar</span> servicios
          </button>

          <button
            onClick={() => navigate("/register/provider")}
            className="w-full bg-[#1E2F5D] text-white py-3 rounded-full text-[1rem] font-light"
          >
            Quiero <span className="font-semibold">ofrecer</span> mis servicios
          </button>
        </div>

        <p className="text-center text-[#3B3B3B] text-sm">
          ¿Ya tenés cuenta?
          <span
            onClick={() => navigate("/login")}
            className="ml-1 text-[#1E2F5D] font-bold cursor-pointer"
          >
            Inicia sesión
          </span>
        </p>
      </div>
    </div>
  );
}