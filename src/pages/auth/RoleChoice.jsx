// src/pages/auth/RoleChoice.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { updateMyProfile } from "../../services/profiles";
import Loading from "../../components/Loading";
import { Icon as IconifyIcon } from "@iconify/react";

export default function RoleChoice() {
  const nav = useNavigate();
  const { user, role, profileLoading } = useAuth();

  // ✅ NUEVO: evita que el useEffect te redirija mientras elegís
  const [choosing, setChoosing] = useState(false);
  const choosingRef = useRef(false);

  useEffect(() => {
    // si estás eligiendo, NO auto-redirigir
    if (choosingRef.current) return;

    if (!user) return;
    if (profileLoading) return;

    if (role === "provider") nav("/provider", { replace: true });
    else if (role === "admin") nav("/admin", { replace: true });
    else if (role === "client") nav("/client", { replace: true });
  }, [user, role, profileLoading, nav]);

  async function choose(chosenRole) {
    // ✅ BLOQUEA autoredirect mientras navegamos/actualizamos
    choosingRef.current = true;
    setChoosing(true);

    try {
      // Si no hay sesión: pasamos role por query + state (fallback)
      if (!user?.id) {
        nav(`/register/account?role=${chosenRole}`, {
          state: { role: chosenRole }, // ✅ fallback si el query se pierde
        });
        return;
      }

      await updateMyProfile(user.id, {
        role: chosenRole,
        provider_profile_complete: chosenRole === "provider" ? false : true,
      });

      if (chosenRole === "provider") {
        nav("/register/provider/last-step", { replace: true });
      } else {
        nav("/client", { replace: true });
      }
    } finally {
      // si por alguna razón NO navegó, liberamos el bloqueo
      choosingRef.current = false;
      setChoosing(false);
    }
  }

  // ✅ si está cargando el perfil o está eligiendo, mostramos loading (evita taps dobles también)
  if (profileLoading || choosing) return <Loading />;

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
          <button
            type="button"
            onClick={() => nav(-1)}
            className="h-11 w-11 rounded-full bg-white/10 border border-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.22)] grid place-items-center text-white"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-xl leading-none relative -top-[1px]">‹</span>
          </button>

          <div className="min-h-[calc(100vh-44px)] flex items-center">
            <div className="w-full">
              <h1 className="text-[30px] leading-[32px] font-extrabold text-white mb-5">
                Elegí tu perfil
              </h1>

              <p className="mt-2 text-[13px] text-white/70 leading-relaxed">
                Para comenzar en <span className="lowercase">orby</span>, elegí cómo querés usar la plataforma.
                Podés contratar servicios u ofrecerlos.
              </p>

              <div className="mt-[35px] grid gap-3">
                <button
                  type="button"
                  onClick={() => choose("client")}
                  className="w-full h-[56px] rounded-full bg-white text-[#1E2F5D]
                             shadow-[0_18px_45px_rgba(0,0,0,0.18)]
                             px-5 active:scale-[0.99] transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-[#1E2F5D]/10 grid place-items-center">
                        <IconifyIcon icon="mdi:shopping-outline" className="h-5 w-5 text-[#1E2F5D]" />
                      </span>
                      <span className="text-[14px] font-extrabold">Contratar servicios</span>
                    </span>
                    <IconifyIcon icon="mdi:chevron-right" className="h-6 w-6 text-black/35" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => choose("provider")}
                  className="mt-[5px] w-full h-[56px] rounded-full bg-white/10 text-white
                             border border-white/20
                             shadow-[0_14px_36px_rgba(0,0,0,0.16)]
                             px-5 active:scale-[0.99] transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-white/10 border border-white/15 grid place-items-center">
                        <IconifyIcon icon="mdi:briefcase-outline" className="h-5 w-5 text-white" />
                      </span>
                      <span className="text-[14px] font-extrabold">Ofrecer servicios</span>
                    </span>
                    <IconifyIcon icon="mdi:chevron-right" className="h-6 w-6 text-white/65" />
                  </div>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}