import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import mpLogo from "../assets/img/mp.png";
import { addPayment } from "../services/payment";
import { createPreference } from "../services/mercadopago";
import CreditCardForm from "../components/CreditCardForm";

export default function AddPayment() {
  const navigate = useNavigate();
  const [showCardForm, setShowCardForm] = useState(false);

  // Guardar tarjeta
  const handleAddCard = async (cardData) => {
    try {
      await addPayment({
        type: "Tarjeta de crédito o débito",
        details: {
          last4: cardData.last4,
          exp: cardData.exp
        },
        icon: "card",
      });
      navigate("/payment-methods");
    } catch (err) {
      console.error("Error al agregar tarjeta:", err.message);
    }
  };

  // Mercado Pago
  const handleConnectMercadoPago = async () => {
    try {
      window.open("https://www.mercadopago.com.ar/", "_blank");

      await addPayment({
        type: "Mercado Pago",
        details: "Cuenta vinculada correctamente",
        icon: "mercadopago",
      });

      navigate("/payment-methods");

    } catch (err) {
      console.error("Error al conectar Mercado Pago:", err.message);
      alert("No se pudo conectar con Mercado Pago");
    }
  };

  // Efectivo
  const handleAddCash = async () => {
    try {
      await addPayment({
        type: "Efectivo",
        details: "Pago directo al prestador",
        icon: "cash",
      });
      navigate("/payment-methods");
    } catch (err) {
      console.error("Error al agregar efectivo:", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-[Poppins]">

      <header className="flex items-center gap-3 px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-gray-200 shadow flex items-center justify-center bg-white hover:bg-gray-100 transition"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>
        <h2 className="text-2xl font-semibold text-black ml-8">Métodos de pago</h2>
      </header>

      {!showCardForm ? (
        <div className="max-w-xl mx-5 space-y-6 px-2">
          <div className="text-left">
            <h3 className="font-semibold text-xl text-black mb-2 mt-5">
              ¿Cómo querés pagar?
            </h3>
            <p className="text-md text-[#686868]">Agregá una nueva forma de pago.</p>
          </div>

          <button
            onClick={() => setShowCardForm(true)}
            className="flex justify-between items-center bg-white p-4 rounded-3xl shadow cursor-pointer w-[100%]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#C1C9DF] p-3 rounded-full">
                <Icon
                  icon="bi:credit-card-fill"
                  width="25"
                  className="text-[#2A4691]"
                />
              </div>
              <div className="text-left">
                <h3 className="text-black font-semibold text-[1rem]">
                  Tarjeta de crédito o débito
                </h3>
                <p className="text-sm text-[#686868]">Cargo automático a tu tarjeta</p>
              </div>
            </div>
            <Icon icon="ep:arrow-right-bold" width="22" className="ml-2 text-[#D0D0D0]" />
          </button>

          <button
            onClick={handleAddCash}
            className="flex justify-between items-center bg-white p-4 rounded-3xl shadow cursor-pointer w-[100%]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#C1C9DF] p-3 rounded-full">
                <Icon
                  icon="heroicons-solid:cash"
                  width="25"
                  className="text-[#2A4691]"
                />
              </div>
              <div className="text-left">
                <h3 className="text-black font-semibold text-[1rem]">Efectivo</h3>
                <p className="text-sm text-[#686868]">
                  Pago directo al prestador
                </p>
              </div>
            </div>
            <Icon icon="ep:arrow-right-bold" width="22" className="ml-2 text-[#D0D0D0]" />
          </button>

          <button
            onClick={handleConnectMercadoPago}
            className="flex justify-between items-center bg-white p-4 rounded-3xl shadow cursor-pointer w-[100%]"
          >
            <div className="flex items-center gap-4">
              <img
                src={mpLogo}
                alt="Mercado Pago"
                className="w-12 h-12 rounded-full"
              />
              <div className="text-left">
                <h3 className="text-black font-semibold text-[1rem]">
                  Mercado Pago
                </h3>
                <p className="text-sm text-[#686868]">
                  Conectá con tu cuenta
                </p>
              </div>
            </div>
            <Icon icon="ep:arrow-right-bold" width="22" className=" ml-2 text-[#D0D0D0]" />
          </button>
        </div>
      ) : (
        <CreditCardForm onSaved={handleAddCard} />
      )}
    </div>
  );
}