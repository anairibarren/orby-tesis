// src/pages/client/RequestForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import Loading from "../../components/Loading";

function draftKey(id) {
  return `orby_request_draft_${id}`;
}

function isMissingColumn(err, col) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes(`column "${String(col).toLowerCase()}" does not exist`);
}

/**
 * Barrios / localidades dentro del Partido de Vicente López
 */
const VICENTE_LOPEZ_NEIGHBORHOODS = [
  "Vicente López",
  "Olivos",
  "Florida",
  "Florida Oeste",
  "La Lucila",
  "Villa Martelli",
  "Munro",
  "Carapachay",
];

const PAYMENT_METHODS = [
  { key: "cash", label: "Efectivo", desc: "Pagás al finalizar", icon: "mdi:cash" },
  { key: "mp", label: "Mercado Pago", desc: "Pagás al prestador", icon: "mdi:credit-card-outline" },
];

function CardShell({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.06)] border border-black/10 overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, rows = 4 }) {
  return (
    <div className="py-4">
      <p className="text-[12px] font-semibold text-black/55">{label}</p>

      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          className="mt-2 w-full bg-transparent text-[14px] text-[#3D3D3D] outline-none placeholder:text-black/25 resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-2 w-full bg-transparent text-[16px] text-[#3D3D3D] outline-none placeholder:text-black/25"
        />
      )}

      <div className="mt-3 h-[1px] w-full bg-black/10" />
    </div>
  );
}

