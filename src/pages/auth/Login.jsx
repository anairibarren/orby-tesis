import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, loginWithGoogle } from "../../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await loginUser(email.trim(), password);
      // ✅ dejamos que los guards decidan a dónde va según profiles.role
      navigate("/", { replace: true });
    } catch (err) {
      setErrorMsg(err?.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErrorMsg("");
    try {
      await loginWithGoogle(); // redirige
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo iniciar con Google.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4EFEB]">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-semibold text-[#1E2F5D]">Iniciar sesión</h2>

        <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#2A4691]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <input
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-[#2A4691]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-[#2A4691] px-4 py-3 text-white font-medium disabled:opacity-60"
            type="submit"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full rounded-xl border border-black/10 px-4 py-3 font-medium"
          >
            Continuar con Google
          </button>
        </form>

        <p className="mt-4 text-sm text-black/70">
          ¿No tenés cuenta?{" "}
          <Link className="text-[#2A4691] font-medium" to="/register">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
