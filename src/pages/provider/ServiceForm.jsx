// src/pages/provider/ServiceForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../../hooks/useAuth";
import { createProviderService, listCatalogServices } from "../../services/services";

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Chip({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function FieldLabel({ children }) {
  return <p className="text-[12px] font-semibold text-black/45">{children}</p>;
}

function FieldButton({ label, value, placeholder, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "mt-2 w-full h-12 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.04)]",
        "px-4 flex items-center justify-between gap-3 text-left",
        "active:scale-[0.99] transition",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[#3D3D3D] truncate">
          {value || placeholder}
        </span>
        {label ? (
          <span className="block text-[11px] text-black/40 truncate">{label}</span>
        ) : null}
      </span>

      <IconifyIcon icon="mdi:chevron-down" className="h-6 w-6 text-black/35 shrink-0" />
    </button>
  );
}

/** Bottom sheet selector (estilado, mobile-friendly) */
function SelectSheet({ open, title, subtitle, options, selectedValue, onClose, onSelect }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="absolute inset-x-0 bottom-0 p-4 pb-6">
            <motion.div
              className="mx-auto w-full max-w-lg rounded-[28px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden"
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.9 }}
              role="dialog"
              aria-modal="true"
            >
              <div className="h-1.5 w-12 bg-black/10 rounded-full mx-auto mt-3" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">{title}</h3>
                    {subtitle ? <p className="mt-1 text-[12px] text-black/45">{subtitle}</p> : null}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
                  </button>
                </div>

                <div className="mt-4 grid gap-2 max-h-[55vh] overflow-y-auto pr-1">
                  {options.map((opt) => {
                    const active = String(opt.value) === String(selectedValue);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSelect(opt.value)}
                        className={[
                          "w-full rounded-[18px] border px-4 py-3 text-left transition active:scale-[0.99]",
                          active ? "border-[#1E2F5D]/25 bg-[#EAF2FF]" : "border-black/10 bg-white",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[#3D3D3D] truncate">
                              {opt.label}
                            </p>
                            {opt.sub ? (
                              <p className="mt-1 text-[12px] text-black/45 truncate">{opt.sub}</p>
                            ) : null}
                          </div>

                          {active ? (
                            <IconifyIcon
                              icon="mdi:check-decagram"
                              className="h-5 w-5 text-[#4368C5] shrink-0 mt-[2px]"
                            />
                          ) : (
                            <span className="h-5 w-5 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Sheet especial para "Servicio" con buscador + chip Fijo/Cotización */
function ServiceSelectSheet({
  open,
  title,
  subtitle,
  options,
  selectedValue,
  onClose,
  onSelect,
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;

    return options.filter((o) => {
      const hay = `${o?.name || ""} ${o?.category || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q, options]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <div className="absolute inset-x-0 bottom-0 p-4 pb-6">
            <motion.div
              className="mx-auto w-full max-w-lg rounded-[28px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden"
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.9 }}
              role="dialog"
              aria-modal="true"
            >
              <div className="h-1.5 w-12 bg-black/10 rounded-full mx-auto mt-3" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-extrabold text-[#3D3D3D]">{title}</h3>
                    {subtitle ? (
                      <p className="mt-1 text-[12px] text-black/45">{subtitle}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 w-10 rounded-full bg-black/[0.04] grid place-items-center active:scale-[0.98] transition"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <IconifyIcon icon="mdi:close" className="h-6 w-6 text-black/40" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-12 w-full rounded-full bg-black/[0.04] px-4 flex items-center gap-2">
                    <IconifyIcon icon="mdi:magnify" className="h-5 w-5 text-black/35 shrink-0" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por nombre o categoría…"
                      className="w-full bg-transparent outline-none text-[14px] font-medium text-[#3D3D3D] placeholder:text-black/35"
                      inputMode="search"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-2 max-h-[52vh] overflow-y-auto pr-1">
                  {filtered.map((o) => {
                    const active = String(o.id) === String(selectedValue);
                    const isFixed = o.pricing_type === "A";

                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => onSelect(o.id)}
                        className={[
                          "w-full rounded-[18px] border px-4 py-3 text-left transition active:scale-[0.99]",
                          active ? "border-[#1E2F5D]/25 bg-[#F7FAFF]" : "border-black/10 bg-white",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">
                              {o.name}
                            </p>
                            <p className="mt-1 text-[12px] text-black/45 truncate">{o.category}</p>
                          </div>

                          <span className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold bg-black/[0.04] text-black/60">
                            {isFixed ? "Fijo" : "Cotización"}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="rounded-[18px] border border-black/10 bg-white p-4">
                      <p className="text-[14px] font-semibold text-[#3D3D3D]">Sin resultados</p>
                      <p className="mt-1 text-[12px] text-black/45">
                        Probá con otro nombre o categoría.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function fmtMoneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("es-AR")}`;
}

/** ✅ Mensajes amigables para Supabase/Postgres */
function friendlyErrorMessage(e) {
  const raw = String(e?.message || e || "").toLowerCase();

  // Único por (provider_id, catalog_id) -> "provider_catalog_unique"
  if (raw.includes("provider_catalog_unique") || raw.includes("duplicate key value")) {
    return "Ya publicaste este servicio. Elegí otro del catálogo o editá el que ya tenés publicado.";
  }

  // fallback
  return e?.message || "No se pudo publicar el servicio.";
}

export default function ServiceForm() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [catalog, setCatalog] = useState([]);
  const [catalogId, setCatalogId] = useState("");

  const [basePrice, setBasePrice] = useState("");
  const [durationMin, setDurationMin] = useState("60");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [durationSheetOpen, setDurationSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listCatalogServices();
        if (alive) setCatalog(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr("No se pudo cargar el catálogo.");
      }
    })();
    return () => (alive = false);
  }, []);

  const selected = useMemo(
    () => catalog.find((c) => String(c.id) === String(catalogId)) || null,
    [catalog, catalogId]
  );

  const pricingType = selected?.pricing_type; // A | B
  const isFixed = pricingType === "A";

  const serviceValueText = useMemo(() => {
    if (!selected) return "";
    return `${selected.name} — ${selected.category} — ${isFixed ? "Fijo" : "Cotización"}`;
  }, [selected, isFixed]);

  const durationOptions = useMemo(
    () => [
      { value: "30", label: "30 min" },
      { value: "45", label: "45 min" },
      { value: "60", label: "60 min" },
      { value: "90", label: "90 min" },
      { value: "120", label: "120 min" },
    ],
    []
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!user?.id) return setErr("No hay usuario logueado.");
    if (!catalogId) return setErr("Elegí un servicio del catálogo.");

    if (isFixed) {
      const n = Number(basePrice);
      if (!Number.isFinite(n) || n <= 0) return setErr("Poné un precio base válido.");
    }

    const d = Number(durationMin);
    if (![30, 45, 60, 90, 120].includes(d)) return setErr("Duración inválida.");

    setLoading(true);
    try {
      await createProviderService({
        provider_id: user.id,
        catalog_id: catalogId,
        base_price: isFixed ? Number(basePrice) : null,
        duration_minutes: d,
        is_active: true,
      });

      nav("/provider", { replace: true });
    } catch (e2) {
      setErr(friendlyErrorMessage(e2)); // ✅ acá
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[40px] pb-32">
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Publicar servicio</h1>
        </div>

        <p className="mt-4 text-[13px] text-black/55">
          La duración (y el precio si aplica) se pueden editar después.
        </p>

        {/* Resumen */}
        <CardShell className="mt-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] font-semibold text-black/40">Resumen</p>

            <div className="flex items-center gap-2 -mt-[2px]">
              <Chip className="bg-[#EAF2FF] text-[#1E2F5D]">
                {pricingType ? (isFixed ? "Precio fijo" : "Cotización") : "—"}
              </Chip>
              <Chip className="bg-black/[0.04] text-black/55">{durationMin} min</Chip>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-[15px] font-extrabold text-[#3D3D3D] truncate">
              {selected?.name || "Elegí un servicio"}
            </p>
            <p className="mt-1 text-[12px] text-black/45 truncate">
              {selected?.category || "—"}
            </p>
          </div>

          {isFixed && (
            <div className="mt-3 rounded-[18px] bg-[#F5F5F5] p-4">
              <p className="text-[12px] font-semibold text-black/45">Precio base</p>
              <p className="mt-1 text-[14px] font-extrabold text-[#2A4691]">
                {basePrice ? fmtMoneyARS(basePrice) : "—"}
              </p>
            </div>
          )}
        </CardShell>

        {/* Form */}
        <CardShell className="mt-4 p-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="min-w-0">
              <FieldLabel>Servicio</FieldLabel>
              <FieldButton
                value={serviceValueText}
                placeholder="Elegí…"
                onClick={() => setServiceSheetOpen(true)}
                disabled={loading}
              />
            </div>

            <div className="min-w-0">
              <FieldLabel>Duración</FieldLabel>
              <FieldButton
                value={`${durationMin} min`}
                placeholder="Elegí…"
                onClick={() => setDurationSheetOpen(true)}
                disabled={loading}
              />
            </div>

            {isFixed && (
              <div className="min-w-0">
                <FieldLabel>Precio base</FieldLabel>

                <div className="mt-2 h-12 w-full rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.04)] px-4 flex items-center gap-2">
                  <span className="text-[14px] font-extrabold text-[#2A4691]">$</span>
                  <input
                    className="w-full bg-transparent outline-none text-[14px] font-semibold text-[#3D3D3D] placeholder:text-black/35"
                    type="number"
                    min="1"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="Ej: 12000"
                    disabled={loading}
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}

            {/* ✅ Aviso gris + estilo consistente */}
            {err && (
              <div className="rounded-[18px] bg-black/[0.04] border border-black/10 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="h-9 w-9 rounded-full bg-white border border-black/10 grid place-items-center shrink-0">
                    <IconifyIcon icon="mdi:information-outline" className="h-5 w-5 text-black/45" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#3D3D3D]">No se pudo publicar</p>
                    <p className="mt-1 text-[12px] text-black/55">{err}</p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardShell>
      </div>

      {/* CTA fijo */}
      <div className="fixed inset-x-0 bottom-[110px] z-[40] px-6">
        <button
          disabled={loading}
          className="w-full h-[54px] rounded-full bg-[#1E2F5D] text-white text-[14px] font-semibold shadow-[0_14px_30px_rgba(30,47,93,0.28)] active:scale-[0.99] transition disabled:opacity-60"
          type="button"
          onClick={(e) => {
            const form = e.currentTarget?.closest("body")?.querySelector("form");
            if (form) form.requestSubmit();
          }}
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </div>

      {/* Servicio sheet */}
      <ServiceSelectSheet
        open={serviceSheetOpen}
        title="Elegí un servicio"
        subtitle="Del catálogo de orby"
        options={catalog}
        selectedValue={catalogId}
        onClose={() => setServiceSheetOpen(false)}
        onSelect={(id) => {
          setCatalogId(String(id));
          setServiceSheetOpen(false);
        }}
      />

      {/* Duración sheet */}
      <SelectSheet
        open={durationSheetOpen}
        title="Duración"
        subtitle="Elegí el tiempo estimado del servicio."
        options={durationOptions}
        selectedValue={durationMin}
        onClose={() => setDurationSheetOpen(false)}
        onSelect={(v) => {
          setDurationMin(String(v));
          setDurationSheetOpen(false);
        }}
      />
    </div>
  );
}
