// src/pages/client/CategoryServices.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listCatalogServices } from "../../services/services";
import { Icon as IconifyIcon } from "@iconify/react";

function normalize(str = "") {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getServiceIcon(name = "", category = "") {
  const n = normalize(name);
  const c = normalize(category);

  if (n.includes("alban")) return "mdi:hammer";
  if (n.includes("carpinter")) return "mdi:tools";
  if (n.includes("electric")) return "mdi:lightning-bolt";
  if (n.includes("gas") || n.includes("calef")) return "mdi:fire";
  if (n.includes("jardin")) return "mdi:flower";
  if (n.includes("limpieza")) return "mdi:spray-bottle";
  if (n.includes("pintura") || n.includes("pintor")) return "mdi:format-paint";

  if (n.includes("masaj")) return "mdi:hand-heart";
  if (n.includes("adultos") || n.includes("mayores") || n.includes("cuidado")) return "mdi:account-heart";
  if (n.includes("entrenamiento") || n.includes("personal")) return "mdi:dumbbell";
  if (n.includes("paseador") || n.includes("mascota") || n.includes("perro")) return "mdi:dog-service";

  if (c.includes("educacion") || c.includes("habilidades")) {
    if (n.includes("ingles") || n.includes("italiano")) return "mdi:translate";
    if (n.includes("apoyo")) return "mdi:book-open-page-variant";
    if (n.includes("guit")) return "mdi:guitar-acoustic";
    if (n.includes("piano")) return "mdi:piano";
  }

  if (c.includes("eventos") || c.includes("entretenimiento")) {
    if (n.includes("dj")) return "mdi:music";
    if (n.includes("fot")) return "mdi:camera";
    if (n.includes("catering")) return "mdi:food";
  }

  return "mdi:briefcase-outline";
}

function RowIcon({ icon }) {
  return (
    <span
      className="h-[44px] w-[44px] rounded-full grid place-items-center"
      style={{ background: "rgba(44,72,148,0.18)" }} // mismo fondo que categorías
    >
      <IconifyIcon icon={icon} className="h-[22px] w-[22px]" style={{ color: "#1E2F5D" }} />
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className="w-full rounded-[22px] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-[44px] w-[44px] rounded-full bg-black/10" />
        <div className="h-4 w-40 rounded bg-black/10" />
      </div>
      <div className="h-4 w-4 rounded bg-black/10" />
    </div>
  );
}

export default function CategoryServices() {
  const nav = useNavigate();
  const { category } = useParams();

  const decodedCategory = useMemo(() => decodeURIComponent(category || ""), [category]);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);

        const data = await listCatalogServices();
        const filtered = (data || []).filter((s) => s.category === decodedCategory);

        if (alive) setItems(filtered);
      } catch (e) {
        if (alive) setErr(e?.message || "Error cargando servicios");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [decodedCategory]);

  function goBack() {
    if (window.history.length > 1) nav(-1);
    else nav("/client", { replace: true, state: { disableHomeShared: true } });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-6 pt-[40px] pb-6">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={goBack}
          className="absolute left-0 h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center"
          aria-label="Volver"
          title="Volver"
        >
          <span className="text-xl leading-none">‹</span>
        </button>


        <h1 className="text-[18px] font-semibold text-[#3D3D3D]">{decodedCategory}</h1>
      </div>

      {err && <p className="mt-6 text-sm text-red-600">{err}</p>}

      <div className="mt-6 grid gap-4">
        {loading && Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}

        {!loading &&
          !err &&
          items.map((s) => {
            const icon = getServiceIcon(s?.name, decodedCategory);

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => nav(`/client/services/catalog/${encodeURIComponent(s.id)}`)}
                className="w-full rounded-[22px] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-4">
                  <RowIcon icon={icon} />
                  <p className="text-[15px] font-medium text-[#3D3D3D]">{s.name}</p>
                </div>

                <IconifyIcon icon="mdi:chevron-right" className="h-7 w-7 text-black/25" />
              </button>
            );
          })}

        {!loading && !err && items.length === 0 && (
          <p className="text-sm text-black/50">Todavía no hay servicios cargados en esta categoría.</p>
        )}
      </div>
    </div>
  );
}
