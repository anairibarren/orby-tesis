// src/pages/client/Categories.jsx
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

const CATEGORIES = [
  { key: "Hogar y reparaciones", label: "Hogar y\nreparaciones", icon: "tools" },
  { key: "Educación y habilidades", label: "Educación y\nhabilidades", icon: "school" },
  { key: "Cuidado y bienestar", label: "Cuidado y\nbienestar", icon: "lotus" },
  { key: "Eventos y entretenimiento", label: "Eventos y\nentretenimiento", icon: "party" },
];

// ✅ mismo estilo de Home, pero al tamaño de Categories (55x55)
function CategoryIcon({ name }) {
  const ICONS = {
    tools: "tabler:settings",
    school: "tabler:school",
    lotus: "lucide-lab:flower-lotus",
    party: "bx:party",
  };

  return (
    <div
      className="h-[55px] w-[55px] rounded-full grid place-items-center shrink-0 select-none"
      style={{ background: "rgba(44,72,148,0.18)" }} // igual Home
    >
      <IconifyIcon
        icon={ICONS[name]}
        className="h-[30px] w-[30px]" // ✅ ajustado para que se vea “proporcional” al 55px
        style={{ color: "#1E2F5D" }}  // igual Home
      />
    </div>
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

      {/* grid */}
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
            {/* ✅ icon estilo Home, tamaño 55 */}
            <div className="mt-[-2px]">
              <CategoryIcon name={c.icon} />
            </div>

            <p className="mt-auto text-[16px] leading-[18px] font-semibold text-[#1E2F5D] whitespace-pre-line mb-2">
              {c.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}