import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RequireProviderComplete({ children }) {
  const { role, profile, profileLoading } = useAuth();

  if (profileLoading) return <div className="p-6">Cargando…</div>;

  if (role !== "provider") return <Navigate to="/" replace />;

  if (!profile?.provider_profile_complete) {
    return <Navigate to="/register/provider/last-step" replace />;
  }

  return children;
}
