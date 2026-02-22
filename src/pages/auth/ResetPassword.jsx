// src/pages/auth/ResetPassword.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { supabase } from "../../services/supabase";

export default function ResetPassword() {
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ✅ cuando entrás desde el mail, Supabase te deja sesión temporal
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        // Si no hay sesión, probablemente abrió la pantalla sin venir del email
        if (!data?.session) {
          if (!alive) return;
          setErrorMsg("Este link no es válido o ya expiró. Pedí uno nuevo.");
        }
      } catch (e) {
        if (!alive) return;
        setErrorMsg(e?.message || "No se pudo validar el link.");
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!password || password.length < 6) return setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirm) return setErrorMsg("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccessMsg("Listo. Contraseña actualizada. Redirigiendo…");
      setTimeout(() => {
        window.location.replace("/login");
      }, 800);
    } catch (e) {
      setErrorMsg(e?.message || "No se pudo actualizar la contraseña.");
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
            Nueva contraseña
          </h2>
          <p className="mt-1 text-[13px] text-black/45">
            Elegí una contraseña nueva para tu cuenta.
          </p>

          {!ready ? (
            <div className="mt-6 text-[13px] text-black/50">Cargando…</div>
          ) : (
            <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
              <div>
                <label className="text-[12px] font-semibold text-black/55">
                  Contraseña nueva
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                    <IconifyIcon icon="mdi:lock-outline" className="h-5 w-5" />
                  </span>

                  <input
                    className="w-full rounded-full bg-[#F2F4F7] border border-black/5 pl-12 pr-4 py-3 text-[14px] text-[#3D3D3D] outline-none focus:border-[#1E2F5D] focus:ring-4 focus:ring-[#1E2F5D]/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-black/55">
                  Repetir contraseña
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                    <IconifyIcon icon="mdi:lock-check-outline" className="h-5 w-5" />
                  </span>

                  <input
                    className="w-full rounded-full bg-[#F2F4F7] border border-black/5 pl-12 pr-4 py-3 text-[14px] text-[#3D3D3D] outline-none focus:border-[#1E2F5D] focus:ring-4 focus:ring-[#1E2F5D]/10"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repetí tu contraseña"
                    type="password"
                    autoComplete="new-password"
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
                disabled={loading || Boolean(errorMsg && !successMsg)}
                className="mt-1 w-full h-[52px] rounded-full text-white text-[14px] font-extrabold shadow-[0_14px_28px_rgba(30,47,93,0.28)] active:scale-[0.99] transition disabled:opacity-60"
                style={{ background: BLUE }}
                type="submit"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>

              <button
                type="button"
                onClick={() => nav("/forgot-password")}
                className="w-full h-[52px] rounded-full bg-white border border-black/10 text-[14px] font-extrabold text-[#3D3D3D] shadow-[0_10px_22px_rgba(0,0,0,0.06)] active:scale-[0.99] transition"
              >
                Pedir otro link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}