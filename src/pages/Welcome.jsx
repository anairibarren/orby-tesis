import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/img/logo-claro.png";

export default function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#1E2F5D] text-white font-poppins">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <h2 className="mt-6 text-xl">Cargando Orby...</h2>
      </div>
    );

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-[#1E2F5D] text-center font-poppins">
      <img src={logo} alt="Orby Logo" className="w-80 mb-10" />

      <div className="flex flex-col items-center gap-8">
        <button
          className="bg-[#F4EFEB] text-[#1E2F5D] px-4 py-3 rounded-full text-lg font-semibold w-72"
          onClick={() => navigate("/auth")}
        >
          Registrarme
        </button>
        <button
          className="border-2 border-solid border-white bg-transparent text-white px-4 py-3 rounded-full text-lg font-semibold w-72 "
          onClick={() => navigate("/auth")}
        >
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
}