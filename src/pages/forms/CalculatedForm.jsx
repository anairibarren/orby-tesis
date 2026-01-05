export default function CalculatedForm({ service, onClose }) {
  return (
    <div className="p-6 bg-white rounded-2xl">
      <h2 className="font-semibold text-lg mb-4">
        Presupuesto automático – {service.name}
      </h2>

      {/* inputs que calculan el precio */}

      <button onClick={onClose}>Cerrar</button>
    </div>
  );
}