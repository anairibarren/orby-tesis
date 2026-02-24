import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";
import Modal from "../../components/Modal";

/* ================= UI COMPONENTS ================= */

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden border border-black/10",
        className,
      ].join(" ")}
    >
      {children}
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

  // MODAL BORRAR
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

    const { data: categoriesData } = await supabase
      .from("service_catalog")
      .select("category");

    setService(serviceData);
    setProviders(providersData || []);

    const uniqueCategories = [
      ...new Set((categoriesData || []).map((c) => c.category)),
    ];

    setCategories(uniqueCategories);

    setName(serviceData.name);
    setCategory(serviceData.category);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
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
  }, [id]);

  /* ================= COMPUTED ================= */

  const computedProviders = useMemo(() => {
    return providers.map((p) => ({
      id: p.id,
      name: p.profiles?.full_name || p.profiles?.email || "Prestador",
      price: p.base_price,
    }));
  }, [providers]);

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
      toast.error("Error al actualizar servicio");
      return;
    }

    toast.success("Servicio actualizado correctamente");
    setShowEditModal(false);
    loadData();
  }

  async function handleDeleteService() {
    setDeleting(true);

    const { error } = await supabase
      .from("service_catalog")
      .delete()
      .eq("id", id);

    setDeleting(false);

    if (error) {
      console.error(error);
      toast.error("Error al eliminar servicio");
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
        <h2 className="text-xl font-bold text-[#1E2F5D] mb-2">
          Servicio no encontrado
        </h2>
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
      <div className="space-y-5 p-4">

        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate("/admin/services")}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">
            Detalle del servicio
          </h1>
        </div>

        {/* Servicio */}
        <CardShell className="p-5">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D] mb-2">
            Servicio
          </h3>
          <InfoRow label="Servicio" value={service.name} />
          <InfoRow label="Categoría" value={service.category} />
        </CardShell>

        {/* Prestadores */}
        <CardShell className="p-5">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D] mb-3">
            Prestadores que lo ofrecen
          </h3>

          {computedProviders.length === 0 && (
            <p className="text-sm text-black/50">
              No hay prestadores activos ofreciendo este servicio.
            </p>
          )}

          <div className="space-y-3">
            {computedProviders.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3"
              >
                <span className="text-sm font-medium text-black/80">
                  {p.name}
                </span>
                <span className="text-sm font-semibold text-[#1E2F5D]">
                  ${Number(p.price).toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
        </CardShell>

        {/* EDICIÓN */}
        <CardShell className="p-5">
          <h3 className="text-[16px] font-extrabold text-[#3D3D3D] mb-3">
            Edición de servicio
          </h3>

          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 rounded-full border border-black/10 py-2 text-sm font-medium"
            >
              Editar servicio
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 rounded-full bg-[#1E2F5D] py-2 text-sm font-medium text-white"
            >
              Borrar servicio
            </button>
          </div>
        </CardShell>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[999] flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowEditModal(false)}
          />

          <form
            onSubmit={handleUpdateService}
            className="relative w-full bg-white rounded-t-[28px] p-6 pb-8 max-w-[460px] mx-auto"
          >
            <div className="w-10 h-1.5 bg-black/20 rounded-full mx-auto mb-6" />

            <h2 className="text-[18px] font-extrabold text-[#3D3D3D] mb-2">
              Editar servicio
            </h2>

            <p className="text-sm text-black/45 mb-6">
              Modificá la información del servicio seleccionado.
            </p>

            <div className="space-y-5">

              <div>
                <label className="text-sm text-black/45 block mb-1">
                  Nombre del servicio <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none"
                />
              </div>


              <div className="pt-2">
                <h3 className="text-sm text-black/45 block mb-1">
                  Categoría
                </h3>

                <p className="text-xs text-black/45 mb-3">
                  Seleccioná la categoría correspondiente.
                </p>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none appearance-none"
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


            <div className="mt-8 space-y-3">
              <button
                type="submit"
                className="w-full h-14 rounded-full bg-[#1E2F5D] text-white font-medium shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition"
              >
                Guardar cambios
              </button>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-full h-14 rounded-full bg-black/[0.04] text-black/70 font-medium active:scale-[0.99] transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL BORRAR */}
      <Modal
        open={showDeleteModal}
        title="Eliminar servicio"
        description="¿Seguro que querés eliminar este servicio? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={deleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteService}
      />
    </div>
  );
}