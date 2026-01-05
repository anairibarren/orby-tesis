import { useAuthContext } from "../context/AuthContext";

export function useAuth() {
  const context = useAuthContext();

  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }

  return context;
}