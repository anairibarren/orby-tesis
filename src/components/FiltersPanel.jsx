import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

const FiltersPanel = ({ onClose, onApply, onFilterChange }) => {
  const [categoria, setCategoria] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [servicioObj, setServicioObj] = useState(null);

  const [ubicacion, setUbicacion] = useState("vicente"); // default
  const [orden, setOrden] = useState("");

  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);

  const panelRef = useRef(null);
  const navigate = useNavigate();

  const categoryIdToName = {
    1: "hogar",
    2: "educacion",
    3: "belleza",
    4: "eventos",
  };

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from("categories").select("id,nombre");
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.warn("No se pudieron cargar categories (puede que no exista):", err.message || err);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        let query = supabase.from("subcategories").select("*");
        if (categoria) query = query.eq("category_id", Number(categoria));
        const { data, error } = await query;
        if (error) throw error;
        setSubcategories(data || []);
      } catch (err) {
        console.error("Error cargando subcategories:", err.message || err);
        setSubcategories([]);
      }
    };
    fetchSubcategories();
  }, [categoria]);

  useEffect(() => {
    if (!servicioId) {
      setServicioObj(null);
      return;
    }
    const found = subcategories.find((s) => String(s.id) === String(servicioId));
    setServicioObj(found || null);
  }, [servicioId, subcategories]);

  useEffect(() => {
    onFilterChange?.({
      categoria,
      servicio: servicioObj,
      ubicacion,
      orden,
      province: province || null,
      city: city || null,
      address: address || null,
    });
  }, [categoria, servicioObj, ubicacion, orden, province, city, address, onFilterChange]);

  // Cerrar panel 
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleApply = () => {
    const filters = {
      categoria: categoria || "",
      servicio: servicioObj || null,
      ubicacion,
      orden: orden || "",
      province: province || "",
      city: city || "",
      address: address || "",
    };

    onApply?.(filters);

    const categoryName = categoryIdToName[Number(categoria)];
    if (categoryName && servicioObj) {
      navigate(`/category/${categoryName}/subcategory/${servicioObj.id}`);
    } else if (categoryName) {
      navigate(`/category/${categoryName}`);
    }

    onClose?.();
  };

  const handleReset = () => {
    setCategoria("");
    setServicioId("");
    setServicioObj(null);
    setUbicacion("vicente");
    setOrden("");
    setProvince("");
    setCity("");
    setAddress("");

    const clean = {
      categoria: "",
      servicio: null,
      ubicacion: "",
      orden: "",
      province: "",
      city: "",
      address: "",
    };

    onApply?.(clean);
    onFilterChange?.(clean);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-end z-[1000]">
      <div
        ref={panelRef}
        className="w-full max-h-[70vh] bg-white rounded-t-3xl p-6 overflow-y-auto shadow-[0_-10px_30px_rgba(0,0,0,0.25)] animate-slideUp"
      >

        <div className="flex justify-between items-center mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Icon icon="mingcute:filter-2-fill" width="24" />
            Filtro
          </h1>

          <button onClick={handleReset} className="text-sm underline font-thin">
            Resetear
          </button>
        </div>

        <div className="border-b pb-5 mb-5 border-[#ECECEC]">
          <p className="text-md font-semibold mb-2">Categoría</p>
    
          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setServicioId(""); 
            }}
            className="w-full bg-[#F0F0F0] p-3 rounded-full outline-none text-[#808080]"
          >
            <option value="">Todas las categorías</option>
            {categories.length > 0
              ? categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              : (
                <>
                  <option value="1">Hogar y Reparaciones</option>
                  <option value="2">Educación y Habilidades</option>
                  <option value="3">Belleza y Bienestar</option>
                  <option value="4">Eventos y Entretenimiento</option>
                </>
              )}
          </select>

          <p className="text-md font-semibold mt-5 mb-2">Servicios</p>
          <select
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            className="w-full bg-[#F0F0F0] p-3 rounded-full outline-none text-[#808080]"
          >
            <option value="">
              {categoria ? "Seleccionar servicio" : "Todos los servicios"}
            </option>

            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b pb-5 mb-5 border-[#ECECEC]">
          <p className="text-md font-semibold mb-3">Ubicación</p>

          <div className="flex gap-3">
            <button
              onClick={() => setUbicacion("vicente")}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-full transition ${
                ubicacion === "vicente" ? "bg-[#C1C9DF]" : "bg-[#F0F0F0]"
              }`}
            >
              {ubicacion === "vicente" ? (
                <span className="bg-[#2A4691] p-1 rounded-full text-white flex items-center justify-center">
                  <Icon icon="charm:tick" width="16" />
                </span>
              ) : (
                <span className="p-1 rounded-full text-[#2A4691] flex items-center justify-center">
                  <Icon icon="akar-icons:plus" width="16" />
                </span>
              )}
              <span className="text-sm truncate">Vicente López</span>
            </button>

            <button
              onClick={() => setUbicacion("custom")}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-full transition ${
                ubicacion === "custom" ? "bg-[#C1C9DF]" : "bg-[#F0F0F0]"
              }`}
            >
              {ubicacion === "custom" ? (
                <span className="bg-[#2A4691] p-1 rounded-full text-white flex items-center justify-center">
                  <Icon icon="charm:tick" width="16" />
                </span>
              ) : (
                <span className="p-1 rounded-full text-[#2A4691] flex items-center justify-center">
                  <Icon icon="akar-icons:plus" width="16" />
                </span>
              )}
              <span className="text-sm truncate">Agregar ubicación</span>
            </button>
          </div>

          {ubicacion === "custom" && (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Provincia"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-[#F0F0F0] p-3 rounded-full outline-none"
              />
              <input
                type="text"
                placeholder="Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#F0F0F0] p-3 rounded-full outline-none"
              />
              <input
                type="text"
                placeholder="Dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#F0F0F0] p-3 rounded-full outline-none"
              />
            </div>
          )}
        </div>

        <div className="pb-5 mb-5 border-b border-[#ECECEC]">
          <p className="text-md font-semibold mb-3">Ordenar por</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "rating", text: "Calificación alta" },
              { id: "solicitados", text: "Más solicitados" },
              { id: "precio", text: "Menor precio" },
              { id: "nuevos", text: "Nuevos en la plataforma" },
              { id: "experiencia", text: "Mayor experiencia" },
              { id: "verificados", text: "Verificados" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setOrden(item.id)}
                className={`flex items-center justify-start gap-3 px-4 py-3 rounded-full transition text-left w-full ${
                  orden === item.id ? "bg-[#C1C9DF]" : "bg-[#F0F0F0]"
                }`}
                aria-pressed={orden === item.id}
              >
                {orden === item.id ? (
                  <span className="bg-[#2A4691] p-1 rounded-full text-white flex items-center justify-center">
                    <Icon icon="charm:tick" width="16" />
                  </span>
                ) : (
                  <span className="w-[26px]" />
                )}

                <span className="text-sm">{item.text}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full py-3 rounded-full bg-[#2A4691] text-white font-semibold shadow-lg"
        >
          Aplicar filtro
        </button>
      </div>
    </div>
  );
};

export default FiltersPanel;