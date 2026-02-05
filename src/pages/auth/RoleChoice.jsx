import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { updateMyProfile } from "../../services/profiles";

export default function RoleChoice() {
  const nav = useNavigate();
  const { user, role, profileLoading } = useAuth();

  // ✅ Si ya estás logueada y ya hay role, NO te muestro esta pantalla
  useEffect(() => {
    if (!user) return;
    if (profileLoading) return;

    if (role === "provider") nav("/provider", { replace: true });
    else if (role === "admin") nav("/admin", { replace: true });
    else if (role === "client") nav("/client", { replace: true });
  }, [user, role, profileLoading, nav]);

  async function choose(chosenRole) {
    // Caso A) NO logueada -> va a crear cuenta con role
    if (!user?.id) {
      nav(`/register/account?role=${chosenRole}`, { replace: true });
      return;
    }

    // Caso B) Logueada (Google) -> guardo role en profiles y sigo
    await updateMyProfile(user.id, {
      role: chosenRole,
      provider_profile_complete: chosenRole === "provider" ? false : true,
    });

    if (chosenRole === "provider") nav("/register/provider/last-step", { replace: true });
    else nav("/client", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-[#1E2F5D]">¿Cómo vas a usar orby?</h1>
        <p className="mt-2 text-sm text-black/70">
          Elegí el perfil con el que querés comenzar.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => choose("client")}
            className="w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium"
          >
            Quiero contratar servicios
          </button>

          <button
            onClick={() => choose("provider")}
            className="w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium"
          >
            Quiero ofrecer mis servicios
          </button>
        </div>
      </div>
    </div>
  );
}
