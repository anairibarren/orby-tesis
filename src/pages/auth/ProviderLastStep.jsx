import { useNavigate } from "react-router-dom";

export default function ProviderLastStep() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-semibold text-[#1E2F5D]">
          Último paso antes de comenzar
        </h2>
        <p className="mt-2 text-sm text-black/60">
          Para generar confianza, completá tu perfil con foto, descripción y matrícula/certificación.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => nav("/register/provider/profile")}
            className="w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium"
          >
            Completar perfil
          </button>

          <button
            onClick={() => nav("/provider", { replace: true })}
            className="w-full rounded-full border border-black/10 py-3 font-medium"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
}