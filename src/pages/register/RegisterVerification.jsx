import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useLocation, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/auth";

export default function RegisterVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = location.state; 

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [status, setStatus] = useState("empty"); 
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDigits(["4", "7", "2", "9"]);
      setStatus("typing");
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleVerify = async () => {
    setStatus("success");
    setLoading(true);
    setErrorMsg("");

    setTimeout(async () => {
      const res = await registerUser(userData);

      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
        setStatus("typing");
        return;
      }

      setStatus("finished");
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen relative flex flex-col px-6 pt-6">

      {errorMsg && (
        <p className="text-red-500 text-lg ml-[3rem] mt-6">
          Error: {errorMsg}
        </p>
      )}

      {status === "empty" || status === "typing" ? (
        <>
          <button onClick={() => navigate(-1)} className="mt-4 mb-4">
            <Icon
              icon="ep:arrow-left-bold"
              className="w-7 h-7 text-black ml-[1rem] mt-[1rem]"
            />
          </button>

          <h1 className="text-3xl font-bold text-left mt-[2rem] ml-[1rem]">
            Verificación de cuenta
          </h1>

          <p className="text-left text-lg text-gray-600 mt-[2rem] ml-[1rem] leading-snug">
            Te enviamos un código de verificación. Ingresalo para activar tu cuenta.
          </p>

          <div className="flex gap-[1rem] mt-[3rem] ml-[2rem] mr-[4rem]">
          {digits.map((d, i) => (
            <input
              key={i}
              type="text"
              maxLength="1"
              value={d}
              readOnly
              className="w-[4rem] h-[4rem] text-3xl font-bold text-center bg-[#F0F0F0] rounded-[1rem] outline-none"
            />
          ))}
        </div>

        {status === "typing" && (
          <button
            onClick={handleVerify}
            className="bg-[#2A4691] text-white rounded-full py-3 px-10 mt-[4rem] ml-[6rem] mr-[6rem]"
          >
            {loading ? "Creando usuario..." : "Verificar"}
          </button>
        )}
        </>
      ) : null}

      {status === "success" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50 animate-pulse">
          <Icon icon="mdi:check-circle" className="text-[#2A4691] w-24 h-24" />
          <p className="text-2xl font-semibold mt-[2rem]">Código verificado</p>
        </div>
      )}

      {status === "finished" && (
        <div className="absolute inset-0 flex flex-col items-start justify-center bg-white z-50 px-10">

          <h1 className="text-3xl font-bold mt-[2rem] ml-[1rem]">
            Ahora sí, ¡Todo listo para empezar!
          </h1>

          <p className="text-lg text-gray-600 mt-[2rem] ml-[1rem] leading-snug">
            Tu perfil fue creado con éxito. Ahora ya podés explorar Orby.
          </p>

          <button
            onClick={() => {
              navigate("/home", { replace: true });
            }}
            className="mt-[5rem] ml-[1rem] bg-[#2A4691] text-white px-14 py-3 rounded-full shadow-md"
          >
            Explorar Orby
          </button>
        </div>
      )}
    </div>
  );
}
