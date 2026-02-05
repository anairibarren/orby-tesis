import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { FiCheckCircle, FiAlertCircle, FiXCircle } from "react-icons/fi";

const ToastContext = createContext(null);

const ICONS = {
  success: { Icon: FiCheckCircle, iconClass: "text-[#22C55E]" }, // verde
  warning: { Icon: FiAlertCircle, iconClass: "text-[#FACC15]" }, // amarillo
  error: { Icon: FiXCircle, iconClass: "text-[#EF4444]" }, // rojo
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * API:
 * toast.success("Título", "Subtítulo opcional")
 * toast.warning("Título", "Subtítulo opcional")
 * toast.error("Título", "Subtítulo opcional")
 * toast.show({ type, title, message, duration })
 *
 * ✅ Cambio: toast "singleton" (no se apilan).
 * - Si disparás varias veces, se reemplaza el toast anterior.
 * - También se limpia el timeout anterior para que no desaparezca “de golpe” por un timer viejo.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const timersRef = useRef(new Map()); // id -> timeoutId
  const clearTimer = useCallback((id) => {
    const t = timersRef.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    for (const [, t] of timersRef.current.entries()) window.clearTimeout(t);
    timersRef.current.clear();
  }, []);

  const remove = useCallback(
    (id) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer]
  );

  const show = useCallback(
    ({ type = "success", title = "", message = "", duration = 2600 } = {}) => {
      const id = uid();
      const toast = { id, type, title, message, duration };

      // ✅ Singleton: cerramos el/los anteriores y limpiamos sus timeouts
      setToasts((prev) => {
        prev.forEach((t) => clearTimer(t.id));
        return [toast];
      });

      if (duration && duration > 0) {
        const timeoutId = window.setTimeout(() => remove(id), duration);
        timersRef.current.set(id, timeoutId);
      }

      return id;
    },
    [remove, clearTimer]
  );

  const api = useMemo(
    () => ({
      show,
      success: (title, message = "", duration) =>
        show({ type: "success", title, message, duration }),
      warning: (title, message = "", duration) =>
        show({ type: "warning", title, message, duration }),
      error: (title, message = "", duration) =>
        show({ type: "error", title, message, duration }),
      remove,
      clear: () => {
        clearAllTimers();
        setToasts([]);
      },
    }),
    [show, remove, clearAllTimers]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Container */}
      <div className="fixed top-6 left-1/2 z-[9999] w-full max-w-md -translate-x-1/2 px-4">
        <div className="flex flex-col gap-4">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}

function ToastItem({ toast, onClose }) {
  const { type, title, message } = toast;
  const conf = ICONS[type] || ICONS.success;
  const Icon = conf.Icon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#2B2B2B] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-3 top-3 text-white/40 hover:text-white/70"
      >
        ✕
      </button>

      <div className="flex items-start gap-3 px-5 py-4">
        <Icon className={`mt-[2px] h-5 w-5 ${conf.iconClass}`} />

        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">{title}</p>
          {message ? <p className="mt-1 text-[12px] text-white/55">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}