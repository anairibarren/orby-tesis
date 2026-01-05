import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

// Detección de marca 
function detectCardType(number) {
  const n = onlyDigits(number);
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6(?:011|5)/.test(n)) return "discover";
  if (/^(5018|5020|5038|5893|6304|6759|6761|6763)/.test(n)) return "maestro";
  if (/^60/.test(n)) return "cabal";
  if (/^36|^38/.test(n)) return "naranja";
  return "default";
}

function formatCardNumber(value = "") {
  const d = onlyDigits(value).slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value = "") {
  let v = onlyDigits(value).slice(0, 4);
  if (v.length >= 3) v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
  return v;
}

function validateExpiry(exp) {
  const [mm, yy] = (exp || "").split("/");
  if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return false;
  const month = parseInt(mm, 10);
  const year = parseInt(`20${yy}`, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(year, month - 1, 1);
  return (
    expDate.getFullYear() > now.getFullYear() ||
    (expDate.getFullYear() === now.getFullYear() && expDate.getMonth() >= now.getMonth())
  );
}

// Bancos
const bancosArgentina = {
  "450799": "BBVA",
  "450778": "Banco Galicia",
  "504345": "Banco Nación",
  "589562": "HSBC",
  "541275": "Santander Río",
  "522135": "Banco Provincia",
};

// helpers / utils
const onlyDigits = (str) => str.replace(/\D/g, "");

function detectarBanco(cardNumber) {
  const clean = onlyDigits(cardNumber);
  if (clean.length < 6) return "";
  const bin = clean.slice(0, 6);
  return bancosArgentina[bin] || "Banco no identificado";
}

export default function CreditCardForm({ onSaved = null }) {
  const navigate = useNavigate();

  const [cardNumber, setCardNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [dni, setDni] = useState("");

  const [focused, setFocused] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const brand = detectCardType(cardNumber);
  const rawNumber = onlyDigits(cardNumber);
  const banco = detectarBanco(cardNumber);
  const last4 = rawNumber.slice(-4);

  const maskedForDisplay = (() => {
    if (rawNumber.length === 0) return "•••• •••• •••• ••••";
    const groups = formatCardNumber(rawNumber).split(" ");
    if (rawNumber.length >= 12) {
      return groups.map((g, i) => (i < groups.length - 1 ? "••••" : g)).join(" ");
    }
    return groups.map(() => "••••").join(" ");
  })();

  const onChangeCardNumber = (e) => setCardNumber(formatCardNumber(e.target.value));
  const onChangeExpiry = (e) => setExpiry(formatExpiry(e.target.value));

  // Validación Luhn
  function validaLuhn(num) {
    const arr = num.split("").reverse().map(Number);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      let n = arr[i];
      if (i % 2 !== 0) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    }
    return sum % 10 === 0;
  }

  const onSubmit = async (e) => {
    e.preventDefault();

    console.log("rawNumber para Luhn:", rawNumber);

    if (!validaLuhn(rawNumber)) return setMessage({ type: "error", text: "Esta tarjeta no es válida" });
    if (!holder.trim()) return setMessage({ type: "error", text: "Ingresá el nombre del titular" });
    if (!validateExpiry(expiry)) return setMessage({ type: "error", text: "Fecha de caducidad inválida" });
    if (cvv.length < 3) return setMessage({ type: "error", text: "Código de seguridad inválido" });
    if (dni.length < 7 || dni.length > 8) return setMessage({ type: "error", text: "Documento inválido" });

    setSaving(true);
    setMessage(null);

    try {
      const simulatedGatewayResponse = {
        card_id: `mock_card_${Date.now()}`,
        brand,
        last4,
        expiry_month: parseInt(expiry.split("/")[0], 10),
        expiry_year: parseInt(`20${expiry.split("/")[1]}`, 10),
        holder_name: holder,
      };

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) throw new Error("Usuario no autenticado");

      // Guardar en Supabase sin 'gateway'
      const { error: insertError } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        type: "Tarjeta",
        icon: "bi:credit-card-fill",
        details: {
          last4: simulatedGatewayResponse.last4,
          exp: `${simulatedGatewayResponse.expiry_month}/${simulatedGatewayResponse.expiry_year}`,
          brand: simulatedGatewayResponse.brand,
          bank: banco,
        }
      });

      if (insertError) throw insertError;

      setMessage({ type: "success", text: "Tarjeta guardada correctamente" });
      if (onSaved) onSaved();
      setTimeout(() => navigate("/payment-methods"), 900);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Error al guardar la tarjeta" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {message && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50 ${
          message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-3xl mt-4">
          <div className="flex gap-6 flex-col md:flex-row">
            {/* Tarjeta */}
            <div className="md:w-1/4 flex justify-center">
              <div className="relative" style={{ perspective: 1000 }}>
                <div
                  className={`relative w-[320px] h-[200px] rounded-2xl transform-style-3d transition-transform duration-700`}
                  style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  {/* Frente */}
                  <div
                    className="absolute inset-0 rounded-2xl p-5 text-white"
                    style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg,#1E2F5D,#3F568F)", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-lg font-semibold">
                        {brand === "visa" && "VISA"}
                        {brand === "mastercard" && "Mastercard"}
                        {brand === "amex" && "AMEX"}
                        {brand === "maestro" && "Maestro"}
                        {brand === "cabal" && "Cabal"}
                        {brand === "naranja" && "Naranja"}
                        {brand === "discover" && "Discover"}
                        {brand === "default" && "Tarjeta"}
                      </div>
                    </div>

                    <div className="mt-2 w-12 h-8 rounded-md bg-gradient-to-b from-white/85 to-gray-300/60" />

                    <div className="mt-3 text-xl tracking-widest">
                      {rawNumber.length >= 12 ? `•••• •••• •••• ${last4}` : maskedForDisplay}
                    </div>

                    <div className="mt-6 flex justify-between items-end text-sm">
                      <div>
                        <div className="text-xs opacity-80">Titular</div>
                        <div className="font-medium">{holder || "NOMBRE DEL TITULAR"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs opacity-80">Hasta</div>
                        <div className="font-medium">{expiry || "MM/AA"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Reverso */}
                  <div
                    className="absolute inset-0 rounded-2xl p-5 text-white"
                    style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg,#1E2F5D,#3F568F)", transform: "rotateY(180deg)", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}
                  >
                    <div className="bg-black/80 h-10 rounded-sm mt-3" />
                    <div className="mt-5">
                      <div className="text-xs opacity-80">CVV</div>
                      <div className="bg-white text-black p-2 rounded w-24 text-right">
                        {cvv ? cvv.replace(/./g, "•") : "•••"}
                      </div>
                    </div>

                    <div className="mt-6 text-right opacity-80">
                      {brand === "visa" && "VISA"}
                      {brand === "mastercard" && "Mastercard"}
                      {brand === "amex" && "American Express"}
                      {brand === "maestro" && "Maestro"}
                      {brand === "cabal" && "Cabal"}
                      {brand === "naranja" && "Naranja"}
                      {brand === "discover" && "Discover"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="md:w-1/2 bg-white rounded-2xl p-6 shadow">
              <form id="payment-form" onSubmit={onSubmit} className="space-y-4">
                {/* Número de tarjeta */}
                <div>
                  <label className="block text-sm font-medium text-[#B1B1B1] mb-2">Número de tarjeta</label>
                  <input
                    inputMode="numeric"
                    className="w-full p-3 rounded-full bg-[#F0F0F0] placeholder-[#777777] outline-none"
                    placeholder="1234 1234 1234 1234"
                    value={cardNumber}
                    onChange={onChangeCardNumber}
                    onFocus={() => setFocused("number")}
                    onBlur={() => setFocused(null)}
                    maxLength={23}
                  />
                </div>

                {/* Titular */}
                <div>
                  <label className="block text-sm font-medium text-[#B1B1B1] mb-2">Titular de la tarjeta</label>
                  <input
                    className="w-full p-3 rounded-full bg-[#F0F0F0] placeholder-[#777777] outline-none"
                    placeholder="Ej: María López"
                    value={holder.toUpperCase()}
                    onChange={(e) => setHolder(e.target.value.toUpperCase())}
                    onFocus={() => setFocused("holder")}
                    onBlur={() => setFocused(null)}
                  />
                </div>

                {/* Vencimiento + CVV */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#B1B1B1] mb-2">Vencimiento</label>
                    <input
                      className="w-full p-3 rounded-full bg-[#F0F0F0] placeholder-[#777777] outline-none"
                      placeholder="MM/AA"
                      value={expiry}
                      onChange={onChangeExpiry}
                      onFocus={() => setFocused("expiry")}
                      onBlur={() => setFocused(null)}
                      maxLength={5}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#B1B1B1] mb-2">Código de seguridad</label>
                    <input
                      type="password"
                      className="w-full p-3 rounded-full bg-[#F0F0F0] placeholder-[#777777] outline-none"
                      placeholder="Ej: 123"
                      value={cvv}
                      onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 3))}
                      onFocus={() => setIsFlipped(true)}
                      onBlur={() => setIsFlipped(false)}
                      maxLength={3}
                    />
                  </div>
                </div>

                {/* DNI */}
                <div>
                  <label className="block text-sm font-medium text-[#B1B1B1] mb-2">Documento del titular</label>
                  <input
                    inputMode="numeric"
                    className="w-full p-3 rounded-full bg-[#F0F0F0] placeholder-[#777777] outline-none"
                    placeholder="12.123.123"
                    value={dni}
                    onChange={(e) => setDni(onlyDigits(e.target.value).slice(0, 8))}
                    onFocus={() => setFocused("dni")}
                    onBlur={() => setFocused(null)}
                  />
                </div>
              </form>
            </div>

            {/* Info y botón fuera del form */}
            <div className="mt-3">
              <p className="text-center text-[#B1B1B1] text-sm">Tu información de pago se guardará de forma segura</p>
            </div>

            <div>
              <button
                disabled={saving}
                type="submit"
                form="payment-form"
                className="w-full bg-[#2A4691] text-white py-3 rounded-full text-lg font-semibold shadow-md"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
