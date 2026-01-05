import { supabase } from "./supabase";

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return { data, error };
};

export const updateUserProfile = async (userId, data) => {
  const dataForSupabase = {
    ...data,
    fecha_nacimiento: data.nacimiento || data.fecha_nacimiento,
  };
  delete dataForSupabase.nacimiento;

  const { data: updatedData, error } = await supabase
    .from("users")
    .update(dataForSupabase)
    .eq("id", userId)
    .select(); 
  return { data: updatedData, error };
};

export const uploadAvatar = async (userId, file) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) return { error: uploadError };

  const { data: publicData, error: publicError } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  if (publicError) return { error: publicError };

  return { url: publicData?.publicUrl ?? "" };
};