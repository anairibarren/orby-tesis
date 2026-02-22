// src/pages/auth/RegisterAccount.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";

import { registerUser } from "../../services/auth";
import { supabase } from "../../services/supabase";

const BARRIOS_VL = [
  "Vicente López",
  "Olivos",
  "Florida",
  "La Lucila",
  "Munro",
  "Villa Martelli",
  "Carapachay",
];

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-black/45">{label}</label>

      <div className="mt-2 relative">
        {/* primero el contenido (input / wrapper) */}
        {children}

        {/* luego el icono, arriba de todo */}
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35 z-20">
          <IconifyIcon icon={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function InputBase({ invalid = false, className = "", ...props }) {
  return (
    <input
      {...props}
      className={[
        "w-full h-[46px] rounded-full bg-[#F1F3F5] border border-black/10",
        "pl-12 pr-4 text-[13px] font-semibold text-[#3D3D3D] placeholder:text-black/35",
        "outline-none focus:border-[#1E2F5D] focus:ring-2 focus:ring-[#1E2F5D]/10",
        invalid ? "border-red-300 focus:border-red-400 focus:ring-red-200/60" : "",
        className,
      ].join(" ")}
    />
  );
}

/** Combobox simple */
function BarrioCombo({ value, onChange, disabled, invalid = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const blurT = useRef(null);

  const list = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return BARRIOS_VL;
    return BARRIOS_VL.filter((b) => b.toLowerCase().includes(term));
  }, [q]);

  function pick(b) {
    onChange(b);
    setQ(b);
    setOpen(false);
  }

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
        <IconifyIcon icon="mdi:map-marker-outline" className="h-5 w-5" />
      </span>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(""); // evita barrio viejo si editan texto
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurT.current = setTimeout(() => setOpen(false), 120);
        }}
        placeholder="Elegí tu barrio"
        disabled={disabled}
        className={[
          "w-full h-[46px] rounded-full bg-[#F1F3F5] border border-black/10",
          "pl-12 pr-12 text-[13px] font-semibold text-[#3D3D3D] placeholder:text-black/35",
          "outline-none focus:border-[#1E2F5D] focus:ring-2 focus:ring-[#1E2F5D]/10",
          invalid ? "border-red-300 focus:border-red-400 focus:ring-red-200/60" : "",
        ].join(" ")}
      />

      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center text-black/35"
        aria-label="Abrir barrios"
        title="Abrir barrios"
      >
        <IconifyIcon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} className="h-5 w-5" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-[18px] bg-white border border-black/10 shadow-[0_18px_45px_rgba(0,0,0,0.16)] overflow-hidden">
          <div className="max-h-56 overflow-auto py-1">
            {list.length ? (
              list.map((b) => (
                <button
                  key={b}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (blurT.current) clearTimeout(blurT.current);
                    pick(b);
                  }}
                  className={[
                    "w-full px-4 py-3 text-left text-[13px] font-semibold",
                    "hover:bg-black/[0.03] active:bg-black/[0.06]",
                    value === b ? "text-[#1E2F5D]" : "text-[#3D3D3D]",
                  ].join(" ")}
                >
                  {b}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-[13px] text-black/50">No hay coincidencias.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isValidEmail(v) {
  const s = String(v || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizeRole(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "provider" || s === "prestador") return "provider";
  if (s === "admin") return "admin";
  return "client";
}

export default function RegisterAccount() {
  const nav = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  // ✅ Rol: query OR state OR sessionStorage (si se pierde el query)
  const role = useMemo(() => {
    const qRole = params.get("role");
    const sRole = location.state?.role;
    const memRole = sessionStorage.getItem("orby_signup_role");
    const raw = qRole || sRole || memRole;
    return raw ? normalizeRole(raw) : null;  
  }, [params, location.state]);

  const isProvider = role === "provider";

  // ✅ persistimos el rol para que no se “pierda”
  useEffect(() => {
    if (role) sessionStorage.setItem("orby_signup_role", role);
  }, [role]);

  const [fullName, setFullName] = useState("");
  const [barrio, setBarrio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [invalid, setInvalid] = useState({
    fullName: false,
    email: false,
    password: false,
    barrio: false,
    terms: false,
  });

  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  async function handleSubmit(e) {
    let willRedirect = false;
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!role) {
      setErrorMsg("Elegí si vas a usar orby como prestador o cliente.");
      return nav("/register", { replace: true });
    }

    const nextInvalid = {
      fullName: !fullName.trim(),
      email: !email.trim() || !isValidEmail(email),
      password: !password || String(password).length < 6,
      barrio: !barrio,
      terms: !terms,
    };

    setInvalid(nextInvalid);

    if (nextInvalid.fullName) {
      fullNameRef.current?.focus();
      setErrorMsg("Completá tu nombre.");
      return;
    }
    if (nextInvalid.email) {
      emailRef.current?.focus();
      setErrorMsg(!email.trim() ? "Completá tu email." : "Ingresá un email válido.");
      return;
    }
    if (nextInvalid.password) {
      passwordRef.current?.focus();
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nextInvalid.barrio) {
      setErrorMsg("Elegí tu barrio.");
      return;
    }
    if (nextInvalid.terms) {
      setErrorMsg("Tenés que aceptar los términos y condiciones.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(email.trim(), password, {
        role, // ✅ metadata.role
        full_name: fullName.trim(),
        neighborhood: barrio,
      });

      const session = data?.session || null;
      const uid = data?.user?.id || session?.user?.id || null;

      // Si hay confirmación de email: no hay sesión, no podemos continuar el flow
      if (!session || !uid) {
        setSuccessMsg("Cuenta creada. Te enviamos un correo para confirmar tu email. Luego iniciá sesión.");
        return;
      }

      // ✅ FIX CLAVE: garantizamos que el row de profiles exista + tenga datos
      // (evita el “no se ve nombre/barrio” hasta reloguear)
      const profilePatch = {
        id: uid,
        role,
        full_name: fullName.trim(),
        neighborhood: barrio,
        provider_profile_complete: role === "provider" ? false : true,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from("profiles")
        .upsert(profilePatch, { onConflict: "id" });

      if (upErr) throw upErr;

     setSuccessMsg("Cuenta creada. Redirigiendo...");

    willRedirect = true;
    setRedirecting(true);

    // ✅ decirle al guard cuál es el destino final (evita el flash a /client)
    const target = role === "provider" ? "/register/provider/last-step" : "/client";
    sessionStorage.setItem("orby_post_auth_redirect", target);

    willRedirect = true;
    setRedirecting(true);

    window.location.replace(target);
    return;


    return;

      } catch (err) {
        setErrorMsg(err?.message || "Error al crear la cuenta.");
      } finally {
        if (!willRedirect) setLoading(false);
      }
  }

    return (
    <div className="min-h-screen px-6 bg-[#1E2F5D]">
      {(loading || redirecting) && (
        <div className="fixed inset-0 z-[9999] bg-[#1E2F5D]">
          <div className="min-h-screen grid place-items-center px-6 text-center">
            <div className="w-full max-w-[320px]">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <p className="mt-4 text-white font-extrabold text-[16px]">
                Creando tu cuenta…
              </p>
              <p className="mt-1 text-white/70 text-[12px]">
                Te estamos llevando al siguiente paso
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="min-h-screen"
        style={{
          paddingTop: "max(22px, env(safe-area-inset-top))",
          paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="h-11 w-11 rounded-full bg-white/10 border border-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.22)] grid place-items-center text-white"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-xl leading-none relative -top-[1px]">‹</span>
          </button>

          <div className="mt-5 rounded-[28px] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.18)] p-6">
            <h2 className="text-[22px] font-extrabold text-[#3D3D3D]">
              Crear cuenta
            </h2>

            <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
              Perfil{" "}
              <span className="font-semibold text-[#1E2F5D]">
                {isProvider ? "prestador" : "cliente"}
              </span>{" "}
              · completá tus datos para continuar.
            </p>

            <form
              className="mt-5 grid gap-4"
              onSubmit={handleSubmit}
              noValidate
            >
              <Field label="Nombre completo" icon="mdi:account-outline">
                <InputBase
                  ref={fullNameRef}
                  placeholder="Nombre y apellido"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setInvalid((s) => ({ ...s, fullName: false }));
                  }}
                  disabled={loading}
                  invalid={invalid.fullName}
                />
              </Field>

              <Field label="Email" icon="mdi:email-outline">
                <InputBase
                  ref={emailRef}
                  placeholder="tu@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setInvalid((s) => ({ ...s, email: false }));
                  }}
                  autoComplete="email"
                  disabled={loading}
                  invalid={invalid.email}
                />
              </Field>

              <Field label="Contraseña" icon="mdi:lock-outline">
                {/* wrapper para que el icono izquierdo de Field siga funcionando */}
                <div className="relative">
                  <InputBase
                    ref={passwordRef}
                    placeholder="Mínimo 6 caracteres"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setInvalid((s) => ({ ...s, password: false }));
                    }}
                    autoComplete="new-password"
                    disabled={loading}
                    invalid={invalid.password}
                    className="pr-12"
                  />

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10
                            h-8 w-8 rounded-full grid place-items-center text-black/35
                            hover:text-black/55 active:scale-[0.98] transition"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    title={showPassword ? "Ocultar" : "Mostrar"}
                  >
                    <IconifyIcon
                      icon={
                        showPassword
                          ? "mdi:eye-off-outline"
                          : "mdi:eye-outline"
                      }
                      className="h-5 w-5"
                    />
                  </button>
                </div>
              </Field>

              <div>
                <label className="text-[12px] font-semibold text-black/45">
                  Barrio
                </label>
                <div className="mt-2">
                  <BarrioCombo
                    value={barrio}
                    onChange={(v) => {
                      setBarrio(v);
                      setInvalid((s) => ({ ...s, barrio: false }));
                    }}
                    disabled={loading}
                    invalid={invalid.barrio}
                  />
                </div>
              </div>

              <label className="mt-1 flex items-start gap-3 text-[13px] text-black/60">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => {
                    setTerms(e.target.checked);
                    setInvalid((s) => ({ ...s, terms: false }));
                  }}
                  disabled={loading}
                  className={[
                    "mt-1 h-4 w-4 accent-[#1E2F5D]",
                    invalid.terms ? "outline outline-2 outline-red-200 rounded" : "",
                  ].join(" ")}
                />
                <span>Acepto términos y condiciones</span>
              </label>

              {errorMsg && (
                <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="rounded-2xl bg-green-50 border border-green-200 px-3 py-2 text-[13px] text-green-700">
                  {successMsg}
                </div>
              )}

              <button
                disabled={loading || redirecting}
                className="mt-1 h-12 w-full rounded-full bg-[#1E2F5D] text-white font-semibold shadow-[0_12px_24px_rgba(30,47,93,0.24)] active:scale-[0.99] transition disabled:opacity-60"
                type="submit"
              >
                {loading ? "Creando..." : "Continuar"}
              </button>
            </form>

            <p className="mt-5 text-[13px] text-black/60 text-center">
              ¿Ya tenés cuenta?{" "}
              <Link className="text-[#1E2F5D] font-semibold" to="/login">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}