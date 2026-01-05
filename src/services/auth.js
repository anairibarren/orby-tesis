import { supabase } from "./supabase";

/**
 * LOGIN
 */
export async function loginUser(email, password) {
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error en login:", error.message);
    throw error;
  }

  return data;
}

/**
 * REGISTER
 */
export async function registerUser(dataFromStep) {
  try {
    let registerData = dataFromStep;

    if (!registerData) {
      const raw = localStorage.getItem("register_data");
      if (!raw) return { error: "Faltan datos del registro" };
      registerData = JSON.parse(raw);
    }

    const { nombre, apellido, email, password } = registerData;

    // 1. Signup en supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido } 
      }
    });

    if (error) return { error: error.message };

    // 2. Login automático
    await supabase.auth.signInWithPassword({ email, password });

    return { success: true };

  } catch (err) {
    return { error: err.message };
  }
}



/**
 * LOGIN CON GOOGLE
 */
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`, // redirige al inicio
    },
  });

  if (error) {
    console.error("Error en login con Google:", error.message);
    throw error;
  }

  return data;
}


/**
 * LOGOUT
 */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error al cerrar sesión:", error.message);
    throw error;
  }

  return true;
}