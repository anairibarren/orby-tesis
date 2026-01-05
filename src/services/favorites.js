import { supabase } from "./supabase";

// Agregar a favoritos 
export const addFavorite = async (userId, provider) => {
  try {
    const { error } = await supabase.from("favorites").insert([
      {
        user_id: userId,
        provider_id: provider.id,
        provider_name: provider.name,
        provider_image: provider.avatar_url,
        provider_category:
          provider.subcategory ||
          provider.category ||
          (provider.services?.[0] ?? "Servicio")
      }
    ]);

    if (error) {
      console.error("Error al guardar en favoritos:", error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// Eliminar favoritos
export const removeFavorite = async (userId, providerId) => {
  try {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("provider_id", providerId);

    if (error) {
      console.error("Error al eliminar favorito:", error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};


export const isFavorite = async (userId, providerId) => {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("provider_id", providerId)
      .maybeSingle(); 


    if (error && error.code !== "PGRST116") {
      console.error("Error al verificar favorito:", error);
    }

    return !!data;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// Trae el favorito del usuario
export const getFavorites = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener favoritos:", error);
      return [];
    }

    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
};