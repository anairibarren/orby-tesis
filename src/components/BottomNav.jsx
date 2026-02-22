import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Icon as IconifyIcon } from "@iconify/react";
import { LayoutGroup, motion } from "framer-motion";

const NAV_W = 367;
const NAV_H = 73;

const ACTIVE_BG = "rgba(44,72,148,0.18)"; // #2C4894 baja opacidad
const ACTIVE_COLOR = "#1E2F5D";           // #1E2F5D

const ICON_SIZE = 23;

/* ✅ Iconify icons */
const HomeIcon = ({ size = ICON_SIZE }) => (
  <IconifyIcon icon="ri:home-line" width={size} height={size} />
);

const BookmarkIcon = ({ size = ICON_SIZE }) => (
  <IconifyIcon icon="material-symbols:bookmark-outline-rounded" width={size} height={size} />
);

const SearchIcon = ({ size = ICON_SIZE }) => (
  <IconifyIcon icon="iconamoon:search" width={size} height={size} />
);

const UserIcon = ({ size = ICON_SIZE }) => (
  <IconifyIcon icon="material-symbols:person-outline-rounded" width={size} height={size} />
);

const CalendarIcon = ({ size = ICON_SIZE }) => (
  <IconifyIcon icon="material-symbols:calendar-today-outline-rounded" width={size} height={size} />
);

function TabItem({ to, label, Icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "relative overflow-hidden", // ✅ necesario para el pill
          "flex items-center justify-center",
          "h-[45px]",
          "px-4",
          "rounded-full",
          // ✅ sin hover
          isActive ? "text-[#1E2F5D]" : "text-black/80",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {/* ✅ pill animado (shared layout) */}
          {isActive && (
            <motion.span
              layoutId="orby-nav-pill"
              className="absolute inset-0 rounded-full"
              style={{ background: ACTIVE_BG }}
              transition={{ type: "spring", stiffness: 520, damping: 36 }}
            />
          )}

          {/* contenido arriba del pill */}
          <div className="relative z-10 flex items-center gap-2">
            <span style={{ color: isActive ? ACTIVE_COLOR : "currentColor" }}>
              <Icon size={ICON_SIZE} />
            </span>

            {isActive && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.16 }}
                className="text-sm font-medium"
              >
                {label}
              </motion.span>
            )}
          </div>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const { role } = useAuth();
  if (role === "admin") return null;

  const base = role === "provider" ? "/provider" : "/client";
  const third =
    role === "provider"
      ? { to: `${base}/agenda`, label: "Agenda", Icon: CalendarIcon }
      : { to: `${base}/search`, label: "Buscar", Icon: SearchIcon };

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="rounded-full bg-white shadow-md" style={{ width: NAV_W, height: NAV_H }}>
        <LayoutGroup>
          <div className="flex h-full items-center justify-between px-4">
            <TabItem to={`${base}`} label="Inicio" Icon={HomeIcon} end />
            <TabItem to={`${base}/requests`} label="Solicitudes" Icon={BookmarkIcon} />
            <TabItem to={third.to} label={third.label} Icon={third.Icon} />
            <TabItem to={`${base}/profile`} label="Perfil" Icon={UserIcon} />
          </div>
        </LayoutGroup>
      </div>
    </nav>
  );
}