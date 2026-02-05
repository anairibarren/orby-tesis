// src/pages/auth/ProviderProfileSetup.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[28px] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)] overflow-hidden",
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
  // fallback por mime
  const t = String(file?.type || "").toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("png")) return "png";
  if (t.includes("jpeg")) return "jpeg";
  if (t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  return "file";
}

export default function ProviderProfileSetup() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [about, setAbout] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [file, setFile] = useState(null);

  const canContinue = useMemo(() => !!about.trim(), [about]);

  useEffect(() => {
    if (!user?.id) return;
    if (role && role !== "provider") return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, about, bio, description, certificate_url")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (!alive) return;

        const txt = data?.about || data?.bio || data?.description || "";
        setAbout(String(txt || ""));
        setCertificateUrl(String(data?.certificate_url || ""));
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
      toast.warning("Archivo inválido", "Subí un PDF o una imagen (JPG/PNG).");
      return null;
    }

    const bucket = "certificates";
    const ext = extFromFile(file);
    const safeName = `certificate.${ext}`;
    const path = `providers/${user.id}/${Date.now()}-${safeName}`;

    // upload
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (upErr) {
      toast.error(
        "Error subiendo certificado",
        upErr?.message ||
          "No se pudo subir. Revisá que exista el bucket 'certificates' y que tenga permisos."
      );
      return null;
    }

    // public url
    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    const url = pub?.data?.publicUrl || "";

    if (!url) {
      toast.error("Error", "Se subió el archivo pero no pude obtener la URL pública.");
      return null;
    }

    return url;
  }

  async function onSave() {
    if (!user?.id) return toast.error("Error", "Tenés que iniciar sesión.");
    if (!canContinue) return toast.warning("Falta info", "Completá tu descripción.");

    setSaving(true);
    try {
      const cert = await uploadCertificateIfAny();
      // Si seleccionó archivo y falló upload, cortamos
      if (file && !cert) return;

      const patch = {
        about: about.trim(),
        certificate_url: cert || null,
      };

      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;

      toast.success("Listo", "Perfil actualizado.");

      // Mandalo al panel provider o al siguiente paso según tu flujo:
      nav("/provider", { replace: true });
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F5] p-6">Cargando…</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-6 pt-[40px] pb-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="h-11 w-11 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center"
          aria-label="Volver"
          title="Volver"
        >
          <IconifyIcon icon="mdi:chevron-left" className="h-7 w-7 text-black/60" />
        </button>

        <p className="text-[16px] font-extrabold text-[#3D3D3D]">Completá tu perfil</p>

        <span className="h-11 w-11" />
      </div>

      <div className="mt-6 grid gap-4">
        <CardShell className="p-5">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">Sobre mí</p>
          <p className="mt-1 text-[12px] text-black/45">
            Contá en pocas líneas tu experiencia y qué te diferencia.
          </p>

          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={5}
            placeholder="Ej: Experiencia en limpieza profunda, puntualidad y atención personalizada…"
            className="
              mt-4 w-full rounded-[18px]
              bg-[#F6F6F6] border border-black/10
              px-4 py-3 text-[13px] text-[#3D3D3D]
              outline-none focus:border-[#1E2F5D]/30
            "
          />
        </CardShell>

        <CardShell className="p-5">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">Certificado</p>
          <p className="mt-1 text-[12px] text-black/45">
            Subí un PDF o imagen. Esto se verá en tu perfil público.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-4 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-10 w-10 rounded-full bg-[#D5E0F2] grid place-items-center shrink-0">
                  <IconifyIcon icon="mdi:file-upload-outline" className="h-6 w-6 text-[#2A4691]" />
                </span>

                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-[#3D3D3D] truncate">
                    {file ? file.name : certificateUrl ? "Certificado cargado" : "Seleccionar archivo"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-black/45 truncate">
                    {file ? "Listo para subir" : certificateUrl ? "Ya tenés un archivo guardado" : "PDF / JPG / PNG"}
                  </p>
                </div>
              </div>

              <IconifyIcon icon="mdi:chevron-right" className="h-7 w-7 text-black/25 shrink-0" />

              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                }}
              />
            </label>

            {certificateUrl && !file && (
              <button
                type="button"
                onClick={() => {
                  setCertificateUrl("");
                  toast.success("Ok", "Se eliminará al guardar.");
                }}
                className="w-full h-[48px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[13px] font-extrabold active:scale-[0.99] transition"
              >
                Quitar certificado guardado
              </button>
            )}
          </div>
        </CardShell>

        <button
          type="button"
          onClick={onSave}
          disabled={!canContinue || saving}
          className="
            w-full h-[54px] rounded-full
            bg-[#1E2F5D] text-white
            text-[14px] font-extrabold
            shadow-[0_14px_30px_rgba(30,47,93,0.28)]
            active:scale-[0.99] transition
            disabled:opacity-60
          "
        >
          {saving ? "Guardando..." : "Guardar y continuar"}
        </button>

        <p className="text-[12px] text-black/45 text-center">
          Si falla la subida: creá el bucket <b>certificates</b> en Storage y marcá <b>Public</b>.
        </p>
      </div>
    </div>
  );
}
