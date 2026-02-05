import { supabase } from "./supabase";

export async function uploadToPublicBucket({ bucket, path, file }) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    console.error("❌ Storage upload error message:", error.message);
    console.error("❌ Storage upload error full:", error);
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