/** Selector tipo autocomplete (solo permite opciones de la lista) */
function NeighborhoodSelect({ label = "Barrio", value, onChange, setErr }) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const normalizedList = useMemo(() => {
    return VICENTE_LOPEZ_NEIGHBORHOODS.map((x) => ({
      raw: x,
      norm: String(x).toLowerCase(),
    }));
  }, []);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return normalizedList;
    return normalizedList.filter((n) => n.norm.includes(q));
  }, [query, normalizedList]);

  const isValidValue = useMemo(() => {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return false;
    return normalizedList.some((n) => n.norm === v);
  }, [value, normalizedList]);

  function commit(optionRaw) {
    setErr?.("");
    onChange?.(optionRaw);
    setQuery(optionRaw);
    setOpen(false);
    setActiveIdx(-1);
  }

  function closeAndValidate() {
    setOpen(false);
    setActiveIdx(-1);

    const q = String(query || "").trim();
    if (!q) {
      onChange?.("");
      return;
    }

    const hit = normalizedList.find((n) => n.norm === q.toLowerCase());
    if (hit) {
      commit(hit.raw);
    } else {
      setErr?.("Elegí un barrio válido de Vicente López.");
      onChange?.("");
      setQuery("");
    }
  }

  useEffect(() => {
    function onDocDown(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) {
        closeAndValidate();
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="py-4" ref={wrapRef}>
      <p className="text-[12px] font-semibold text-black/55">{label}</p>

      <div className="relative mt-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setErr?.("");
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              setOpen(true);
              return;
            }

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min((filtered?.length || 1) - 1, i + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && filtered?.length) {
                const idx = activeIdx >= 0 ? activeIdx : 0;
                const opt = filtered[idx];
                if (opt) commit(opt.raw);
              } else {
                closeAndValidate();
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              closeAndValidate();
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!wrapRef.current) return;
              const active = document.activeElement;
              if (active && wrapRef.current.contains(active)) return;
              closeAndValidate();
            }, 80);
          }}
          placeholder="Ej: Olivos"
          className="w-full bg-transparent text-[14px] text-[#3D3D3D] outline-none placeholder:text-black/25 pr-10"
          inputMode="text"
          autoComplete="off"
        />

        <button
          type="button"
          onClick={() => {
            setErr?.("");
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center text-black/45 hover:bg-black/[0.03] active:scale-[0.98] transition"
          aria-label="Abrir barrios"
          title="Abrir barrios"
        >
          <IconifyIcon icon="mdi:chevron-down" className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute left-0 right-0 mt-2 z-20">
            <div className="rounded-[16px] bg-white border border-black/10 shadow-[0_18px_32px_rgba(0,0,0,0.10)] overflow-hidden">
              <div className="max-h-52 overflow-auto">
                {filtered.length ? (
                  filtered.map((opt, idx) => {
                    const active = idx === activeIdx;
                    const selected = String(value || "").trim().toLowerCase() === opt.norm;

                    return (
                      <button
                        key={opt.raw}
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => commit(opt.raw)}
                        className={[
                          "w-full text-left px-4 py-3 text-[13px] transition flex items-center justify-between",
                          active ? "bg-[#1E2F5D]/[0.06]" : "bg-white",
                          "hover:bg-black/[0.02]",
                        ].join(" ")}
                      >
                        <span className="font-semibold text-[#3D3D3D]">{opt.raw}</span>
                        {selected ? <IconifyIcon icon="mdi:check" className="h-4 w-4 text-[#1E2F5D]" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-[13px] text-black/50">No hay coincidencias.</div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-black/10 bg-black/[0.02]">
                <p className="text-[12px] text-black/45">
                  Solo barrios de <b>Vicente López</b>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 h-[1px] w-full bg-black/10" />

      {!isValidValue && String(value || "").trim() ? (
        <p className="mt-2 text-[12px] text-red-600">Elegí una opción válida del selector.</p>
      ) : null}
    </div>
  );
}

function PaymentPicker({ value, onChange }) {
  return (
    <div className="mt-2 grid gap-2">
      {PAYMENT_METHODS.map((m) => {
        const active = value === m.key;
        const disabled = !!m.disabled;

        return (
          <button
            key={m.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(m.key)}
            className={[
              "w-full rounded-[18px] px-4 py-4 text-left transition active:scale-[0.99]",
              disabled
                ? "bg-black/[0.03] text-black/30 cursor-not-allowed"
                : active
                ? "bg-[#1E2F5D]/[0.06]"
                : "bg-black/[0.02] hover:bg-black/[0.03]",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={[
                    "h-10 w-10 rounded-full grid place-items-center shrink-0",
                    active ? "bg-[#1E2F5D] text-white" : "bg-black/[0.04] text-black/50",
                  ].join(" ")}
                >
                  <IconifyIcon icon={m.icon} className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{m.label}</p>
                  <p className="mt-0.5 text-[12px] text-black/45 truncate">{m.desc}</p>
                </div>
              </div>

              <span
                className={[
                  "h-6 w-6 rounded-full grid place-items-center shrink-0 mt-1",
                  disabled ? "bg-black/10" : active ? "bg-[#1E2F5D]" : "bg-black/10",
                ].join(" ")}
              >
                {!disabled && active ? <IconifyIcon icon="mdi:check" className="h-4 w-4 text-white" /> : null}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function moneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("es-AR")}`;
}

/* ---------------- Address Autocomplete (OSM / Nominatim) ---------------- */
function AddressAutocomplete({ label = "Dirección exacta", value, onChange, setErr }) {
  const wrapRef = useRef(null);
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Sync externo -> input
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Cierra al click afuera
  useEffect(() => {
    function onDown(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounce + fetch Nominatim
  useEffect(() => {
    const q = String(query || "").trim();
    if (!open) return;
    if (q.length < 3) {
      setItems([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);

        const search = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          limit: "6",
          countrycodes: "ar",
          q: `${q}, Vicente López, Buenos Aires`,
        });

        const res = await fetch(`https://nominatim.openstreetmap.org/search?${search.toString()}`, {
          headers: {
            "Accept-Language": "es-AR,es;q=0.9",
          },
        });

        const data = await res.json();

        const filtered = (Array.isArray(data) ? data : []).filter((x) => {
          const a = x?.address || {};
          const county = String(a.county || "").toLowerCase();
          const city = String(a.city || a.town || a.village || "").toLowerCase();
          const suburb = String(a.suburb || a.neighbourhood || a.city_district || "").toLowerCase();
          const display = String(x.display_name || "").toLowerCase();

          const hitCounty = county.includes("vicente lópez") || county.includes("vicente lopez");
          const hitCity = city.includes("vicente lópez") || city.includes("vicente lopez");
          const hitSuburb = suburb.includes("vicente lópez") || suburb.includes("vicente lopez");
          const hitDisplay = display.includes("vicente lópez") || display.includes("vicente lopez");

          return hitCounty || hitCity || hitSuburb || hitDisplay;
        });

        setItems(filtered);
        setActiveIdx(-1);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [query, open]);

  function shortLabel(opt) {
    const a = opt?.address || {};

    const road = a.road || a.pedestrian || a.footway || a.cycleway || "";
    const house = a.house_number || "";
    const suburb = a.suburb || a.neighbourhood || a.city_district || "";
    const city = a.city || a.town || a.village || "";

    const line1 = [road, house].filter(Boolean).join(" ").trim();
    const line2 = [suburb || city].filter(Boolean).join("");

    if (!line1) return String(opt?.display_name || "").split(",").slice(0, 2).join(",").trim();
    return line2 ? `${line1}, ${line2}` : line1;
  }

  function commitFromOpt(opt) {
    const v = shortLabel(opt);
    setErr?.("");
    onChange?.(v);
    setQuery(v);
    setOpen(false);
    setActiveIdx(-1);
  }

  return (
    <div className="py-4" ref={wrapRef}>
      <p className="text-[12px] font-semibold text-black/55">{label}</p>

      <div className="relative mt-2">
        <input
          value={query}
          onChange={(e) => {
            setErr?.("");
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              setOpen(true);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min((items.length || 1) - 1, i + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && items.length) {
                const idx = activeIdx >= 0 ? activeIdx : 0;
                const opt = items[idx];
                if (opt) commitFromOpt(opt);
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          placeholder="Ej: Av. Maipú 1234, Olivos"
          className="w-full bg-transparent text-[14px] text-[#3D3D3D] outline-none placeholder:text-black/25 pr-10"
          inputMode="text"
          autoComplete="off"
        />

        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center text-black/45">
          {loading ? (
            <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black/50 animate-spin" />
          ) : (
            <IconifyIcon icon="mdi:map-marker-outline" className="h-5 w-5" />
          )}
        </div>

        {open && (items.length > 0 || query.trim().length >= 3) && (
          <div className="absolute left-0 right-0 mt-2 z-20">
            <div className="rounded-[16px] bg-white border border-black/10 shadow-[0_18px_32px_rgba(0,0,0,0.10)] overflow-hidden">
              <div className="max-h-56 overflow-auto">
                {items.length ? (
                  items.map((opt, idx) => {
                    const active = idx === activeIdx;
                    return (
                      <button
                        key={`${opt.place_id}-${idx}`}
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => commitFromOpt(opt)}
                        className={[
                          "w-full text-left px-4 py-3 text-[13px] transition",
                          active ? "bg-[#1E2F5D]/[0.06]" : "bg-white",
                          "hover:bg-black/[0.02]",
                        ].join(" ")}
                      >
                        <p className="font-semibold text-[#3D3D3D] line-clamp-2">{shortLabel(opt)}</p>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-[13px] text-black/50">No hay coincidencias en Vicente López.</div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-black/10 bg-black/[0.02]">
                <p className="text-[12px] text-black/45">
                  Sugerencias limitadas a <b>Vicente López</b>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 h-[1px] w-full bg-black/10" />
    </div>
  );
}

export default function ClientRequestForm() {
  const nav = useNavigate();
  const toast = useToast();
  const { id } = useParams(); // provider_service_id
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ps, setPs] = useState(null);
  const [err, setErr] = useState("");

  const draft = useMemo(() => {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [id]);

  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (draft) {
      if (draft?.description) setDescription(draft.description);
      if (draft?.payment_method) setPaymentMethod(draft.payment_method);
      if (draft?.neighborhood) setNeighborhood(draft.neighborhood);
      if (draft?.address) setAddress(draft.address);
    } else {
      if (profile?.neighborhood) setNeighborhood(profile.neighborhood);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.description, draft?.payment_method, draft?.neighborhood, draft?.address, profile?.neighborhood]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr("");

        let res = await supabase
          .from("provider_services")
          .select(
            `
            id,
            provider_id,
            catalog_id,
            base_price,
            duration_minutes,
            service_catalog:catalog_id ( id, name, category, pricing_type, currency )
          `
          )
          .eq("id", id)
          .single();

        if (res.error && isMissingColumn(res.error, "duration_minutes")) {
          res = await supabase
            .from("provider_services")
            .select(
              `
              id,
              provider_id,
              catalog_id,
              base_price,
              service_catalog:catalog_id ( id, name, category, pricing_type, currency )
            `
            )
            .eq("id", id)
            .single();
        }

        if (res.error) throw res.error;
        if (alive) setPs(res.data);
      } catch (e) {
        if (alive) setErr(e?.message || "No se pudo cargar el servicio");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  function saveDraft() {
    const cleanDesc = String(description || "").trim();
    const cleanNeighborhood = String(neighborhood || "").trim();
    const cleanAddress = String(address || "").trim();

    const descriptionForProvider =
      cleanAddress || cleanNeighborhood
        ? `${cleanDesc}\n\n📍 Ubicación:\n- Barrio: ${cleanNeighborhood || "—"}\n- Dirección: ${cleanAddress || "—"}`
        : cleanDesc;

    localStorage.setItem(
      draftKey(id),
      JSON.stringify({
        description: cleanDesc,
        description_compiled: descriptionForProvider,
        payment_method: paymentMethod,
        neighborhood: cleanNeighborhood || null,
        address: cleanAddress || null,
      })
    );

    return { cleanDesc, cleanNeighborhood, cleanAddress };
  }

  const duration = ps?.duration_minutes ?? 60;
  const serviceName = ps?.service_catalog?.name || "Servicio";
  const serviceCategory = ps?.service_catalog?.category || "";
  const pricingType = ps?.service_catalog?.pricing_type || null;

  const neighborhoodIsValid = useMemo(() => {
    const v = String(neighborhood || "").trim().toLowerCase();
    return VICENTE_LOPEZ_NEIGHBORHOODS.some((x) => String(x).toLowerCase() === v);
  }, [neighborhood]);

  const isValid = useMemo(() => {
    const d = String(description || "").trim();
    const a = String(address || "").trim();
    const pm = String(paymentMethod || "").trim();
    return !!d && neighborhoodIsValid && !!a && !!pm;
  }, [description, neighborhoodIsValid, address, paymentMethod]);

  const amountsPreview = useMemo(() => {
    const feePercent = 0.07;

    if (!ps) return { base: null, fee: null, total: null, isQuote: false };

    const isQuote = String(pricingType || "").toUpperCase() === "B";
    if (isQuote) return { base: null, fee: null, total: null, isQuote: true };

    const base = ps?.base_price != null ? Number(ps.base_price) : null;
    if (!Number.isFinite(base)) return { base: null, fee: null, total: null, isQuote: false };

    const fee = Math.round(base * feePercent * 100) / 100;
    const total = Math.round((base + fee) * 100) / 100;
    return { base, fee, total, isQuote: false };
  }, [ps, pricingType]);

  function onNext() {
    setErr("");

    if (!neighborhoodIsValid) {
      setErr("Elegí un barrio válido de Vicente López.");
      return;
    }

    if (!isValid) {
      setErr("Completá todos los campos para continuar.");
      return;
    }

    try {
      saveDraft();
      nav(`/client/services/${id}/schedule`);
    } catch (e) {
      toast.error("Error", e?.message || "No se pudo guardar el borrador.");
    }
  }

  if (loading) return <Loading />;

  if (err && !ps) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6">
        <button onClick={() => nav(-1)} className="text-sm text-[#2A4691]">
          ← Volver
        </button>
        <p className="mt-4 text-sm text-red-600">{err}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="px-6 pt-[46px] pb-10">
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>

          <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Nueva solicitud</h1>
        </div>

        {/* Summary */}
        <CardShell className="mt-5 p-5">
          <div className="relative">
            <span className="absolute right-0 top-0 inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold bg-[#EAF2FF] text-[#1E2F5D]">
              {duration} min
            </span>

            <p className="text-[12px] font-semibold text-black/40">Resumen</p>
            <p className="mt-1 pr-20 text-[15px] font-extrabold text-[#3D3D3D] leading-snug break-words">{serviceName}</p>

            {serviceCategory ? <p className="mt-1 text-[12px] text-black/45">{serviceCategory}</p> : null}
          </div>
        </CardShell>

        {/* Form */}
        <CardShell className="mt-4 p-5">
          <div className="flex items-start gap-3">
            <span className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
              <IconifyIcon icon="mdi:clipboard-text-outline" className="h-6 w-6 text-black/40" />
            </span>

            <div className="min-w-0">
              <p className="text-[15px] font-extrabold text-[#3D3D3D]">Detalles</p>
              <p className="mt-1 text-[12px] text-black/45">
                Explicá bien qué necesitás y cualquier dato importante (el prestador lo ve tal cual).
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Field
              label="Descripción"
              value={description}
              onChange={(e) => {
                setErr("");
                setDescription(e.target.value);
              }}
              placeholder="Ej: Se tapó la bacha, pierde agua y necesito que revisen la conexión…"
              multiline
              rows={5}
            />

            <NeighborhoodSelect label="Barrio" value={neighborhood} onChange={(v) => setNeighborhood(v)} setErr={setErr} />

            <AddressAutocomplete
              label="Dirección exacta"
              value={address}
              onChange={(v) => {
                setErr("");
                setAddress(v);
              }}
              setErr={setErr}
            />

            <div className="pt-4">
              <p className="text-[12px] font-semibold text-black/55">Método de pago</p>
              <PaymentPicker value={paymentMethod} onChange={(v) => setPaymentMethod(v)} />
            </div>

            {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}
          </div>
        </CardShell>

        {/* Barra final (NO fija) */}
        <CardShell className="mt-4">
          <div className="p-5">
            {!amountsPreview.isQuote ? (
              <div className="grid gap-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-black/50">Servicio</span>
                  <span className="font-semibold text-black/75">{moneyARS(amountsPreview.base)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-black/50">Tarifa Orby (7%)</span>
                  <span className="font-semibold text-black/75">{moneyARS(amountsPreview.fee)}</span>
                </div>

                <div className="pt-2 border-t border-black/10 flex items-center justify-between">
                  <span className="text-black/60 font-extrabold">Total</span>
                  <span className="text-[#1E2F5D] font-extrabold">{moneyARS(amountsPreview.total)}</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[13px] font-extrabold text-[#3D3D3D]">Este servicio se cotiza</p>
                <p className="mt-1 text-[12px] text-black/45 leading-snug">
                  El prestador te va a pasar el precio. A eso se le suma la <b>tarifa Orby del 7%</b>.
                </p>
              </div>
            )}

            <button
              onClick={onNext}
              disabled={!isValid}
              className={[
                "mt-4 w-full h-[54px] rounded-full text-[15px] font-extrabold shadow-[0_14px_30px_rgba(30,47,93,0.28)] active:scale-[0.99] transition",
                isValid ? "bg-[#1E2F5D] text-white" : "bg-[#1E2F5D]/50 text-white/90 cursor-not-allowed",
              ].join(" ")}
            >
              Agendar día y horario
            </button>
          </div>
        </CardShell>

        <div className="h-10" />
      </div>
    </div>
  );
}