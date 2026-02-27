// src/pages/admin/ServiceDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { Icon } from "@iconify/react";
import { createPortal } from "react-dom";

/* ================= UI COMPONENTS ================= */

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white overflow-hidden border border-black/10",
        "shadow-[0_8px_18px_rgba(0,0,0,0.02)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-xl bg-black/[0.04] grid place-items-center">
        <Icon icon={icon} className="h-5 w-5 text-black/45" />
      </span>
      <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 mt-3">
      <span className="text-[13px] text-black/45">{label}</span>
      <span className="text-[13px] font-semibold text-black/70 text-right">
        {value || "—"}
      </span>
    </div>
  );
}

/* ================= SHEET (bottom) ================= */
function Sheet({ open, onClose, title, subtitle, children, disabledClose = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // opcional: bloquear scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-service-sheet" // ✅ key estable
          className="fixed inset-0"
          style={{ zIndex: 2147483647 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => !disabledClose && onClose?.()}
            aria-label="Cerrar"
          />

          <motion.div
            className="absolute left-0 right-0 bottom-0 px-4"
            style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
            initial={{ y: 44, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 44, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10">
              <div className="pt-3 flex justify-center">
                <div className="h-1.5 w-14 rounded-full bg-black/10" />
              </div>

              <div className="px-6 pt-4 pb-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">{title}</h3>
                    {subtitle ? (
                      <p className="mt-1 text-[12px] text-black/45 leading-snug">{subtitle}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5">{children}</div>
              </div>
            </div>

            <style>{`
              @keyframes sheetUp {
                from { transform: translateY(16px); opacity: 0; }
                to   { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ================= PAGE ================= */

export default function ServiceDetails() {
  const { user, loading: authLoading } = useAuthContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [service, setService] = useState(null);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // MODAL EDICIÓN
  const [showEditModal, setShowEditModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  // SHEET BORRAR
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // SHEET OPCIONES (⋯)
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  // UI: ver más / ver menos para prestadores
  const [showAllProviders, setShowAllProviders] = useState(false);
  const PROVIDERS_PREVIEW = 6;

  /* ================= LOAD DATA ================= */
  async function loadData() {
    setLoading(true);
    setNotFound(false);

    const { data: serviceData, error: serviceError } = await supabase
      .from("service_catalog")
      .select("*")
      .eq("id", id)
      .single();

    if (serviceError || !serviceData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: providersData } = await supabase
      .from("provider_services")
      .select(`id, base_price, profiles ( id, full_name, email )`)
      .eq("catalog_id", id)
      .eq("is_active", true)
      .order("base_price", { ascending: true });

    const { data: categoriesData } = await supabase.from("service_catalog").select("category");

    setService(serviceData);
    setProviders(providersData || []);

    const uniqueCategories = [...new Set((categoriesData || []).map((c) => c.category))];
    setCategories(uniqueCategories);

    setName(serviceData.name);
    setCategory(serviceData.category);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ================= REAL TIME ================= */
  useEffect(() => {
    const channel = supabase
      .channel(`provider_services_changes_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "provider_services",
          filter: `catalog_id=eq.${id}`,
        },
        loadData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ================= COMPUTED ================= */
  const computedProviders = useMemo(() => {
    return providers.map((p) => ({
      id: p.id,
      name: p.profiles?.full_name || p.profiles?.email || "Prestador",
      price: p.base_price,
    }));
  }, [providers]);

  const hasProviders = computedProviders.length > 0;

  const visibleProviders = showAllProviders
    ? computedProviders
    : computedProviders.slice(0, PROVIDERS_PREVIEW);

  // ✅ CAMBIO 1: si es por cotización (precio 0 / null), no mostrar "$0"
  function priceLabel(price) {
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return "Por cotización";
    return `$${n.toLocaleString("es-AR")}`;
  }

  /* ================= ACTIONS ================= */
  async function handleUpdateService(e) {
    e.preventDefault();

    if (!name.trim() || !category) {
      toast.warning("Completa todos los campos");
      return;
    }

    const { error } = await supabase
      .from("service_catalog")
      .update({
        name: name.trim(),
        category,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      toast.error("Error al actualizar", error.message);
      return;
    }

    toast.success("Servicio actualizado correctamente");
    setShowEditModal(false);
    loadData();
  }

  async function handleDeleteService() {
    if (hasProviders) {
      toast.warning(
        "No se puede eliminar este servicio",
        "Hay prestadores activos que lo ofrecen. Primero desasociá el servicio de esos prestadores."
      );
      setShowDeleteModal(false);
      return;
    }

    setDeleting(true);

    const { error } = await supabase.from("service_catalog").delete().eq("id", id);

    setDeleting(false);

    if (error) {
      console.error(error);
      toast.error(
        "No se pudo eliminar el servicio",
        "Probá de nuevo o verificá si está asociado a algún prestador."
      );
      return;
    }

    toast.success("Servicio eliminado correctamente");
    navigate("/admin/services");
  }

  /* ================= RENDER ================= */
  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  if (loading) return <Loading />;

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F5]">
        <h2 className="text-xl font-bold text-[#1E2F5D] mb-2">Servicio no encontrado</h2>
        <p className="text-sm text-black/50 mb-6">
          El servicio que estás buscando no existe o fue eliminado.
        </p>
        <button
          onClick={() => navigate("/admin/services")}
          className="rounded-full bg-[#1E2F5D] px-6 py-2 text-sm font-medium text-white"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="space-y-5 px-0 pt-4 pb-28">
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate("/admin/services")}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.02)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Detalle del servicio</h1>

          {/* ⋯ Menu (abre Sheet) */}
          <div className="absolute right-0">
            <button
              type="button"
              onClick={() => setShowOptionsSheet(true)}
              className="h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.02)] grid place-items-center active:scale-[0.99] transition"
              aria-label="Opciones"
              title="Opciones"
            >
              <Icon icon="mdi:dots-horizontal" className="h-6 w-6 text-black/45" />
            </button>
          </div>
        </div>

        {/* Servicio */}
        <CardShell className="p-5">
          <SectionTitle icon="mdi:briefcase-outline" title="Servicio" />
          <InfoRow label="Servicio" value={service?.name} />
          <InfoRow label="Categoría" value={service?.category} />
        </CardShell>

        {/* Prestadores */}
        <CardShell className="p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle icon="mdi:account-group-outline" title="Prestadores que lo ofrecen" />

            {/* ✅ CAMBIO 2: ya tenías "Ver más" para evitar lista enorme (se mantiene) */}
            {computedProviders.length > PROVIDERS_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllProviders((v) => !v)}
                className="h-9 px-4 rounded-full bg-black/[0.04] border border-black/10 text-[12px] font-extrabold text-[#3D3D3D] inline-flex items-center gap-2 active:scale-[0.99] transition"
              >
                <span>{showAllProviders ? "Ver menos" : "Ver más"}</span>
                <Icon
                  icon={showAllProviders ? "mdi:chevron-up" : "mdi:chevron-down"}
                  className="h-5 w-5 text-black/45"
                />
              </button>
            )}
          </div>

          {computedProviders.length === 0 ? (
            <p className="mt-3 text-sm text-black/50">
              No hay prestadores activos ofreciendo este servicio.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {visibleProviders.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-[18px] bg-black/[0.03] px-4 py-3"
                >
                  <span className="text-sm font-medium text-black/70 truncate">{p.name}</span>

                  {/* ✅ CAMBIO 1 aplicado acá */}
                  <span className="text-sm font-extrabold text-[#3D3D3D]">
                    {priceLabel(p.price)}
                  </span>
                </div>
              ))}

              {!showAllProviders && computedProviders.length > PROVIDERS_PREVIEW && (
                <p className="pt-1 text-[12px] text-black/40">
                  Mostrando {PROVIDERS_PREVIEW} de {computedProviders.length}.
                </p>
              )}
            </div>
          )}
        </CardShell>
      </div>

      {/* SHEET OPCIONES (sin botón Cancelar) */}
      <Sheet
        open={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        title="Opciones"
        subtitle="Administrá este servicio."
      >
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => {
              setShowOptionsSheet(false);
              setName(service?.name || "");
              setCategory(service?.category || "");
              setShowEditModal(true);
            }}
            className="w-full h-[54px] rounded-full border border-black/10 text-[14px] font-extrabold active:scale-[0.99] transition inline-flex items-center justify-center gap-2 bg-black/[0.04] text-[#3D3D3D]"
          >
            <Icon icon="mdi:pencil" className="h-5 w-5 text-black/55" />
            Editar servicio
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOptionsSheet(false);

              if (hasProviders) {
                toast.warning(
                  "No se puede eliminar este servicio",
                  "Hay prestadores activos que lo ofrecen. Primero desasociá el servicio de esos prestadores."
                );
                return;
              }

              setShowDeleteModal(true);
            }}
            disabled={hasProviders}
            className={[
              "w-full h-[54px] rounded-full border border-black/10 text-[14px] font-extrabold active:scale-[0.99] transition inline-flex items-center justify-center gap-2",
              hasProviders ? "bg-black/[0.04] text-black/40" : "bg-[#FFECEE] text-[#9B1C1C]",
            ].join(" ")}
          >
            <Icon
              icon="mdi:trash-can"
              className={["h-5 w-5", hasProviders ? "text-black/30" : "text-[#9B1C1C]"].join(" ")}
            />
            Eliminar servicio
          </button>

          {hasProviders && (
            <p className="pt-1 text-[12px] text-black/45 leading-snug">
              Este servicio no se puede eliminar porque hay prestadores activos que lo ofrecen.
            </p>
          )}
        </div>
      </Sheet>

      {/* MODAL EDITAR (estilo como tu imagen) */}
      {showEditModal &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647]">
            {/* overlay */}
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowEditModal(false)}
              aria-label="Cerrar"
            />

            {/* sheet con safe-area para iOS */}
            <div
              className="absolute left-0 right-0 bottom-0 px-4"
              style={{
                paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
                paddingTop: 12,
              }}
            >
              <form
                onSubmit={handleUpdateService}
                className="mx-auto max-w-[520px] rounded-[28px] bg-white shadow-2xl overflow-hidden border border-black/10 animate-sheetUp"
              >
                {/* handle */}
                <div className="pt-3 flex justify-center">
                  <div className="h-1.5 w-14 rounded-full bg-black/10" />
                </div>

                {/* header */}
                <div className="px-6 pt-4 pb-4">
                  <h2 className="text-[18px] font-extrabold text-[#3D3D3D]">Editar servicio</h2>
                  <p className="mt-1 text-[12px] text-black/45">Mantené la información actualizada.</p>
                </div>

                {/* content */}
                <div className="px-6 pb-4 space-y-3">
                  {/* Nombre */}
                  <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-black/45">
                      <Icon icon="mdi:briefcase-outline" className="h-5 w-5" />
                      <p className="text-[12px] font-semibold">
                        Nombre del servicio <span className="text-red-500">*</span>
                      </p>
                    </div>

                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none placeholder:text-black/30"
                      placeholder="Ingresá el nombre"
                    />
                  </div>

                  {/* Categoría */}
                  <div className="rounded-[18px] bg-black/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-black/45">
                      <Icon icon="mdi:tag-outline" className="h-5 w-5" />
                      <p className="text-[12px] font-semibold">
                        Categoría <span className="text-red-500">*</span>
                      </p>
                    </div>

                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-2 w-full bg-transparent text-[16px] font-extrabold text-[#3D3D3D] outline-none appearance-none"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* footer */}
                <div className="px-6 pb-6 pt-3 border-t border-black/10 bg-white">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="h-[54px] rounded-full bg-white border border-black/10 text-[14px] font-extrabold text-[#3D3D3D] active:scale-[0.99] transition"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="h-[54px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-extrabold shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <style>{`
              @keyframes sheetUp {
                from { transform: translateY(16px); opacity: 0; }
                to   { transform: translateY(0); opacity: 1; }
              }
              .animate-sheetUp { animation: sheetUp .18s ease-out both; }
            `}</style>
          </div>,
          document.body
        )}

      {/* SHEET BORRAR (botones en 14) */}
      <Sheet
        open={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        disabledClose={deleting}
        title="Eliminar servicio"
        subtitle="¿Seguro que querés eliminar este servicio? Esta acción no se puede deshacer."
      >
        <div className="grid gap-2">
          <button
            type="button"
            onClick={handleDeleteService}
            disabled={deleting}
            className={[
              "h-[54px] w-full rounded-full text-white text-[14px] font-extrabold",
              "shadow-[0_14px_30px_rgba(198,40,40,0.20)] active:scale-[0.99] transition",
              deleting ? "bg-[#C62828]/60" : "bg-[#C62828]",
            ].join(" ")}
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            className="h-[54px] w-full rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold shadow-[0_8px_18px_rgba(0,0,0,0.02)] active:scale-[0.99] transition"
          >
            Cancelar
          </button>
        </div>
      </Sheet>
    </div>
  );
}