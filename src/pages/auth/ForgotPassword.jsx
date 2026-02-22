// src/pages/auth/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { supabase } from "../../services/supabase";

export default function ForgotPassword() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const em = email.trim();
    if (!em) return setErrorMsg("Completá tu email.");

    setLoading(true);
    try {
      // ✅ Debe coincidir con una URL permitida en Supabase Auth (ver paso 3)
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo });
      if (error) throw error;

      setSuccessMsg("Listo. Te enviamos un mail con el link para restablecer tu contraseña.");
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo enviar el email.");
    } finally {
      setLoading(false);
    }
  }

  const BLUE = "#1E2F5D";

    return (
    <div className="min-h-screen bg-[#1E2F5D] relative overflow-hidden">
      {/* Back */}
      <button
        type="button"
        onClick={() => nav(-1)}
        className="absolute left-6 top-[max(25px,env(safe-area-inset-top))] h-11 w-11 rounded-full
                   bg-white/10 border border-white/20
                   shadow-[0_10px_24px_rgba(0,0,0,0.22)]
                   grid place-items-center text-white z-10"
        aria-label="Volver"
        title="Volver"
      >
        <span className="text-xl leading-none relative -top-[1px]">‹</span>
      </button>

      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{
          paddingTop: "max(28px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="w-full max-w-md rounded-[30px] bg-white p-7 shadow-[0_22px_60px_rgba(0,0,0,0.25)] border border-white/10">
          <h2 className="text-[22px] font-extrabold" style={{ color: BLUE }}>
            Restablecer contraseña
          </h2>
          <p className="mt-1 text-[13px] text-black/45">
            Te mandamos un link por email para crear una nueva contraseña.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
            <div>
              <label className="text-[12px] font-semibold text-black/55">Email</label>

              <div className="mt-2 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                  <IconifyIcon icon="mdi:email-outline" className="h-5 w-5" />
                </span>

                <input
                  className="w-full rounded-full bg-[#F2F4F7] border border-black/5 pl-12 pr-4 py-3 text-[14px] text-[#3D3D3D] outline-none focus:border-[#1E2F5D] focus:ring-4 focus:ring-[#1E2F5D]/10"
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

            {errorMsg && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-[13px] text-green-700">
                {successMsg}
              </div>
            )}

            <button
              disabled={loading}
              className="mt-1 w-full h-[52px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_28px_rgba(30,47,93,0.28)] active:scale-[0.99] transition disabled:opacity-60"
              style={{ background: BLUE }}
              type="submit"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>

            <button
              type="button"
              onClick={() => nav("/login")}
              className="w-full h-[52px] rounded-full bg-white border border-black/10 text-[14px] font-extrabold text-[#3D3D3D] shadow-[0_10px_22px_rgba(0,0,0,0.06)] active:scale-[0.99] transition"
            >
              Volver a iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}