//src/app/layouts/ProviderLayout.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "../../components/BottomNav";

import ProviderHome from "../../pages/provider/Home";
import ProviderRequests from "../../pages/provider/Requests";
import ProviderAgenda from "../../pages/provider/Agenda";
import ProviderProfile from "../../pages/provider/Profile";

import ServiceForm from "../../pages/provider/ServiceForm";
import RequireProviderComplete from "../../components/RequireProviderComplete";
import ProviderAvailability from "../../pages/provider/Availability";

// ✅ NUEVO
import ProviderNotifications from "../../pages/provider/Notifications";

export default function ProviderLayout() {
  return (
    <div className="min-h-screen pb-24">
      <Routes>
        <Route index element={<ProviderHome />} />
        <Route path="requests" element={<ProviderRequests />} />
        <Route path="agenda" element={<ProviderAgenda />} />
        <Route path="profile" element={<ProviderProfile />} />

        {/* ✅ NUEVO */}
        <Route path="notifications" element={<ProviderNotifications />} />

        {/* ✅ Disponibilidad (antes del wildcard) */}
        <Route path="availability" element={<ProviderAvailability />} />

        <Route
          path="services/new"
          element={
            <RequireProviderComplete>
              <ServiceForm />
            </RequireProviderComplete>
          }
        />

        <Route
          path="services/:id/edit"
          element={
            <RequireProviderComplete>
              <ServiceForm />
            </RequireProviderComplete>
          }
        />

        {/* Wildcard siempre al final */}
        <Route path="*" element={<Navigate to="/provider" replace />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
