// src/pages/provider/Chat.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import Loading from "../../components/Loading";
import RequestChat from "../../components/RequestChat";
import { getRequestById, getProfileById, getProviderServiceById } from "../../services/requests";

export default function ProviderRequestChatPage() {
  const nav = useNavigate();
  const { requestId } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState(null);

  const [clientName, setClientName] = useState("Cliente");
  const [serviceTitle, setServiceTitle] = useState("Servicio");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const r = await getRequestById(requestId);
        if (!alive) return;
        setReq(r);

        // ✅ nombre del servicio (mismo criterio que client)
        try {
          const psId = r?.provider_service_id ?? r?.service_id ?? null;

          if (psId) {
            const ps = await getProviderServiceById(psId).catch(() => null);
            const name =
              ps?.service_catalog?.name ||
              ps?.name ||
              r?.service_name ||
              r?.service_title ||
              "Servicio";

            if (alive) setServiceTitle(name);
          } else {
            const name =
              r?.service_name ||
              r?.service_title ||
              r?.catalog?.name ||
              r?.service_catalog?.name ||
              "Servicio";

            if (alive) setServiceTitle(name);
          }
        } catch {
          if (alive) {
            setServiceTitle(
              r?.service_name ||
                r?.service_title ||
                r?.catalog?.name ||
                r?.service_catalog?.name ||
                "Servicio"
            );
          }
        }

        // ✅ nombre del cliente
        if (r?.client_id) {
          const c = await getProfileById(r.client_id).catch(() => null);
          if (!alive) return;
          setClientName(c?.full_name || "Cliente");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestId]);

  if (loading) return <Loading />;

  const statusLower = String(req?.status || "").toLowerCase();
  const enabled = statusLower === "agendada" || statusLower === "completada" || statusLower === "incumplida";
  const locked = statusLower !== "agendada";

  return (
    <div className="fixed inset-0 bg-[#F5F5F5] flex flex-col overflow-hidden">
      {/* Header (igual a client/Chat.jsx) */}
      <div className="px-6 pt-[46px] pb-4">
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

          <div className="flex flex-col items-center">
            <p className="text-[17px] font-extrabold text-[#3D3D3D] leading-none truncate max-w-[240px]">
              {clientName}
            </p>
            <p className="mt-1 mb-2 text-[12px] text-black/40 leading-none truncate max-w-[260px]">
              {serviceTitle}
            </p>
          </div>
        </div>
      </div>

      {/* Chat full screen */}
      <div className="flex-1 min-h-0">
        <RequestChat requestId={req?.id} myUserId={user?.id} enabled={enabled} locked={locked} />      </div>
    </div>
  );
}