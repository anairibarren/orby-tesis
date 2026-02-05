// src/pages/client/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

import { useAuth } from "../../hooks/useAuth";
import { logoutUser } from "../../services/auth";
import { updateMyProfile } from "../../services/profiles";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabase";

const NEIGHBORHOODS = [
  "Vicente López",
  "Olivos",
  "La Lucila",
  "Florida",
  "Florida Oeste",
  "Munro",
  "Villa Martelli",
  "Carapachay",
].sort((a, b) => a.localeCompare(b));

function IconButton({ onClick, title, children, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        "h-11 w-11 rounded-full bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] grid place-items-center shrink-0 active:scale-[0.98] transition",
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
    <div className={["w-full rounded-[24px] bg-white shadow-[0_12px_26px_rgba(0,0,0,0.07)] overflow-hidden", className].join(" ")}>
      {children}
    </div>
  );
}

function InitialsAvatar({ name }) {
  const initials = useMemo(() => {
    const n = String(name || "").trim();
    if (!n) return "O";
    const parts = n.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "O";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  }, [name]);

  return (
    <div className="h-[68px] w-[68px] rounded-[26px] bg-[#DDE6F7] grid place-items-center shrink-0">
      <span className="text-[18px] font-extrabold text-[#1E2F5D]">{initials}</span>
    </div>
  );
}

