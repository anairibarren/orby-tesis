import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "../../components/BottomNav";

import ClientHome from "../../pages/client/Home";
import ClientSearch from "../../pages/client/Search";
import ClientRequests from "../../pages/client/Requests";
import ClientProfile from "../../pages/client/Profile";

import ClientRequestForm from "../../pages/client/RequestForm";
import ClientSchedule from "../../pages/client/Schedule";
import ClientRequestSuccess from "../../pages/client/RequestSuccess";

import ClientChat from "../../pages/client/Chat";

import ClientCategoryServices from "../../pages/client/CategoryServices";
import ProvidersByService from "../../pages/client/ProvidersByService";
import ProviderProfile from "../../pages/client/ProviderProfile";
import ClientNotifications from "../../pages/client/Notifications";
import ClientCategories from "../../pages/client/Categories";
import ClientFavorites from "../../pages/client/Favorites";
import ClientHistory from "../../pages/client/History";
import ClientHelp from "../../pages/client/Help";
import ClientLegal from "../../pages/client/Legal";

function ServiceToRequestRedirect() {
  const { id } = useParams();
  return <Navigate to={`/client/services/${id}/request`} replace />;
}

export default function ClientLayout() {
  const location = useLocation();

  const hideBottomNav = /\/client\/requests\/[^/]+\/chat$/.test(location.pathname);

  // ✅ Excepción: Home client (ruta exacta /client)
  const isHome = location.pathname === "/client" || location.pathname === "/client/";

  return (
  <div
    className="min-h-[100dvh] bg-[#F5F5F5]"
    style={{
      // ✅ Home maneja su propio top (para que el header arranque arriba sin franja)
      paddingTop: isHome ? 0 : "env(safe-area-inset-top)",

      paddingBottom: hideBottomNav
        ? "env(safe-area-inset-bottom)"
        : "calc(env(safe-area-inset-bottom) + 96px)",
    }}
  >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Routes location={location}>
            <Route index element={<ClientHome />} />
            <Route path="search" element={<ClientSearch />} />
            <Route path="requests" element={<ClientRequests />} />
            <Route path="profile" element={<ClientProfile />} />

            <Route path="favorites" element={<ClientFavorites />} />
            <Route path="history" element={<ClientHistory />} />
            <Route path="help" element={<ClientHelp />} />
            <Route path="legal" element={<ClientLegal />} />
            <Route path="notifications" element={<ClientNotifications />} />

            <Route path="categories" element={<ClientCategories />} />
            <Route path="categories/:category" element={<ClientCategoryServices />} />

            <Route path="services/catalog/:catalogId" element={<ProvidersByService />} />
            <Route path="provider/:providerServiceId" element={<ProviderProfile />} />

            <Route path="services/:id/request" element={<ClientRequestForm />} />
            <Route path="services/:id/schedule" element={<ClientSchedule />} />
            <Route path="services/:id/success" element={<ClientRequestSuccess />} />
            <Route path="services/:id" element={<ServiceToRequestRedirect />} />

            <Route path="requests/:requestId/chat" element={<ClientChat />} />

            <Route path="*" element={<Navigate to="/client" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}