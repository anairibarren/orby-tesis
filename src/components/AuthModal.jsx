import React, { useState } from "react";
import { supabase } from "../services/supabase";

export default function AuthModal({ type, onClose }) {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (type === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) setError(error.message);
      else window.location.href = "/home"; // redirige a Home
    } else {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name } },
      });
      if (error) setError(error.message);
      else window.location.href = "/complete-profile"; // paso siguiente
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 className="auth-title">
          {type === "login" ? "Bienvenido de nuevo a Orby" : "¡Crea tu cuenta!"}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {type === "register" && (
            <input
              type="text"
              name="name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="auth-btn">
            {type === "login" ? "Ingresar" : "Registrarme"}
          </button>
        </form>
      </div>
    </div>
  );
}