// src/pages/client/Profile.jsx
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

/* ---------------- barrios Vicente López (COMPLETO) ---------------- */
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

/* ---------------- UI atoms (estilo provider) ---------------- */
function IconButton({ onClick, title, children, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        "h-11 w-11 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] grid place-items-center shrink-0 active:scale-[0.98] transition",
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
    <div className="h-[76px] w-[76px] rounded-[26px] bg-[#DDE6F7] grid place-items-center shrink-0">
      <span className="text-[18px] font-extrabold text-[#1E2F5D]">{initials}</span>
    </div>
  );
}

function RolePill({ role }) {
  const label = role || "—";
  const isClient = label === "client";
  const styles = "bg-black/[0.04] text-black/55";
  const pretty = isClient ? "Cliente" : label;

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${styles}`}>
      {pretty}
    </span>
  );
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
      className="w-full min-w-0 rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-4 text-left active:scale-[0.99] transition box-border"
    >
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
            <IconifyIcon icon={icon} className="h-5 w-5 text-black/45" />
          </span>

          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{title}</p>
            {desc ? <p className="mt-0.5 text-[12px] text-black/45 truncate">{desc}</p> : null}
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

/* ---------------- Minimal inputs (igual provider) ---------------- */
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

/* ---------------- Combobox barrios (dropdown SIEMPRE abajo) ---------------- */
function NeighborhoodCombobox({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [anchor, setAnchor] = useState({ left: 16, top: 120, width: 320, maxH: 240 });

  const filtered = useMemo(() => {
    const q = keyify(open ? query : value);
    if (!q) return VICENTE_LOPEZ_NEIGHBORHOODS;
    return VICENTE_LOPEZ_NEIGHBORHOODS.filter((n) => keyify(n).includes(q));
  }, [query, value, open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function updateAnchor() {
    const el = inputRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const gap = 8;
    const top = r.bottom + gap; // ✅ SIEMPRE abajo

    // ✅ max height dinámico: no se corta, se achica y scrollea
    const spaceBelow = window.innerHeight - top - 12;
    const maxH = Math.max(120, Math.min(240, spaceBelow));

    setAnchor({
      left: Math.max(12, r.left),
      top,
      width: Math.max(240, r.width),
      maxH,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateAnchor();

    const onResize = () => updateAnchor();
    const onScroll = () => updateAnchor();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, value]);

  function pick(v) {
    onChange(v);
    close();
  }

  return (
    <div className="relative">
      <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <IconifyIcon icon="mdi:map-marker-outline" className="h-5 w-5 text-black/35 shrink-0" />
          <p className="text-[12px] font-semibold text-black/45">Barrio</p>
        </div>

        <input
          ref={inputRef}
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

      <AnimatePresence>
        {open && !disabled && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[9998] bg-transparent"
              onClick={close}
              aria-label="Cerrar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="fixed z-[9999] rounded-[18px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)] overflow-hidden border border-black/5"
              style={{ left: anchor.left, top: anchor.top, width: anchor.width }}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div style={{ maxHeight: anchor.maxH }} className="overflow-auto">
                {filtered.length ? (
                  filtered.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pick(n)}
                      className="w-full px-4 py-3 text-left hover:bg-black/[0.03] active:bg-black/[0.05] flex items-center justify-between"
                    >
                      <span className="text-[14px] font-semibold text-[#3D3D3D]">{n}</span>
                      {keyify(value) === keyify(n) ? (
                        <IconifyIcon icon="mdi:check" className="h-5 w-5 text-[#2A4691]" />
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-[13px] text-black/50">No hay coincidencias</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Edit modal (bottom sheet, estilo provider) ---------------- */
function EditProfileModal({ open, onClose, onSave, busy, initial }) {
  const [fullName, setFullName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  // ✅ el warning solo aparece al intentar guardar
  const [neighborhoodTouched, setNeighborhoodTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.full_name || "");
    setNeighborhood(initial?.neighborhood || "");
    setNeighborhoodTouched(false);
  }, [open, initial]);

  const neighborhoodValid = useMemo(() => isAllowedNeighborhood(neighborhood), [neighborhood]);

  const canSave = useMemo(() => {
    return fullName.trim().length >= 2 && neighborhoodValid && !busy;
  }, [fullName, neighborhoodValid, busy]);

  function trySave() {
    setNeighborhoodTouched(true);

    onSave?.({
      full_name: fullName.trim(),
      neighborhood: neighborhood.trim(),
    });
  }

  return (
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
            <div className="mx-auto w-full max-w-[460px] px-4">
              <div className="rounded-t-[28px] bg-white shadow-2xl px-5 pt-4 pb-6 overflow-x-hidden">
                <div className="flex justify-center">
                  <div className="h-1.5 w-12 rounded-full bg-black/10" />
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-extrabold text-[#3D3D3D]">Editar perfil</h3>
                    <p className="mt-1 text-[12px] text-black/50">Mantené tu perfil actualizado.</p>
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

                <div className="mt-5 grid gap-3 pr-1">
                  <InputPill
                    label="Nombre y apellido"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Escribí tu nombre"
                    disabled={busy}
                    icon="mdi:account-outline"
                  />

                  <NeighborhoodCombobox value={neighborhood} onChange={(v) => setNeighborhood(v)} disabled={busy} />

                  {/* ✅ SOLO después de tocar Guardar */}
                  {neighborhoodTouched && norm(neighborhood).length > 0 && !neighborhoodValid ? (
                    <div className="rounded-[18px] bg-red-50 px-4 py-3">
                      <p className="text-[12px] font-semibold text-red-700">
                        Ese barrio no está dentro de Vicente López.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => !busy && onClose?.()}
                    disabled={busy}
                    className="flex-1 h-[56px] rounded-full bg-black/[0.04] text-[14px] font-extrabold text-black/70 active:scale-[0.99] transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={trySave}
                    disabled={!canSave}
                    className={[
                      "flex-1 h-[56px] rounded-full text-[14px] font-extrabold text-white shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition",
                      canSave ? "bg-[#1E2F5D]" : "bg-[#1E2F5D]/50",
                    ].join(" ")}
                  >
                    {busy ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Skeleton (igual provider) ---------------- */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full pt-[40px] pb-24 box-border">
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
  const { user, profile, profileLoading, setProfile, role } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

    if (!isAllowedNeighborhood(patch.neighborhood)) {
      toast.error("Barrio inválido", "Elegí un barrio dentro de Vicente López.");
      return;
    }

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

  if (profileLoading && !profile) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full pt-[40px] pb-24 box-border overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[460px] box-border overflow-x-hidden"
          style={{
            paddingLeft: "max(16px, env(safe-area-inset-left))",
            paddingRight: "max(16px, env(safe-area-inset-right))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold text-[#3D3D3D] leading-tight">Perfil</h1>
              <p className="mt-1 text-[13px] text-black/45 leading-relaxed">Gestioná tu cuenta y preferencias</p>
            </div>

            <IconButton onClick={() => setEditOpen(true)} title="Editar" disabled={!user?.id}>
              <IconifyIcon icon="mdi:pencil" className="h-6 w-6 text-black/40" />
            </IconButton>
          </div>

          <CardShell className="mt-5 p-5">
            <div className="flex items-center gap-4 min-w-0">
              {profile?.avatar_url ? (
                <div className="h-[76px] w-[76px] rounded-[26px] overflow-hidden bg-black/[0.04] shrink-0">
                  <img src={profile.avatar_url} alt={fullName || "Perfil"} className="h-full w-full object-cover" />
                </div>
              ) : (
                <InitialsAvatar name={fullName || email} />
              )}

              <div className="min-w-0">
                <p className="text-[18px] font-extrabold text-[#3D3D3D] truncate">{fullName || "Tu perfil"}</p>
                <div className="mt-2">
                  <RolePill role={profile?.role || role || "client"} />
                </div>
              </div>
            </div>
          </CardShell>

          <div className="mt-4">
            <CardShell className="px-5">
              <InfoRow icon="mdi:account" label="Nombre" value={fullName} />
              <div className="h-px w-full bg-black/5" />
              <InfoRow icon="mdi:email-outline" label="Email" value={email} />
              <div className="h-px w-full bg-black/5" />
              <InfoRow icon="mdi:map-marker-outline" label="Barrio" value={neighborhood} />
            </CardShell>
          </div>

          <div className="mt-4 grid gap-3">
            <RowButton
              icon="mdi:heart-outline"
              title="Favoritos"
              desc="Prestadores guardados para volver rápido"
              onClick={() => nav("/client/favorites")}
              right={
                <span className="inline-flex items-center justify-center h-7 min-w-[24px] px-2 rounded-full bg-black/[0.04] text-[11px] font-extrabold text-black/55">
                  {favCount}
                </span>
              }
            />

            <RowButton
              icon="mdi:history"
              title="Mi historial"
              desc="Tus solicitudes pasadas y estados"
              onClick={() => nav("/client/history")}
            />

            <RowButton
              icon="mdi:help-circle-outline"
              title="Ayuda y soporte"
              desc="Preguntas frecuentes y contacto"
              onClick={() => nav("/client/help")}
            />

            <RowButton
              icon="mdi:shield-outline"
              title="Privacidad y términos"
              desc="Información legal de la app"
              onClick={() => nav("/client/legal")}
            />
          </div>

          <div className="mt-4 overflow-visible pb-[max(18px,env(safe-area-inset-bottom))]">
            {/* ✅ aire real abajo para que NO se corte la sombra al final del scroll */}
            <div className="pt-2 pb-3 overflow-visible">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={[
                  "w-full rounded-full py-3 font-semibold transition active:scale-[0.99] box-border",
                  "bg-white border border-black/10 text-[#3D3D3D]",
                  "shadow-[0_10px_24px_rgba(0,0,0,0.08)]",
                  "inline-flex items-center justify-center gap-2",
                  loggingOut ? "opacity-60" : "",
                ].join(" ")}
              >
                <IconifyIcon icon="mdi:logout" className="h-5 w-5 text-black/45" />
                {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </div>

            {/* ✅ separador extra (garantiza que el scroll nunca “corte” la sombra) */}
            <div className="h-6" />
          </div>
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        onSave={handleSave}
        busy={saving}
        initial={profile}
      />
    </div>
  );
}
