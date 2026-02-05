export default function Modal({
  open,
  title = "Confirmar",
  description = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-label="Cerrar"
      />

      {/* card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1E2F5D]">{title}</h3>

        {description && (
          <p className="mt-2 text-sm text-black/70">{description}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-black/10 py-2 text-sm font-medium disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-[#1E2F5D] py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
