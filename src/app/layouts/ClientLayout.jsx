import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "../../components/BottomNav";

// Placeholders (crealos aunque sea vacíos)
import ClientHome from "../../pages/client/Home";
import ClientSearch from "../../pages/client/Search";
import ClientRequests from "../../pages/client/Requests";
import ClientProfile from "../../pages/client/Profile";

export default function ClientLayout() {
  return (
    <div className="min-h-screen pb-24">
      <Routes>
        <Route index element={<ClientHome />} />
        <Route path="search" element={<ClientSearch />} />
        <Route path="requests" element={<ClientRequests />} />
        <Route path="profile" element={<ClientProfile />} />
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>

      <BottomNav />
    </div>
  );
}