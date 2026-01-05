export default function QuoteForm({ service, onClose }) {
  return (
    <div className="p-6 bg-white rounded-2xl">
      <h2 className="font-semibold text-lg mb-4">
        Solicitar cotización – {service.name}
      </h2>

      <p className="text-gray-500 mb-6">
        Completá el formulario y el prestador se contactará con vos.
      </p>

      {/* campos dinámicos según service */}

      <button onClick={onClose}>Cerrar</button>
    </div>
  );
}