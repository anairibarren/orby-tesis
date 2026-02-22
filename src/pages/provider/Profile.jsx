// src/pages/provider/Profile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../hooks/useAuth";
import { logoutUser } from "../../services/auth";
import { updateMyProfile } from "../../services/profiles";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabase";

/* ---------------- utils ---------------- */
function norm(v) {
  return String(v ?? "").trim();
}

function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function keyify(s) {
  return stripAccents(norm(s)).toLowerCase();
}

function fileLabelFromUrl(url) {
  const u = String(url || "");
  try {
    const clean = u.split("?")[0];
    const last = clean.split("/").pop() || clean;
    return decodeURIComponent(last);
  } catch {
    return "archivo";
  }
}

function uniqUrls(arr) {
  const out = [];
  const seen = new Set();
  for (const u of arr || []) {
    const x = String(u || "").trim();
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/* ---------------- UI atoms ---------------- */
function IconButton({ onClick, title, children, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        // ✅ mobile: un poquito más chico + mejor touch
        "h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition",
        disabled ? "opacity-60 pointer-events-none" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function VerifiedBadgeIcon({ className = "h-[14px] w-[14px]" }) {
  return (
    <IconifyIcon
      icon="mdi:check-decagram"
      className={`${className} text-[#4368C5] shrink-0`}
      aria-label="Verificado"
      title="Verificado"
    />
  );
}

function InitialsAvatar({ name }) {
  const initials = useMemo(() => {
    const n = norm(name);
    if (!n) return "O";
    const parts = n.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "O";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  }, [name]);

  return (
    <div className="h-[64px] w-[64px] xs:h-[70px] xs:w-[70px] sm:h-[76px] sm:w-[76px] rounded-[22px] xs:rounded-[24px] sm:rounded-[26px] bg-[#DDE6F7] grid place-items-center shrink-0">
      <span className="text-[16px] xs:text-[17px] sm:text-[18px] font-extrabold text-[#1E2F5D]">{initials}</span>
    </div>
  );
}

function RolePill({ role }) {
  const label = role || "—";
  const isProvider = label === "provider";
  const styles = isProvider ? "bg-[#2A4691]/10 text-[#2A4691]" : "bg-black/[0.04] text-black/55";
  const pretty = isProvider ? "Prestador" : label;

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${styles}`}>
      {pretty}
    </span>
  );
}

function InfoRow({ icon, label, value, right, onRightClick }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="h-9 w-9 xs:h-10 xs:w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
        <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-black/40">{label}</p>
        {/* ✅ mobile: permitir 2 líneas si es largo, evitando que “rompa” */}
        <p className="mt-0.5 text-[14px] font-semibold text-[#3D3D3D] break-words line-clamp-2">
          {value || "—"}
        </p>
      </div>

      {right ? (
        <button type="button" onClick={onRightClick} className="shrink-0" aria-label="Ver">
          {right}
        </button>
      ) : null}
    </div>
  );
}

function RowButton({ icon, title, desc, onClick, right }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-4 xs:p-[18px] text-left active:scale-[0.99] transition box-border"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-9 w-9 xs:h-10 xs:w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
            <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{title}</p>
            {desc ? <p className="mt-0.5 text-[12px] text-black/45 line-clamp-1">{desc}</p> : null}
          </div>
        </div>

        {right ? (
          <div className="shrink-0">{right}</div>
        ) : (
          <IconifyIcon icon="mdi:chevron-right" className="h-7 w-7 text-black/25 shrink-0" />
        )}
      </div>
    </button>
  );
}

/* ---------------- barrios Vicente López (exactos) ---------------- */
const VICENTE_LOPEZ_NEIGHBORHOODS = [
  "Vicente López",
  "Olivos",
  "Florida",
  "La Lucila",
  "Villa Martelli",
  "Florida Oeste",
  "Munro",
  "Carapachay",
  "Villa Adelina",
];

const ALLOWED_SET = new Set(VICENTE_LOPEZ_NEIGHBORHOODS.map((n) => keyify(n)));

function isAllowedNeighborhood(v) {
  return ALLOWED_SET.has(keyify(v));
}

/* ---------------- Minimal inputs ---------------- */
function InputPill({ label, value, onChange, placeholder, disabled, icon }) {
  return (
    <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
      <div className="flex items-center gap-2">
        {icon ? <IconifyIcon icon={icon} className="h-5 w-5 text-black/35 shrink-0" /> : null}
        <p className="text-[12px] font-semibold text-black/45">{label}</p>
      </div>

      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2 w-full bg-transparent text-[16px] font-semibold text-[#3D3D3D] outline-none placeholder:text-black/25"
      />
    </div>
  );
}

function TextareaPill({ label, value, onChange, placeholder, disabled, icon, rows = 5 }) {
  return (
    <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
      <div className="flex items-center gap-2">
        {icon ? <IconifyIcon icon={icon} className="h-5 w-5 text-black/35 shrink-0" /> : null}
        <p className="text-[12px] font-semibold text-black/45">{label}</p>
      </div>

      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="mt-2 w-full bg-transparent text-[14px] font-semibold text-[#3D3D3D] outline-none placeholder:text-black/25 resize-none"
      />
    </div>
  );
}

/* ---------------- Combobox barrios ---------------- */
function NeighborhoodCombobox({ value, onChange, disabled }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = keyify(open ? query : value);
    if (!q) return VICENTE_LOPEZ_NEIGHBORHOODS;
    return VICENTE_LOPEZ_NEIGHBORHOODS.filter((n) => keyify(n).includes(q));
  }, [query, value, open]);

  function pick(v) {
    onChange(v);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <IconifyIcon icon="mdi:map-marker-outline" className="h-5 w-5 text-black/35 shrink-0" />
          <p className="text-[12px] font-semibold text-black/45">Barrio</p>
        </div>

        <input
          value={open ? query : value}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Elegí un barrio…"
          disabled={disabled}
          className="mt-2 w-full bg-transparent text-[16px] font-semibold text-[#3D3D3D] outline-none placeholder:text-black/25"
        />
      </div>

      {open && !disabled && (
        <>
          <button type="button" className="fixed inset-0 z-[60] cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar" />
          <div className="absolute left-0 right-0 z-[70] mt-2 rounded-[18px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)] overflow-hidden border border-black/5">
            <div className="max-h-[240px] overflow-auto">
              {filtered.length ? (
                filtered.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pick(n)}
                    className="w-full px-4 py-3 text-left hover:bg-black/[0.03] active:bg-black/[0.05] flex items-center justify-between"
                  >
                    <span className="text-[14px] font-semibold text-[#3D3D3D]">{n}</span>
                    {keyify(value) === keyify(n) ? <IconifyIcon icon="mdi:check" className="h-5 w-5 text-[#2A4691]" /> : null}
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-[13px] text-black/50">No hay coincidencias</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Viewer modal ---------------- */
function ViewerModal({ open, onClose, title, url }) {
  const isImg = useMemo(() => {
    const u = String(url || "").toLowerCase();
    return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp");
  }, [url]);

  const isPdf = useMemo(() => String(url || "").toLowerCase().includes(".pdf"), [url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Cerrar" />
      {/* ✅ mobile: usar safe areas y ajustar top/bottom */}
      <div className="absolute inset-x-0 top-4 bottom-4 xs:top-8 xs:bottom-8 sm:top-10 sm:bottom-10 mx-auto w-full max-w-[460px] px-3 xs:px-4">
        <div className="h-full rounded-[22px] xs:rounded-[24px] bg-white shadow-2xl overflow-hidden flex flex-col">
          <div className="px-4 xs:px-5 py-3 xs:py-4 border-b border-black/10 flex items-center justify-between gap-3">
            <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{title || "Archivo"}</p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/45" />
            </button>
          </div>

          <div className="flex-1 bg-black/[0.02]">
            {!url ? (
              <div className="h-full grid place-items-center p-6 text-center">
                <p className="text-sm text-black/50">No hay archivo para mostrar.</p>
              </div>
            ) : isImg ? (
              <div className="h-full w-full grid place-items-center p-3">
                <img src={url} alt="Certificado" className="max-h-full max-w-full rounded-2xl object-contain" />
              </div>
            ) : isPdf ? (
              <iframe title="Certificado" src={url} className="h-full w-full" style={{ border: "none" }} />
            ) : (
              <iframe title="Archivo" src={url} className="h-full w-full" style={{ border: "none" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Confirm modal ---------------- */
function ConfirmModal({ open, title, desc, confirmText = "Eliminar", cancelText = "Cancelar", onConfirm, onClose, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 xs:p-6">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={() => !busy && onClose?.()} aria-label="Cerrar" />
      <div className="relative w-full max-w-md rounded-[22px] bg-white shadow-2xl p-4 xs:p-5">
        <p className="text-[16px] font-extrabold text-[#3D3D3D]">{title}</p>
        {desc ? <p className="mt-2 text-[13px] text-black/55 leading-relaxed">{desc}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="h-12 rounded-full bg-black/[0.04] px-5 text-[13px] font-semibold text-black/70 active:scale-[0.98] transition"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => !busy && onConfirm?.()}
            disabled={busy}
            className={[
              "h-12 rounded-full px-6 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.12)] active:scale-[0.98] transition",
              busy ? "bg-red-500/50" : "bg-red-500",
            ].join(" ")}
          >
            {busy ? "Eliminando…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Cert list modal ---------------- */
function CertListModal({ open, onClose, urls, onOpenUrl }) {
  if (!open) return null;

  const list = urls || [];

  return (
    <div className="fixed inset-0 z-[9999]">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Cerrar" />

      {/* ✅ mobile: más padding abajo por safe area y menos lateral */}
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[460px] px-3 xs:px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="rounded-[24px] xs:rounded-[26px] bg-white shadow-2xl border border-black/10 overflow-hidden">
          <div className="px-4 xs:px-5 py-3 xs:py-4 border-b border-black/10 flex items-center justify-between gap-3">
            <p className="text-[15px] font-extrabold text-[#3D3D3D]">Certificaciones</p>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/45" />
            </button>
          </div>

          <div className="p-3 xs:p-4 grid gap-2">
            {list.length ? (
              list.map((u, idx) => (
                <button
                  key={`${u}-${idx}`}
                  type="button"
                  onClick={() => onOpenUrl?.(u, idx)}
                  className="w-full rounded-[18px] border border-black/10 bg-[#F7F7F7] px-4 py-4 flex items-center justify-between active:scale-[0.99] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-full bg-white grid place-items-center shrink-0 border border-black/10">
                      <IconifyIcon icon="mdi:file-document-outline" className="h-5 w-5 text-black/45" />
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-[13px] font-extrabold text-[#3D3D3D] truncate">{`Certificado ${idx + 1}`}</p>
                      <p className="mt-0.5 text-[11px] text-black/45 truncate">{fileLabelFromUrl(u)}</p>
                    </div>
                  </div>

                  <IconifyIcon icon="mdi:chevron-right" className="h-6 w-6 text-black/25 shrink-0" />
                </button>
              ))
            ) : (
              <div className="rounded-[18px] border border-black/10 bg-[#F7F7F7] p-4">
                <p className="text-[13px] font-semibold text-[#111827]">Sin archivos</p>
                <p className="mt-1 text-[12px] text-black/50">Todavía no cargaste certificaciones.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Edit modal (bottom sheet) ---------------- */
function EditProfileModal({
  open,
  onClose,
  onSave,
  busy,
  initial,
  toast,
  certFiles,
  setCertFiles,
  setCertTouched,

  // ✅ FIX CLAVE: ahora sí llega al modal
  onPersistCerts,
}) {
  const fileRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [about, setAbout] = useState("");

  const [certUploading, setCertUploading] = useState(false);
  const [certRemoving, setCertRemoving] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.full_name || "");
    setNeighborhood(initial?.neighborhood || "");
    setAbout(initial?.about || initial?.bio || initial?.description || "");
  }, [open, initial]);

  const neighborhoodValid = useMemo(() => isAllowedNeighborhood(neighborhood), [neighborhood]);

  const canSave = useMemo(() => {
    return fullName.trim().length >= 2 && neighborhoodValid && !busy;
  }, [fullName, neighborhoodValid, busy]);

  function openViewer(url) {
    if (!norm(url)) return;
    setViewerUrl(url);
    setViewerOpen(true);
  }

  async function uploadCertification(file) {
    if (!file) return;

    const uid = initial?.id;
    if (!uid) {
      toast?.error("Error", "No hay usuario para subir el archivo.");
      return;
    }

    setCertUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${uid}/cert_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

      const up = await supabase.storage.from("certifications").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined,
      });

      if (up.error) {
        if (String(up.error?.message || "").toLowerCase().includes("bucket")) {
          toast?.error(
            "Falta configuración",
            "No existe el bucket 'certifications'. Crealo en Supabase Storage (public) y volvé a intentar."
          );
          return;
        }
        throw up.error;
      }

      const { data: pub } = supabase.storage.from("certifications").getPublicUrl(path);
      const publicUrl = pub?.publicUrl || "";

      const next = Array.isArray(certFiles) ? [...certFiles] : [];
      next.push(publicUrl);

      setCertTouched?.(true);
      setCertFiles?.(next);
      toast?.success("Listo", "Certificación subida. Guardá para aplicar.");
    } catch (e) {
      toast?.error("No se pudo subir", e?.message || "Error subiendo certificación.");
    } finally {
      setCertUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function requestRemove(url) {
    setPendingRemove(url);
    setConfirmOpen(true);
  }

  async function doRemovePending() {
    const url = pendingRemove;
    if (!norm(url)) {
      setConfirmOpen(false);
      setPendingRemove(null);
      return;
    }

    setCertRemoving(true);
    try {
      // 1) borrar del bucket (si es URL pública del bucket certifications)
      const marker = "/object/public/certifications/";
      const idx = String(url).indexOf(marker);

      if (idx !== -1) {
        const path = String(url).slice(idx + marker.length);
        const del = await supabase.storage.from("certifications").remove([path]);
        if (del.error) throw del.error;
      }

      // 2) actualizar estado local (modal)
      const next = (certFiles || []).filter((u) => u !== url);
      setCertTouched?.(true);
      setCertFiles?.(next);

      // ✅ 3) persistir inmediato en DB + refrescar profile global
      if (typeof onPersistCerts === "function") {
        await onPersistCerts(next);
      }

      toast?.success("Listo", "Certificación eliminada.");
    } catch (e) {
      toast?.error("No se pudo eliminar", e?.message || "Error eliminando certificación.");
    } finally {
      setCertRemoving(false);
      setConfirmOpen(false);
      setPendingRemove(null);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[9998] bg-black/50"
              onClick={() => !busy && onClose?.()}
              aria-label="Cerrar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="fixed inset-x-0 bottom-0 z-[9999] w-full"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              {/* ✅ mobile: menos padding lateral y más alto usable */}
              <div className="mx-auto w-full max-w-[460px] px-3 xs:px-4">
                <div className="rounded-t-[28px] bg-white shadow-2xl px-4 xs:px-5 pt-4 pb-6 overflow-x-hidden">
                  <div className="flex justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-black/10" />
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[17px] xs:text-[18px] font-extrabold text-[#3D3D3D]">Editar perfil</h3>
                      <p className="mt-1 text-[12px] text-black/50">Mantené tu perfil actualizado.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => !busy && onClose?.()}
                      className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition disabled:opacity-60 shrink-0"
                      disabled={busy}
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
                    </button>
                  </div>

                  {/* ✅ mobile: scroll más estable, padding bottom para no tapar inputs */}
                  <div className="mt-5 grid gap-3 max-h-[72vh] overflow-y-auto overflow-x-hidden pr-1 pb-1">
                    <InputPill
                      label="Nombre y apellido"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      disabled={busy}
                      icon="mdi:account-outline"
                    />

                    <NeighborhoodCombobox value={neighborhood} onChange={(v) => setNeighborhood(v)} disabled={busy} />

                    {!neighborhoodValid && norm(neighborhood) ? (
                      <div className="rounded-[18px] bg-red-50 px-4 py-3">
                        <p className="text-[12px] font-semibold text-red-700">Ese barrio no está dentro de Vicente López.</p>
                      </div>
                    ) : null}

                    <TextareaPill
                      label="Descripción"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Contá brevemente tu experiencia, especialidad, etc."
                      disabled={busy}
                      icon="mdi:text-long"
                      rows={5}
                    />

                    <div className="rounded-[22px] bg-black/[0.03] p-4 overflow-x-hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <IconifyIcon icon="mdi:file-certificate-outline" className="h-5 w-5 text-black/35 shrink-0" />
                          <p className="text-[12px] font-semibold text-black/45 truncate">Certificaciones</p>
                        </div>

                        <span className="text-[11px] text-black/45 shrink-0">
                          {(certFiles || []).length ? `${(certFiles || []).length} archivo(s)` : "Sin archivos"}
                        </span>
                      </div>

                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => uploadCertification(e.target.files?.[0])}
                        disabled={busy || certUploading}
                      />

                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={busy || certUploading}
                        className={[
                          "mt-3 h-12 w-full rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.06)] px-4 text-[13px] font-semibold text-[#3D3D3D] active:scale-[0.99] transition flex items-center justify-center gap-2",
                          certUploading ? "opacity-70" : "",
                        ].join(" ")}
                      >
                        <IconifyIcon icon="mdi:upload" className="h-5 w-5 text-black/45" />
                        {certUploading ? "Subiendo…" : "Subir archivo"}
                      </button>

                      {(certFiles || []).length ? (
                        <div className="mt-3 grid gap-2 overflow-x-hidden">
                          {(certFiles || []).map((url, idx) => {
                            const label = fileLabelFromUrl(url);
                            return (
                              <div
                                key={`${url}-${idx}`}
                                className="rounded-[18px] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center justify-between gap-3 overflow-x-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => openViewer(url)}
                                  className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden text-left"
                                  title="Ver archivo"
                                >
                                  <span className="h-9 w-9 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                                    <IconifyIcon icon="mdi:file-document-outline" className="h-5 w-5 text-black/45" />
                                  </span>

                                  <div className="min-w-0 overflow-hidden text-left">
                                    <p className="text-[13px] font-extrabold text-[#3D3D3D] truncate text-left">{`Certificado ${idx + 1}`}</p>
                                    <p className="mt-0.5 text-[11px] text-black/45 truncate text-left">{label}</p>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => requestRemove(url)}
                                  disabled={busy}
                                  className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition shrink-0"
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                >
                                  <IconifyIcon icon="mdi:trash-can-outline" className="h-5 w-5 text-black/45" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ✅ mobile: botones siempre cómodos + no apretados */}
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => !busy && onClose?.()}
                      disabled={busy}
                      className="flex-1 h-[52px] xs:h-[56px] rounded-full bg-black/[0.04] text-[14px] font-extrabold text-black/70 active:scale-[0.99] transition"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSave?.({
                          full_name: fullName.trim(),
                          neighborhood: neighborhood.trim(),
                          about: about.trim(),
                          certificate_url: (certFiles || [])[0] ? String((certFiles || [])[0]) : null,
                          cert_url: JSON.stringify(certFiles || []),
                        })
                      }
                      disabled={!canSave}
                      className={[
                        "flex-1 h-[52px] xs:h-[56px] rounded-full text-[14px] font-extrabold text-white shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition",
                        canSave ? "bg-[#1E2F5D]" : "bg-[#1E2F5D]/50",
                      ].join(" ")}
                    >
                      {busy ? "Guardando..." : "Guardar"}
                    </button>
                  </div>

                  <ViewerModal open={viewerOpen} onClose={() => setViewerOpen(false)} title="Certificado" url={viewerUrl} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar certificación"
        desc={(certFiles || []).length <= 1 ? "Si eliminás esta certificación, tu perfil va a quedar como NO verificado." : "¿Seguro que querés eliminar este archivo?"}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={doRemovePending}
        onClose={() => {
          if (certRemoving) return;
          setConfirmOpen(false);
          setPendingRemove(null);
        }}
        busy={certRemoving}
      />
    </>
  );
}

/* ---------------- Skeleton ---------------- */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      {/* ✅ mobile: padding-top menor + safe area */}
      <div className="w-full pt-[28px] xs:pt-[34px] sm:pt-[40px] pb-24 box-border">
        <div
          className="mx-auto w-full max-w-[460px] box-border overflow-x-hidden"
          style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingInline: "max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right))",
          }}
        >
          <div className="h-7 w-32 rounded bg-black/10 animate-pulse" />
          <div className="mt-2 h-4 w-72 rounded bg-black/10 animate-pulse" />

          <div className="mt-5 rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-[76px] w-[76px] rounded-[26px] bg-black/10" />
              <div className="flex-1">
                <div className="h-5 w-44 rounded bg-black/10" />
                <div className="mt-3 h-4 w-36 rounded bg-black/10" />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="h-[72px] rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
            <div className="h-[72px] rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
            <div className="h-[72px] rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function Profile() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile, profileLoading, setProfile } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [certFiles, setCertFiles] = useState([]);
  const [certTouched, setCertTouched] = useState(false);

  // ✅ preview soporta múltiples
  const [certListOpen, setCertListOpen] = useState(false);
  const [previewViewerOpen, setPreviewViewerOpen] = useState(false);
  const [previewViewerUrl, setPreviewViewerUrl] = useState("");
  const [previewViewerTitle, setPreviewViewerTitle] = useState("Certificado");

  const email = user?.email || "";
  const fullName = profile?.full_name || "";
  const neighborhood = profile?.neighborhood || "";
  const about = profile?.about || profile?.bio || profile?.description || "";

  const certificateUrl = profile?.certificate_url || "";

  // ✅ lista publicada = cert_url (JSON) + fallback certificate_url
  const publishedCertUrls = useMemo(() => {
    let parsed = [];
    try {
      if (profile?.cert_url) parsed = JSON.parse(profile.cert_url);
    } catch {
      parsed = [];
    }

    const base = [];
    if (Array.isArray(parsed)) base.push(...parsed);
    if (norm(certificateUrl)) base.push(certificateUrl);

    return uniqUrls(base);
  }, [profile?.cert_url, certificateUrl]);

  const hasPublishedCertificate = publishedCertUrls.length > 0;

  // ✅ Opción B (fix real): persistir en DB cuando se borra
  async function persistCerts(nextCerts) {
    if (!user?.id) return;

    const list = Array.isArray(nextCerts) ? nextCerts.filter((x) => norm(x)) : [];
    const first = list[0] ? String(list[0]) : null;

    // 🔥 clave: si queda vacío, guardamos NULL (no "[]")
    const patch = {
      certificate_url: first,
      cert_url: list.length ? JSON.stringify(list) : null,
    };

    try {
      const updated = await updateMyProfile(user.id, patch);
      setProfile?.(updated);
    } catch (e) {
      toast.error("No se pudo actualizar", e?.message || "Error actualizando certificaciones.");
    }
  }

  useEffect(() => {
    if (!editOpen) return;
    if (certTouched) return;

    let parsed = [];
    try {
      if (profile?.cert_url) parsed = JSON.parse(profile.cert_url);
    } catch {
      parsed = [];
    }

    const start = Array.isArray(parsed) && parsed.length ? parsed : certificateUrl ? [certificateUrl] : [];
    setCertFiles(start);
  }, [editOpen, certTouched, profile?.cert_url, certificateUrl]);

  async function handleLogout() {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await logoutUser();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleSave(patch) {
    if (!user?.id) return;

    if (!isAllowedNeighborhood(patch.neighborhood)) {
      toast.error("Barrio inválido", "Elegí un barrio dentro de Vicente López.");
      return;
    }

    try {
      setSaving(true);

      const safePatch = { ...patch };

      // si por cualquier motivo esa columna no existe en el objeto profile, no la mandamos
      // (pero ojo: si existe, sí permitimos limpiar)
      if (!("cert_url" in (profile || {}))) delete safePatch.cert_url;

      const updated = await updateMyProfile(user.id, safePatch);
      setProfile?.(updated);
      toast.success("Perfil actualizado", "Tus cambios se guardaron correctamente.");
      setEditOpen(false);
      setCertTouched(false);
    } catch (e) {
      toast.error("No se pudo guardar", e?.message || "Revisá RLS/policies en profiles.");
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading && !profile) return <ProfileSkeleton />;

  function openPreviewList() {
    if (!hasPublishedCertificate) return;
    setCertListOpen(true);
  }

  function openPreviewCertificate(url, idx = 0) {
    if (!norm(url)) return;
    setPreviewViewerUrl(url);
    setPreviewViewerTitle(`Certificado ${idx + 1}`);
    setPreviewViewerOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      {/* ✅ mobile: padding-top menor + safe areas */}
      <div className="w-full pt-[28px] xs:pt-[34px] sm:pt-[40px] pb-24 box-border overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[460px] box-border overflow-x-hidden"
          style={{
            paddingLeft: "max(14px, env(safe-area-inset-left))",
            paddingRight: "max(14px, env(safe-area-inset-right))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {/* ✅ mobile: título un toque más chico para pantallas mínimas */}
              <h1 className="text-[20px] xs:text-[21px] sm:text-[22px] font-extrabold text-[#3D3D3D] leading-tight">
                Perfil
              </h1>
              <p className="mt-1 text-[12px] xs:text-[13px] text-black/45 leading-relaxed">
                Mantené tu perfil actualizado
              </p>
            </div>

            <IconButton
              onClick={() => {
                setEditOpen(true);
                setCertTouched(false);
              }}
              title="Editar"
              disabled={!user?.id}
            >
              <IconifyIcon icon="mdi:pencil" className="h-6 w-6 text-black/40" />
            </IconButton>
          </div>

          {/* ✅ mobile: padding levemente menor */}
          <CardShell className="mt-5 p-4 xs:p-5">
            <div className="flex items-center gap-3 xs:gap-4 min-w-0">
              {profile?.avatar_url ? (
                <div className="h-[64px] w-[64px] xs:h-[70px] xs:w-[70px] sm:h-[76px] sm:w-[76px] rounded-[22px] xs:rounded-[24px] sm:rounded-[26px] overflow-hidden bg-black/[0.04] shrink-0">
                  <img src={profile.avatar_url} alt={fullName || "Perfil"} className="h-full w-full object-cover" />
                </div>
              ) : (
                <InitialsAvatar name={fullName || email} />
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[16px] xs:text-[17px] sm:text-[18px] font-extrabold text-[#3D3D3D] truncate">
                    {fullName || "Tu perfil"}
                  </p>
                  {hasPublishedCertificate ? <VerifiedBadgeIcon className="h-[16px] w-[16px]" /> : null}
                </div>

                <div className="mt-2">
                  <RolePill role="provider" />
                </div>
              </div>
            </div>
          </CardShell>

          <div className="mt-4">
            {/* ✅ mobile: padding x menor */}
            <CardShell className="px-4 xs:px-5">
              <InfoRow icon="mdi:account" label="Nombre" value={fullName} />
              <div className="h-px w-full bg-black/5" />
              <InfoRow icon="mdi:email-outline" label="Email" value={email} />
              <div className="h-px w-full bg-black/5" />
              <InfoRow icon="mdi:map-marker-outline" label="Barrio" value={neighborhood} />
              <div className="h-px w-full bg-black/5" />
              <InfoRow icon="mdi:text-long" label="Descripción" value={about || "—"} />
              <div className="h-px w-full bg-black/5" />
              <InfoRow
                icon="mdi:file-certificate-outline"
                label="Certificaciones"
                value={hasPublishedCertificate ? `${publishedCertUrls.length} archivo(s) publicado(s)` : "Sin archivos"}
                right={
                  hasPublishedCertificate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-2 text-[12px] font-semibold text-black/60">
                      Ver
                      <IconifyIcon icon="mdi:chevron-right" className="h-5 w-5 text-black/30" />
                    </span>
                  ) : null
                }
                onRightClick={hasPublishedCertificate ? openPreviewList : undefined}
              />
            </CardShell>
          </div>

          <div className="mt-4 grid gap-3">
            <RowButton icon="mdi:calendar-clock" title="Disponibilidad" desc="Definí días, horarios y buffers" onClick={() => nav("/provider/availability")} />
            <RowButton icon="mdi:history" title="Mi historial" desc="Solicitudes completadas" onClick={() => nav("/provider/history")} />
            <RowButton icon="mdi:star-outline" title="Mis reseñas" desc="Calificaciones y comentarios de clientes" onClick={() => nav("/provider/reviews")} />
            <RowButton icon="mdi:shield-outline" title="Privacidad y términos" desc="Información legal de la app" onClick={() => nav("/provider/legal")} />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={[
                "w-full rounded-full py-3 font-semibold transition active:scale-[0.99] box-border",
                "bg-white border border-black/10 text-[#3D3D3D]",
                "shadow-[0_8px_18px_rgba(0,0,0,0.06)]",
                loggingOut ? "opacity-60" : "",
              ].join(" ")}
            >
              {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Lista de certificados */}
      <CertListModal
        open={certListOpen}
        onClose={() => setCertListOpen(false)}
        urls={publishedCertUrls}
        onOpenUrl={(u, idx) => {
          setCertListOpen(false);
          openPreviewCertificate(u, idx);
        }}
      />

      {/* ✅ Viewer (se abre por el seleccionado) */}
      <ViewerModal open={previewViewerOpen} onClose={() => setPreviewViewerOpen(false)} title={previewViewerTitle} url={previewViewerUrl} />

      <EditProfileModal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        onSave={handleSave}
        busy={saving}
        initial={profile}
        toast={toast}
        certFiles={certFiles}
        setCertFiles={setCertFiles}
        setCertTouched={setCertTouched}
        onPersistCerts={persistCerts}
      />
    </div>
  );
}
