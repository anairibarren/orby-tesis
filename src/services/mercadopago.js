export const createPreference = async (amount, title = "Turno Orby") => {
  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: title,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: "http://localhost:5173/success",
          failure: "http://localhost:5173/failure",
          pending: "http://localhost:5173/pending",
        },
        auto_return: "approved",
      }),
    });

    const data = await response.json();

    return data.init_point; 
  } catch (error) {
    console.error("Error creando preferencia:", error);
    throw error;
  }
};