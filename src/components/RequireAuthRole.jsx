//src/components/RequiereAuthRole.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loading from "../../components/Loading";

function resolveHome(role) {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/client";
}

export default function RequireAuthRole({ allow = ["client", "provider", "admin"], children }) {
  const { loading, user, role, profileLoading } = useAuth();
  const location = useLocation();

  // ✅ Cargando auth
  if (loading) return <Loading />;

  // ✅ No logueada
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // ✅ CLAVE: logueada pero todavía no sabemos rol/profile -> NO navegar a /client
  if (profileLoading || !role) return <Loading />;

  // ✅ Si no tiene permitido este rol, mandarla a su home
  if (!allow.includes(role)) return <Navigate to={resolveHome(role)} replace />;

  return children;
}