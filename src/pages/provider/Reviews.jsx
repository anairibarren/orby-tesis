// src/pages/provider/Reviews.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabase";

/* ✅ Header centrado + flecha izquierda (safe area ok) */
function PageHeader({ title }) {
  const nav = useNavigate();

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={() => nav(-1)}
        className="absolute left-0 h-11 w-11 rounded-full bg-white shadow-[0_4px_4.8px_rgba(0,0,0,0.06)] grid place-items-center active:scale-[0.98] transition"
        aria-label="Volver"
        title="Volver"
      >
        <span className="text-xl leading-none">‹</span>
      </button>

      <h1 className="text-[18px] font-extrabold text-[#3D3D3D]">{title}</h1>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Stars({ value, size = 16 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const isHalf = i === full && half;
        const icon = filled ? "mdi:star" : isHalf ? "mdi:star-half-full" : "mdi:star-outline";
        return (
          <IconifyIcon
            key={i}
            icon={icon}
            style={{ width: size, height: size }}
            className="text-[#F5B301]"
          />
        );
      })}
    </div>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="w-full rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] p-5">
      <div className="flex items-start gap-3">
        <span className="h-11 w-11 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
          <IconifyIcon icon="mdi:star-outline" className="h-6 w-6 text-black/35" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-[#3D3D3D]">{title}</p>
          <p className="mt-1 text-[12px] text-black/45 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ✅ Initials avatar (fallback) */
function initialsFromName(name) {
  const n = String(name || "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "C";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function ClientAvatar({ name, url }) {
  if (url) {
    return (
      <div className="h-12 w-12 rounded-full overflow-hidden bg-black/[0.04] shrink-0">
        <img src={url} alt={name || "Cliente"} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="h-12 w-12 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
      <span className="text-[12px] font-extrabold text-black/55">{initialsFromName(name)}</span>
    </div>
  );
}

/* ✅ Barras de rating */
function RatingBars({ dist, total }) {
  const rows = [5, 4, 3, 2, 1].map((k) => {
    const count = dist[k] || 0;
    const pct = total ? (count / total) * 100 : 0;
    return { k, pct };
  });

  return (
    <div className="mt-5 border-t border-black/10 pt-4">
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center gap-4">
            <div className="flex-1 h-[8px] rounded-full bg-black/[0.10] overflow-hidden">
              <div className="h-full rounded-full bg-[#F5B301]" style={{ width: `${r.pct}%` }} />
            </div>

            <div className="w-[58px] shrink-0 flex items-center justify-end gap-2">
              <span className="text-[12px] font-semibold text-black/55">{r.k.toFixed(1)}</span>
              <IconifyIcon icon="mdi:star" className="h-4 w-4 text-[#F5B301]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reviews() {
  const toast = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  // ✅ map client_id -> { full_name, avatar_url }
  const [clientInfo, setClientInfo] = useState({});

  // ✅ toggle para desplegable del summary
  const [summaryOpen, setSummaryOpen] = useState(true);

  async function fetchReviews() {
    if (!user?.id) return;
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, provider_id, rating, comment, created_at, client_id")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = data || [];
      setItems(rows);

      // ✅ buscar datos de clientes en profiles (sin inventar campos en reviews)
      const ids = Array.from(new Set(rows.map((r) => r.client_id).filter(Boolean)));
      if (ids.length) {
        const { data: profs, error: perr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids);

        if (!perr && Array.isArray(profs)) {
          const map = {};
          for (const p of profs) {
            map[p.id] = {
              full_name: p.full_name || "Cliente",
              avatar_url: p.avatar_url || "",
            };
          }
          setClientInfo(map);
        }
      } else {
        setClientInfo({});
      }
    } catch (e) {
      const msg = e?.message || "Error cargando reseñas";
      setErr(msg);
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ realtime: cambios en reviews del prestador
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`rt-reviews-provider-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `provider_id=eq.${user.id}`,
        },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const summary = useMemo(() => {
    const n = items.length;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    items.forEach((r) => {
      const k = Math.round(Number(r.rating) || 0);
      if (k >= 1 && k <= 5) dist[k] += 1;
    });

    if (!n) return { avg: 0, n: 0, dist };
    const sum = items.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = sum / n;

    return { avg, n, dist };
  }, [items]);

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
          <PageHeader title="Mis reseñas" />

          <div className="mt-5 grid gap-3">
            {/* ✅ Summary + desplegable real */}
            <Card className="p-5">
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                className="w-full flex items-center gap-4 text-left"
                aria-expanded={summaryOpen}
                aria-label="Mostrar u ocultar resumen"
              >
                <p className="text-[40px] font-extrabold text-[#3D3D3D] leading-none">
                  {summary.avg ? summary.avg.toFixed(1) : "—"}
                </p>

                <div className="h-12 w-px bg-black/10" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Stars value={summary.avg} size={18} />
                  </div>

                  <p className="mt-1 text-[12px] text-black/45">
                    {summary.avg ? summary.avg.toFixed(1) : "—"} <span className="mx-1">|</span>{" "}
                    {summary.n ? `${summary.n} reseña(s)` : "0 reseñas"}
                  </p>
                </div>

                <span className="h-11 w-11 rounded-full bg-white border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.06)] grid place-items-center shrink-0">
                  <IconifyIcon
                    icon="mdi:chevron-down"
                    className={[
                      "h-6 w-6 text-black/35 transition-transform",
                      summaryOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </span>
              </button>

              {summaryOpen ? <RatingBars dist={summary.dist} total={summary.n} /> : null}
            </Card>

            {loading ? (
              <>
                <div className="h-[140px] rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
                <div className="h-[140px] rounded-[22px] bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] animate-pulse" />
              </>
            ) : err ? (
              <EmptyState title="No pudimos cargar" desc={err} />
            ) : items.length === 0 ? (
              <EmptyState title="Todavía no tenés reseñas" desc="Cuando completes trabajos, los clientes van a poder calificarte." />
            ) : (
              items.map((r) => {
                const info = clientInfo[r.client_id] || {};
                const clientName = info.full_name || "Cliente";
                const avatarUrl = info.avatar_url || "";

                return (
                  <Card key={r.id} className="p-5">
                  {/* 1) FILA: avatar + header (nombre/fecha + estrellas) */}
                  <div className="flex items-start gap-4">
                    <ClientAvatar name={clientName} url={avatarUrl} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-extrabold text-[#3D3D3D] truncate">{clientName}</p>
                        <p className="text-[12px] font-semibold text-black/40 shrink-0">{formatDate(r.created_at)}</p>
                      </div>

                      <div className="mt-2">
                        <Stars value={r.rating} size={16} />
                      </div>
                    </div>
                  </div>

                  {/* 2) COMENTARIO: alineado al avatar (no al nombre) */}
                  <div className="mt-3 pl-41">
                    {r.comment ? (
                      <p className="text-[13px] text-black/65 leading-relaxed whitespace-pre-line">
                        {r.comment}
                      </p>
                    ) : (
                      <p className="text-[13px] text-black/40 italic">Sin comentario</p>
                    )}
                  </div>
                </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
