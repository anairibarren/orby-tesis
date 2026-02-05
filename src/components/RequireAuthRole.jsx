import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function resolveHome(role) {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/client";
}

export default function RequireAuthRole({ allow = ["client", "provider", "admin"], children }) {
  const { loading, user, role, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) return null;

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Logueada pero sin role definido (caso Google) -> RoleChoice
  if (!role) return <Navigate to="/register" replace />;

  // Si no tiene permitido este rol, mandarla a su home
  if (!allow.includes(role)) return <Navigate to={resolveHome(role)} replace />;

  return children;
}
