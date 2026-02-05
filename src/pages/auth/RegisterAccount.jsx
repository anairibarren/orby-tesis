import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const isProvider = role === "provider";

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
      const { session } = await registerUser(email.trim(), password, {
        role,
        full_name: fullName.trim(),
        neighborhood: barrio,
      });

      if (!session) {
        setSuccessMsg(
          "Cuenta creada. Te enviamos un correo para confirmar tu email. Luego iniciá sesión."
        );
        return;
      }

      setSuccessMsg("Cuenta creada. Redirigiendo...");

      if (role === "provider") {
        nav("/register/provider/last-step", { replace: true });
      } else {
        nav("/", { replace: true });
      }
    } catch (err) {
      setErrorMsg(err?.message || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4EFEB] relative overflow-hidden">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#A0B8E1]/45 blur-3xl" />
      <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#CFDE87]/30 blur-3xl" />

      <div className="relative px-6 pt-[46px] pb-10 min-h-screen">
        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-2xl leading-none">‹</span>
            </button>
            <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">
              Crear cuenta
            </h2>
          </div>

          <div className="mt-5 rounded-[26px] bg-white/80 border border-white/60 shadow-[0_18px_45px_rgba(0,0,0,0.10)] backdrop-blur-xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] text-black/60">
                  Estás creando una cuenta{" "}
                  <span className="font-semibold text-[#1E2F5D]">
                    {isProvider ? "Prestador" : "Cliente"}
                  </span>
                </p>
              </div>

              <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-semibold text-black/60">
                Paso 1/2
              </span>
            </div>

            <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
              <div>
                <label className="text-[12px] font-semibold text-black/45">Nombre completo</label>
                <div className="mt-2 rounded-full bg-white border border-black/10 px-4 py-3 shadow-sm focus-within:border-[#2A4691]">
                  <input
                    className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D] placeholder:text-black/35"
                    placeholder="Nombre y apellido"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-black/45">Email</label>
                <div className="mt-2 rounded-full bg-white border border-black/10 px-4 py-3 shadow-sm focus-within:border-[#2A4691]">
                  <input
                    className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D] placeholder:text-black/35"
                    placeholder="tu@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-black/45">Contraseña</label>
                <div className="mt-2 rounded-full bg-white border border-black/10 px-4 py-3 shadow-sm focus-within:border-[#2A4691]">
                  <input
                    className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D] placeholder:text-black/35"
                    placeholder="Mínimo 6 caracteres"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-black/45">Ubicación</label>
                <div className="mt-2 rounded-full bg-white border border-black/10 px-4 py-3 shadow-sm focus-within:border-[#2A4691]">
                  <select
                    className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#3D3D3D] appearance-none"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">Elegí tu barrio</option>
                    {BARRIOS_VL.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="mt-1 flex items-start gap-3 text-[13px] text-black/60">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  Acepto términos y condiciones
                  <span className="text-black/35"> (podés cambiarlos luego)</span>
                </span>
              </label>

              {errorMsg && (
                <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="rounded-2xl bg-green-50 border border-green-200 px-3 py-2 text-[13px] text-green-700">
                  {successMsg}
                </div>
              )}

              <button
                disabled={loading}
                className="mt-1 h-12 w-full rounded-full bg-[#1E2F5D] text-white font-semibold shadow-[0_12px_24px_rgba(30,47,93,0.24)] active:scale-[0.99] transition disabled:opacity-60"
                type="submit"
              >
                {loading ? "Creando..." : "Continuar"}
              </button>
            </form>

            <p className="mt-5 text-[13px] text-black/60">
              ¿Ya tenés cuenta?{" "}
              <Link className="text-[#2A4691] font-semibold" to="/login">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