function RolePill({ role }) {
  const label = role || "—";
  const isClient = label === "client";
  const styles = isClient ? "bg-[#CFDE87]/25 text-[#3D3D3D]" : "bg-black/[0.04] text-black/55";
  const pretty = isClient ? "Cliente" : label;
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${styles}`}>{pretty}</span>;
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
        <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-black/40">{label}</p>
        <p className="mt-0.5 text-[14px] font-semibold text-[#3D3D3D] truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function RowButton({ icon, title, desc, onClick, right }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-4 text-left active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
            <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{title}</p>
            {desc ? <p className="mt-0.5 text-[12px] text-black/45 truncate">{desc}</p> : null}
          </div>
        </div>

        {right ? <div className="shrink-0">{right}</div> : <IconifyIcon icon="mdi:chevron-right" className="h-7 w-7 text-black/25 shrink-0" />}
      </div>
    </button>
  );
}

function NeighborhoodPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const t = String(value || "").trim().toLowerCase();
    if (!t) return NEIGHBORHOODS.slice(0, 8);
    return NEIGHBORHOODS.filter((n) => n.toLowerCase().includes(t)).slice(0, 8);
  }, [value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Ej: Villa Martelli"
        className="mt-2 w-full h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30"
        disabled={disabled}
      />

      {open && !disabled && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white shadow-[0_12px_26px_rgba(0,0,0,0.10)] border border-black/10 overflow-hidden z-[99999]">
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-black/50">Barrios sugeridos</p>
            <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 rounded-full bg-black/[0.04] grid place-items-center">
              <IconifyIcon icon="mdi:close" className="h-5 w-5 text-black/45" />
            </button>
          </div>

          <div className="max-h-56 overflow-auto">
            {matches.length ? (
              matches.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onChange?.(n);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-black/[0.03] active:bg-black/[0.05]"
                >
                  <p className="text-[14px] font-semibold text-[#3D3D3D]">{n}</p>
                </button>
              ))
            ) : (
              <div className="px-4 py-4">
                <p className="text-[12px] text-black/50">No hay coincidencias.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditProfileModal({ open, onClose, onSave, busy, initial }) {
  const [fullName, setFullName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.full_name || "");
    setNeighborhood(initial?.neighborhood || "");
  }, [open, initial]);

  if (!open) return null;

  const canSave = fullName.trim().length >= 2 && !busy;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={() => !busy && onClose?.()} aria-label="Cerrar" />

      {/* ✅ sin overflow-hidden para que no corte el dropdown */}
      <div className="relative w-full max-w-lg rounded-[24px] bg-white shadow-2xl overflow-visible">
        <div className="p-6 border-b border-black/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-extrabold text-[#3D3D3D]">Editar perfil</h3>
              <p className="mt-1 text-[12px] text-black/50">Actualizá tu info para personalizar la experiencia.</p>
            </div>

            <button
              type="button"
              onClick={() => !busy && onClose?.()}
              className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition disabled:opacity-60"
              disabled={busy}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <label className="text-[12px] font-semibold text-black/60">Nombre y apellido</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Jazmín Carrión"
                className="mt-2 w-full h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none placeholder:text-black/30"
                disabled={busy}
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-black/60">Barrio</label>
              <NeighborhoodPicker value={neighborhood} onChange={setNeighborhood} disabled={busy} />
            </div>
          </div>
        </div>

        <div className="p-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="h-11 rounded-full bg-black/[0.04] px-5 text-[13px] font-semibold text-black/70 active:scale-[0.98] transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              onSave?.({
                full_name: fullName.trim(),
                neighborhood: neighborhood.trim(),
              })
            }
            disabled={!canSave}
            className={[
              "h-11 rounded-full px-6 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(30,47,93,0.18)] active:scale-[0.98] transition",
              canSave ? "bg-[#1E2F5D]" : "bg-[#1E2F5D]/50",
            ].join(" ")}
          >
            {busy ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile, profileLoading, setProfile, role } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ favoritos count (sin joins raros)
  const [favCount, setFavCount] = useState(0);

  const email = user?.email || "";
  const fullName = profile?.full_name || "";
  const neighborhood = profile?.neighborhood || "";

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
    try {
      setSaving(true);
      const updated = await updateMyProfile(user.id, patch);
      setProfile?.(updated);
      toast.success("Perfil actualizado", "Tus cambios se guardaron correctamente.");
      setEditOpen(false);
    } catch (e) {
      toast.error("No se pudo guardar", e?.message || "Revisá RLS/policies en profiles.");
    } finally {
      setSaving(false);
    }
  }

  async function loadFavCount() {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id);

      if (error) throw error;
      setFavCount(count || 0);
    } catch {
      setFavCount(0);
    }
  }

  useEffect(() => {
    loadFavCount().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (profileLoading && !profile) {
    return <div className="min-h-screen bg-[#F5F5F5] p-6">Cargando…</div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pt-[40px] pb-6 box-border">
        {/* Top bar */}
        <div className="relative flex items-center justify-center">
          <IconButton onClick={() => nav(-1)} title="Volver" className="absolute left-0">
            <IconifyIcon icon="mdi:chevron-left" className="h-7 w-7 text-black/60" />
          </IconButton>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Perfil</h1>

          <IconButton onClick={() => setEditOpen(true)} title="Editar" className="absolute right-0" disabled={!user?.id}>
            <IconifyIcon icon="mdi:pencil" className="h-6 w-6 text-black/40" />
          </IconButton>
        </div>

        {/* Header card */}
        <CardShell className="mt-5 p-5">
          <div className="flex items-start gap-4">
            {profile?.avatar_url ? (
              <div className="h-[68px] w-[68px] rounded-[26px] overflow-hidden bg-black/[0.04] shrink-0">
                <img src={profile.avatar_url} alt={fullName || "Perfil"} className="h-full w-full object-cover" />
              </div>
            ) : (
              <InitialsAvatar name={fullName || email} />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[18px] font-extrabold text-[#3D3D3D] truncate">{fullName || "Tu perfil"}</p>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <RolePill role={profile?.role || role} />

                {!!email && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-semibold text-black/55">
                    <IconifyIcon icon="mdi:email-outline" className="h-4 w-4 text-black/35" />
                    <span className="max-w-[180px] truncate">{email}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-1 text-[12px] font-semibold text-black/55">
                  <IconifyIcon icon="mdi:map-marker" className="h-4 w-4 text-black/35" />
                  <span className="max-w-[180px] truncate">{neighborhood || "Sin barrio"}</span>
                </span>
              </div>

              <p className="mt-3 text-[12px] text-black/45">Gestioná tu cuenta y tus preferencias desde acá.</p>
            </div>
          </div>
        </CardShell>

        {/* Info */}
        <div className="mt-4">
          <CardShell className="px-5">
            <InfoRow icon="mdi:account" label="Nombre" value={fullName} />
            <div className="h-px w-full bg-black/5" />
            <InfoRow icon="mdi:email-outline" label="Email" value={email} />
            <div className="h-px w-full bg-black/5" />
            <InfoRow icon="mdi:map-marker-outline" label="Barrio" value={neighborhood} />
          </CardShell>
        </div>

        {/* Accesos (incluye Favoritos como el mismo formato) */}
        <div className="mt-4 grid gap-3">
          <RowButton
            icon="mdi:heart-outline"
            title="Favoritos"
            desc="Prestadores guardados para volver rápido"
            onClick={() => nav("/client/favorites")}
            right={
              <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-full bg-black/[0.04] text-[12px] font-extrabold text-black/55">
                {favCount}
              </span>
            }
          />

          <RowButton icon="mdi:clipboard-text-outline" title="Mis solicitudes" desc="Seguimiento de pedidos, cancelaciones y reseñas" onClick={() => nav("/client/requests")} />
          <RowButton icon="mdi:bell-outline" title="Notificaciones" desc="Preferencias y avisos importantes" onClick={() => nav("/client/notifications")} />
          <RowButton icon="mdi:help-circle-outline" title="Ayuda y soporte" desc="Preguntas frecuentes y contacto" onClick={() => toast.info("Soporte", "Después armamos una pantalla simple de ayuda.")} />
          <RowButton icon="mdi:shield-outline" title="Privacidad y términos" desc="Información legal de la app" onClick={() => toast.info("Legal", "Luego sumamos la pantalla legal.")} />
        </div>

        {/* Logout */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={[
              "w-full rounded-full py-3 font-semibold transition active:scale-[0.99]",
              "bg-white border border-black/10 text-[#3D3D3D]",
              "shadow-[0_8px_18px_rgba(0,0,0,0.06)]",
              loggingOut ? "opacity-60" : "",
            ].join(" ")}
          >
            {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </div>

      <EditProfileModal open={editOpen} onClose={() => !saving && setEditOpen(false)} onSave={handleSave} busy={saving} initial={profile} />
    </div>
  );
}
