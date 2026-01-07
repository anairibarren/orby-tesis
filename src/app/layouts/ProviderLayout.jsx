import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "../../components/BottomNav";

import ProviderHome from "../../pages/provider/Home";
import ProviderRequests from "../../pages/provider/Requests";
import ProviderAgenda from "../../pages/provider/Agenda";
import ProviderProfile from "../../pages/provider/Profile";

import ServiceForm from "../../pages/provider/ServiceForm";
import RequireProviderComplete from "../../components/RequireProviderComplete";

export default function ProviderLayout() {
  return (
    <div className="min-h-screen pb-24">
      <Routes>
        <Route index element={<ProviderHome />} />
        <Route path="requests" element={<ProviderRequests />} />
        <Route path="agenda" element={<ProviderAgenda />} />
        <Route path="profile" element={<ProviderProfile />} />

        {/* No puede publicar hasta completar perfil*/}
        <Route
          path="services/new"
          element={
            <RequireProviderComplete>
              <ServiceForm />
            </RequireProviderComplete>
          }
        />

        <Route path="*" element={<Navigate to="/provider" replace />} />
      </Routes>

      <BottomNav />
    </div>
  );
}