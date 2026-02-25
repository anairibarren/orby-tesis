// src/pages/auth/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, loginWithGoogle } from "../../services/auth";
import { isAdmin } from "../../services/adminAccess";
import { Icon as IconifyIcon } from "@iconify/react";

function supabaseAuthErrorToEs(err) {
  const msg = String(err?.message || "").toLowerCase();

  // Supabase suele mandar "Invalid login credentials"
  if (msg.includes("invalid login credentials") || msg.includes("invalid") && msg.includes("credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (msg.includes("email not confirmed")) {
    return "Tu email todavía no está confirmado. Revisá tu casilla y confirmalo.";
  }

  if (msg.includes("user not found")) {
    return "No existe una cuenta con ese email.";
  }

  if (msg.includes("too many requests")) {
    return "Hiciste demasiados intentos. Probá de nuevo en unos minutos.";
  }

  // Cuando hay problemas de red / fetch
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
    return "No se pudo conectar. Revisá tu conexión e intentá de nuevo.";
  }

  return "Error al iniciar sesión. Revisá tus datos e intentá de nuevo.";
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
  e.preventDefault();
  setErrorMsg("");
  setLoading(true);

  try {
    const userCredential = await loginUser(email.trim(), password);
    const user = userCredential?.user;

    // admin → directo al panel
    if (user && isAdmin(user)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    // flujo normal
    navigate("/", { replace: true });
  } catch (err) {
    setErrorMsg(supabaseAuthErrorToEs(err));
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

  const BLUE = "#1E2F5D";

  return (
    <div className="min-h-screen bg-[#1E2F5D] relative overflow-hidden">
      {/* Back (glass) FUERA del card */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute left-6 top-[max(25px,env(safe-area-inset-top))] h-11 w-11 rounded-full
                   bg-white/10 border border-white/20
                   shadow-[0_10px_24px_rgba(0,0,0,0.22)]
                   grid place-items-center text-white z-10"
        aria-label="Volver"
        title="Volver"
      >
        <span className="text-xl leading-none relative -top-[1px]">‹</span>
      </button>

      {/* Contenido centrado */}
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{
          paddingTop: "max(28px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="w-full max-w-md rounded-[30px] bg-white p-7 shadow-[0_22px_60px_rgba(0,0,0,0.25)] border border-white/10 relative">
          {/* Título */}
          <h2 className="text-[22px] font-extrabold" style={{ color: BLUE }}>
            Iniciar sesión
          </h2>
          <p className="mt-1 text-[13px] text-black/45">
            Usá tu cuenta para continuar en orby
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="text-[12px] font-semibold text-black/55">
                Email
              </label>

              <div className="mt-2 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                  <IconifyIcon icon="mdi:email-outline" className="h-5 w-5" />
                </span>

                <input
                  className="w-full rounded-full bg-[#F2F4F7] border border-black/5 pl-12 pr-4 py-3 text-[16px] text-[#3D3D3D] outline-none focus:border-[#1E2F5D] focus:ring-4 focus:ring-[#1E2F5D]/10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-[12px] font-semibold text-black/55">
                Contraseña
              </label>

              <div className="mt-2 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                  <IconifyIcon icon="mdi:lock-outline" className="h-5 w-5" />
                </span>

                <input
                  className="w-full rounded-full bg-[#F2F4F7] border border-black/5 pl-12 pr-12 py-3 text-[16px] text-[#3D3D3D] outline-none focus:border-[#1E2F5D] focus:ring-4 focus:ring-[#1E2F5D]/10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />

                {/* Ojito */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center text-black/35 hover:text-black/55 transition"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  <IconifyIcon
                    icon={
                      showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"
                    }
                    className="h-5 w-5"
                  />
                </button>
              </div>

              <div className="mt-3 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-[12px] font-extrabold"
                  style={{ color: BLUE }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Botón ingresar */}
            <button
              disabled={loading}
              className="mt-1 w-full h-[52px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_28px_rgba(30,47,93,0.28)] active:scale-[0.99] transition disabled:opacity-60"
              style={{ background: BLUE }}
              type="submit"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            {/* Separador */}
            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-[12px] font-semibold text-black/35">o</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full rounded-full border border-black/10 bg-[#F5F5F5] px-4 py-3 font-semibold text-[#3D3D3D] flex items-center justify-center gap-3"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 48 48"
                aria-hidden="true"
                className="opacity-60"
              >
                <path
                  fill="currentColor"
                  d="M44.5 20H24v8.5h11.8C34.2 33.9 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.5 0 6.4 1.3 8.7 3.4l6-6C35.2 5 30 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.1-2.1-.5-4Z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-black/55">
            ¿No tenés cuenta?{" "}
            <Link className="font-extrabold" style={{ color: BLUE }} to="/register">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}