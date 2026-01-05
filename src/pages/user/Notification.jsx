import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Navbar from "../../components/Navbar";

export default function Notification() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      <header className="flex items-center p-4 px-8 mt-4">
        <button
          type="button"
          className="bg-white border border-gray-300 rounded-full w-10 h-10 flex items-center justify-center text-xl cursor-pointer shadow-md hover:bg-gray-100"
          onClick={() => navigate(-1)}
          aria-label="Volver atrás"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <h1 className="flex-1 text-center text-2xl font-bold text-black">
          Notificaciones
        </h1>
      </header>

      <main className="flex-1 flex flex-col items-center text-center mt-12 px-6">
        <h2 className="text-3xl text-black mb-5 font-semibold">
          ¡Ups! no hay notificaciones
        </h2>

        <p className="text-md text-[#B1B1B1] max-w-xl">
          Cuando haya novedades importantes, aparecerán aquí para que estés al tanto.
        </p>
      </main>

      <footer>
        <Navbar />
      </footer>
      
    </div>
  );
}
