//src/components/RequireGuest.jsx
import { useMemo } from "react";
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

  // ✅ PRIORIDAD: si venimos de signup/login, respetar destino y evitar flash a /client
  const forced = sessionStorage.getItem("orby_post_auth_redirect");
  if (forced) {
    sessionStorage.removeItem("orby_post_auth_redirect");
    return <Navigate to={forced} replace />;
  }

  if (user && !role) {
    return <Navigate to="/register" replace state={{ from: location.pathname }} />;
  }

  if (user && role) {
    return <Navigate to={resolveHome(role)} replace />;
  }

  return children;
}
