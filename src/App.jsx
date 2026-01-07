import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

// Layouts
import ClientLayout from "./app/layouts/ClientLayout";
import ProviderLayout from "./app/layouts/ProviderLayout";
import AdminLayout from "./app/layouts/AdminLayout";

// Auth pages
import Login from "./pages/auth/Login";
import Welcome from "./pages/auth/Welcome";
import RoleChoice from "./pages/auth/RoleChoice";
import RegisterAccount from "./pages/auth/RegisterAccount";
import ProviderLastStep from "./pages/auth/ProviderLastStep";
import ProviderProfileSetup from "./pages/auth/ProviderProfileSetup";


export default function App() {
  const { loading, user, role } = useAuth();

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={!user ? <Welcome /> : <RoleRedirect role={role} />} />


      <Route path="/register" element={<RoleChoice />} />
      <Route path="/register/account" element={<RegisterAccount />} />
      <Route path="/register/provider/last-step" element={<ProviderLastStep />} />
      <Route path="/register/provider/profile" element={<ProviderProfileSetup />} />

      {/* Client */}
      <Route
        path="/client/*"
        element={
          <RequireAuth user={user} role={role} allow={["client"]}>
            <ClientLayout />
          </RequireAuth>
        }
      />

      {/* Provider */}
      <Route
        path="/provider/*"
        element={
          <RequireAuth user={user} role={role} allow={["provider"]}>
            <ProviderLayout />
          </RequireAuth>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <RequireAuth user={user} role={role} allow={["admin"]}>
            <AdminLayout />
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function RoleRedirect({ role }) {
  if (role === "provider") return <Navigate to="/provider" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/client" replace />; // default client
}

function RequireAuth({ user, role, allow, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}