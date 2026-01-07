import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import { FiHome, FiBookmark, FiSearch, FiUser } from "react-icons/fi";
import { PiCalendarBlank } from "react-icons/pi";

const NAV_W = 367;
const NAV_H = 73;

const ACTIVE_BG = "bg-[rgba(160,184,225,0.44)]";
const ACTIVE_COLOR = "text-[#2A4691]";

function TabItem({ to, label, Icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center justify-center",
          "h-[45px]",
          "px-4",
          "rounded-full",
          "transition-all duration-200",
          isActive ? `${ACTIVE_BG} ${ACTIVE_COLOR}` : "text-black/80 hover:text-black",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <div className="flex items-center gap-2">
          <Icon size={23} />
          {isActive && <span className="text-sm font-medium">{label}</span>}
        </div>
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
      ? { to: `${base}/agenda`, label: "Agenda", Icon: PiCalendarBlank }
      : { to: `${base}/search`, label: "Buscar", Icon: FiSearch };

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="rounded-full bg-white shadow-md" style={{ width: NAV_W, height: NAV_H }}>
        <div className="flex h-full items-center justify-between px-4">
          <TabItem to={`${base}`} label="Inicio" Icon={FiHome} end />
          <TabItem to={`${base}/requests`} label="Solicitudes" Icon={FiBookmark} />
          <TabItem to={third.to} label={third.label} Icon={third.Icon} />
          <TabItem to={`${base}/profile`} label="Perfil" Icon={FiUser} />
        </div>
      </div>
    </nav>
  );
}