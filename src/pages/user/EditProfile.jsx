import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import { getUserProfile, updateUserProfile, uploadAvatar } from "../../services/users";

export default function EditProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    nacimiento: "",
    genero: "",
    barrio: "",
    direccion: "",
    password: "",
  });

  // Cargar datos del usuario
  useEffect(() => {
    const loadUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userAuth = authData?.user;

      if (!userAuth) return;

      setUser(userAuth);

      const { data: userProfile, error } = await getUserProfile(userAuth.id);

      if (error) {
        console.error("Error obteniendo perfil:", error);
        return;
      }

      if (userProfile) {
        // ⚡ Mapeo fecha_nacimiento → nacimiento
        setFormData({
          nombre: userProfile.nombre || "",
          telefono: userProfile.telefono || "",
          nacimiento: userProfile.fecha_nacimiento || "",
          genero: userProfile.genero || "",
          barrio: userProfile.barrio || "",
          direccion: userProfile.direccion || "",
          password: "",
        });

        setAvatarUrl(
          userProfile.avatar_url ||
            "https://cdn-icons-png.flaticon.com/512/847/847969.png"
        );
      }
    };

    loadUser();
  }, []);

  // Manejo de inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Subida de avatar
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const { url, error } = await uploadAvatar(user.id, file);

    if (error) {
      console.error(error);
      setMessage({ text: "Error al subir la imagen", type: "error" });
      return;
    }

    const { error: updateError } = await updateUserProfile(user.id, {
      avatar_url: url,
    });

    if (updateError) {
      console.error(updateError);
      setMessage({ text: "Error al guardar imagen", type: "error" });
      return;
    }

    setAvatarUrl(url);
    setMessage({ text: "Foto actualizada", type: "success" });
  };

  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const dataToUpdate = {
      nombre: formData.nombre,
      telefono: formData.telefono,
      fecha_nacimiento: formData.nacimiento,
      genero: formData.genero,
      barrio: formData.barrio,
      direccion: formData.direccion,
    };

    const { error } = await updateUserProfile(user.id, dataToUpdate);

    if (error) {
      console.error(error);
      setMessage({ text: "Error al actualizar perfil", type: "error" });
      return;
    }

    if (formData.password.trim() !== "") {
      const { error: passError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (passError) {
        console.error(passError);
        setMessage({ text: "Error al cambiar la contraseña", type: "error" });
        return;
      }
    }

    setMessage({ text: "Perfil actualizado correctamente", type: "success" });

    setTimeout(() => {
      navigate("/profile");
    }, 1500);
  };


  return (
    <div className="min-h-screen bg-gray-50 px-5 py-8">
      {message.text && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-lg
            ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }
          `}
        >
          {message.text}
        </div>
      )}

      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full border shadow-sm flex items-center justify-center bg-white"
        >
          <Icon icon="ep:arrow-left-bold" className="text-xl text-black" />
        </button>

        <h1 className="text-2xl ml-[3rem] font-semibold text-black">
          Editar perfil
        </h1>
      </header>

      <section className="text-center mb-8">
        <div className="relative inline-block">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-28 h-28 rounded-full object-cover border"
          />

          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <button
            type="button"
            onClick={() =>
              document.getElementById("avatar-upload").click()
            }
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#2A4691] text-white flex items-center justify-center shadow-lg"
          >
            <Icon icon="tabler:plus" className="text-lg" />
          </button>
        </div>

        <p className="text-[#808080] text-xs mt-2">Cambiar foto de perfil</p>
      </section>

      <div className="bg-white shadow-md rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <div>
            <label className="text-black text-md font-medium">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
            />
          </div>

          <div>
            <label className="text-black text-md font-medium">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
            />
          </div>

          <div>
            <label className="text-black text-md font-medium">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#777777]"
              >
                <Icon
                  icon={showPassword ? "mdi:eye-off" : "mdi:eye"}
                  className="text-xl"
                />
              </button>
            </div>
          </div>

          <div>
            <label className="text-black text-md font-medium">Teléfono</label>
            <div className="flex items-center gap-2">
              <span className="px-4 py-3 rounded-full bg-[#F7F7F7] text-gray-500 text-sm">
                +54
              </span>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Tu número"
                className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
              />
            </div>
          </div>

          <div>
            <label className="text-black text-md font-medium">Fecha de nacimiento</label>
            <input
              type="date"
              name="nacimiento"
              value={formData.nacimiento}
              onChange={handleChange}
              className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
            />
          </div>

          <div>
            <label className="text-black text-md font-medium">Género</label>
            <select
              name="genero"
              value={formData.genero}
              onChange={handleChange}
              className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
            >
              <option value="">Seleccionar…</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="No binario">No binario</option>
              <option value="Prefiero no decirlo">Prefiero no decirlo</option>
            </select>
          </div>

          <div>
            <label className="text-black text-md font-medium">Barrio</label>
            <input
              type="text"
              name="barrio"
              value={formData.barrio}
              onChange={handleChange}
              placeholder="Tu barrio"
              className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
            />
          </div>

          <div>
            <label className="text-black text-md font-medium">Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Tu dirección"
              className="w-full mt-1 px-4 py-3 rounded-full bg-[#F7F7F7] text-[#777777] text-sm focus:outline-[#2A4691]"
            />
          </div>

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-1 px-4 py-3 rounded-full bg-[#C1C9DF] text-[#2A4691] text-md"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="mt-1 px-4 py-3 rounded-full bg-[#2A4691] text-white text-md"
            >
              Guardar cambios
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}