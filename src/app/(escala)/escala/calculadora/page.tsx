import type { Metadata } from "next";
import Link from "next/link";
import { CalculadoraWizard } from "../_components/CalculadoraWizard";
import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * La calculadora, fuera de la landing.
 *
 * Vivía al final de la página de captación y hacía dos cosas a la vez: cerrar
 * el argumento y capturar el lead. Al ponerle un formulario propio al hero, esa
 * segunda función deja de ser suya, y lo que queda —tres preguntas sobre tus
 * números— es una herramienta, no un cierre.
 *
 * Separarla mejora las dos: la landing termina en su mejor frase en vez de en
 * un formulario, y la calculadora se puede enlazar suelta —en una llamada, en
 * un correo, en un anuncio— sin arrastrar la página entera detrás.
 */
export const metadata: Metadata = {
  // Sin "— dinkbit" al final: la plantilla de título del layout raíz ya lo
  // añade, y con los dos salía dos veces.
  title: "¿Cuánto te cuesta conseguir un paciente?",
  description:
    "Tres preguntas y te decimos lo que te cuesta hoy cada paciente nuevo. Gratis y en un minuto.",
};

export default function Calculadora() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/escala"
          className="text-sm font-bold underline underline-offset-4"
          style={{ color: T.muted }}
        >
          ← Volver
        </Link>

        <p
          className="mt-8 text-xs font-bold uppercase tracking-[0.28em]"
          style={{ color: T.lime }}
        >
          Empieza por aquí
        </p>

        <h1
          className="mt-8 font-black leading-[1.05] tracking-[-0.02em] text-balance"
          style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)" }}
        >
          ¿Cuánto te cuesta hoy conseguir un paciente?
        </h1>

        <p className="mt-6 text-lg leading-relaxed" style={{ color: T.muted }}>
          Tres preguntas. Si no sabes las respuestas, también nos vale — de hecho, eso ya es el
          diagnóstico.
        </p>

        <div className="mt-10">
          <CalculadoraWizard />
        </div>
      </div>
    </section>
  );
}
