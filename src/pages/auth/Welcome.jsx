import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div className="min-h-screen bg-[#F4EFEB]">
      <div className="mx-auto w-full max-w-sm px-6 py-10">
        {/* Marca */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-[#1E2F5D]" />
          <span className="text-sm font-semibold text-[#1E2F5D]">orby</span>
        </div>

        {/* Título */}
        <h1 className="mt-8 text-[34px] leading-[1.08] font-semibold tracking-tight text-[#1E2F5D]">
          Bienvenido/a
        </h1>
        <p className="mt-2 text-sm text-black/60 leading-relaxed">
          Iniciá sesión o creá tu cuenta para continuar.
        </p>

        {/* Card acciones */}
        <div className="mt-10 rounded-[28px] bg-white border border-black/5 shadow-[0_10px_25px_rgba(0,0,0,0.06)] p-5">
          <div className="flex flex-col gap-3">
            <Link
              to="/login"
              className="w-full rounded-full bg-[#1E2F5D] py-3.5 text-center text-white font-semibold active:scale-[0.99] transition"
            >
              Iniciar sesión
            </Link>

            <Link
              to="/role-choice"
              className="w-full rounded-full border border-black/10 bg-white py-3.5 text-center font-semibold text-[#1E2F5D] active:scale-[0.99] transition"
            >
              Crear cuenta
            </Link>
          </div>

          <p className="mt-5 text-center text-xs text-black/40">
            Al continuar aceptás nuestros términos y políticas.
          </p>
        </div>
      </div>
    </div>
  );
}
