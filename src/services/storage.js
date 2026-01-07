import { supabase } from "./supabase";

/**
 * Sube un archivo a un bucket (public) y devuelve el publicUrl.
 * Para tesis, lo más simple: buckets públicos.
 */
export async function uploadToPublicBucket({ bucket, path, file }) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}