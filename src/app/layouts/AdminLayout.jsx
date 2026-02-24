import { Outlet } from "react-router-dom";
import AdminNav from "../../components/AdminNav";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] px-5 pt-8 pb-32">
      <Outlet />
      <AdminNav />
    </div>
  );
}