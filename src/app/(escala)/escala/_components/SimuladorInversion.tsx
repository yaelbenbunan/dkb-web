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

/** Una fila de la comparativa: concepto, ahora y con nosotros. */
function Fila({
  concepto,
  ahora,
  conNosotros,
  crecimiento,
  destacar = false,
}: {
  concepto: string;
  ahora: string;
  conNosotros: string;
  /** Anotación bajo la cifra nuestra, del tipo "+11 %". */
  crecimiento?: string;
  destacar?: boolean;
}) {
  const tamano = destacar
    ? "clamp(1.125rem, 4.5vw, 1.5rem)"
    : "clamp(0.9375rem, 3.4vw, 1.125rem)";
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 py-3 sm:gap-x-5"
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
        {ahora}
      </span>
      <span className="w-[5.25rem] text-right sm:w-28">
        <span
          className="block whitespace-nowrap font-black tabular-nums"
          style={{ fontSize: tamano, color: T.lime }}
        >
          {conNosotros}
        </span>
        {crecimiento && (
          <span
            className="block whitespace-nowrap text-[0.7rem] font-bold tabular-nums"
            style={{ color: T.lime }}
          >
            {crecimiento}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * La proyección con nuestro sistema, comparada contra su situación real.
 *
 * Dos decisiones que la gobiernan:
 *
 * - La columna de AHORA está congelada en sus cifras reales. Es un hecho, no
 *   una hipótesis, y moverla con el deslizador la convertiría en otra
 *   simulación más, con lo que ya no habría contra qué comparar.
 * - El deslizador arranca en SU misma inversión y va DEBAJO de la tabla.
 *   Primero se entiende la comparación con el dinero que ya se gasta, que es
 *   más difícil de rebatir que pedirle presupuesto, y solo después se le
 *   invita a jugar.
 */
export function SimuladorInversion({
  actual,
  costeConNosotros,
  ticket,
}: {
  /** Su situación de hoy. null = todavía no invierte. */
  actual: SituacionActual | null;
  /** El coste al que dejaríamos su captación, antes de escalar. */
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

  const dejaAhora = actual ? actual.generado - actual.inversion : 0;
  const masAlMes = Math.round((nos.deja - dejaAhora) * 100) / 100;
  const crecePacientes =
    actual && actual.pacientes > 0
      ? Math.round(((nos.pacientes - actual.pacientes) / actual.pacientes) * 100)
      : null;

  return (
    <div
      className="rounded-2xl p-5 sm:p-7"
      style={{ background: T.ink, border: `1px solid ${T.lime}55` }}
    >
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em]" style={{ color: T.lime }}>
        Con nuestro sistema
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: T.muted }}>
        Bajamos un 20 % lo que cuesta traer cada paciente. Con el mismo dinero, entran más.
      </p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 pb-1 sm:gap-x-5">
        <span />
        <span
          className="w-[4.75rem] text-right text-[0.6rem] font-bold uppercase tracking-[0.12em] sm:w-24"
          style={{ color: T.muted }}
        >
          Ahora
        </span>
        <span
          className="w-[5.25rem] text-right text-[0.6rem] font-bold uppercase tracking-[0.12em] sm:w-28"
          style={{ color: T.lime }}
        >
          Con nosotros
        </span>
      </div>

      <Fila
        concepto="Inversión al mes"
        ahora={actual ? eur(actual.inversion) : eur(0)}
        conNosotros={eur(inversion)}
      />
      <Fila
        concepto="Coste por paciente"
        ahora={actual ? eur(actual.costePorPaciente) : "—"}
        conNosotros={eur(nos.costePorPaciente)}
      />
      <Fila
        concepto="Pacientes nuevos"
        ahora={actual ? String(actual.pacientes) : "0"}
        conNosotros={String(nos.pacientes)}
        crecimiento={
          crecePacientes !== null && crecePacientes > 0 ? `+${crecePacientes} %` : undefined
        }
      />
      <Fila
        concepto="Facturación"
        ahora={actual ? eur(actual.generado) : eur(0)}
        conNosotros={eur(nos.generado)}
      />
      <Fila
        concepto="Te queda al mes"
        ahora={actual ? eur(dejaAhora) : eur(0)}
        conNosotros={eur(nos.deja)}
        destacar
      />

      <div className="mt-7 rounded-xl p-4" style={{ background: T.surface }}>
        <label
          htmlFor={id}
          className="text-[0.65rem] font-bold uppercase tracking-[0.16em]"
          style={{ color: T.muted }}
        >
          ¿Y si invirtieras…?
        </label>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span
            className="font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)", color: T.fg }}
          >
            {formatEur(inversion)}
          </span>
          <span className="text-xs font-bold" style={{ color: T.muted }}>
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
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, ${T.lime} 0%, ${T.lime} ${progreso}%, ${T.line} ${progreso}%, ${T.line} 100%)`,
          }}
          aria-valuetext={`${formatEur(inversion)} al mes`}
        />
      </div>

      {masAlMes > 0 && (
        <div className="mt-6 rounded-xl p-5" style={{ background: `${T.lime}14` }}>
          <p className="text-sm font-bold leading-snug">
            {actual
              ? "Con nuestro sistema estarías generando"
              : "Empezando a invertir estarías generando"}
          </p>
          <p
            className="mt-1 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(2.25rem, 10vw, 3.5rem)", color: T.lime }}
          >
            +{eur(masAlMes)}
          </p>
          <p className="mt-1 text-sm font-bold">más al mes que ahora</p>
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed" style={{ color: T.muted }}>
        Estimación conservadora con tus propias cifras, redondeada a la baja. Al subir el
        presupuesto el coste por paciente sube un poco: se compra tráfico cada vez menos fino, y
        eso pasaría con nosotros o sin nosotros.
      </p>
    </div>
  );
}
