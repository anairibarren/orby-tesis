// src/components/SplashScreen.jsx
import logo from "../assets/img/logo-claro.png";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[999999] bg-[#1E2F5D] grid place-items-center">
      <img
        src={logo}
        alt="orby"
        className="w-[200px] h-auto"
        draggable="false"
      />
    </div>
  );
}