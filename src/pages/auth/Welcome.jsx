// src/pages/auth/Welcome.jsx
import { Link } from "react-router-dom";
import logo from "../../assets/img/logo-claro.png";
import InstallPWAButton from "../../components/InstallPWAButton";

export default function Welcome() {
  return (
    <div className="min-h-screen px-6 relative overflow-hidden bg-[#1E2F5D]">
      <div
        className="min-h-screen relative"
        style={{
          paddingTop: "max(18px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {/* logo arriba */}
        <div className="absolute left-1/2 top-[max(28px,env(safe-area-inset-top))] -translate-x-1/2">
          <img
            src={logo}
            alt="orby"
            className="h-10 w-auto select-none opacity-95"
            draggable="false"
          />
        </div>

        {/* contenido centrado */}
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="w-full max-w-sm text-center">
            <h1 className="text-[34px] leading-[1.06] font-extrabold tracking-tight text-white">
              Bienvenido
            </h1>

            <p className="mt-3 text-[13px] text-white/70 leading-relaxed">
              Iniciá sesión o creá tu cuenta para continuar.
            </p>

            <div className="mt-10 grid gap-3">
              <Link
                to="/login"
                className="w-full h-[54px] rounded-full bg-white text-[#1E2F5D] font-extrabold grid place-items-center
                           shadow-[0_18px_45px_rgba(0,0,0,0.18)] active:scale-[0.99] transition"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/register"
                className="w-full h-[54px] rounded-full bg-white/10 text-white font-extrabold grid place-items-center
                           border border-white/20 shadow-[0_14px_36px_rgba(0,0,0,0.16)] active:scale-[0.99] transition"
              >
                Crear cuenta
              </Link>
              <InstallPWAButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}