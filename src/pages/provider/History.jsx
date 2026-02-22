// src/pages/provider/History.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabase";

const norm = (v) => String(v ?? "").toLowerCase();

/* ---------------- utils ---------------- */
function safeTS(iso) {
  const t = new Date(iso || "").getTime();
  return Number.isFinite(t) ? t : NaN;
}

function monthKey(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "sin-fecha";
  const y = d.getFullYear();
  const m = d.getMonth(); // 0..11
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key) {
  if (key === "sin-fecha") return "Sin fecha";
  const [y, mm] = key.split("-");
  const d = new Date(Number(y), Number(mm) - 1, 1);
  const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTurno(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

function moneyARS(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString("es-AR")}`;
}

/**
 * precio histórico:
 * - si pricing_type === "B" => quote_amount
 * - si NO es B => service_amount (snapshot) y fallback a base_price actual
 */
function computeBase(r, ps, cat) {
  const pricingType = cat?.pricing_type || null;

  const quote = r?.quote_amount != null ? Number(r.quote_amount) : null;
  const serviceAmount = r?.service_amount != null ? Number(r.service_amount) : null;
  const baseFixed = ps?.base_price != null ? Number(ps.base_price) : null;

  const isQuote = String(pricingType || "").toUpperCase() === "B";

  if (isQuote) return Number.isFinite(quote) ? quote : null;

  // prioridad: snapshot del request
  if (Number.isFinite(serviceAmount)) return serviceAmount;

  // fallback: precio actual del servicio (solo si no hay snapshot)
  if (Number.isFinite(baseFixed)) return baseFixed;

  return null;
}

/* ---------------- UI atoms ---------------- */
function Card({ children }) {
  return (
    <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden">
      {children}
    </div>
  );
}

function Row({ title, subtitle, right, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 hover:bg-black/[0.02] active:bg-black/[0.04]"
    >
      <div className="min-w-0">
        <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{title}</p>
        {subtitle ? <p className="mt-1 text-[12px] text-black/45 truncate">{subtitle}</p> : null}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {right ? <span className="text-[12px] font-extrabold text-[#1E2F5D]">{right}</span> : null}
        <IconifyIcon icon="mdi:chevron-right" className="h-6 w-6 text-black/25" />
      </div>
    </button>
  );
}

function SectionTitle({ children }) {
  return <p className="mt-5 mb-2 text-[12px] font-extrabold text-black/35 tracking-wide">{children}</p>;
}

/* ---------------- Chips ---------------- */
function StatChip({ label, value }) {
  return (
    <div className="rounded-[18px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-4 py-3">
      <p className="text-[11px] font-semibold text-black/45 truncate text-left">{label}</p>
      <p className="mt-1 text-[16px] font-extrabold text-[#3D3D3D] text-left">{value}</p>
    </div>
  );
}

/* ---------------- Skeleton ---------------- */
function ChipSkeleton() {
  return (
    <div className="rounded-[18px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-4 py-3 animate-pulse">
      <div className="h-3 w-[55%] rounded bg-black/10" />
      <div className="mt-2 h-4 w-[40%] rounded bg-black/10" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] px-5 py-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="h-[14px] w-[70%] rounded bg-black/10" />
          <div className="mt-2 h-[12px] w-[45%] rounded bg-black/10" />
        </div>
        <div className="h-4 w-[60px] rounded bg-black/10" />
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function History() {
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [reqs, setReqs] = useState([]); // service_requests
  const [psMap, setPsMap] = useState({}); // provider_service_id -> provider_services row
  const [catMap, setCatMap] = useState({}); // catalog_id -> service_catalog row

  async function fetchHistory() {
    if (!user?.id) return;

    setLoading(true);
    setErr("");

    try {
      // ✅ IMPORTANTE: tu columna es preferred_datetime + traemos catalog_id
      const { data: rData, error: rErr } = await supabase
      .from("service_requests") // ✅ nombre real de tu tabla
      .select(
        "id,status,created_at,preferred_datetime,quote_amount,service_amount,provider_id,provider_service_id,catalog_id"
      )
      .eq("provider_id", user.id)
      .in("status", ["completada", "incumplida"])
      .order("preferred_datetime", { ascending: false, nullsFirst: false })
      .limit(250);

      if (rErr) throw rErr;

      const list = rData || [];
      setReqs(list);

      // ✅ Traemos provider_services si existe el ID
      const psIds = Array.from(new Set(list.map((r) => r?.provider_service_id).filter(Boolean)));
      if (psIds.length === 0) {
        setPsMap({});
        // igual podemos resolver nombres por catalog_id del request
        const reqCatIds = Array.from(new Set(list.map((r) => r?.catalog_id).filter(Boolean)));
        if (reqCatIds.length === 0) {
          setCatMap({});
          return;
        }

        const { data: catDataOnly, error: catErrOnly } = await supabase
          .from("service_catalog")
          .select("id, name, pricing_type")
          .in("id", reqCatIds);

        if (catErrOnly) throw catErrOnly;

        const catById = {};
        (catDataOnly || []).forEach((c) => {
          if (c?.id) catById[c.id] = c;
        });
        setCatMap(catById);
        return;
      }

      const { data: psData, error: psErr } = await supabase
        .from("provider_services")
        .select("id, base_price, catalog_id")
        .in("id", psIds);

      if (psErr) throw psErr;

      const psById = {};
      (psData || []).forEach((p) => {
        if (p?.id) psById[p.id] = p;
      });
      setPsMap(psById);

      // ✅ catalog ids desde provider_services + desde el request (fallback si borraron provider_service)
      const catIdsFromPS = (psData || []).map((p) => p?.catalog_id).filter(Boolean);
      const catIdsFromReq = (list || []).map((r) => r?.catalog_id).filter(Boolean);
      const catIds = Array.from(new Set([...catIdsFromPS, ...catIdsFromReq]));

      if (catIds.length === 0) {
        setCatMap({});
        return;
      }

      const { data: catData, error: catErr } = await supabase
        .from("service_catalog")
        .select("id, name, pricing_type")
        .in("id", catIds);

      if (catErr) throw catErr;

      const catById = {};
      (catData || []).forEach((c) => {
        if (c?.id) catById[c.id] = c;
      });
      setCatMap(catById);
    } catch (e) {
      const msg = e?.message || "Error cargando historial";
      setErr(msg);
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const enrichedSorted = useMemo(() => {
    const arr = (reqs || []).map((r) => {
      const ps = r?.provider_service_id ? psMap[r.provider_service_id] : null;

      // ✅ clave: si no hay ps (servicio borrado), usamos catalog_id del request
      const catalogId = ps?.catalog_id || r?.catalog_id || null;
      const cat = catalogId ? catMap[catalogId] : null;

      const name = cat?.name || "Servicio";
      const base = computeBase(r, ps, cat);

      return { ...r, _name: name, _base: base };
    });

    arr.sort((a, b) => {
      const ta = safeTS(a?.preferred_datetime) || safeTS(a?.created_at);
      const tb = safeTS(b?.preferred_datetime) || safeTS(b?.created_at);
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });

    return arr;
  }, [reqs, psMap, catMap]);

  // ✅ Chips: Completadas + Total recaudado (solo completadas)
  const stats = useMemo(() => {
    const completed = enrichedSorted.filter((r) => norm(r.status) === "completada").length;

    const total = enrichedSorted.reduce((acc, r) => {
      if (norm(r.status) !== "completada") return acc; // incumplida NO suma
      const b = Number(r._base);
      return Number.isFinite(b) ? acc + b : acc;
    }, 0);

    return { completed, total };
  }, [enrichedSorted]);

  const grouped = useMemo(() => {
    const map = new Map();
    enrichedSorted.forEach((r) => {
      const key = monthKey(r?.preferred_datetime || r?.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });

    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({ key: k, label: monthLabelFromKey(k), items: map.get(k) }));
  }, [enrichedSorted]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full px-6 pb-8 box-border" style={{ paddingTop: "max(46px, env(safe-area-inset-top))" }}>
        <div className="mx-auto w-full max-w-[520px]">
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

            <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Mi historial</h1>
          </div>

          {/* Chips */}
          <div className="mt-5">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                <ChipSkeleton />
                <ChipSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatChip label="Completadas" value={String(stats.completed)} />
                <StatChip label="Total" value={moneyARS(stats.total)} />
              </div>
            )}
          </div>

          {!loading && err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

          <div className="mt-5">
            {loading ? (
              <div className="grid gap-3">
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : err ? null : enrichedSorted.length === 0 ? (
              <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-start gap-3">
                  <span className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                    <IconifyIcon icon="mdi:inbox-outline" className="h-6 w-6 text-black/35" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-extrabold text-[#3D3D3D]">No hay historial</p>
                    <p className="mt-1 text-[12px] text-black/45">Cuando completes servicios, van a aparecer acá.</p>
                  </div>
                </div>
              </div>
            ) : (
              grouped.map((g) => (
                <div key={g.key}>
                  <SectionTitle>{g.label}</SectionTitle>

                  <Card>
                    {g.items.map((r, idx) => {
                      const title = r._name || "Servicio";
                      const subtitle = formatTurno(r?.preferred_datetime);

                      const s = norm(r.status);
                      const right = s === "incumplida" ? "Incumplida" : r._base != null ? moneyARS(r._base) : "—";

                      return (
                        <div key={r.id}>
                          <Row title={title} subtitle={subtitle} right={right} onClick={() => nav(`/provider/requests/${r.id}`)} />
                          {idx !== g.items.length - 1 ? <div className="h-px w-full bg-black/5" /> : null}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            className="mt-4 w-full h-[52px] rounded-full bg-white border border-black/10 text-[#3D3D3D] text-[14px] font-extrabold shadow-[0_10px_22px_rgba(0,0,0,0.06)] active:scale-[0.99] transition"
          >
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}