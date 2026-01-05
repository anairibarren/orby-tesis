import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import NotificationPopup from "../../components/NotificationPopup";
import { 
  getNotificationPreferences, 
  enableAllNotifications,
  updateNotificationPreference 
} from "../../services/settings";

export default function Settings() {
  const navigate = useNavigate();

  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getNotificationPreferences();
      setEmailNotifications(prefs.email);
      setPushNotifications(prefs.push);
    };
    loadPreferences();
  }, []);

  const handlePreferenceChange = async (field, value) => {
    await updateNotificationPreference(field, value);
    if (field === "email_notifications") setEmailNotifications(value);
    if (field === "push_notifications") setPushNotifications(value);
  };

  const handleDeleteConfirm = () => {
    setShowDeletePopup(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32">

      <header className="flex items-center gap-6 px-8 pt-10 pb-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md"
        >
          <Icon icon="ep:arrow-left-bold" width="22" />
        </button>

        <h1 className="flex-1 text-2xl font-semibold text-center text-black mr-[3rem]">
          Configuración
        </h1>
      </header>

      <main className="px-6 space-y-8">
        
        <h2 className="text-xl font-semibold text-black">
          Notificaciones
        </h2>

        <section className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between py-2">
            <p className="text-md text-black">
              Notificaciones por correo
            </p>

            <button
              onClick={() =>
                handlePreferenceChange(
                  "email_notifications",
                  !emailNotifications
                )
              }
              className={`w-12 h-6 rounded-full relative transition-all ${
                emailNotifications ? "bg-[#2A4691]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${
                  emailNotifications ? "translate-x-6" : ""
                }`}
              ></span>
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <p className="text-md text-black">
              Notificaciones push
            </p>

            <button
              onClick={() =>
                handlePreferenceChange(
                  "push_notifications",
                  !pushNotifications
                )
              }
              className={`w-12 h-6 rounded-full relative transition-all ${
                pushNotifications ? "bg-[#2A4691]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${
                  pushNotifications ? "translate-x-6" : ""
                }`}
              ></span>
            </button>
          </div>
        </section>
        
        <h2 className="text-xl font-semibold text-black mb-6">
          Privacidad y seguridad
        </h2>

        <section className="bg-white rounded-2xl shadow-md p-4">
          <div
            onClick={() => navigate("/privacy-policy")}
            className="flex items-center justify-between py-3 cursor-pointer group"
          >
            <p className="text-md text-black">
              Política de privacidad
            </p>
            <Icon icon="ep:arrow-right-bold" className="text-[#818181]" />
          </div>

          <div
            onClick={() => navigate("/terms")}
            className="flex items-center justify-between py-3 cursor-pointer group"
          >
            <p className="text-md text-black">
              Términos y condiciones
            </p>
            <Icon icon="ep:arrow-right-bold" className="text-[#818181]" />
          </div>

          <div
            onClick={() => navigate("/data-usage")}
            className="flex items-center justify-between py-3 cursor-pointer group"
          >
            <p className="text-md text-black">
              Uso de datos personales
            </p>
            <Icon icon="ep:arrow-right-bold" className="text-[#818181]" />
          </div>

          <div
            onClick={() => setShowDeletePopup(true)}
            className="flex items-center justify-between py-3 cursor-pointer group"
          >
            <p className="text-md text-black">
              Eliminar cuenta
            </p>
            <Icon icon="ep:arrow-right-bold" className="text-[#818181]" />
          </div>
        </section>

        <h2 className="text-xl font-bold text-black mb-6">
          Cuenta
        </h2>

        <section className="bg-white rounded-2xl shadow-md p-4">
          <div
            onClick={() => navigate("/auth")}
            className="flex items-center justify-between py-2 cursor-pointer group"
          >
            <p className="text-md text-black">
              Cambiar tipo de cuenta
            </p>
            <Icon icon="ep:arrow-right-bold" className="text-[#818181]" />
          </div>
        </section>

      </main>

      <Navbar />

      {showDeletePopup && (
        <NotificationPopup
          title="Eliminar cuenta"
          text="¿Estás seguro de que querés eliminar tu cuenta? Esta acción no se puede deshacer."
          buttonText="Eliminar"
          onAction={handleDeleteConfirm}
          onClose={() => setShowDeletePopup(false)}
        />
      )}
    </div>
  );
}
