"use client";

import { useEffect, useState } from "react";
import { PD } from "./tema";

/**
 * Botón fijo abajo en móvil que lleva al formulario. Se esconde mientras el
 * formulario está en pantalla (ahí sobra) y deja libre la esquina derecha, que
 * es la de la burbuja de WhatsApp.
 */
export function CtaMovil() {
  const [formularioVisible, setFormularioVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById("solicitud");
    if (!form || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setFormularioVisible(e.isIntersecting), { threshold: 0.15 });
    obs.observe(form);
    return () => obs.disconnect();
  }, []);

  return (
    <a
      href="#solicitud"
      aria-hidden={formularioVisible || undefined}
      tabIndex={formularioVisible ? -1 : undefined}
      className={`fixed bottom-5 left-4 right-24 z-40 flex min-h-[56px] items-center justify-center rounded-xl text-[16px] font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_18px_40px_-12px_rgba(24,123,239,.9)] transition-all duration-300 md:hidden ${formularioVisible ? "pointer-events-none translate-y-24 opacity-0" : ""}`}
      style={{ background: PD.acento }}
    >
      Quiero mi pack
    </a>
  );
}
