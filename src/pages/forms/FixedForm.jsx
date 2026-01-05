import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

export default function FixedForm({ provider, service, onClose }) {
  const [modalidad, setModalidad] = useState("");
  const [duracion, setDuracion] = useState(null);
  const [canContinue, setCanContinue] = useState(false);

  const navigate = useNavigate();


  const duraciones = [
    {
      id: 60,
      title: "Clase individual",
      desc: "60 minutos",
      price: service.prices?.price60,
      icon: "mingcute:time-fill"
    },
    {
      id: 90,
      title: "Clase extendida",
      desc: "90 minutos",
      price: service.prices?.price90,
      icon: "mingcute:time-fill"
    },
    {
      id: "pack",
      title: "Pack de 4 clases",
      desc: "60 min cada clase",
      price: service.prices?.pricePack,
      icon: "mingcute:calendar-line"
    }
  ];

  useEffect(() => {
    setCanContinue(Boolean(modalidad && duracion));
  }, [modalidad, duracion]);

  return (
    <div className="bg-[#F5F5F5] min-h-screen p-4">

      <div className="relative mb-8">
        <button
          onClick={onClose}
          className="absolute left-0 top-0 bg-white shadow p-2 rounded-full"
        >
          <Icon icon="ep:arrow-left-bold" className="w-5 h-5 text-[#3B3B3B]" />
        </button>

        <h1 className="text-center text-xl pt-2 font-bold text-[#3B3B3B]">
          {service.name}
        </h1>
      </div>

      {/* Modalidad */}
      <h2 className="font-semibold text-md mb-1 ml-2">Modalidad</h2>
      <p className="text-[#BFBFBF] text-sm mb-3 ml-2">
        Elegí cómo querés el servicio
      </p>

      <div className="flex gap-3 mb-4">
        {["Presencial", "Online"].map((m) => (
          <button
            key={m}
            onClick={() => setModalidad(m)}
            className={`px-6 py-3 rounded-full shadow flex items-center gap-2 ${
              modalidad === m
                ? "bg-[#C6D4ED] text-[#2A4691]"
                : "bg-white"
            }`}
          >
            {modalidad === m && (
              <Icon icon="charm:tick" className="text-lg" />
            )}
            <span>{m}</span>
          </button>
        ))}
      </div>


      {modalidad === "Presencial" && (
        <div className="bg-white rounded-full py-2 px-4 shadow mb-6 flex items-start gap-3">
          <Icon
            icon="mingcute:location-line"
            className="text-[#2A4691] mt-2"
            width="22"
          />
          <div>
            <h4 className="font-semibold">Ubicación</h4>
            <p className="text-[#BFBFBF] text-sm">
              {service.address || "VER"}
            </p>
          </div>
        </div>
      )}

      {/* Duración */}
      <h2 className="font-semibold text-md mb-1 ml-2">Duración</h2>
      <p className="text-[#BFBFBF] text-sm mb-3 ml-2">
        Seleccioná una opción
      </p>

      <div className="grid gap-4">
        {duraciones.map((d) => (
          <button
            key={d.id}
            onClick={() => setDuracion(d.id)}
            className={`p-4 rounded-2xl shadow flex justify-between items-center ${
              duracion === d.id
                ? "border-2 border-[#2A4691] bg-white"
                : "bg-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[#A0B8E1] text-[#2A4691]">
                <Icon icon={d.icon} width="20" />
              </div>

              <div className="text-left">
                <h4 className="font-semibold">{d.title}</h4>
                <p className="text-[#BFBFBF] text-sm">{d.desc}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold">${d.price}</p>
              <p className="text-xs text-[#BFBFBF]">
               por hora
              </p>
            </div>
          </button>
        ))}
      </div>

      <button
        disabled={!canContinue}
        onClick={() =>
          navigate("/calendar", {
            state: {
              provider,
              service,
              modalidad,
              duracion
            }
          })
        }
        className={`mt-6 w-full py-3 rounded-full text-white font-medium ${
          canContinue ? "bg-[#1E2F5D]" : "bg-[#D1D1D1]"
        }`}
      >
        Elegir día y hora
      </button>

    </div>
  );
}