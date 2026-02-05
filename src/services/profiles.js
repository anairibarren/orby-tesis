import { supabase } from "./supabase";

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualiza el perfil del usuario logueado.
 * (No usamos upsert en onboarding para evitar edge cases.)
 */
export async function updateMyProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
