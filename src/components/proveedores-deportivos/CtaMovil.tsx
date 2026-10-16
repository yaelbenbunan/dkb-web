"use client";

import { useEffect, useState } from "react";
import { PD } from "./tema";

/**
 * Botón fijo abajo en móvil que lleva al formulario. Se esconde mientras el
 * formulario o el CTA final están en pantalla (ahí sobra, y con el CTA final se
 * verían dos botones iguales seguidos) y deja libre la esquina derecha, que es
 * la de la burbuja de WhatsApp.
 */
export function CtaMovil() {
  const [formularioVisible, setFormularioVisible] = useState(false);

  useEffect(() => {
    const destinos = ["solicitud", "cta-final"].map((id) => document.getElementById(id)).filter((n): n is HTMLElement => n !== null);
    if (destinos.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visibles = new Set<Element>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target);
          else visibles.delete(e.target);
        }
        setFormularioVisible(visibles.size > 0);
      },
      { threshold: 0.15 },
    );
    destinos.forEach((n) => obs.observe(n));
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
