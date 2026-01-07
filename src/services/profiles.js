import { supabase } from "./supabase";

/**
 * Lee el perfil del usuario logueado desde la tabla profiles
 */
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
 * Upsert de perfil (sirve tanto para crear como para actualizar).
 * Recomendado para onboarding.
 */
export async function upsertMyProfile(profile) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}