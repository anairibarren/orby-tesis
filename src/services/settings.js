import { supabase } from "./supabase";

async function ensurePreferencesRow(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: inserted, error: insertErr } = await supabase
      .from("preferences")
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (insertErr) {
      console.error("Error al crear preferences:", insertErr);
      return null;
    }
    return inserted;
  }

  if (error) {
    console.error("Error al leer preferences:", error);
    return null;
  }

  return data;
}

export async function getNotificationPreferences() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return { email: false, push: false };

  const { data: prefs, error } = await supabase
    .from("preferences")
    .select("email_notifications, push_notifications")
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    const created = await ensurePreferencesRow(user.id);
    return {
      email: !!created?.email_notifications,
      push: !!created?.push_notifications,
    };
  }

  if (error) {
    console.error("Error al obtener preferences:", error);
    return { email: false, push: false };
  }

  return {
    email: !!prefs.email_notifications,
    push: !!prefs.push_notifications,
  };
}

export async function updateNotificationPreference(field, value) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return;

  const payload = { user_id: user.id, [field]: value };

  const { error } = await supabase
    .from("preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) console.error("Error al actualizar preferencia:", error);
}

export async function enableAllNotifications() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return;

  const payload = {
    user_id: user.id,
    email_notifications: true,
    push_notifications: true,
  };

  const { error } = await supabase
    .from("preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) console.error("Error al habilitar todas las notificaciones:", error);
}