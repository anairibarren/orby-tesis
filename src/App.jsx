// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

// components
import Loading from "./components/Loading";
import OfflineOverlay from "./components/OfflineOverlay";
import SplashScreen from "./components/SplashScreen";

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

// ✅ Forgot / Reset password
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Detail pages
import ProviderRequestDetail from "./pages/provider/RequestDetail";
import ClientRequestDetail from "./pages/client/RequestDetail";

// Client pages
import ProvidersByService from "./pages/client/ProvidersByService";
import ProviderProfile from "./pages/client/ProviderProfile";
import Favorites from "./pages/client/Favorites";

// ✅ Flow (request → schedule → success)
import ClientRequestForm from "./pages/client/RequestForm";
import ClientSchedule from "./pages/client/Schedule";
import ClientRequestSuccess from "./pages/client/RequestSuccess";

// ✅ Notificaciones
import ClientNotifications from "./pages/client/Notifications";
import ProviderNotifications from "./pages/provider/Notifications";

export default function App() {
  const { loading, user, role, profileLoading } = useAuth();

    const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const stillLoading = loading || (user && profileLoading);

    if (stillLoading) {
      setShowSplash(true);
      return;
    }

    // ✅ anti “flash”: que la splash se vea mínimo 650ms
    const t = setTimeout(() => setShowSplash(false), 650);
    return () => clearTimeout(t);
  }, [loading, profileLoading, user]);

  if (showSplash) return <SplashScreen />;

  return (
    <>
      <OfflineOverlay />
    <Routes>
      {/* Home */}
      <Route
        path="/"
        element={
          !user ? (
            <Welcome />
          ) : !role ? (
            <Navigate to="/register" replace />
          ) : (
            <RoleRedirect role={role} />
          )
        }
      />

      {/* Auth */}
      <Route
        path="/login"
        element={
          <RequireGuest user={user} role={role}>
            <Login />
          </RequireGuest>
        }
      />
      <Route path="/register" element={<RoleChoice />} />
      <Route
        path="/register/account"
        element={
          <RequireGuest user={user} role={role}>
            <RegisterAccount />
          </RequireGuest>
        }
      />
      

      {/* ✅ Forgot / Reset password */}
      <Route
        path="/forgot-password"
        element={
          <RequireGuest user={user} role={role}>
            <ForgotPassword />
          </RequireGuest>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RequireGuest user={user} role={role}>
            <ResetPassword />
          </RequireGuest>
        }
      />

      <Route
        path="/register/provider/last-step"
        element={
          <RequireAuth user={user}>
            <ProviderLastStep />
          </RequireAuth>
        }
      />

      <Route
        path="/register/provider/profile"
        element={
          <RequireAuth user={user} role={role} allow={["provider"]} requireRole>
            <ProviderProfileSetup />
          </RequireAuth>
        }
      />

      {/* Details */}
      <Route
        path="/provider/requests/:requestId"
        element={
          <RequireAuth user={user} role={role} allow={["provider"]} requireRole>
            <ProviderRequestDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/client/requests/:requestId"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ClientRequestDetail />
          </RequireAuth>
        }
      />

      {/* ✅ FLOW */}
      <Route
        path="/client/services/:id/request"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ClientRequestForm />
          </RequireAuth>
        }
      />
      <Route
        path="/client/services/:id/schedule"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ClientSchedule />
          </RequireAuth>
        }
      />
      <Route
        path="/client/services/:id/success"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ClientRequestSuccess />
          </RequireAuth>
        }
      />

      {/* Providers list + profile */}
      <Route
        path="/client/services/catalog/:catalogId/providers"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ProvidersByService />
          </RequireAuth>
        }
      />

      {/* ✅ rutas alias */}
      <Route
        path="/client/provider/:providerServiceId"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ProviderProfile />
          </RequireAuth>
        }
      />
      <Route
        path="/client/providers/:providerServiceId"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ProviderProfile />
          </RequireAuth>
        }
      />
      <Route
        path="/client/provider-service/:providerServiceId"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ProviderProfile />
          </RequireAuth>
        }
      />

      {/* Favorites */}
      <Route
        path="/client/favorites"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <Favorites />
          </RequireAuth>
        }
      />

      {/* Layout routes */}
      <Route
        path="/client/*"
        element={
          <RequireAuth user={user} role={role} allow={["client"]} requireRole>
            <ClientLayout />
          </RequireAuth>
        }
      />
      <Route
        path="/provider/*"
        element={
          <RequireAuth user={user} role={role} allow={["provider"]} requireRole>
            <ProviderLayout />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAuth user={user} role={role} allow={["admin"]} requireRole>
            <AdminLayout />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

function RoleRedirect({ role }) {
  if (role === "provider") return <Navigate to="/provider" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/client" replace />;
}

function RequireGuest({ user, role, children }) {
  const location = useLocation();

  // ✅ Si venís del registro, NO redirigir automáticamente.
  if (location.state?.fromRegisterFlow) return children;

  if (user && !role) return <Navigate to="/register" replace />;
  if (user && role) return <RoleRedirect role={role} />;
  return children;
}

function RequireAuth({ user, role, allow, children, requireRole = false }) {
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (requireRole && !role) return <Navigate to="/register" replace />;
  if (role && !allow.includes(role)) return <Navigate to="/" replace />;

  return children;
}