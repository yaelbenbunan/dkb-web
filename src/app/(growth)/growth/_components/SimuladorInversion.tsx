"use client";

import { useId, useState } from "react";
import { formatEur, simular } from "@/lib/growth-calc";
import { GROWTH_THEME as T } from "@/lib/growth-config";

/** Los topes del deslizador, en múltiplos de la inversión de partida. */
const MIN_FACTOR = 0.25;
const MAX_FACTOR = 4;
/** Saltos de 50 € para que los números salgan redondos al arrastrar. */
const PASO = 50;

const redondearA50 = (n: number) => Math.max(PASO, Math.round(n / PASO) * PASO);

/**
 * Deslizador para que el usuario juegue con su inversión y vea qué pasaría.
 *
 * El valor de arranque es el que le proponemos, no el que tiene hoy: así lo
 * primero que ve es la recomendación, y a partir de ahí explora.
 *
 * El coste por paciente NO se mantiene plano al subir el presupuesto: se
 * encarece según `simular()`. Un deslizador que multiplicara los pacientes en
 * proporción exacta al dinero sería un juguete que promete lo imposible, y
 * quien lo detecte —cualquiera que ya haya escalado campañas— dejará de
 * creerse el resto de la página.
 */
export function SimuladorInversion({
  inversionInicial,
  inversionBase,
  costeBase,
  ticket,
}: {
  /** Dónde arranca el deslizador: nuestra recomendación. */
  inversionInicial: number;
  /** Su inversión de hoy, que es desde donde el coste empieza a encarecerse. */
  inversionBase: number;
  costeBase: number;
  ticket: number;
}) {
  const id = useId();
  const [inversion, setInversion] = useState(redondearA50(inversionInicial));

  const min = redondearA50(inversionBase * MIN_FACTOR);
  const max = redondearA50(inversionBase * MAX_FACTOR);
  const s = simular({ inversion, costeBase, inversionBase, ticket });

  return (
    <div
      className="mt-6 rounded-2xl p-6 sm:p-7"
      style={{ background: T.ink, border: `1px solid ${T.line}` }}
    >
      <label
        htmlFor={id}
        className="text-[0.7rem] font-bold uppercase tracking-[0.24em]"
        style={{ color: T.lime }}
      >
        Prueba tú mismo
      </label>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3">
        <span
          className="font-black leading-none tabular-nums"
          style={{ fontSize: "clamp(2.25rem, 9vw, 3.25rem)", color: T.fg }}
        >
          {formatEur(inversion)}
        </span>
        <span className="text-sm font-bold" style={{ color: T.muted }}>
          al mes en publicidad
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={PASO}
        value={inversion}
        onChange={(e) => setInversion(Number(e.target.value))}
        className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{
          // El relleno hasta el pulgar se pinta con un degradado duro: así se
          // ve cuánto se ha subido sin necesitar un elemento extra.
          background: `linear-gradient(to right, ${T.lime} 0%, ${T.lime} ${
            ((inversion - min) / (max - min)) * 100
          }%, ${T.line} ${((inversion - min) / (max - min)) * 100}%, ${T.line} 100%)`,
        }}
        aria-valuetext={`${formatEur(inversion)} al mes`}
      />

      <div className="mt-2 flex justify-between text-xs" style={{ color: T.muted }}>
        <span>{formatEur(min)}</span>
        <span>{formatEur(max)}</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div>
          <p
            className="text-[0.6rem] font-bold uppercase tracking-[0.14em]"
            style={{ color: T.muted }}
          >
            Pacientes
          </p>
          <p
            className="mt-1 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)", color: T.fg }}
          >
            {s.pacientes}
          </p>
        </div>
        <div>
          <p
            className="text-[0.6rem] font-bold uppercase tracking-[0.14em]"
            style={{ color: T.muted }}
          >
            Coste por paciente
          </p>
          <p
            className="mt-1 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)", color: T.fg }}
          >
            {formatEur(s.costePorPaciente)}
          </p>
        </div>
        <div>
          <p
            className="text-[0.6rem] font-bold uppercase tracking-[0.14em]"
            style={{ color: T.muted }}
          >
            Facturación
          </p>
          <p
            className="mt-1 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)", color: T.fg }}
          >
            {formatEur(s.generado)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl p-5" style={{ background: `${T.lime}14` }}>
        <p
          className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
          style={{ color: T.lime }}
        >
          Te quedaría al mes
        </p>
        <p
          className="mt-1 font-black leading-none tabular-nums"
          style={{ fontSize: "clamp(2rem, 9vw, 3rem)", color: T.lime }}
        >
          {formatEur(s.deja)}
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed" style={{ color: T.muted }}>
        Al subir el presupuesto, el coste por paciente sube un poco: se compra
        tráfico cada vez menos fino. Lo tenemos en cuenta aquí en vez de multiplicar
        los pacientes en proporción al dinero, que es lo que no pasa en la realidad.
      </p>
    </div>
  );
}
