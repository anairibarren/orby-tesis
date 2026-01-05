import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import { getPayments } from "../../services/payment";
import SuccessModal from "../../components/SuccessModal";

export default function ProblemForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const passed = location.state || {}; // { providerId, subcategoryId, providerName, serviceName, date, time, price }

  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); 

  // Traer usuario y métodos de pago
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      try {
        const methods = await getPayments();
        setPaymentMethods(methods || []);
      } catch (err) {
        console.error("Error al traer métodos de pago:", err);
      }
    };
    init();
  }, []);

  // Manejo de imágenes
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const selectedFiles = files.slice(0, 3 - images.length);
    const newImages = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const formatPassedDate = (d) => {
    if (!d) return null;
    if (typeof d === "string") return d.split("T")[0];
    if (d instanceof Date) return d.toISOString().split("T")[0];
    return null;
  };

  const formatDateDropdown = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(""); 

    const form = e.target;
    const descripcion = form.descripcion.value.trim();
    const direccion = form.direccion.value.trim();

    // Validaciones obligatorias
    if (!descripcion || !direccion || !selectedPayment) {
      setErrorMessage("Por favor completa todos los campos obligatorios antes de enviar.");
      setLoading(false);
      return;
    }

    // Subir imágenes
    for (let i = 0; i < images.length; i++) {
      const file = images[i].file;
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("requests-files")
        .upload(fileName, file);
      if (error) console.warn("Error subiendo imagen:", error);
    }

    const selectedMethod = paymentMethods.find(
      (pm) => String(pm.id) === String(selectedPayment)
    );
  console.log("STATE EN PROBLEM FORM:", location.state);

    const payload = {
      user_id: user?.id || null,
      provider_id: passed.providerId || null,
      provider_name: passed.providerName || null,
      subcategory_id: passed.subcategoryId || null,
      subcategory_name: passed.subcategoryName || null,

      date:
        formatPassedDate(passed.date) ||
        new Date().toISOString().split("T")[0],

      time: passed.time || "A coordinar",
      location: direccion,
      price: passed.price || null,

      payment_status: "pendiente",
      status: "pendiente",

      created_at: new Date().toISOString(),
    };



    const { error } = await supabase.from("requests").insert([payload]);


    if (!error) setShowModal(true);
    else setErrorMessage("Hubo un error al enviar la solicitud.");

    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    navigate("/requests");
  };

  return (
    <div className="min-h-screen bg-white px-6 md:px-12 py-6 flex flex-col">
      <div className="flex items-center mb-6">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:opacity-80"
          onClick={() => navigate(-1)}
        >
          <Icon icon="ep:arrow-left-bold" width="26" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-center flex-1">Agendar turno</h2>
      </div>

      <div className="mt-4 mb-4">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100"
        >
          <span className="font-medium">Información de la reserva</span>
          <Icon icon="ep:arrow-down-bold" width="20" className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>

        {showDropdown && (
          <div className="mt-2 bg-white shadow-md rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Icon icon="mingcute:calendar-fill" width="24" className="text-gray-700" />
              <div>
                <span className="font-semibold">Fecha:</span> 
                <span className="text-gray-500 ml-1">{formatDateDropdown(passed.date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Icon icon="mingcute:time-fill" width="24" className="text-gray-700" />
              <div>
                <span className="font-semibold">Horario:</span> 
                <span className="text-gray-500 ml-1">{passed.time || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Icon icon="lineicons:cash-app" width="24" className="text-gray-700" />
              <div>
                <span className="font-semibold">Precio estimado:</span> 
                <span className="text-gray-500 ml-1">
                  {passed.minPrice != null && passed.maxPrice != null
                    ? `$${passed.minPrice} - $${passed.maxPrice}`
                    : passed.price
                      ? `$${passed.price}`
                      : "-"
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form className="flex flex-col gap-5 md:gap-6" onSubmit={handleSubmit}>
        <label className="font-medium">Descripción del problema <span className="text-red-700">*</span></label>
        <textarea
          name="descripcion"
          placeholder="Describe tu problema actual"
          className="w-full p-3 md:p-4 rounded-xl border border-gray-200 focus:border-black resize-vertical min-h-[100px]"
          required
        />

        <label className="font-medium">Dirección exacta <span className="text-red-700">*</span></label>
        <input
          name="direccion"
          type="text"
          placeholder="Agregar ubicación"
          className="w-full p-3 md:p-4 rounded-xl border border-gray-200 focus:border-black"
          required
        />

        <label className="font-medium">Piso/Dpto/Casa <span className="text-gray-500">(Opcional)</span></label>
        <input
          name="piso"
          type="text"
          placeholder="Completa si es necesario"
          className="w-full p-3 md:p-4 rounded-xl border border-gray-200 focus:border-black"
        />

        <label className="font-medium">Detalles <span className="text-gray-500">(Opcional)</span></label>
        <textarea
          name="detalles"
          placeholder="Agregá más detalles si lo considerás necesario"
          className="w-full p-3 md:p-4 rounded-xl border border-gray-200 focus:border-black min-h-[120px]"
        />

        <label className="font-medium">Subí hasta 3 imágenes (Opcional)</label>
        <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-100 p-10 text-center cursor-pointer">
          <Icon icon="ep:upload-filled" width="40" className="text-gray-700 mb-2 mx-auto" />
          <h4 className="font-semibold text-gray-700 mb-1">Subí tus archivos aquí o arrastralos</h4>
          <p className="text-sm text-gray-500">Formato JPG, PNG o PDF</p>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            onChange={handleImageChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-2">
            {images.map((img, index) => (
              <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 bg-gray-50">
                <img src={img.preview} alt={`preview-${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 flex items-center justify-center"
                >
                  <Icon icon="ep:close-bold" width="20" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="font-medium">Método de pago <span className="text-red-700">*</span></label>
        {paymentMethods.length > 0 ? (
          <select
            className="w-full p-3 md:p-4 rounded-xl border border-gray-200 focus:border-black"
            required
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
          >
            <option value="">Seleccioná un método de pago</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.type}{pm.details ? ` (${pm.details})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm mt-1 text-gray-500">
            <Link to="/payment-methods" className="text-gray-500 underline">
              Aún no tienes métodos de pago cargados
            </Link>
          </p>
        )}

        {errorMessage && (
          <div className="bg-red-100 text-red-800 p-3 rounded-xl text-center font-700 mt-2">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-4 bg-white shadow-lg rounded-xl p-2 mt-2">
          <Icon 
            icon="uis:padlock" 
            width="60" 
            className="bg-[#C1C9DF] text-[#2A4691] p-4 rounded-full flex-shrink-0" 
          />
          <p className="text-base text-black leading-7 flex-1">
            Tu pago está <strong>protegido</strong>. Solo se cobra cuando el servicio se completa. 
            Si necesitás <strong>cancelar</strong>, podés hacerlo hasta <strong>12 horas antes sin costo</strong>.
          </p>
        </div>

        <button
          type="submit"
          className="bg-blue-900 text-white font-semibold py-3 px-6 rounded-full mt-6 hover:bg-[#C1C9DF] hover:text-[#2A4691] transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      {showModal && <SuccessModal onClose={closeModal} />}
    </div>
  );
}