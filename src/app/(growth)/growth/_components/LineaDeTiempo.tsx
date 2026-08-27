"use client";

import { useEffect, useRef, useState } from "react";
import { GROWTH_THEME as T } from "@/lib/growth-config";

export interface PasoLinea {
  n: string;
  t: string;
  d: string;
}

/**
 * Los pasos del sistema, que se van encendiendo según el usuario baja.
 *
 * El hilo que los une se rellena al hacer scroll: es lo que comunica que esto
 * es una secuencia con un principio y un final, y no cuatro servicios sueltos
 * en una lista. Sin el relleno, la línea es decoración; con él, es un proceso.
 *
 * Se usa IntersectionObserver y no las animaciones ligadas al scroll de CSS
 * (`animation-timeline`) porque el soporte de éstas todavía deja fuera a
 * Firefox, y esta landing va a recibir tráfico de pago de todo tipo de
 * navegador.
 */
export function LineaDeTiempo({ pasos }: { pasos: PasoLinea[] }) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  // -1 = ninguno visto todavía. Solo avanza, nunca retrocede: al volver hacia
  // arriba el camino se queda recorrido, que es como se lee un progreso.
  const [activo, setActivo] = useState(-1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const i = refs.current.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setActivo((prev) => (i > prev ? i : prev));
        }
      },
      // Se enciende cuando el paso llega al tercio inferior de la pantalla:
      // antes resulta prematuro y después el usuario ya lo ha leído apagado.
      { rootMargin: "0px 0px -33% 0px", threshold: 0.1 },
    );

    for (const el of refs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [pasos.length]);

  const relleno = activo < 0 ? 0 : ((activo + 1) / pasos.length) * 100;

  return (
    <ol className="relative mt-14">
      {/* Raíl completo, siempre visible. */}
      <div
        aria-hidden
        className="absolute bottom-6 left-[1.4375rem] top-6 w-px md:left-[1.6875rem]"
        style={{ background: T.line }}
      />
      {/* Relleno que avanza con el scroll. */}
      <div
        aria-hidden
        className="absolute left-[1.4375rem] top-6 w-px motion-safe:transition-[height] motion-safe:duration-700 motion-safe:ease-out md:left-[1.6875rem]"
        style={{ height: `calc(${relleno}% - 1.5rem)`, background: T.lime }}
      />

      {pasos.map((p, i) => {
        const encendido = i <= activo;
        return (
          <li
            key={p.n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="relative flex gap-6 pb-14 last:pb-0 md:gap-9"
          >
            <span
              className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums motion-safe:transition-colors motion-safe:duration-500 md:h-14 md:w-14 md:text-base"
              style={{
                background: encendido ? T.lime : T.surface,
                color: encendido ? T.ink : T.muted,
                border: `1px solid ${encendido ? T.lime : T.line}`,
              }}
            >
              {p.n}
            </span>

            <div className="pt-1.5 md:pt-3">
              <p
                className="font-black leading-tight"
                style={{ fontSize: "clamp(1.375rem, 2.4vw, 2.125rem)" }}
              >
                {p.t}
              </p>
              <p
                className="mt-3 max-w-2xl leading-relaxed"
                style={{ fontSize: "clamp(1.0625rem, 1.4vw, 1.25rem)", color: T.muted }}
              >
                {p.d}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
