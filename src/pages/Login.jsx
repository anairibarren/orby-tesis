import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { FaGoogle } from "react-icons/fa";
import { useAuthContext } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginGoogle } = useAuthContext(); // ⬅️ Ahora viene del contexto

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("⚠️ Todos los campos son obligatorios");
      return;
    }

    try {
      await login({ email, password }); // ⬅️ reemplaza tu lógica vieja
      setMessage("✅ Inicio de sesión exitoso");
      navigate("/");
    } catch (error) {
      setMessage(`⚠️ ${error.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setMessage("");
      await loginGoogle(); // ⬅️ Llama a Supabase OAuth
      // Supabase redirige automáticamente a tu redirect URL
    } catch (error) {
      setMessage("⚠️ Error al iniciar con Google");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col px-6 pt-6">

      <button onClick={() => navigate("/auth")} className="mb-4">
        <Icon
          icon="ep:arrow-left-bold"
          className="w-7 h-7 text-black mt-[1rem]"
        />
      </button>

      <h1 className="text-4xl font-bold text-black mt-[2rem]">
        Iniciar sesión
      </h1>

      {message && (
        <div className="text-center bg-gray-100 p-2 rounded-xl mt-6 ml-[3rem] mr-[3rem] text-md text-gray-700">
          {message}
        </div>
      )}

      <form
        onSubmit={handleLogin}
        className="flex flex-col gap-4 mt-[3rem] w-[100%]"
      >
        <div className="bg-[#F0F0F0] rounded-full px-4 py-3 flex items-center">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-transparent flex-1 text-[1rem] outline-none placeholder-[#AAAAAA]"
          />
        </div>

        <div className="bg-[#F0F0F0] rounded-full px-4 py-3 flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-transparent flex-1 text-[1rem] outline-none placeholder-[#AAAAAA]"
          />

          <Icon
            icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
            className="text-gray-600 text-xl cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>

        <p className="text-center text-[#808080] text-sm mt-1 cursor-pointer">
          ¿Olvidaste tu contraseña?
        </p>

        <button
          type="submit"
          className="bg-[#2A4691] text-white py-3 rounded-full mt-4 font-semibold w-1/2 mx-auto"
        >
          Iniciar sesión
        </button>
      </form>

      <div className="text-center my-6 text-gray-400 relative text-sm">
        <span className="px-2 bg-white relative z-10">O</span>
        <div className="absolute left-0 top-1/2 w-[30%] h-px bg-gray-300"></div>
        <div className="absolute right-0 top-1/2 w-[30%] h-px bg-gray-300"></div>
      </div>


      <div className="flex justify-center mb-4">
        <button
          onClick={handleGoogleLogin}
          className="w-12 h-12 rounded-xl bg-[#efeeee] flex items-center justify-center cursor-pointer transition transform hover:scale-110 text-gray-600"
        >
          <FaGoogle size={24} />
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 mt-4">
        ¿No tenés cuenta?{" "}
        <span
          className="text-[#2A4691] cursor-pointer font-semibold"
          onClick={() => navigate("/register")}
        >
          Registrate
        </span>
      </p>
    </div>
  );
}