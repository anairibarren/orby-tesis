import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-5 py-6">
      
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")}>
          <Icon icon="ep:arrow-left-bold" className="text-2xl ml-2 mr-5 text-black" />
        </button>
        <h1 className="text-xl font-semibold text-black">
          Política de Privacidad
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4 text-md leading-relaxed text-[#808080]">
        
        <p> En <span className="text-[#898989] font-bold">orby</span> valoramos tu privacidad y la protección de tu información personal. Toda la información que  recopilamos tiene como  fin optimizar tu experiencia en la aplicación y mejorar nuestros servicios. </p>

        <p> Los datos se almacenan de forma segura y bajo estrictos estándares de confidencialidad. No compartimos ni vendemos tu información a terceros sin tu consentimiento.</p>

        <p> Solo utilizamos tus datos cuando es necesario para brindarte una mejor experiencia, facilitar la comunicación con prestadores o reforzar la seguridad de la plataforma. </p>

        <p> Si tenés dudas o querés conocer más sobre cómo gestionamos tu información, podés contactarnos o solicitar la eliminación de tus datos en cualquier momento. </p>

      </div>
    </div>
  );
}