// src/components/BodyTheme.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function BodyTheme() {
  const { pathname } = useLocation();

  useEffect(() => {
    // ✅ rutas que deben tener “status bar” azul
    const isAuth =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/auth");

    const isHome =
      pathname === "/client" ||
      pathname === "/provider";

    const shouldBeBlue = isAuth || isHome;

    document.body.classList.toggle("bg-orby", shouldBeBlue);

    return () => {
      // por si desmonta
      document.body.classList.remove("bg-orby");
    };
  }, [pathname]);

  return null;
}