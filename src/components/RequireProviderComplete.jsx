// src/components/RequireProviderComplete.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loading from "./Loading";

export default function RequireProviderComplete({ children }) {
  const { role, profile, profileLoading } = useAuth();

  // ✅ Loader mientras se termina de cargar el profile
  if (profileLoading) return <Loading />;

  if (role !== "provider") return <Navigate to="/" replace />;

  if (!profile?.provider_profile_complete) {
    return <Navigate to="/register/provider/last-step" replace />;
  }

  return children;
}