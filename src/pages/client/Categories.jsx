// src/pages/client/Categories.jsx
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { key: "Hogar y reparaciones", label: "Hogar y\nreparaciones", icon: "tools" }, // icono1
  { key: "Educación y habilidades", label: "Educación y\nhabilidades", icon: "school" }, // icono2
  { key: "Cuidado y bienestar", label: "Cuidado y\nbienestar", icon: "lotus" }, // icono3
  { key: "Eventos y entretenimiento", label: "Eventos y\nentretenimiento", icon: "party" }, // icono4
];

function Icon({ name }) {
  const ICONS = {
    tools: new URL("../../assets/img/icono1.png", import.meta.url).href,
    school: new URL("../../assets/img/icono2.png", import.meta.url).href,
    lotus: new URL("../../assets/img/icono3.png", import.meta.url).href,
    party: new URL("../../assets/img/icono4.png", import.meta.url).href,
  };

  return (
    <img
      src={ICONS[name]}
      alt=""
      className="h-[55px] w-[55px] object-contain shrink-0 select-none"
      draggable="false"
    />
  );
}

export default function Categories() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-6 pt-[40px] pb-6">
      {/* Top bar */}
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-sm grid place-items-center"
          aria-label="Volver"
        >
          <span className="text-xl leading-none">‹</span>
        </button>

        <h1 className="text-xl font-semibold text-[#3D3D3D]">Categorías</h1>
      </div>

      {/* ✅ gap 12px como Figma */}
      <div className="mt-10 grid grid-cols-2 gap-[16px]">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => nav(`/client/categories/${encodeURIComponent(c.key)}`)}
            className="
              w-full h-[168px]
              rounded-2xl bg-white
              shadow-[0_4px_12px_rgba(0,0,0,0.06)]
              px-5 pt-4 pb-4 text-left
              flex flex-col
            "
          >
            {/* icon */}
            <div className="h-[40px] w-[40px] mt-[-2px]">
              <Icon name={c.icon} />
            </div>

            {/* texto 16px */}
            <p className="mt-auto text-[16px] leading-[18px] font-semibold text-[#1E2F5D] whitespace-pre-line mb-2">
              {c.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
