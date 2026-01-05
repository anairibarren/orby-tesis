import { supabase } from "./supabase";

// Agregar un nuevo método de pago
export async function addPayment({ type, details, icon }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error("No se encontró usuario activo");

  const user_id = userData.user.id;

  const { data, error } = await supabase.from("payment_methods").insert([
    {
      user_id,
      type,
      details,
      icon,
    },
  ]);

  if (error) throw error;
  return data;
}

// Obtener métodos de pago del usuario actual
export const getPayments = async () => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Usuario no autenticado.");

    const { data, error } = await supabase
      .from("payment_methods")
      .select("id, type, details, icon")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error al traer métodos de pago:", error.message);
    return [];
  }
};

// Eliminar un método de pago
export async function deletePayment(id) {
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) throw error;
  return true;
}