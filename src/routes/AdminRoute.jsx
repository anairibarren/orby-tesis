import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isAdmin } from "../services/adminAccess";

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}