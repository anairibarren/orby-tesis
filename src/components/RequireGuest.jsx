import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function resolveHome(role) {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/client";
}

export default function RequireGuest({ children }) {
  const { loading, user, role, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || (user && profileLoading)) return null;

  // Si hay user pero todavía no hay role, mandamos a elegir rol
  if (user && !role) {
    return <Navigate to="/register" replace state={{ from: location.pathname }} />;
  }

  // Si está logueada y ya tiene role, afuera de login/register
  if (user && role) {
    return <Navigate to={resolveHome(role)} replace />;
  }

  return children;
}
