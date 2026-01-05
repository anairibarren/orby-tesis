import React from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";

const Categories = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 1, name: "Hogar y reparaciones", icon: "ep:tools" },
    { id: 2, name: "Educación y habilidades", icon: "tabler:school" },
    { id: 3, name: "Cuidado y bienestar", icon: "lucide-lab:flower-lotus" },
    { id: 4, name: "Eventos y entretenimiento", icon: "bx:party" },
  ];

  return (
    <div className="bg-[#F5F5F5] min-h-screen font-[Poppins]">

      <header className="px-6 pt-6 pb-4 relative">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
        >
          <Icon
            icon="ep:arrow-left-bold"
            className="text-[#3D3D3D]"
            width="20"
          />
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 top-7 text-2xl font-semibold text-[#1E2F5D]">
          Categorías
        </h1>
      </header>

      <section className="px-6 mt-6 grid grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => navigate(`/category/${cat.id}`)}
            className="bg-white rounded-2xl p-4 shadow-sm active:scale-95 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#D5E0F2] flex items-center justify-center mb-6">
              <Icon
                icon={cat.icon}
                className="text-[#2A4691]"
                width="28"
              />
            </div>

            <p className="text-[#1E2F5D] font-semibold text-md">
              {cat.name}
            </p>
          </div>
        ))}
      </section>

      <Navbar />
    </div>
  );
};

export default Categories;