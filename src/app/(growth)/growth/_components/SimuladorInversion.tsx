"use client";

import { useId, useState } from "react";
import { formatEur, formatEurCompacto as eur, simular } from "@/lib/growth-calc";
import { GROWTH_THEME as T } from "@/lib/growth-config";

const MIN_FACTOR = 0.25;
const MAX_FACTOR = 4;
const PASO = 50;
/** Con qué presupuesto se simula a quien todavía no invierte nada. */
export const INVERSION_REFERENCIA = 500;

const redondearA50 = (n: number) => Math.max(PASO, Math.round(n / PASO) * PASO);

export interface SituacionActual {
  inversion: number;
  pacientes: number;
  costePorPaciente: number;
  generado: number;
}

/** Una fila de la comparativa: concepto, hoy y con nosotros. */
function Fila({
  concepto,
  hoy,
  nosotros,
  destacar = false,
}: {
  concepto: string;
  hoy: string;
  nosotros: string;
  destacar?: boolean;
}) {
  const tamano = destacar ? "clamp(1.125rem, 4.5vw, 1.5rem)" : "clamp(0.9375rem, 3.4vw, 1.125rem)";
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 py-2.5 sm:gap-x-5"
      style={{ borderTop: `1px solid ${T.line}` }}
    >
      <span
        className="text-[0.65rem] font-bold uppercase leading-tight tracking-[0.06em]"
        style={{ color: T.muted }}
      >
        {concepto}
      </span>
      <span
        className="w-[4.75rem] whitespace-nowrap text-right font-bold tabular-nums sm:w-24"
        style={{ fontSize: tamano, color: T.muted }}
      >
        {hoy}
      </span>
      <span
        className="w-[5.25rem] whitespace-nowrap text-right font-black tabular-nums sm:w-28"
        style={{ fontSize: tamano, color: T.lime }}
      >
        {nosotros}
      </span>
    </div>
  );
}

/**
 * La comparativa completa: dónde está hoy y dónde estaría con nosotros.
 *
 * Dos decisiones que la gobiernan:
 *
 * - La columna de HOY está congelada en sus cifras reales. Es un hecho, no
 *   una hipótesis, y moverla con el deslizador la convertiría en otra
 *   simulación más — con lo que ya no habría contra qué comparar.
 * - El deslizador arranca en SU misma inversión. Así lo primero que ve es
 *   qué cambiaría con el mismo dinero, que es un argumento más difícil de
 *   rebatir que pedirle presupuesto. Subirlo es decisión suya.
 *
 * Todas las cifras viven en el mismo esquema a propósito: repartidas en
 * tarjetas sueltas obligan a recomponer mentalmente la comparación.
 */
export function SimuladorInversion({
  actual,
  costeConNosotros,
  ticket,
}: {
  /** Su situación de hoy. null = todavía no invierte. */
  actual: SituacionActual | null;
  /** El coste al que lo dejaríamos, antes del encarecimiento por escalar. */
  costeConNosotros: number;
  ticket: number;
}) {
  const id = useId();
  const base = redondearA50(actual?.inversion ?? INVERSION_REFERENCIA);
  const [inversion, setInversion] = useState(base);

  const min = redondearA50(base * MIN_FACTOR);
  const max = redondearA50(base * MAX_FACTOR);
  const progreso = ((inversion - min) / (max - min)) * 100;

  const nos = simular({ inversion, costeBase: costeConNosotros, inversionBase: base, ticket });

  const roasHoy = actual && actual.inversion > 0 ? actual.generado / actual.inversion : 0;
  const roasNos = inversion > 0 ? nos.generado / inversion : 0;
  const dejaHoy = actual ? actual.generado - actual.inversion : 0;
  const masAlMes = Math.round((nos.deja - dejaHoy) * 100) / 100;

  const nUm = (n: number) => n.toFixed(1).replace(".", ",");
  const pct = (n: number) => `${Math.round(n * 100)} %`;
  const guion = "—";

  return (
    <div
      className="mt-8 rounded-2xl p-5 text-left sm:p-7"
      style={{ background: T.ink, border: `1px solid ${T.lime}55` }}
    >
      {/* El deslizador mueve solo nuestra columna. */}
      <label
        htmlFor={id}
        className="text-[0.7rem] font-bold uppercase tracking-[0.2em]"
        style={{ color: T.lime }}
      >
        Ajusta la inversión de nuestro escenario
      </label>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
        <span
          className="font-black leading-none tabular-nums"
          style={{ fontSize: "clamp(2rem, 8vw, 2.75rem)", color: T.lime }}
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

      {/* Cabecera de las dos columnas. */}
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 pb-1 sm:gap-x-5">
        <span />
        <span
          className="w-[4.75rem] text-right text-[0.6rem] font-bold uppercase tracking-[0.14em] sm:w-24"
          style={{ color: T.muted }}
        >
          Hoy
        </span>
        <span
          className="w-[5.25rem] text-right text-[0.6rem] font-bold uppercase tracking-[0.14em] sm:w-28"
          style={{ color: T.lime }}
        >
          Con nosotros
        </span>
      </div>

      <Fila
        concepto="Inversión"
        hoy={actual ? eur(actual.inversion) : eur(0)}
        nosotros={eur(inversion)}
      />
      <Fila
        concepto="Pacientes"
        hoy={actual ? String(actual.pacientes) : "0"}
        nosotros={String(nos.pacientes)}
      />
      <Fila
        concepto="Coste / paciente"
        hoy={actual ? eur(actual.costePorPaciente) : guion}
        nosotros={eur(nos.costePorPaciente)}
      />
      <Fila
        concepto="Facturación"
        hoy={actual ? eur(actual.generado) : eur(0)}
        nosotros={eur(nos.generado)}
      />
      <Fila
        concepto="Te queda / paciente"
        hoy={actual ? eur(ticket - actual.costePorPaciente) : guion}
        nosotros={eur(ticket - nos.costePorPaciente)}
      />
      <Fila
        concepto="Retorno / €"
        hoy={actual ? `${nUm(roasHoy)} €` : guion}
        nosotros={`${nUm(roasNos)} €`}
      />
      <Fila
        concepto="Retorno %"
        hoy={actual ? pct(roasHoy) : guion}
        nosotros={pct(roasNos)}
      />
      <Fila
        concepto="Te queda al mes"
        hoy={actual ? eur(dejaHoy) : eur(0)}
        nosotros={eur(nos.deja)}
        destacar
      />

      {masAlMes > 0 && (
        <div className="mt-6 rounded-xl p-5" style={{ background: `${T.lime}14` }}>
          <p
            className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
            style={{ color: T.lime }}
          >
            Diferencia
          </p>
          <p
            className="mt-1 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(2rem, 9vw, 3.25rem)", color: T.lime }}
          >
            +{formatEur(masAlMes)}
          </p>
          <p className="mt-1 text-sm font-bold">más al mes en tu bolsillo</p>
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed" style={{ color: T.muted }}>
        Estimación conservadora con tus propias cifras, redondeada a la baja. Al subir el
        presupuesto el coste por paciente sube un poco: se compra tráfico cada vez menos fino,
        y eso pasaría con nosotros o sin nosotros.
      </p>
    </div>
  );
}
