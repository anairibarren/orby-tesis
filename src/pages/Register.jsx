import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleNext = (e) => {
    e.preventDefault();

    if (!checked) {
      alert("Debes aceptar los Términos y Políticas.");
      return;
    }

    localStorage.setItem(
      "register_data",
      JSON.stringify({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        password: formData.password,
      })
    );

    navigate("/register-detail", { state: formData });
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-6 pt-6">

      <button onClick={() => navigate("/auth")} className="mb-4">
        <Icon icon="ep:arrow-left-bold" className="w-7 h-7 text-black ml-[1rem] mt-[1rem]" />
      </button>

      <h1 className="text-4xl font-bold text-black ml-[1rem] mt-[1rem]">Crear cuenta</h1>

      <p className="text-md text-[#808080] ml-[1rem] mt-[2rem] leading-snug">
        Con tu cuenta de cliente podrás explorar y contratar el servicio que
        necesites de forma rápida y segura.
      </p>

      <form
        onSubmit={handleNext}
        className="flex flex-col gap-4 mt-[2rem] w-full max-w-md mx-auto"
      >
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          className="bg-[#F0F0F0] rounded-full px-4 py-3 outline-none placeholder-[#AAAAAA]"
          value={formData.nombre}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="apellido"
          placeholder="Apellido"
          className="bg-[#F0F0F0] rounded-full px-4 py-3 outline-none placeholder-[#AAAAAA]"
          value={formData.apellido}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          className="bg-[#F0F0F0] rounded-full px-4 py-3 outline-none placeholder-[#AAAAAA]"
          value={formData.email}
          onChange={handleChange}
          required
        />

        {/* ⭐ Campo de contraseña con ojito */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Contraseña"
            className="bg-[#F0F0F0] rounded-full px-4 py-3 w-full outline-none placeholder-[#AAAAAA]"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <Icon
            icon={showPassword ? "mdi:eye-off" : "mdi:eye"}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 w-6 h-6 cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>

        <div
          className="flex items-start gap-3 cursor-pointer mt-1"
          onClick={() => setChecked(!checked)}
        >
          <div
            className={`w-8 h-6 rounded border ${
              checked ? "bg-[#1E2F5D] border-[#1E2F5D]" : "border-gray-400"
            } flex items-center justify-center`}
          >
            {checked && (
              <Icon
                icon="mdi:check"
                className="w-5 h-5 text-white"
              />
            )}
          </div>

          <p className="text-sm text-gray-600">
            Al registrarte, aceptas nuestros{" "}
            <span className="text-[#1E2F5D] underline cursor-pointer">
              Términos
            </span>{" "}
            y{" "}
            <span className="text-[#1E2F5D] underline cursor-pointer">
              Políticas de privacidad
            </span>.
          </p>
        </div>

        <button
          type="submit"
          className="bg-[#2A4691] text-white py-3 rounded-full mt-4 font-semibold"
        >
          Registrarme
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-gray-600 mb-10">
        ¿Ya tenés cuenta?{" "}
        <span
          className="text-[#2A4691] cursor-pointer hover:underline"
          onClick={() => navigate("/login")}
        >
          Iniciar sesión
        </span>
      </p>
    </div>
  );
}
