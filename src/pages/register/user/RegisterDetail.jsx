import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useLocation, useNavigate } from "react-router-dom";

export default function RegisterDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const baseData = location.state;

  const [formData, setFormData] = useState({
    fecha_nacimiento: "",
    genero: "",
    telefono: "",
    barrio: "",
    direccion: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleNext = (e) => {
    e.preventDefault();

    const base = JSON.parse(localStorage.getItem("register_data"));

    if (!base) {
      console.error("❌ No existe register_data en localStorage");
      alert("Error interno: faltan datos del paso anterior.");
      return;
    }

    const all = {
      ...base,
      ...formData,
    };

    localStorage.setItem("register_data", JSON.stringify(all));

    navigate("/register-verification", {
      state: all,
    });
  };


  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 relative">

      <button onClick={() => navigate(-1)}>
        <Icon icon="ep:arrow-left-bold" className="w-7 h-7 text-black ml-[1rem] mt-[1rem]" />
      </button>

      <h1 className="text-4xl font-bold text-left mt-[2rem] ml-[1rem]">
        Un último paso antes de comenzar
        </h1>


        <p className="text-left text-md text-gray-600 mt-[2rem] ml-[1rem] mr-[5rem]">
        Para brindarte la mejor experiencia en Orby, necesitamos que completes tu perfil con algunos datos importantes.
        </p>

      <form
        id="form-detail"
        onSubmit={handleNext}
        className="flex flex-col gap-4 mt-10 pb-20"
      >
        <h2 className="text-lg font-semibold text-black">
          Información personal
        </h2>

        <input
          type="date"
          name="fecha_nacimiento"
          className="bg-[#F0F0F0] rounded-full px-4 py-3 outline-none text-[#808080]"
          value={formData.fecha_nacimiento}
          onChange={handleChange}
          required
        />

        <select
          name="genero"
          className="bg-[#F0F0F0] text-[#808080] rounded-full px-4 py-3 outline-none"
          value={formData.genero}
          onChange={handleChange}
          required
        >
          <option value="">Selecciona tu género</option>
          <option value="femenino">Femenino</option>
          <option value="masculino">Masculino</option>
          <option value="otro">Otro</option>
        </select>

        <h2 className="text-lg font-semibold text-black mt-4">
          Contacto y ubicación
        </h2>

        <input
          type="text"
          name="telefono"
          placeholder="Teléfono"
          className="bg-[#F0F0F0] rounded-full px-4 py-3 outline-none"
          value={formData.telefono}
          onChange={handleChange}
          required
        />

        <select
          name="barrio"
          className="bg-[#F0F0F0] text-[#808080] rounded-full px-4 py-3 outline-none"
          value={formData.barrio}
          onChange={handleChange}
          required
        >
          <option value="">Barrio (Vicente López)</option>
          <option value="Olivos">Olivos</option>
          <option value="Florida">Florida</option>
          <option value="Vicente López">Vicente López</option>
          <option value="La Lucila">La Lucila</option>
          <option value="Munro">Munro</option>
        </select>

        <input
          type="text"
          name="direccion"
          placeholder="Dirección"
          className="bg-[#F0F0F0] rounded-full px-4 py-3 outline-none"
          value={formData.direccion}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          className="w-14 h-14 rounded-full bg-[#2A4691] text-white flex items-center justify-center absolute right-[3rem] bottom-[7rem] shadow-xl"
        >
          <Icon icon="maki:arrow" className="w-6 h-6" />
        </button>

        <div className="w-full h-2 bg-gray-200 rounded-full mt-[6rem]">
        <div className="h-2 bg-[#2A4691] w-1/2 rounded-full"></div>
        </div>

      </form>
    </div>
  );
}
