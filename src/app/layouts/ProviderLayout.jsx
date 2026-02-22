// src/app/layouts/ProviderLayout.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomNav from "../../components/BottomNav";

import ProviderHome from "../../pages/provider/Home";
import ProviderRequests from "../../pages/provider/Requests";
import ProviderAgenda from "../../pages/provider/Agenda";
import ProviderProfile from "../../pages/provider/Profile";

import ServiceForm from "../../pages/provider/ServiceForm";
import RequireProviderComplete from "../../components/RequireProviderComplete";
import ProviderAvailability from "../../pages/provider/Availability";

import ProviderNotifications from "../../pages/provider/Notifications";
import ProviderHistory from "../../pages/provider/History";
import ProviderReviews from "../../pages/provider/Reviews";
import ProviderLegal from "../../pages/provider/Legal";

import ProviderChat from "../../pages/provider/Chat";

export default function ProviderLayout() {
  const location = useLocation();

  // ✅ si estás en /provider/requests/:id/chat => NO nav + NO padding bottom
  const hideBottomNav = /\/provider\/requests\/[^/]+\/chat$/.test(location.pathname);

  return (
    <div className={hideBottomNav ? "min-h-screen" : "min-h-screen pb-24"}>
      <Routes>
        <Route index element={<ProviderHome />} />
        <Route path="requests" element={<ProviderRequests />} />
        <Route path="agenda" element={<ProviderAgenda />} />
        <Route path="profile" element={<ProviderProfile />} />

        <Route path="notifications" element={<ProviderNotifications />} />
        <Route path="availability" element={<ProviderAvailability />} />

        <Route path="history" element={<ProviderHistory />} />
        <Route path="reviews" element={<ProviderReviews />} />
        <Route path="legal" element={<ProviderLegal />} />

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

        {/* ✅ Chat provider */}
        <Route path="requests/:requestId/chat" element={<ProviderChat />} />

        <Route path="*" element={<Navigate to="/provider" replace />} />
      </Routes>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}