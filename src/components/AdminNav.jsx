import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isAdmin } from "../services/adminAccess";
import { Icon as IconifyIcon } from "@iconify/react";
import { FiBookmark, FiStar, FiBarChart2 } from "react-icons/fi";
import { LayoutGroup, motion } from "framer-motion";

const NAV_W = 367;
const NAV_H = 73;

const ACTIVE_BG = "rgba(44,72,148,0.18)";
const ACTIVE_COLOR = "#1E2F5D";

const ICON_SIZE = 23;

/* ===== HOME ICON ===== */
const HomeIcon = ({ size = ICON_SIZE }) => (
  <IconifyIcon icon="ri:home-line" width={size} height={size} />
);

/* ===== TAB ITEM ===== */
function TabItem({ to, label, Icon, end = false }) {
  const location = useLocation();

  /* 🔥 Esto hace que Inicio quede activo al iniciar sesión */
  const isHome = to === "/admin/dashboard";
  const forceActive =
    isHome &&
    (location.pathname === "/admin" ||
      location.pathname === "/admin/" ||
      location.pathname === "/admin/dashboard");

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "relative overflow-hidden",
          "flex items-center justify-center",
          "h-[45px]",
          "px-4",
          "rounded-full",
          isActive || forceActive ? "text-[#1E2F5D]" : "text-black/80",
        ].join(" ")
      }
    >
      {({ isActive }) => {
        const active = isActive || forceActive;

        return (
          <>
            {/* Pill animado */}
            {active && (
              <motion.span
                layoutId="admin-nav-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: ACTIVE_BG }}
                transition={{ type: "spring", stiffness: 520, damping: 36 }}
              />
            )}

            {/* Contenido */}
            <div className="relative z-10 flex items-center gap-2">
              <span style={{ color: active ? ACTIVE_COLOR : "currentColor" }}>
                <Icon size={ICON_SIZE} />
              </span>

              {active && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.16 }}
                  className="text-sm font-medium"
                >
                  {label}
                </motion.span>
              )}
            </div>
          </>
        );
      }}
    </NavLink>
  );
}

/* ===== NAVBAR ===== */
export default function AdminNav() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin(user)) return null;

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className="rounded-full bg-white shadow-md"
        style={{ width: NAV_W, height: NAV_H }}
      >
        <LayoutGroup>
          <div className="flex h-full items-center justify-between px-4">
            <TabItem
              to="/admin/dashboard"
              label="Inicio"
              Icon={HomeIcon}
              end
            />

            <TabItem
              to="/admin/bookings"
              label="Solicitudes"
              Icon={FiBookmark}
            />

            <TabItem
              to="/admin/reviews"
              label="Reseñas"
              Icon={FiStar}
            />

            <TabItem
              to="/admin/metrics"
              label="Métricas"
              Icon={FiBarChart2}
            />
          </div>
        </LayoutGroup>
      </div>
    </nav>
  );
}