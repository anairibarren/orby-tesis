import { useNavigate } from "react-router-dom";

export default function RoleChoice() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-[#1E2F5D]">
          ¿Cómo vas a usar orby?
        </h1>
        <p className="mt-2 text-sm text-black/60">
          Elegí el perfil con el que querés comenzar. Podés cambiarlo más adelante.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={() => nav("/register/account?role=client")}
            className="w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium"
          >
            Quiero contratar servicios
          </button>

          <button
            onClick={() => nav("/register/account?role=provider")}
            className="w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium"
          >
            Quiero ofrecer mis servicios
          </button>

          <p className="mt-4 text-sm text-center text-black/60">
            ¿Ya tenés cuenta?{" "}
            <span
              className="text-[#2A4691] font-medium cursor-pointer"
              onClick={() => nav("/login")}
            >
              Iniciá sesión
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}