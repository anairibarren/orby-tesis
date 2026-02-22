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

/** ✅ Burbuja “escribiendo…” (3 puntitos) del lado del otro */
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[86%] rounded-2xl px-4 py-3 bg-white border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <span className="typing-dot" />
          <span className="typing-dot typing-dot--2" />
          <span className="typing-dot typing-dot--3" />
        </div>

        <style>{`
          @keyframes typingBounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
            40% { transform: translateY(-4px); opacity: 1; }
          }
          .typing-dot {
            width: 8px;
            height: 8px;
            border-radius: 9999px;
            background: rgba(0,0,0,0.35);
            animation: typingBounce 1.1s infinite;
          }
          .typing-dot--2 { animation-delay: 0.12s; }
          .typing-dot--3 { animation-delay: 0.24s; }
        `}</style>
      </div>
    </div>
  );
}

function ChatLoader() {
  return (
    <div className="pt-3">
      <div className="mx-auto w-fit rounded-full bg-white border border-black/10 px-4 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-black/45">Cargando</span>
          <span className="loader-dot" />
          <span className="loader-dot loader-dot--2" />
          <span className="loader-dot loader-dot--3" />
        </div>
      </div>

      <style>{`
        @keyframes loaderPulse {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.25; }
          40% { transform: translateY(-2px); opacity: 0.9; }
        }
        .loader-dot{
          width:6px;height:6px;border-radius:9999px;
          background: rgba(0,0,0,0.35);
          animation: loaderPulse 1.05s infinite;
        }
        .loader-dot--2{ animation-delay: .12s; }
        .loader-dot--3{ animation-delay: .24s; }
      `}</style>
    </div>
  );
}
export default function RequestChat({ requestId, myUserId, enabled = true, locked = false }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const canUse = !!requestId && !!myUserId && !!enabled;

  // ✅ typing state
  const [otherTyping, setOtherTyping] = useState(false);
  const typingOffTimerRef = useRef(null);
  const lastTypingSentAtRef = useRef(0);
  const channelRef = useRef(null);

  async function markSeen() {
    if (!requestId || !myUserId) return;

    const { error } = await supabase
      .from("request_messages")
      .update({ seen_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .neq("sender_id", myUserId)
      .is("seen_at", null);

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

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") markSeen();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, myUserId]);

  // ✅ realtime: INSERT + UPDATE + typing broadcast
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

          // si llegó mensaje del otro -> marcar visto
          if (myUserId && row.sender_id !== myUserId) {
            await markSeen();
          }

          // si el otro mandó mensaje, ya no está “escribiendo…”
          if (row?.sender_id && row.sender_id !== myUserId) {
            setOtherTyping(false);
            if (typingOffTimerRef.current) clearTimeout(typingOffTimerRef.current);
            typingOffTimerRef.current = null;
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
      // ✅ typing broadcast
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = payload?.payload?.sender_id;
        if (!senderId) return;
        if (senderId === myUserId) return; // ignoro mis propios eventos

        setOtherTyping(true);

        // auto-off si deja de mandar typing
        if (typingOffTimerRef.current) clearTimeout(typingOffTimerRef.current);
        typingOffTimerRef.current = setTimeout(() => setOtherTyping(false), 1500);
      })
      .subscribe();

    channelRef.current = ch;

    return () => {
      if (typingOffTimerRef.current) clearTimeout(typingOffTimerRef.current);
      typingOffTimerRef.current = null;
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [requestId, myUserId]);

  // scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);

  const sorted = useMemo(() => {
    const arr = Array.isArray(messages) ? [...messages] : [];
    arr.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return arr;
  }, [messages]);

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

  // ✅ enviar “typing” con throttle
  function pingTyping() {
    if (!canUse || locked) return;
    const ch = channelRef.current;
    if (!ch) return;

    const now = Date.now();
    if (now - lastTypingSentAtRef.current < 800) return; // throttle
    lastTypingSentAtRef.current = now;

    try {
      ch.send({
        type: "broadcast",
        event: "typing",
        payload: { sender_id: myUserId, at: now },
      });
    } catch {
      // noop
    }
  }

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

  if (!enabled) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* mensajes */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-6 space-y-3">
        {loading && sorted.length === 0 ? (
            <ChatLoader />
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

        {/* ✅ typing bubble del otro */}
        {!locked && otherTyping ? <TypingBubble /> : null}

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
                onChange={(e) => {
                  setText(e.target.value);
                  if (String(e.target.value || "").trim()) pingTyping();
                }}
                onFocus={() => {
                  if (String(text || "").trim()) pingTyping();
                }}
                placeholder={canUse ? "Escribí un mensaje…" : "No disponible"}
                disabled={!canUse || busy}
                className="w-full bg-transparent text-[16px] outline-none placeholder:text-black/30 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSend();
                  else pingTyping();
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