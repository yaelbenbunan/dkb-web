"use client";

import { useEffect, useRef, useState } from "react";
import { Hueco } from "./Hueco";
import { PD, TITULO } from "./tema";

/**
 * Número grande que sube de 0 a su valor al entrar en pantalla.
 *
 * Sin dato real (`valor === null`) enseña `[X]` y no anima: un contador que sube
 * hasta un número inventado sería peor que no tener la franja.
 *
 * Muestra el valor final (es lo que pinta el servidor y lo que se ve sin
 * JavaScript) y solo cuenta desde 0 cuando entra en pantalla; antes de eso
 * está fuera de la vista y nadie ve el salto.
 */
export function Contador({ valor, sufijo = "", etiqueta }: { valor: number | null; sufijo?: string; etiqueta: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mostrado, setMostrado] = useState(valor ?? 0);

  useEffect(() => {
    const nodo = ref.current;
    if (valor === null || !nodo) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let marco = 0;
    const observador = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observador.disconnect();
      const inicio = performance.now();
      const paso = (t: number) => {
        const p = Math.min(1, (t - inicio) / 1200);
        setMostrado(Math.round(valor * (1 - Math.pow(1 - p, 3))));
        if (p < 1) marco = requestAnimationFrame(paso);
      };
      marco = requestAnimationFrame(paso);
    });
    observador.observe(nodo);
    return () => {
      observador.disconnect();
      cancelAnimationFrame(marco);
    };
  }, [valor]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-[56px] leading-none sm:text-[72px]" style={{ ...TITULO, color: PD.acentoClaro }}>
        {valor === null ? <Hueco>[X]</Hueco> : `${mostrado}${sufijo}`}
      </div>
      <p className="mt-4 text-[15px] font-semibold uppercase tracking-[0.06em]" style={{ color: PD.suave }}>
        {etiqueta}
      </p>
    </div>
  );
}
