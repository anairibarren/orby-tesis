import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import Navbar from "../components/Navbar";
import NotificationModal from "../components/NotificationModal";
import SearchBar from "../components/SearchBar";
import banner1 from "../assets/img/banner1.jpg";
import banner2 from "../assets/img/banner2.jpg";
import banner3 from "../assets/img/banner3.jpg";
import {
  getNotificationPreferences,
  enableAllNotifications,
} from "../services/settings";

const Home = () => {
  const navigate = useNavigate();

  /* Estados */
  const [user, setUser] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotif1, setShowNotif1] = useState(false);
  const [showNotif2, setShowNotif2] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [banner1, banner2, banner3];

  /* Rtación de banners */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /* Notificaciones */
  useEffect(() => {
    const getUserAndData = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;

      setUser(data.user);

      // Verifica si tiene métodos de pago
      const { data: methods } = await supabase
        .from("payment_methods")
        .select("id")
        .eq("user_id", data.user.id);

      setShowNotif1(!methods || methods.length === 0);
      setLoadingPayments(false);

      // Preferencias de notificación
      const prefs = await getNotificationPreferences();
      setShowNotif2(prefs && (prefs.email === false || prefs.push === false));
      setLoadingPrefs(false);
    };

    getUserAndData();
  }, []);

  /* Bienvenido personalizado */
  const genero = user?.user_metadata?.genero;
  const saludo =
    genero === "masculino"
      ? "¡Bienvenido!"
      : genero === "femenino"
      ? "¡Bienvenida!"
      : "¡Bienvenido!";

  /* Categorías */
  const categories = [
    { id: 1, name: "Hogar y reparaciones", icon: "ep:tools" },
    { id: 2, name: "Educación y habilidades", icon: "tabler:school" },
    { id: 3, name: "Cuidado y bienestar", icon: "lucide-lab:flower-lotus" },
    { id: 4, name: "Eventos y entretenimiento", icon: "bx:party" },
  ];

  /* Servicios Populares (mock) */
  const popularServices = [
    {
      id: 1,
      title: "Plomería a domicilio",
      rating: 4.8,
      reviews: 124,
      price: "$8.000 – $15.000",
      provider: "Juan Pérez",
    },
    {
      id: 2,
      title: "Clases de inglés",
      rating: 4.9,
      reviews: 98,
      price: "$5.000 – $9.000",
      provider: "Laura Gómez",
    },
  ];

  return (
    <div className="bg-[#F5F5F5] font-[Poppins] min-h-screen">
      {searchFocused ? (
        <SearchBar onBack={() => setSearchFocused(false)} />
      ) : (
        <>
          <header className="px-6 pt-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-[#1E2F5D]">
                  {saludo}
                </h1>
                <p className="text-sm font-light text-[#3D3D3D]">
                  Te damos la bienvenida a Orby
                </p>
              </div>

              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow">
                <Icon
                  icon="fa7-regular:bell"
                  className="text-[#2A4691]"
                  width="24"
                />
              </div>
            </div>

            <div
              className="mt-6 bg-white rounded-full px-5 py-3 flex items-center gap-3 shadow"
              onClick={() => setSearchFocused(true)}
            >
              <Icon icon="jam:search" className="text-[#AAAAAA]" />
              <span className="text-[#AAAAAA] font-light">
                Buscar servicio o prestador
              </span>
            </div>
          </header>

          <section className="mt-10">
            <div className="px-6 flex justify-between items-center mb-4">
              <h2 className="font-bold text-[#1E2F5D] text-[1.4rem]">
                Explorá por categorías
              </h2>

              <span
                onClick={() => navigate("/categories")}
                className="text-sm text-[#AAAAAA] flex items-center gap-1 cursor-pointer"
              >
                Ver más
                <Icon icon="ep:arrow-right-bold" />
              </span>
            </div>

            <div className="flex gap-4 px-6 overflow-x-auto no-scrollbar snap-x ml-5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/category/${cat.id}`)}
                  className="min-w-[160px] bg-white rounded-2xl p-4 snap-start"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D5E0F2] flex items-center justify-center mb-6">
                    <Icon icon={cat.icon} className="text-[#2A4691]" width="24" />
                  </div>
                  <p className="text-[#1E2F5D] font-medium text-md">
                    {cat.name}
                  </p>
                </div>
              ))}
            </div>
          </section>


          <section className="mt-12 px-6 mb-24">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[#1E2F5D] text-[1.5rem]">
                Servicios populares
              </h2>

              <button
                onClick={() => navigate("/services/popular")}
                className="text-sm text-[#AAAAAA] flex items-center gap-1"
              >
                Ver más
                <Icon icon="ep:arrow-right-bold" />
              </button>
            </div>

            <div className="grid gap-4">
              {popularServices.map((service) => (
                <div key={service.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center gap-1">
                    <Icon
                      icon="material-symbols:star-rounded"
                      className="text-yellow-400"
                    />
                    <span className="font-bold text-[#AAAAAA]">
                      {service.rating}
                    </span>
                    <span className="text-md text-[#AAAAAA]">
                      ({service.reviews})
                    </span>
                  </div>

                  <h3 className="font-medium mt-2 text-[1.2rem]">
                    {service.title}
                  </h3>

                  <p className="font-light text-md mt-1">
                    {service.price}
                  </p>

                  <hr className="my-3 border-[#E2E2E2]" />

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#D0D0D0] rounded-full" />
                    <span className="font-medium text-md">
                      {service.provider}
                    </span>
                    <Icon
                      icon="material-symbols:verified-rounded"
                      className="text-[#2A4691]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Navbar active="home" />
        </>
      )}
    </div>
  );
};

export default Home;