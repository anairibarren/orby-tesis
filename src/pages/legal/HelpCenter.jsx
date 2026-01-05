import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

export default function HelpCenter() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);

  const faqItems = [
    "Pagos y cobros",
    "Problemas con prestadores",
    "Problemas con servicios",
    "Cuenta y perfil",
    "Seguridad y datos",
  ];

  const supportItems = [
    "Chat en vivo",
    "Formulario de contacto",
    "Reportar un problema",
  ];

  const helpContent = {
    "Pagos y cobros": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          En{" "}
          <span className="font-medium text-[#4D4D4D]">orby</span>, los pagos se
          gestionan de forma segura a través de plataformas externas garantizando la protección de tus datos y la transparencia en cada transacción.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          Dependiendo del caso, el importe puede quedar temporalmente en estado pendiente hasta que el prestador confirme el inicio del servicio. Una vez finalizado, el cobro se procesa automáticamente según el método de pago asociado a tu cuenta.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Consultas sobre pagos:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.pagos@outlook.com
          </span>
        </p>
      </>
    ),

    "Problemas con prestadores": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          Si tuviste algún inconveniente con un prestador, como falta de puntualidad, incumplimiento del servicio, problemas de comunicación o conductas inapropiadas, podés reportarlo desde esta sección.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          El equipo de{" "}
          <span className="font-medium text-[#4D4D4D]">orby</span> evaluará la
          situación considerando el historial del prestador, los datos del servicio y la información que aportes, con el objetivo de garantizar una experiencia segura y confiable para todos los usuarios.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Soporte directo:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.soporte@gmail.com
          </span>
        </p>
      </>
    ),

    "Problemas con servicios": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          Si un servicio fue marcado como completado sin haberse realizado, no coincide con lo acordado, contiene información incorrecta o presenta inconvenientes en su ejecución, podés informarlo desde aquí para su
          revisión.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          El equipo de <span className="font-medium text-[#4D4D4D]">orby</span> analizará la
          situación y podrá proceder con ajustes, correcciones o reembolsos según corresponda, priorizando la transparencia y satisfacción del usuario.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Contacto general:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.contacto@gmail.com
          </span>
        </p>
      </>
    ),

    "Cuenta y perfil": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          Podes gestionar la información asociada a tu cuenta, actualizar tus datos  personales, modificar tu contraseña o
          revisar la configuración de seguridad.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          También tenés la posibilidad de solicitar la eliminación permanente de
          tu cuenta en{" "}
          <span className="font-medium text-[#4D4D4D]">orby</span>. Tené en
          cuenta que esta acción es irreversible y eliminará toda tu información
          asociada a la plataforma.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Correo de contacto:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.contacto@gmail.com
          </span>
        </p>
      </>
    ),

    "Seguridad y datos": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          En{" "}
          <span className="font-medium text-[#4D4D4D]">orby</span>, la seguridad
          de tu información es una prioridad. Aplicamos medidas de protección
          avanzadas como encriptación de datos, monitoreo de actividad inusual y
          buenas prácticas de gestión de accesos.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          Si detectás movimientos sospechosos, intentos de acceso no autorizados
          o cambios que no realizaste, te recomendamos modificar tu contraseña
          de inmediato y reportar la situación a nuestro equipo de seguridad.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Seguridad y privacidad:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.soporte@gmail.com
          </span>
        </p>
      </>
    ),

    "Chat en vivo": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          Comunicáte en tiempo real con un miembro del equipo de{" "}
          <span className="font-medium text-[#4D4D4D]">orby</span> a través de
          nuestro canal de chat en vivo.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          Este servicio está disponible de lunes a viernes, de 9 a 18 horas, y
          está destinado a consultas generales e inconvenientes inmediatos
          dentro de la plataforma.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Email alternativo:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.soporte@gmail.com
          </span>
        </p>
      </>
    ),

    "Formulario de contacto": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          A través del formulario de contacto podés enviar consultas,
          sugerencias o reclamos relacionados al uso de{" "}
          <span className="font-medium text-[#4D4D4D]">orby</span>.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          Te recomendamos incluir la mayor cantidad de información posible para
          que nuestro equipo pueda brindarte una respuesta clara y eficiente.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Respuesta por mail:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.contacto@gmail.com
          </span>
        </p>
      </>
    ),

    "Reportar un problema": (
      <>
        <p className="font-thin text-[#808080] text-sm leading-relaxed">
          Si detectaste errores en la aplicación, fallas técnicas, problemas de
          carga o cualquier comportamiento inesperado, podés reportarlo desde
          esta sección.
        </p>

        <p className="font-thin text-[#808080] text-sm leading-relaxed mt-4">
          Incluir una descripción detallada, capturas de pantalla y los pasos
          que realizaste antes de que ocurriera el error ayudará a nuestro
          equipo a identificar y resolver el inconveniente con mayor rapidez.
        </p>

        <p className="font-thin text-[#808080] text-sm mt-4">
          Reportes técnicos:{" "}
          <span className="font-medium text-[#4D4D4D]">
            orby.soporte@gmail.com
          </span>
        </p>
      </>
    ),
  };

  if (selectedTopic) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-poppins">
        <header className="relative flex items-center justify-center py-6 px-6 mb-8">
          <button
            onClick={() => setSelectedTopic(null)}
            className="absolute left-6 mt-3 text-xl text-black bg-white p-2 rounded-full shadow-md"
          >
            <Icon icon="ep:arrow-left-bold" />
          </button>

          <h1 className="text-xl mr-10 ml-10 font-semibold mt-4 text-black text-center">
            {selectedTopic}
          </h1>
        </header>

        <main className="flex-1 px-7">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {helpContent[selectedTopic]}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-poppins">
      <header className="relative flex items-center justify-center py-6 px-6">
        <button
          onClick={() => navigate("/profile")}
          className="absolute left-6 mt-3 text-xl text-black bg-white p-2 rounded-full shadow-md"
        >
          <Icon icon="ep:arrow-left-bold" />
        </button>

        <h1 className="text-2xl font-semibold mt-4 text-black text-center">
          Centro de ayuda
        </h1>
      </header>

      <main className="flex-1 px-6 pt-6 mb-10">
        <p className="text-[#686868] text-base mb-10 ml-2 text-left leading-relaxed">
          ¿Tenés un problema o una consulta? Estamos para ayudarte.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-black mb-4 ml-2">
            Preguntas frecuentes
          </h2>

          <div className="bg-white rounded-2xl shadow-sm">
            {faqItems.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedTopic(item)}
                className="flex justify-between items-center px-5 py-4 cursor-pointer"
              >
                <span className="font-medium text-black">{item}</span>
                <Icon
                  icon="ep:arrow-right-bold"
                  className="text-[#D0D0D0] text-xl"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-black mb-4 ml-2">
            Contactar soporte
          </h2>

          <div className="bg-white rounded-2xl shadow-sm">
            {supportItems.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedTopic(item)}
                className="flex justify-between items-center px-5 py-4 cursor-pointer"
              >
                <span className="font-medium text-black">{item}</span>
                <Icon
                  icon="ep:arrow-right-bold"
                  className="text-[#D0D0D0] text-xl"
                />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}