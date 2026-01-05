import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { 
  loginUser, 
  registerUser, 
  logoutUser,
  loginWithGoogle
} from "../services/auth";

const AuthContext = createContext();

// PROVIDER GLOBAL
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión inicial
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Escuchar cambios en la sesión
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Métodos publicados
  const login = async ({ email, password }) => {
    return await loginUser(email, password);
  };

  const loginGoogle = async () => {
    return await loginWithGoogle(); 
  };

  const register = async ({ email, password }) => {
    return await registerUser(email, password);
  };

  const logout = async () => {
    return await logoutUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        loginGoogle, 
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}