import React from "react";
import { Icon } from "@iconify/react";

export default function PaymentSuccess({ loadingMsg, success }) {
  return (
    <div className="payment-success">
      {!success ? (
        <>
          <div className="loader"></div>
          <h2>{loadingMsg}</h2>
          <p>Solo serán unos segundos...</p>
        </>
      ) : (
        <>
          <div className="success-icon">
            <Icon icon="charm:tick" width="36" />
          </div>
          <h2>Método de pago añadido</h2>
          <p>¡Todo listo para contratar servicios!</p>
        </>
      )}
    </div>
  );
}
