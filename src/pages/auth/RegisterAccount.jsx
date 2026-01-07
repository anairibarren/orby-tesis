import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { registerUser } from "../../services/auth";

const BARRIOS_VL = [
  "Vicente López",
  "Olivos",
  "Florida",
  "La Lucila",
  "Munro",
  "Villa Martelli",
  "Carapachay",
];

export default function RegisterAccount() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const role = useMemo(() => params.get("role") || "client", [params]);

  const [fullName, setFullName] = useState("");
  const [barrio, setBarrio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [terms, setTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!terms) {
      setErrorMsg("Tenés que aceptar los términos y condiciones.");
      return;
    }
    if (!barrio) {
      setErrorMsg("Elegí tu barrio.");
      return;
    }

    setLoading(true);
    try {
      // ✅ Creamos el usuario en Auth y mandamos todo por metadata
      // El trigger handle_new_user() se encarga de crear el row en profiles
      await registerUser(email.trim(), password, {
        role,
        full_name: fullName.trim(),
        neighborhood: barrio,
      });

      // Si algún día activan confirm email, no habrá sesión inmediata.
      // Con confirm email OFF, normalmente ya queda logueada y puede navegar.
      setSuccessMsg("Cuenta creada. Redirigiendo...");

      if (role === "provider") {
        nav("/register/provider/last-step", { replace: true });
      } else {
        nav("/client", { replace: true });
      }
    } catch (err) {
      setErrorMsg(err?.message || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-semibold text-[#1E2F5D]">Creá tu cuenta</h2>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium">Nombre completo</label>
            <input
              className="mt-1 w-full rounded-full border border-black/10 px-4 py-3 outline-none"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-full border border-black/10 px-4 py-3 outline-none"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <input
              className="mt-1 w-full rounded-full border border-black/10 px-4 py-3 outline-none"
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Ubicación</label>
            <select
              className="mt-1 w-full rounded-full border border-black/10 px-4 py-3 outline-none bg-white"
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              required
            >
              <option value="">Elegí tu barrio</option>
              {BARRIOS_VL.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            Acepto términos y condiciones
          </label>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          <button
            disabled={loading}
            className="mt-2 w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium disabled:opacity-60"
            type="submit"
          >
            {loading ? "Creando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}