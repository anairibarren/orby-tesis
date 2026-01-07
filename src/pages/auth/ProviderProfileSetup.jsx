import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadToPublicBucket } from "../../services/storage";
import { upsertMyProfile } from "../../services/profiles";
import { useAuth } from "../../hooks/useAuth";

export default function ProviderProfileSetup() {
  const nav = useNavigate();
  const { user, profile, setProfile } = useAuth();

  const [bio, setBio] = useState(profile?.bio || "");
  const [experience, setExperience] = useState(profile?.experience || "");

  const [avatarFile, setAvatarFile] = useState(null);
  const [certFile, setCertFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!user?.id) {
      setErrorMsg("No hay usuario logueado.");
      return;
    }

    // si querés que certificado sea obligatorio para badge/verificado:
    // descomentá esta validación.
    // if (!certFile && !profile?.cert_url) {
    //   setErrorMsg("Tenés que subir tu matrícula/certificación.");
    //   return;
    // }

    if (!avatarFile && !profile?.avatar_url) {
      setErrorMsg("La foto de perfil es obligatoria.");
      return;
    }

    if (!bio.trim()) {
      setErrorMsg("La presentación/descripcion es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = profile?.avatar_url || null;
      let certUrl = profile?.cert_url || null;

      if (avatarFile) {
        const path = `avatars/${user.id}/avatar-${Date.now()}-${avatarFile.name}`;
        avatarUrl = await uploadToPublicBucket({
          bucket: "avatars",
          path,
          file: avatarFile,
        });
      }

      if (certFile) {
        const path = `certs/${user.id}/cert-${Date.now()}-${certFile.name}`;
        certUrl = await uploadToPublicBucket({
          bucket: "provider_docs",
          path,
          file: certFile,
        });
      }

      const updated = await upsertMyProfile({
        id: user.id,
        role: "provider",
        avatar_url: avatarUrl,
        bio: bio.trim(),
        experience: experience.trim(),
        cert_url: certUrl,
        provider_profile_complete: true,
        provider_verified: !!certUrl, // badge automático
      });

      setProfile(updated);
      nav("/provider", { replace: true });
    } catch (err) {
      setErrorMsg(err?.message || "Error guardando perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-xl font-semibold text-[#1E2F5D]">Completá tu perfil</h2>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSave}>
          <div>
            <label className="text-sm font-medium">Foto de perfil (obligatoria)</label>
            <input
              className="mt-2 w-full"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Presentación / descripción (obligatoria)</label>
            <textarea
              className="mt-2 w-full rounded-2xl border border-black/10 p-3 outline-none"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contá quién sos, cómo trabajás, qué ofrecés…"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Experiencia (opcional)</label>
            <input
              className="mt-2 w-full rounded-full border border-black/10 px-4 py-3 outline-none"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Ej: 5 años de experiencia"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Matrícula / certificación (archivo) {profile?.cert_url ? "(ya cargada)" : "(opcional)"}
            </label>
            <input
              className="mt-2 w-full"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setCertFile(e.target.files?.[0] || null)}
            />
            <p className="mt-2 text-xs text-black/50">
              Si la subís, vas a aparecer con el badge “Verificado”.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            disabled={loading}
            className="mt-2 w-full rounded-full bg-[#1E2F5D] text-white py-3 font-medium disabled:opacity-60"
            type="submit"
          >
            {loading ? "Guardando..." : "Finalizar"}
          </button>
        </form>
      </div>
    </div>
  );
}