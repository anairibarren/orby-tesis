import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabase";
import { getUserProfile } from "../services/users";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Función para traer datos actualizados
  const getData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userAuth = authData?.user;
    if (!userAuth) return;

    setUser(userAuth);

    const { data: profileData, error } = await getUserProfile(userAuth.id);
    if (error) {
      console.error("Error al obtener perfil:", error.message);
      return;
    }

    if (profileData) setProfile(profileData);
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getData();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.log("Error al cerrar sesión:", error.message);
    else navigate("/welcome", { replace: true });
  };

  const handleShare = async () => {
    const shareData = {
      title: "Orby App",
      text: "¡Descubrí orby! Reservá servicios profesionales cerca tuyo en segundos.",
      url: "https://orby.app",
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log(err);
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert("El enlace fue copiado al portapapeles");
    }
  };

  const getValidAvatar = () => {
    if (!profile?.avatar_url) {
      return "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    }

    try {
      new URL(profile.avatar_url);
      return profile.avatar_url;
    } catch (error) {
      return "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 mt-4">
        <button
          onClick={() => navigate("/home")}
          className="bg-white border rounded-full w-10 h-10 flex items-center justify-center shadow-md"
        >
          <Icon icon="ep:arrow-left-bold" width="20" />
        </button>

        <h1 className="text-2xl font-bold text-center flex-1">
          Mi perfil
        </h1>

        <div className="w-10 h-10" />
      </header>

      <section className="bg-white rounded-2xl shadow-md flex items-center justify-between p-4 mx-6 mt-4">
        <div className="flex items-center gap-4">
          <img
            src={getValidAvatar()}
            alt="Avatar"
            className="w-[80px] h-[80px] rounded-full object-cover"
          />

          <div>
            <h2 className="text-2xl font-semibold text-left">
              {profile?.nombre || "Sin nombre"}
            </h2>
            <p className="text-black text-left">
              {user?.email || "Sin email"}
            </p>
          </div>
        </div>

        <button
          className="bg-[#2A4691] text-white w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-md"
          onClick={() => navigate("/edit-profile")}
        >
          <Icon
            icon="material-symbols:edit-outline-rounded"
            width="24"
          />
        </button>
      </section>

      <h2 className="text-lg font-semibold px-6 mt-6 mb-2">
        Cuenta
      </h2>

      <section className="bg-white rounded-2xl shadow-md flex flex-col gap-2 px-4 py-4 mx-6">
        <button
          className="flex items-center justify-between w-full p-3 rounded-xl"
          onClick={() => navigate("/history")}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-[#F7F7F7] p-3 rounded-full">
              <Icon icon="fa7-solid:history" width="24" />
            </div>
            <div>
              <span className="font-medium block">
                Historial de servicios
              </span>
              <span className="text-gray-500 text-sm">
                Tus pedidos anteriores.
              </span>
            </div>
          </div>

          <Icon
            icon="ep:arrow-right-bold"
            width="20"
            className="text-gray-400"
          />
        </button>

        <button
          className="flex items-center justify-between w-full p-3 rounded-xl"
          onClick={() => navigate("/favorites")}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-[#F7F7F7] p-3 rounded-full">
              <Icon icon="iconamoon:heart" width="24" />
            </div>
            <div>
              <span className="font-medium block">Favoritos</span>
              <span className="text-gray-500 text-sm">
                Prestadores guardados.
              </span>
            </div>
          </div>

          <Icon
            icon="ep:arrow-right-bold"
            width="20"
            className="text-gray-400"
          />
        </button>
      </section>

      <h2 className="text-lg font-semibold px-6 mt-6 mb-2">
        General
      </h2>

      <section className="bg-white rounded-2xl shadow-md flex flex-col gap-2 px-4 py-4 mx-6">
        <button
          className="flex items-center justify-between w-full p-3 rounded-xl"
          onClick={() => navigate("/settings")}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-[#F7F7F7] p-3 rounded-full">
              <Icon icon="icon-park-outline:config" width="24" />
            </div>
            <div>
              <span className="font-medium block">
                Configuración
              </span>
              <span className="text-gray-500 text-sm">
                Ajustes de tu cuenta.
              </span>
            </div>
          </div>

          <Icon
            icon="ep:arrow-right-bold"
            width="20"
            className="text-gray-400"
          />
        </button>

        <button
          className="flex items-center justify-between w-full p-3 rounded-xl"
          onClick={() => navigate("/payment-methods")}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-[#F7F7F7] p-3 rounded-full">
              <Icon icon="ic:round-payment" width="24" />
            </div>
            <div>
              <span className="font-medium block">
                Métodos de pago
              </span>
              <span className="text-gray-500 text-sm">
                Elegí tus formas de pago.
              </span>
            </div>
          </div>

          <Icon
            icon="ep:arrow-right-bold"
            width="20"
            className="text-gray-400"
          />
        </button>

        <button
          className="flex items-center justify-between w-full p-3 rounded-xl"
          onClick={() => navigate("/help")}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-[#F7F7F7] p-3 rounded-full">
              <Icon
                icon="material-symbols:help-outline"
                width="24"
              />
            </div>
            <div>
              <span className="font-medium block">
                Centro de ayuda
              </span>
              <span className="text-gray-500 text-sm">
                Soporte y consultas.
              </span>
            </div>
          </div>

          <Icon
            icon="ep:arrow-right-bold"
            width="20"
            className="text-gray-400"
          />
        </button>

        <button
          className="flex items-center justify-between w-full p-3 rounded-xl"
          onClick={handleShare}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="bg-[#F7F7F7] p-3 rounded-full">
              <Icon icon="mingcute:invite-line" width="24" />
            </div>
            <div>
              <span className="font-medium block">
                Invitar a un amigo
              </span>
              <span className="text-gray-500 text-sm">
                Compartí la app.
              </span>
            </div>
          </div>

          <Icon
            icon="ep:arrow-right-bold"
            width="20"
            className="text-gray-400"
          />
        </button>
      </section>

      <section className="bg-white rounded-2xl shadow-md px-4 py-4 mx-6 mt-6 mb-[10rem]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3"
        >
          <div className="flex items-center justify-center">
            <Icon
              icon="ci:log-out"
              width="26"
              className="text-[#2A4691]"
            />
          </div>
          <span className="text-[#2A4691] font-medium text-lg text-left">
            Cerrar sesión
          </span>
        </button>
      </section>

      <Navbar />
    </div>
  );
}