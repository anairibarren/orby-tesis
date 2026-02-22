// src/pages/auth/ProviderProfileSetup.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[28px] bg-white border border-black/10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function isAllowed(file) {
  if (!file) return false;
  const t = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return (
    t.includes("pdf") ||
    t.includes("image/") ||
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
}

function extFromFile(file) {
  const n = String(file?.name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg")) return "jpg";
  if (n.endsWith(".jpeg")) return "jpeg";
  if (n.endsWith(".webp")) return "webp";
  const t = String(file?.type || "").toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("png")) return "png";
  if (t.includes("jpeg")) return "jpeg";
  if (t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  return "file";
}

function isAllowedAvatar(file) {
  if (!file) return false;
  const t = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return (
    t.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
}

export default function ProviderProfileSetup() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  const [about, setAbout] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [file, setFile] = useState(null);

  const canContinue = useMemo(() => !!about.trim() && (!!avatarUrl || !!avatarFile), [about, avatarUrl, avatarFile]);
  
  useEffect(() => {
    if (!user?.id) return;
    if (role && role !== "provider") return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // ✅ columnas reales
        const { data, error } = await supabase
          .from("profiles")
          .select("id, about, bio, certificate_url, cert_url, avatar_url")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        if (!alive) return;

        const txt = data?.about || data?.bio || "";
        setAbout(String(txt || ""));

        // ✅ preferimos certificate_url, fallback cert_url
        const cert = data?.certificate_url || data?.cert_url || "";
        setCertificateUrl(String(cert || ""));

        // ✅ avatar
        setAvatarUrl(String(data?.avatar_url || ""));

        } catch (e) {
          toast.error("Error", e?.message || "No se pudo cargar tu perfil.");
        } finally {
          if (alive) setLoading(false);
        }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function uploadCertificateIfAny() {
    if (!file) return certificateUrl || null;

    if (!isAllowed(file)) {
      toast.warning("Archivo inválido", "Subí un PDF o una imagen (JPG/PNG/WebP).");
      return null;
    }

    // ✅ IMPORTANTE: esto es el NOMBRE DEL BUCKET, no una columna
    // Cambialo si tu bucket se llama diferente en Supabase Storage.
    const bucket = "certifications";

    // ✅ importante: que el path empiece con el user.id para que la policy sea simple
    const ext = extFromFile(file);
    const safeName = `certificate.${ext}`;
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (upErr) {
      const msg = upErr?.message || "No se pudo subir.";
      // Mensaje más útil para RLS
      if (msg.toLowerCase().includes("row-level security")) {
        toast.error(
          "Error subiendo certificado",
          "RLS está bloqueando el upload. Tenés que crear una policy en Storage (bucket certifications)."
        );
      } else {
        toast.error("Error subiendo certificado", msg);
      }
      return null;
    }

    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    const url = pub?.data?.publicUrl || "";

    if (!url) {
      toast.error("Error", "Se subió el archivo pero no pude obtener la URL pública.");
      return null;
    }

    return url;
  }

  async function uploadAvatarIfAny() {
  // si no eligió archivo nuevo, mantenemos lo que ya tenía
  if (!avatarFile) return avatarUrl || null;

  if (!isAllowedAvatar(avatarFile)) {
    toast.warning("Archivo inválido", "Subí una imagen (JPG/PNG/WebP).");
    return null;
  }

  // ✅ nombre del bucket (cambialo si en tu Supabase se llama distinto)
  const bucket = "avatars";

  const ext = extFromFile(avatarFile);
  const safeName = `avatar.${ext}`;
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, avatarFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: avatarFile.type || undefined,
    });

  if (upErr) {
    const msg = upErr?.message || "No se pudo subir.";
    if (msg.toLowerCase().includes("row-level security")) {
      toast.error(
        "Error subiendo foto",
        "RLS está bloqueando el upload. Creá una policy en Storage (bucket avatars)."
      );
    } else {
      toast.error("Error subiendo foto", msg);
    }
    return null;
  }

  const pub = supabase.storage.from(bucket).getPublicUrl(path);
  const url = pub?.data?.publicUrl || "";

  if (!url) {
    toast.error("Error", "Se subió la foto pero no pude obtener la URL pública.");
    return null;
  }

  return url;
}

  async function onSave() {
    if (!user?.id) return toast.error("Error", "Tenés que iniciar sesión.");
    if (!canContinue) return toast.warning("Falta info", "Completá tu descripción.");
    if (!avatarUrl && !avatarFile) return toast.warning("Falta info", "Subí una foto de perfil.");

    setSaving(true);
    try {
      const cert = await uploadCertificateIfAny();
      if (file && !cert) return;

      const avatar = await uploadAvatarIfAny();
      if (avatarFile && !avatar) return;

      const patch = {
        about: about.trim(),
        avatar_url: avatar || null,          // ✅ NUEVO
        certificate_url: cert || null,
        cert_url: cert || null,
        provider_profile_complete: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;

      toast.success("Listo", "Perfil actualizado.");
      window.location.replace("/provider");
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  const BLUE = "#1E2F5D";

    return (
    <div className="min-h-screen px-6 relative overflow-hidden bg-[#1E2F5D]">
      <div
        className="min-h-screen relative"
        style={{
          paddingTop: "max(18px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="grid grid-cols-[44px_1fr_44px] items-center">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="h-11 w-11 rounded-full bg-white/10 border border-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.22)] grid place-items-center text-white"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-xl leading-none relative -top-[1px]">‹</span>
            </button>

            <div className="text-center">
              <h1 className="text-[20px] leading-[22px] font-extrabold text-white">
                Completá tu perfil
              </h1>
            </div>

            <span className="h-11 w-11" />
          </div>

          <div className="mt-6">
            <CardShell className="p-5">
              {/* ✅ Foto de perfil (OBLIGATORIA) */}
              <div className="mt-7 flex flex-col items-center text-center">
                <label className="relative cursor-pointer select-none">
                  {/* círculo (más chico) */}
                  <div className="h-[132px] w-[132px] rounded-full bg-black/[0.06] overflow-hidden grid place-items-center">
                    {avatarFile ? (
                      <img
                        src={URL.createObjectURL(avatarFile)}
                        alt="avatar"
                        className="h-full w-full object-cover"
                        draggable="false"
                      />
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="h-full w-full object-cover"
                        draggable="false"
                      />
                    ) : (
                      <IconifyIcon icon="mdi:account" className="h-14 w-14 text-black/25" />
                    )}
                  </div>

                  {/* botón + (más abajo + borde blanco) */}
                  <span className="absolute -bottom-2 right-[-5px] h-11 w-11 rounded-full bg-[#1E2F5D] text-white grid place-items-center ring-[6px] ring-white">
                    <IconifyIcon icon="mdi:plus" className="h-6 w-6" />
                  </span>

                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/*"
                    className="hidden"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </label>

                <p className="mt-6 text-[13px] text-black/35 font-light">
                  Agrega tu foto de perfil
                </p>

                {avatarUrl || avatarFile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarUrl("");
                      toast.success("Ok", "Se eliminará al guardar (recordá subir otra).");
                    }}
                    className="mt-3 h-9 px-4 rounded-full bg-black/[0.04] text-[12px] font-extrabold text-black/60 active:scale-[0.99] transition"
                  >
                    Quitar foto
                  </button>
                ) : null}
              </div>

              <div className="mt-6 h-px w-full" />
              <div className="mt-6" />

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-[#111827]">Sobre vos</p>
                  <p className="mt-0.5 text-[12px] text-black/45">
                    Agregá una descripción detallada, clara y con tu diferencial.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[18px] border border-black/10 bg-black/[0.02] p-3">
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={5}
                  placeholder="Ej: Trabajo hace 5 años, soy puntual y dejo todo impecable…"
                  className="w-full resize-none bg-transparent px-1 py-1 text-[13px] text-[#111827] outline-none placeholder:text-black/30"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-black/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[14px] font-extrabold text-[#111827]">Certificado</p>
                    <p className="mt-0.5 text-[12px] text-black/45">
                      Opcional. PDF o imagen para generar confianza.
                    </p>
                  </div>

                  {certificateUrl && !file ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCertificateUrl("");
                        toast.success("Ok", "Se eliminará al guardar.");
                      }}
                      className="h-9 px-4 rounded-full bg-black/[0.04] text-[12px] font-extrabold text-black/65 active:scale-[0.99] transition"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[18px] border border-black/10 bg-black/[0.02] p-3">
                  <label
                    className="
                      w-full rounded-[18px]
                      bg-[#F3F4F6]
                      px-5 py-5
                      flex flex-col items-center justify-center text-center
                      cursor-pointer select-none
                      active:scale-[0.99] transition
                    "
                  >
                    <IconifyIcon icon="mdi:cloud-upload-outline" className="h-6 w-6 text-black/45" />

                    <p className="mt-3 text-[14px] font-extrabold text-[#3D3D3D]">
                      Subí tus archivos aquí o arrastralos
                    </p>
                    <p className="mt-1 text-[12px] text-black/45">
                      en formato PDF, JPG o PNG
                    </p>

                    <p className="mt-3 text-[12px] text-black/40">
                      {file ? file.name : certificateUrl ? "Certificado cargado" : "Sin archivo"}
                    </p>

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={onSave}
                disabled={!canContinue || saving}
                className={[
                  "mt-6 w-full h-[54px] rounded-full",
                  "text-white text-[14px] font-extrabold",
                  "shadow-[0_14px_30px_rgba(30,47,93,0.28)]",
                  "active:scale-[0.99] transition disabled:opacity-60",
                ].join(" ")}
                style={{ background: BLUE }}
              >
                {saving ? "Guardando..." : "Guardar y continuar"}
              </button>

              <div className="mt-3 text-center text-[11px] text-black/40">
                Tip: una buena descripción aumenta tus chances de recibir solicitudes.
              </div>
            </CardShell>
          </div>
        </div>
      </div>

      <style>{`
        input, textarea, select { caret-color: ${BLUE}; }
        input::selection, textarea::selection { background: rgba(30,47,93,0.14); }
      `}</style>
    </div>
  );
}