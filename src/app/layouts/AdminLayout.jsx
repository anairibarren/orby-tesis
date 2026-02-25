import { Outlet } from "react-router-dom";
import AdminNav from "../../components/AdminNav";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] px-5 pt-[calc(32px+env(safe-area-inset-top))] pb-[calc(128px+env(safe-area-inset-bottom))]">
      <Outlet />
      <AdminNav />
    </div>
  );
}