// src/app/layouts/ClientLayout.jsx
import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import BottomNav from "../../components/BottomNav";
import { AnimatePresence } from "framer-motion";

import ClientHome from "../../pages/client/Home";
import ClientSearch from "../../pages/client/Search";
import ClientRequests from "../../pages/client/Requests";
import ClientProfile from "../../pages/client/Profile";

import ClientRequestForm from "../../pages/client/RequestForm";
import ClientSchedule from "../../pages/client/Schedule";
import ClientRequestSuccess from "../../pages/client/RequestSuccess";

// ✅ Listado por categoría
import ClientCategoryServices from "../../pages/client/CategoryServices";

// ✅ NUEVO: listado de prestadores por servicio (catálogo)
import ProvidersByService from "../../pages/client/ProvidersByService";

// ✅ NUEVO: perfil público del prestador
import ProviderProfile from "../../pages/client/ProviderProfile";

// ✅ NUEVO: Notificaciones cliente
import ClientNotifications from "../../pages/client/Notifications";

// ✅ NUEVO: Pantalla categorías (NO redirect)
import ClientCategories from "../../pages/client/Categories";

function ServiceToRequestRedirect() {
  const { id } = useParams();
  return <Navigate to={`/client/services/${id}/request`} replace />;
}

export default function ClientLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen pb-24 bg-[#F5F5F5] overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route index element={<ClientHome />} />
          <Route path="search" element={<ClientSearch />} />
          <Route path="requests" element={<ClientRequests />} />
          <Route path="profile" element={<ClientProfile />} />

          {/* ✅ Notificaciones */}
          <Route path="notifications" element={<ClientNotifications />} />

          {/* ✅ Categorías */}
          <Route path="categories" element={<ClientCategories />} />
          <Route path="categories/:category" element={<ClientCategoryServices />} />

          {/* ✅ Prestadores por servicio (desde catálogo) */}
          <Route path="services/catalog/:catalogId" element={<ProvidersByService />} />

          {/* ✅ Perfil del prestador (visible por cliente) */}
          <Route path="provider/:providerServiceId" element={<ProviderProfile />} />

          {/* ✅ Flujo solicitud */}
          <Route path="services/:id/request" element={<ClientRequestForm />} />
          <Route path="services/:id/schedule" element={<ClientSchedule />} />
          <Route path="services/:id/success" element={<ClientRequestSuccess />} />

          {/* ✅ Si alguien cae a /client/services/:id */}
          <Route path="services/:id" element={<ServiceToRequestRedirect />} />

          <Route path="*" element={<Navigate to="/client" replace />} />
        </Routes>
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}