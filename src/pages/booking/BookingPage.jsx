import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

import FixedForm from "../forms/FixedForm";
import QuoteForm from "../forms/QuoteForm";
import CalculatedForm from "../forms/CalculatedForm";

import { supabase } from "../../services/supabase";

export default function BookingPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(`
          *,
          service:services (
            id,
            name,
            pricing_type
          )
        `)
        .eq("id", providerId)
        .single();

      if (!error) {
        setProvider(data);
      } else {
        console.error(error);
      }

      setLoading(false);
    };

    fetchProvider();
  }, [providerId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Cargando...
      </div>
    );
  }

  if (!provider || !provider.service) {
    return (
      <div className="text-center mt-10">
        No se pudo cargar el servicio
      </div>
    );
  }

  const renderForm = () => {
    switch (provider.service.pricing_type) {
      case "fixed":
        return (
        <FixedForm
            provider={provider}
            service={provider.service}
        />
        );

      case "quote":
        return <QuoteForm provider={provider} />;

      case "calculated":
        return <CalculatedForm provider={provider} />;

      default:
        return <p>Tipo de servicio no válido</p>;
    }
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen font-poppins pb-10">
      <div>
        {renderForm()}
      </div>
    </div>
  );
}
