import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4EFEB]">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-semibold text-[#1E2F5D]">Orby</h1>
        <p className="mt-2 text-sm text-black/70">
          Conectá con prestadores y resolvé servicios en tu zona.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/login"
            className="w-full rounded-xl bg-[#2A4691] px-4 py-3 text-center text-white font-medium"
          >
            Iniciar sesión
          </Link>

          <Link
            to="/register"
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-center font-medium"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}