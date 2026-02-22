// src/pages/auth/ProviderLastStep.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Loading from "../../components/Loading";

export default function ProviderLastStep() {
  const nav = useNavigate();
  const { role, profileLoading } = useAuth();

  useEffect(() => {
    sessionStorage.removeItem("orby_signup_role");
  }, []);

  // ✅ Mientras se resuelve el role/profile, NO renderizar ni redirigir
  if (profileLoading || !role) return <Loading />;

  // ✅ Si no es provider, afuera
  if (role !== "provider") {
    nav("/client", { replace: true });
    return null;
  }

    return (
    <div className="min-h-screen px-6 relative overflow-hidden bg-[#1E2F5D]">
      <div
        className="min-h-screen"
        style={{
          paddingTop: "max(22px, env(safe-area-inset-top))",
          paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto w-full max-w-sm">
          <div className="min-h-screen flex items-center">
            <div className="w-full">
              <p className="text-[12px] font-semibold text-white/70">
                Perfil prestador
              </p>

              <h1 className="mt-6 text-[32px] leading-[32px] font-extrabold text-white">
                Antes de empezar...
              </h1>

              <p className="mt-4 text-[13px] text-white/75 leading-relaxed">
                Completá tu perfil para generar confianza. Si lo hacés, vas a aparecer como{" "}
                <span className="font-semibold text-white">Verificado</span>.
              </p>

              <div className="mt-10 grid gap-3">
                <button
                  type="button"
                  onClick={() => nav("/register/provider/profile")}
                  className="w-full h-[56px] rounded-full bg-white text-[#1E2F5D]
                             shadow-[0_18px_45px_rgba(0,0,0,0.18)]
                             px-5 active:scale-[0.99] transition"
                >
                  <span className="text-[14px] font-extrabold">
                    Completar perfil
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => nav("/provider", { replace: true })}
                  className="w-full h-[56px] rounded-full bg-white/10 text-white
                             border border-white/20
                             shadow-[0_14px_36px_rgba(0,0,0,0.16)]
                             px-5 active:scale-[0.99] transition"
                >
                  <span className="text-[14px] font-extrabold">Más tarde</span>
                </button>
              </div>

              <div className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
