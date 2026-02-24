import { supabase } from "./supabase";

export async function isAdmin(user) {
  if (!user?.id) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error verificando:", error);
    return false;
  }

  return data?.role === "admin";
}