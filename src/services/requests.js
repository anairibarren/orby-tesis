import { supabase } from "./supabase";

// Trae solicitudes de un usuario por user_id
export async function getUserRequests(user_id) {
  const { data, error } = await supabase
    .from("requests")
    .select(`
      id,
      user_id,
      date,
      time,
      location,
      status,
      payment_status,
      created_at,
      provider_id,
      provider_name,
      subcategory_id,
      subcategory_name
    `)
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Crear nueva solicitud
export async function createRequest({
  user_id,
  provider_id,
  subcategory_id,
  date,
  time,
  location,
  price
}) {
  const { data, error } = await supabase
    .from("requests")
    .insert([
      {
        user_id,
        provider_id,
        subcategory_id,
        date,
        time,
        location,
        price,
        status: "pendiente",
        payment_status: "pendiente",
        created_at: new Date()
      }
    ])
    .select(); 

  if (error) throw error;
  return data[0];
}

// Cancelar solicitud
export async function cancelRequest(request_id) {
  const { data, error } = await supabase
    .from("requests")
    .delete()
    .eq("id", request_id);

  if (error) throw error;
  return data;
}