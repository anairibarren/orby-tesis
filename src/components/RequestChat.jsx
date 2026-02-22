// src/components/RequestChat.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { supabase } from "../services/supabase";
import { listMessagesByRequest, sendMessage } from "../services/messages";

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function dateKey(iso) {
  try {
    const d = new Date(iso);
    // yyyy-mm-dd
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  } catch {
    return "unknown";
  }
}

function dayLabel(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();

    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const diffDays = Math.round((d0 - n0) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return "Hoy";
    if (diffDays === -1) return "Ayer";

    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return "";
  }
}

/** ✅ Tildes tipo WhatsApp:
 * - En tus mensajes: doble tilde gris si NO seen_at, doble tilde celeste si seen_at
 */
function WhatsAppTicks({ mine, seen }) {
  if (!mine) return null;

  return (
    <span className="inline-flex items-center translate-y-[1px]">
      <IconifyIcon
        icon="material-symbols:done-all-rounded"
        className={[
          "h-[16px] w-[16px]",
          seen ? "text-[#34B7F1]" : "text-white/65",
        ].join(" ")}
      />
    </span>
  );
}

function Bubble({ mine, body, createdAt, seenAt }) {
  const seen = !!seenAt;

  return (
    <div className={["flex", mine ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[86%] rounded-2xl px-4 py-2 text-[15px] leading-snug border",
          mine
            ? "bg-[#1E2F5D] text-white border-transparent"
            : "bg-white text-black/75 border-black/10",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>

        <div className="mt-1 flex items-center justify-end gap-1">
          <p className={["text-[11px] leading-none", mine ? "text-white/70" : "text-black/35"].join(" ")}>
            {fmtTime(createdAt)}
          </p>
          <WhatsAppTicks mine={mine} seen={seen} />
        </div>
      </div>
    </div>
  );
}

/** ✅ Banner tipo WhatsApp (cuando está vacío) */
function WhatsAppInfoBanner() {
  return (
    <div className="mx-auto mt-6 max-w-[380px] rounded-2xl bg-[#1E2F5D]/[0.06] border border-[#1E2F5D]/15 px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-2">
        <IconifyIcon icon="mdi:lock" className="h-6 w-6 text-[#1E2F5D]/70 mt-[1px]" />
        <p className="text-[13px] leading-snug text-black/65">
          Este chat queda guardado en orby para ayudarte a coordinar el servicio de forma clara y segura.
        </p>
      </div>
    </div>
  );
}

function DayDivider({ label }) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full bg-white border border-black/10 px-4 py-1 text-[12px] font-extrabold text-black/60 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
        {label}
      </span>
    </div>
  );
}

export default function RequestChat({ requestId, myUserId, enabled = true, locked = false }) {  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const canUse = !!requestId && !!myUserId && !!enabled;

  // ✅ marca vistos SOLO los mensajes del otro (sender_id != yo)
  async function markSeen() {
    if (!requestId || !myUserId) return;

    const { error } = await supabase
      .from("request_messages")
      .update({ seen_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .neq("sender_id", myUserId)
      .is("seen_at", null);

    // OJO: si esto falla por RLS, nunca vas a ver el azul.
    if (error) console.warn("[RequestChat] markSeen error:", error.message);
  }

  async function load() {
    if (!requestId) return;
    setLoading(true);
    try {
      const list = await listMessagesByRequest(requestId);
      setMessages(list || []);
      await markSeen();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // ✅ si volvés al tab/app, re-marcar vistos
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") markSeen();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, myUserId]);

  // ✅ realtime: INSERT + UPDATE (para ver seen_at reflejado)
  useEffect(() => {
    if (!requestId) return;

    const ch = supabase
      .channel(`request-chat-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages", filter: `request_id=eq.${requestId}` },
        async (payload) => {
          const row = payload?.new;
          if (!row?.id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });

          // si llegó mensaje del otro -> marcar visto (si estoy adentro del chat)
          if (myUserId && row.sender_id !== myUserId) {
            await markSeen();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "request_messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const row = payload?.new;
          if (!row?.id) return;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [requestId, myUserId]);

  // scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sorted = useMemo(() => {
    const arr = Array.isArray(messages) ? [...messages] : [];
    arr.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return arr;
  }, [messages]);

  // ✅ armar lista con separadores por día
  const items = useMemo(() => {
    const out = [];
    let lastKey = null;

    for (const m of sorted) {
      const k = dateKey(m.created_at);
      if (k !== lastKey) {
        out.push({ type: "day", key: `day-${k}`, label: dayLabel(m.created_at) });
        lastKey = k;
      }
      out.push({ type: "msg", key: m.id, msg: m });
    }
    return out;
  }, [sorted]);

  async function onSend() {
    const clean = String(text || "").trim();
    if (!canUse || !clean) return;

    try {
      setBusy(true);
      await sendMessage({ requestId, senderId: myUserId, body: clean });
      setText("");
    } finally {
      setBusy(false);
    }
  }

  // ✅ IMPORTANTE: ya NO mostramos mensaje “chat se habilita…”
  // porque vos querés que ni exista el botón hasta agendada
  if (!enabled) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* mensajes */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-6 space-y-3">
        {loading && sorted.length === 0 ? (
          <p className="text-[12px] text-black/40">Cargando…</p>
        ) : sorted.length === 0 ? (
          <>
            <WhatsAppInfoBanner />
          </>
        ) : (
          items.map((it) =>
            it.type === "day" ? (
              <DayDivider key={it.key} label={it.label} />
            ) : (
              <Bubble
                key={it.key}
                mine={it.msg.sender_id === myUserId}
                body={it.msg.body}
                createdAt={it.msg.created_at}
                seenAt={it.msg.seen_at}
              />
            )
          )
        )}

        <div ref={endRef} />
      </div>

      {/* input */}
      {locked ? (
        <div className="px-6 pb-[max(18px,env(safe-area-inset-bottom))]">
          <div className="rounded-2xl bg-black/[0.03] border border-black/10 px-4 py-3 text-[13px] text-black/55">
            Este chat quedó en modo solo lectura porque la solicitud ya fue finalizada.
          </div>
          <div className="h-2" />
        </div>
      ) : (
        <div className="px-6 pb-[max(18px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[62px] rounded-full bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)] flex items-center px-5">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={canUse ? "Escribí un mensaje…" : "No disponible"}
                disabled={!canUse || busy}
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-black/30 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                }}
              />
            </div>

            <button
              type="button"
              onClick={onSend}
              disabled={!canUse || busy || !String(text || "").trim()}
              className="h-[62px] w-[62px] rounded-full bg-[#1E2F5D] text-white grid place-items-center shadow-[0_14px_28px_rgba(30,47,93,0.25)] active:scale-[0.99] transition disabled:opacity-60"
              aria-label="Enviar"
              title="Enviar"
            >
              <IconifyIcon icon="lucide:send" className="h-[18px] w-[18px] translate-x-[1px]" />
            </button>
          </div>

          <div className="h-2" />
        </div>
      )}
    </div>
  );
}