import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function Navbar() {
  const location = useLocation();

  const items = [
    { path: "/", label: "Inicio", icon: "ri:home-line" },
    { path: "/requests", label: "Solicitudes", icon: "material-symbols:bookmark-outline-rounded",},
    { path: "/search", label: "Buscar", icon: "iconamoon:search" },
    { path: "/profile", label: "Perfil", icon: "iconamoon:profile" },
  ];

  return (
    <nav
      className="
        fixed bottom-4 left-4 right-4
        h-[95px]
        bg-white
        rounded-[3rem]
        flex justify-around items-center
        shadow-[0_8px_20px_rgba(0,0,0,0.18)]
        z-[100]
      "
    >
      {items.map((item) => {
        const active = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center justify-center
              transition-all duration-200
              font-[Poppins] font-semibold
              ${
                active
                  ? "bg-[#A0B8E1] px-5 py-3 rounded-full shadow-md"
                  : "px-3 py-3"
              }
            `}
          >
            <Icon
              icon={item.icon}
              width="30"
              className={active ? "text-[#2A4691]" : "text-black"}
            />

            {active && (
              <span className="ml-2 text-[#2A4691] text-[1rem]">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}