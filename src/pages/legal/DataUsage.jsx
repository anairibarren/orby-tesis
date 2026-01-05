import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function DataUsage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className=" text-black px-6 py-5 flex items-center gap-4">
        <button
          onClick={() => navigate("/settings")}
          className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <h1 className="text-xl font-bold">Uso de Datos Personales</h1>
      </header>

      <main className="px-6 py-8 flex flex-col gap-6">
        <p className="text-md text-black leading-relaxed">
          En{" "}<span className="font-bold italic  text-[#2A4691]"> orby</span>{" "} manejamos tus datos con responsabilidad y transparencia. La información que recopilamos nos permite ofrecerte una mejor experiencia de manera más segura y adaptada a tus necesidades.
        </p>

        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-black text-lg font-semibold mb-2">
            Datos que podemos utilizar
          </h2>
          <ul className="text-md text-black list-disc list-inside space-y-1">
            <li>Nombre, correo electrónico y número de contacto.</li>
            <li>Preferencias vinculadas a notificaciones y comunicación.</li>
            <li>Ubicación para mejorar la sugerencia de servicios cercanos.</li>
            <li>Actividad realizada dentro de{" "} <span className="font-bold  text-black"> orby </span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-black text-lg font-semibold mb-2">
            Finalidad del uso
          </h2>
          <p className="text-md text-[#808080] leading-relaxed">
            Esta plataforma se utiliza para facilitar la conexión con prestadores de servicios, recomendarte opciones relevantes y seguir optimizando el funcionamiento de{" "} <span className="text-[#898989] font-bold"> orby </span>.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-black font-semibold mb-2 text-lg">
            Control del usuario
          </h2>
          <p className="text-md text-[#808080] leading-relaxed">
            Tenés total control sobre tu información. Podés revisar o eliminar tus datos cuando lo desees desde la sección de Configuración o contactando al equipo de soporte de{" "}<span className="text-[#898989] font-bold"> orby </span>.
          </p>
        </div>

        <p className="text-md ml-2 text-black mt-4">
          En{" "} <span className="text-black font-bold"> orby </span>{" "} respetamos tu privacidad y trabajamos para que siempre tengas claridad y control sobre tu información.
        </p>
      </main>
    </div>
  );
}