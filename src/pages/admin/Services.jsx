import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin } from "../../services/adminAccess";
import { FiInfo } from "react-icons/fi";
import Loading from "../../components/Loading";
import { useToast } from "../../components/Toast";

export default function Services() {
  const { user, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [services, setServices] = useState([]);
  const [relations, setRelations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  // MODAL NUEVO SERVICIO
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [pricingType, setPricingType] = useState("");
  const [creating, setCreating] = useState(false);

  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: servicesData, error: servicesError } =
        await supabase.from("service_catalog").select("*").order("name");

      if (servicesError) throw servicesError;

      const { data: relationsData, error: relationsError } =
        await supabase.from("provider_services").select("id, catalog_id, is_active");

      if (relationsError) throw relationsError;

      setServices(servicesData || []);
      setRelations(relationsData || []);
    } catch (err) {
      console.error(err);
      setError("Error cargando servicios");
    } finally {
      setLoading(false);
    }
  }

  const computedServices = useMemo(() => {
    return services.map((service) => {
      const providers = relations.filter(
        (r) => r.catalog_id === service.id && r.is_active
      );

      return {
        ...service,
        providersCount: providers.length,
      };
    });
  }, [services, relations]);

  const categories = useMemo(() => {
    const unique = [...new Set(services.map((s) => s.category))];
    return ["all", ...unique];
  }, [services]);

  const modalCategories = useMemo(() => categories.filter((c) => c !== "all"), [categories]);

  const filtered = computedServices.filter((s) => {
    const matchCategory = categoryFilter === "all" ? true : s.category === categoryFilter;
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  /* ================= ACTIONS ================= */
  async function handleCreateService(e) {
    e.preventDefault();

    if (!name.trim() || !category || !pricingType) {
      toast.warning("Completa todos los campos");
      return;
    }

    setCreating(true);

    const { error } = await supabase.from("service_catalog").insert({
      name: name.trim(),
      category,
      pricing_type: pricingType,
      is_active: true,
    });

    setCreating(false);

    if (error) {
      console.error(error);
      toast.error("Error al crear servicio");
      return;
    }

    toast.success("Servicio creado correctamente");
    setShowModal(false);
    setName("");
    setCategory("");
    setPricingType("");
    loadData();
  }

  if (loading) return <Loading />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#3D3D3D]">
            Supervisión de servicios
          </h1>
          <p className="mt-4 mb-4 text-md text-black/50">
            Listado y control del catálogo con sus prestadores asociados
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1E2F5D] text-white w-10 h-10 rounded-full text-3xl shadow-lg flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* FILTROS MODERNOS */}
      <div className="overflow-x-auto no-scrollbar mb-6">
        <div className="flex gap-3 w-max pr-2">
          {categories.map((cat) => {
            const count =
              cat === "all"
                ? computedServices.length
                : computedServices.filter((s) => s.category === cat).length;

            return (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                label={cat === "all" ? "Todas" : cat}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* BUSCADOR */}
      <input
        type="text"
        placeholder="Buscar por servicio o categoría..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-black/10 rounded-full px-4 py-3 text-sm mb-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none"
      />

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-black/50">Servicio no disponible</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 text-left w-2/3">Servicio</th>
                <th className="p-3 text-center w-1/6">Prestadores</th>
                <th className="p-3 text-center w-1/6">Info</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-500">{s.category}</div>
                  </td>
                  <td className="p-3 text-center font-semibold">{s.providersCount}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => navigate(`/admin/services/${s.id}`)}>
                      <FiInfo size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      {/* ================= MODAL NUEVO SERVICIO ================= */}
      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />

          <div className="relative w-full bg-white rounded-t-[28px] p-6 pb-8 max-w-[460px] mx-auto">
            <div className="w-10 h-1.5 bg-black/20 rounded-full mx-auto mb-6" />

            <h2 className="text-[18px] font-extrabold text-[#3D3D3D] mb-2">
              Nuevo servicio
            </h2>
            <p className="text-sm text-black/45 mb-6">
              Completá los campos para crear un nuevo servicio.
            </p>

            <form className="space-y-5" onSubmit={handleCreateService}>
              <div>
                <label className="text-sm text-black/45 block mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-black/45 block mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-[18px] bg-black/[0.03] px-4 py-3 text-sm font-medium outline-none appearance-none"
                >
                  <option value="">Seleccionar</option>
                  {modalCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-black/45 block mb-1">
                  Cotización <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-3">
                  {[
                    { value: "A", label: "Cotizada" },
                    { value: "B", label: "Fijo" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPricingType(option.value)}
                      className={[
                        "flex-1 py-3 rounded-full text-sm font-medium transition",
                        pricingType === option.value
                          ? "bg-[#1E2F5D] text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                          : "bg-black/[0.03] text-black/70",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full h-14 rounded-full bg-[#1E2F5D] text-white font-medium shadow-[0_10px_24px_rgba(30,47,93,0.22)] active:scale-[0.99] transition"
                >
                  {creating ? "Creando..." : "Crear servicio"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full h-14 rounded-full bg-black/[0.04] text-black/70 font-medium active:scale-[0.99] transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENTE CHIP ================= */
function FilterChip({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]",
        active
          ? "bg-[#1E2F5D] text-white"
          : "bg-white text-[#3D3D3D] border border-black/10",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-2 py-[2px] text-[12px]",
          active ? "bg-white/20 text-white" : "bg-black/[0.04] text-black/50",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}