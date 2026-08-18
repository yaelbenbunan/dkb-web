"use client";

import { useId, useState } from "react";
import { formatEur, simular } from "@/lib/growth-calc";
import { GROWTH_THEME as T } from "@/lib/growth-config";

/** Los topes del deslizador, en múltiplos de la inversión de referencia. */
const MIN_FACTOR = 0.25;
const MAX_FACTOR = 4;
/** Saltos de 50 € para que los números salgan redondos al arrastrar. */
const PASO = 50;
/** Con qué presupuesto se simula a quien todavía no invierte nada. */
export const INVERSION_REFERENCIA = 500;

const redondearA50 = (n: number) => Math.max(PASO, Math.round(n / PASO) * PASO);

function Celda({
  etiqueta,
  valor,
  color,
  destacar = false,
}: {
  etiqueta: string;
  valor: string;
  color: string;
  destacar?: boolean;
}) {
  return (
    <div className="py-2.5" style={{ borderTop: `1px solid ${T.line}` }}>
      <p
        className="text-[0.6rem] font-bold uppercase tracking-[0.14em]"
        style={{ color: T.muted }}
      >
        {etiqueta}
      </p>
      <p
        className="mt-0.5 font-black leading-none tabular-nums"
        style={{ fontSize: destacar ? "clamp(1.375rem, 5vw, 1.75rem)" : "1.125rem", color }}
      >
        {valor}
      </p>
    </div>
  );
}

/**
 * Comparativa interactiva: lo que consigue hoy con ese dinero y lo que
 * conseguiría con nosotros.
 *
 * Arranca en SU inversión actual y no en una mayor, a propósito: el argumento
 * más fuerte no es "gasta más y tendrás más" —eso lo dice cualquiera— sino
 * "con el mismo dinero, esto es lo que cambiaría". Que suba el presupuesto es
 * una decisión suya, y para eso está el deslizador.
 *
 * El coste por paciente NO se mantiene plano al subir el presupuesto: se
 * encarece según `simular()`, en las dos columnas por igual. Un simulador que
 * multiplicara los pacientes en proporción exacta al dinero sería un juguete
 * que promete lo imposible, y cualquiera que ya haya escalado campañas lo
 * detectaría.
 */
export function SimuladorInversion({
  inversionActual,
  costeActual,
  costeConNosotros,
  ticket,
}: {
  /** Lo que invierte hoy. null = todavía no invierte. */
  inversionActual: number | null;
  /** Su coste por paciente de hoy. null = no hay con qué comparar. */
  costeActual: number | null;
  /** El coste al que lo dejaríamos, antes del encarecimiento por escalar. */
  costeConNosotros: number;
  ticket: number;
}) {
  const id = useId();
  const base = redondearA50(inversionActual ?? INVERSION_REFERENCIA);
  const [inversion, setInversion] = useState(base);

  const min = redondearA50(base * MIN_FACTOR);
  const max = redondearA50(base * MAX_FACTOR);

  const hoy =
    costeActual !== null
      ? simular({ inversion, costeBase: costeActual, inversionBase: base, ticket })
      : null;
  const nosotros = simular({
    inversion,
    costeBase: costeConNosotros,
    inversionBase: base,
    ticket,
  });

  // Quien no invierte hoy no gana nada por publicidad, así que la mejora es
  // todo lo que dejaría el escenario con nosotros.
  const masAlMes = Math.round((nosotros.deja - (hoy?.deja ?? 0)) * 100) / 100;
  const progreso = ((inversion - min) / (max - min)) * 100;

  return (
    <div
      className="mt-8 rounded-2xl p-6 text-left sm:p-7"
      style={{ background: T.ink, border: `1px solid ${T.lime}55` }}
    >
      <label
        htmlFor={id}
        className="text-[0.7rem] font-bold uppercase tracking-[0.24em]"
        style={{ color: T.lime }}
      >
        {inversionActual === null
          ? "Simulación con una inversión de referencia"
          : "Con lo que inviertes hoy"}
      </label>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3">
        <span
          className="font-black leading-none tabular-nums"
          style={{ fontSize: "clamp(2.25rem, 9vw, 3rem)", color: T.fg }}
        >
          {formatEur(inversion)}
        </span>
        <span className="text-sm font-bold" style={{ color: T.muted }}>
          al mes
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
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, ${T.lime} 0%, ${T.lime} ${progreso}%, ${T.line} ${progreso}%, ${T.line} 100%)`,
        }}
        aria-valuetext={`${formatEur(inversion)} al mes`}
      />
      <div className="mt-1.5 flex justify-between text-xs" style={{ color: T.muted }}>
        <span>{formatEur(min)}</span>
        <span>Mueve la barra para probar</span>
        <span>{formatEur(max)}</span>
      </div>

      {/* Las dos columnas: su realidad y la nuestra, con el mismo dinero. */}
      <div className="mt-7 grid grid-cols-2 gap-x-5 sm:gap-x-8">
        <div>
          <p
            className="text-[0.65rem] font-bold uppercase tracking-[0.18em]"
            style={{ color: T.muted }}
          >
            Hoy
          </p>
          {hoy ? (
            <>
              <Celda etiqueta="Pacientes" valor={String(hoy.pacientes)} color={T.fg} />
              <Celda
                etiqueta="Coste por paciente"
                valor={formatEur(hoy.costePorPaciente)}
                color={T.fg}
              />
              <Celda etiqueta="Facturación" valor={formatEur(hoy.generado)} color={T.fg} />
              <Celda
                etiqueta="Te queda"
                valor={formatEur(hoy.deja)}
                color={T.fg}
                destacar
              />
            </>
          ) : (
            <>
              <Celda etiqueta="Pacientes" valor="0" color={T.muted} />
              <Celda etiqueta="Coste por paciente" valor="—" color={T.muted} />
              <Celda etiqueta="Facturación" valor={formatEur(0)} color={T.muted} />
              <Celda etiqueta="Te queda" valor={formatEur(0)} color={T.muted} destacar />
            </>
          )}
        </div>

        <div>
          <p
            className="text-[0.65rem] font-bold uppercase tracking-[0.18em]"
            style={{ color: T.lime }}
          >
            Con nosotros
          </p>
          <Celda etiqueta="Pacientes" valor={String(nosotros.pacientes)} color={T.lime} />
          <Celda
            etiqueta="Coste por paciente"
            valor={formatEur(nosotros.costePorPaciente)}
            color={T.lime}
          />
          <Celda etiqueta="Facturación" valor={formatEur(nosotros.generado)} color={T.lime} />
          <Celda etiqueta="Te queda" valor={formatEur(nosotros.deja)} color={T.lime} destacar />
        </div>
      </div>

      {masAlMes > 0 && (
        <div className="mt-7 rounded-xl p-5" style={{ background: `${T.lime}14` }}>
          <p
            className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
            style={{ color: T.lime }}
          >
            Te quedarían
          </p>
          <p
            className="mt-1 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(2.25rem, 10vw, 3.5rem)", color: T.lime }}
          >
            +{formatEur(masAlMes)}
          </p>
          <p className="mt-1 text-sm font-bold">más al mes</p>
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed" style={{ color: T.muted }}>
        Simulación con tus propias cifras, conservadora y redondeada siempre a la baja. Al
        subir el presupuesto el coste por paciente sube un poco en las dos columnas: se compra
        tráfico cada vez menos fino, y eso pasa nos contrates o no.
      </p>
    </div>
  );
}
