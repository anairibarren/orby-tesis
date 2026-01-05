import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const hours = ["08:00", "09:30", "11:00", "14:00", "15:30", "17:00"];
  const monthNames = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  const weekDays = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];

  // ⚠️ Navegar atrás si no hay state
  useEffect(() => {
    if (!state) {
      navigate(-1);
    }
  }, [state, navigate]);

  if (!state) return null; // mientras decide el useEffect

  const { provider, service, modalidad, duracion } = state;

  const getDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++)
      days.push(new Date(currentYear, currentMonth, i));

    return days;
  };

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      navigate("/booking/confirm", {
        state: {
          provider,
          service,
          modalidad,
          duracion,
          selectedDate,
          selectedHour
        }
      });
    }, 1500);
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen p-4 font-poppins">

      {/* Header */}
      <div className="relative mb-6">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-0 top-0 bg-white shadow p-2 rounded-full"
        >
          <Icon icon="ep:arrow-left-bold" />
        </button>

        <h1 className="text-center text-xl pt-1 font-bold text-[#3B3B3B]">
          Elegir día y horario
        </h1>
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-[#A0B8E1] text-[#2A4691]">
          <Icon icon="ic:round-school" width="22" />
        </div>
        <div>
          <p className="font-semibold">{service.name}</p>
          <p className="text-sm text-gray-400">
            {modalidad} | {duracion === "pack" ? "Pack 4 clases" : `${duracion} min`}
          </p>
        </div>
      </div>

      {/* Día */}
      <h3 className="font-semibold ml-2 text-lg">Elegí un día</h3>
      <p className="text-sm ml-2 text-gray-400 mb-4">Elegí el día de la clase</p>

      <div className="bg-white rounded-2xl p-4 shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
          >
            <Icon icon="ep:arrow-left-bold" />
          </button>
          <h4 className="font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h4>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
          >
            <Icon icon="ep:arrow-right-bold" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-xs font-semibold text-gray-400">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {getDays().map((day, i) =>
            day ? (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`h-10 flex items-center justify-center  ml-8 rounded-full cursor-pointer w-10
                  ${
                    selectedDate?.toDateString() === day.toDateString()
                      ? "bg-[#C6D4ED] text-[#2A4691]"
                      : "bg-white text-black"
                  }`}
              >
                {day.getDate()}
              </div>
            ) : (
              <div key={i} />
            )
          )}
        </div>
      </div>

      {/* Horario */}
      {selectedDate && (
        <>
          <h3 className="font-semibold ml-2 text-lg">Elegí un horario</h3>
          <p className="text-sm ml-2 text-gray-400 mb-4">
            {duracion === "pack"
              ? "Elegí el horario de tu primera clase"
              : "Elegí el horario de la clase"}
          </p>

          <div className="flex flex-wrap gap-3 mb-6 ml-2">
            {hours.map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHour(h)}
                className={`px-5 py-2 rounded-full cursor-pointer font-medium
                  ${
                    selectedHour === h
                      ? "bg-[#C6D4ED] text-[#2A4691]"
                      : "bg-white"
                  }`}
              >
                {h}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        disabled={!selectedDate || !selectedHour}
        onClick={handleContinue}
        className={`w-full py-3 rounded-full text-white font-medium ${
          selectedDate && selectedHour ? "bg-[#1E2F5D]" : "bg-[#D1D1D1]"
        }`}
      >
        Continuar
      </button>

      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center text-white text-4xl">
          •••
        </div>
      )}
    </div>
  );
}
