import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-5 py-6">
      
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")}>
          <Icon icon="ep:arrow-left-bold" className="text-2xl text-black ml-2 mr-5" />
        </button>
        <h1 className="text-xl font-semibold text-black">
          Términos y Condiciones
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4 text-md leading-relaxed text-[#808080]">

        <p>
          Al utilizar la aplicación <span className="text-[#898989] font-bold">orby</span>, aceptás los presentes términos y condiciones que regulan el uso de la plataforma.
        </p>

        <p> <span className="text-[#898989] font-bold">orby</span> funciona como un medio de conexión entre usuarios y prestadores de servicios. No intervenimos directamente en la relación ni en los acuerdos que se establezcan entre ambas partes.
        </p>

        <p> El usuario es responsable de la veracidad de su información y del correcto uso de la plataforma. Cualquier uso indebido podrá implicar la suspensión o eliminación de la cuenta. </p>

        <p> En caso de cancelación de un turno con menos de 12 horas de anticipación, se descontará un porcentaje del valor acordado, el cual será destinado al prestador como compensación por la pérdida del turno. </p>

        <p> <span className="text-[#898989] font-bold">orby</span> se reserva el derecho de modificar estos términos en cualquier momento. Las actualizaciones entrarán en vigencia una vez publicadas dentro de la aplicación.
        </p>

      </div>
    </div>
  );
}