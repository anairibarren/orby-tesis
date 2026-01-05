import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { getPayments, deletePayment } from "../../services/payment";
import Navbar from "../../components/Navbar";
import mpLogo from "../../assets/img/mp.png";

export default function PaymentMethods() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [view, setView] = useState("loading_initial");
  const [editing, setEditing] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data?.user) {
        setView("empty");
        return;
      }

      setUser(data.user);

      try {
        const methods = await getPayments();

        if (!methods.length) {
          setPaymentMethods([]);
          setView("empty");
        } else {
          setPaymentMethods(methods);
          setView("list");
        }
      } catch (err) {
        console.error(err);
        setView("empty");
      }
    };

    init();
  }, []);

  const handleDelete = (id) => setMethodToDelete(id);

  const confirmDelete = async (id) => {
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return alert("Error al eliminar método");

    const updated = paymentMethods.filter((m) => m.id !== id);
    setPaymentMethods(updated);
    setMethodToDelete(null);
    if (!updated.length) setView("empty");
  };

  const cancelDelete = () => setMethodToDelete(null);

  const toggleEditing = () => {
    if (!paymentMethods.length && !editing) return;
    setEditing((prev) => !prev);
  };

  // Función para mostrar detalles simplificados
  const getDetails = (method) => {
    if (method.type?.toLowerCase().includes("tarjeta")) {
      // method.details es un objeto { last4, exp }
      return `Venc. ${method.details?.exp || "MM/AA"}`;
    }
    if (method.type?.toLowerCase().includes("mercado pago")) {
      return "Cuenta conectada";
    }
    // Efectivo 
    return typeof method.details === "string" ? method.details : JSON.stringify(method.details);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-[Poppins]">

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full border border-gray-200 shadow flex items-center justify-center bg-white hover:bg-gray-100 transition"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <h1 className="text-2xl font-semibold text-black text-center flex-1">
          Métodos de pago
        </h1>

        {paymentMethods.length > 0 ? (
          <button
            onClick={toggleEditing}
            title={editing ? "Finalizar edición" : "Editar métodos"}
            className="w-10 h-10 rounded-full border border-gray-200 shadow flex items-center justify-center bg-white"
          >
            <Icon
              icon={editing ? "charm:tick" : "iconamoon:edit"}
              width="20"
            />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      <main className="flex-1 px-6 pb-24 text-center">

        {/* CARGANDO */}
        {view === "loading_initial" && (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2A4691] rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-semibold text-black">
              Cargando métodos...
            </h2>
          </div>
        )}

        {view === "empty" && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold text-black mb-4">
             Aún no agregaste un método de pago
            </h2>
            <p className="text-md text-[#B1B1B1] mb-10 mr-4 ml-4">
              Agregá una tarjeta o billetera digital para poder contratar servicios.
            </p>

            <button
              onClick={() => navigate("/add-payment")}
              className="bg-[#2A4691] ml-10 text-white px-8 py-4 rounded-full font-medium flex items-center justify-center gap-3"
            >
              <div> Agregar método de pago </div>

            </button>
          </div>
        )}


        {view === "list" && (
          <div className="max-w-xl mx-auto text-left mt-5">

            <p className="text-[#808080] mb-6">
              {editing
                ? "Editá tus métodos de pago"
                : "Seleccioná tu método de pago"}
            </p>

            <div className="space-y-4">

              {paymentMethods.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between bg-white items-center gap-4 py-3 px-3 rounded-3xl shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-4">

                    {m.type?.toLowerCase().includes("tarjeta") && (
                      <div className="bg-[#C1C9DF] p-3 rounded-full">
                        <Icon
                          icon="bi:credit-card-fill"
                          width="20"
                          className="text-[#2A4691]"
                        />
                      </div>
                    )}

                    {m.type?.toLowerCase().includes("efectivo") && (
                      <div className="bg-[#C1C9DF] p-3 rounded-full">
                        <Icon
                          icon="heroicons-solid:cash"
                          width="20"
                          className="text-[#2A4691]"
                        />
                      </div>
                    )}

                    {m.type?.toLowerCase().includes("mercado pago") && (
                      <img
                        src={mpLogo}
                        alt="Mercado Pago"
                        className="w-12 h-12 rounded-full"
                      />
                    )}

                    <div className="text-left">
                      <p className="font-medium text-black">{m.type}</p>
                      <span className="text-sm text-[#808080]">{getDetails(m)}</span>
                    </div>
                  </div>

                  {editing && (
                    <button
                      onClick={async () => {
                        try {
                          await deletePayment(m.id); 
                          const updated = paymentMethods.filter((p) => p.id !== m.id);
                          setPaymentMethods(updated);
                          if (!updated.length) setView("empty"); 
                        } catch (error) {
                          console.error(error);
                          alert("Error al eliminar método");
                        }
                      }}
                      className="text-[#B01919] font-medium text-sm hover:underline"
                    >
                      Eliminar
                    </button>
                  )}


                </div>
              ))}

            </div>

            {!editing && (
              <button
                onClick={() => navigate("/add-payment")}
                className="bg-white flex items-center gap-4 py-3 px-3 rounded-3xl mt-6 w-full text-left text-black font-semibold"
              >
                <div className="w-12 h-12 bg-[#F5F5F5] rounded-full flex items-center justify-center">
                  <Icon
                    icon="stash:plus-solid"
                    className="text-black text-2xl"
                  />
                </div>

                <span>Añadir método de pago</span>
              </button>
            )}

          </div>
        )}

      </main>

      <Navbar />
    </div>
  );
}