import { Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "../../pages/admin/Dashboard";

export default function AdminLayout() {
  return (
    <div className="min-h-screen p-4">
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}