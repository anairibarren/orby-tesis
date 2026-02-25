// src/pages/client/History.jsx
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
  if (Number.isFinite(serviceAmount)) return serviceAmount;
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

/* ---------------- Skeleton ---------------- */
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
  const [provMap, setProvMap] = useState({}); // provider_id -> profile

  async function fetchHistory() {
    if (!user?.id) return;

    setLoading(true);
    setErr("");

    try {
      // 1) requests del CLIENTE (completada/cancelada/incumplida)
      const { data: rData, error: rErr } = await supabase
      .from("service_requests")
      .select(
        "id,status,created_at,preferred_datetime,quote_amount,service_amount,provider_id,provider_service_id,catalog_id"
      )
      .eq("client_id", user.id)
      .in("status", ["completada", "cancelada", "incumplida"])
      .limit(250);

      if (rErr) throw rErr;

      const list = rData || [];
      setReqs(list);

      // 2) profiles de prestadores (para subtítulo)
      const provIds = Array.from(new Set(list.map((r) => r?.provider_id).filter(Boolean)));
      if (provIds.length) {
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", provIds);

        if (!pErr) {
          const map = {};
          (pData || []).forEach((p) => {
            if (p?.id) map[p.id] = p;
          });
          setProvMap(map);
        } else {
          setProvMap({});
        }
      } else {
        setProvMap({});
      }

      // 3) provider_services → base_price + catalog_id
      const psIds = Array.from(new Set(list.map((r) => r?.provider_service_id).filter(Boolean)));
      if (psIds.length === 0) {
        setPsMap({});
        setCatMap({});
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

      // 4) service_catalog (nombre + pricing_type)
      // ✅ IMPORTANTE: hay requests sin provider_service_id, pero con catalog_id.
      const catIdsFromPs = (psData || []).map((p) => p?.catalog_id).filter(Boolean);
      const catIdsFromReq = (list || []).map((r) => r?.catalog_id).filter(Boolean);

      const catIds = Array.from(new Set([...catIdsFromPs, ...catIdsFromReq]));

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

      // ✅ primero intento por provider_services, si no existe uso catalog_id del request
      const catId = ps?.catalog_id || r?.catalog_id || null;
      const cat = catId ? catMap[catId] : null;

      const name = cat?.name || "Servicio";
      const base = computeBase(r, ps, cat);
      const providerName = (r?.provider_id && provMap[r.provider_id]?.full_name) || "Prestador";

      return { ...r, _name: name, _base: base, _providerName: providerName };
    });

    arr.sort((a, b) => {
      const ta = safeTS(a?.preferred_datetime) || safeTS(a?.created_at);
      const tb = safeTS(b?.preferred_datetime) || safeTS(b?.created_at);
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });

    return arr;
  }, [reqs, psMap, catMap, provMap]);

  const grouped = useMemo(() => {
    const map = new Map();
    enrichedSorted.forEach((r) => {
      const key = monthKey(r?.preferred_datetime || r?.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });

    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1)); // desc
    return keys.map((k) => ({ key: k, label: monthLabelFromKey(k), items: map.get(k) }));
  }, [enrichedSorted]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden">
      <div className="w-full pb-24 box-border overflow-x-hidden" style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}>
        <div
          className="mx-auto w-full max-w-[520px] box-border overflow-x-hidden"
          style={{
            paddingLeft: "max(16px, env(safe-area-inset-left))",
            paddingRight: "max(16px, env(safe-area-inset-right))",
          }}
        >
          {/* Header */}
          <div className="relative flex items-center justify-center pt-3 overflow-visible">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="absolute left-0 top-[2px] h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-2xl leading-none">‹</span>
            </button>

            <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">Mi historial</h1>
          </div>

          {!loading && err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

          {/* List */}
          <div className="mt-5">
            {loading ? (
              <div className="grid gap-3">
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : err ? null : enrichedSorted.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center text-center pt-14 pb-10">
                  <div className="h-16 w-16 rounded-2xl bg-black/[0.04] grid place-items-center">
                    <IconifyIcon icon="mdi:bell-outline" className="h-7 w-7 text-black/35" />
                  </div>

                  <p className="mt-6 text-[18px] font-extrabold text-[#3D3D3D]">
                    Todavía no hiciste solicitudes
                  </p>

                  <p className="mt-2 text-[14px] text-black/45 leading-relaxed max-w-[320px]">
                    Cuando pidas un servicio, lo vas a ver acá.
                  </p>

                  <button
                    type="button"
                    onClick={() => nav("/client/categories")}
                    className="mt-6 h-11 px-6 rounded-full bg-[#1E2F5D] text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(30,47,93,0.18)] active:scale-[0.98] transition"
                  >
                    Explorar categorías
                  </button>
                </div>
              ) : (
              grouped.map((g) => (
                <div key={g.key}>
                  <SectionTitle>{g.label}</SectionTitle>

                  <Card>
                    {g.items.map((r, idx) => {
                      const title = r._name || "Servicio";
                      const subtitle = `${r._providerName || "Prestador"} · ${formatTurno(r?.preferred_datetime)}`;

                      const s = norm(r.status);
                      const right =
                        s === "cancelada"
                          ? "Cancelada"
                          : s === "incumplida"
                          ? "Incumplida"
                          : r._base != null
                          ? moneyARS(r._base)
                          : "—";

                      return (
                        <div key={r.id}>
                          <Row title={title} subtitle={subtitle} right={right} onClick={() => nav(`/client/requests/${r.id}`)} />
                          {idx !== g.items.length - 1 ? <div className="h-px w-full bg-black/5" /> : null}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}