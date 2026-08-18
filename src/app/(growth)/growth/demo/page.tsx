import type { Metadata } from "next";
import { calcular, parseImporte } from "@/lib/growth-calc";
import { GROWTH_THEME as T } from "@/lib/growth-config";
import { CalculadoraWizard } from "../_components/CalculadoraWizard";

/**
 * Ruta de demostración del simulador, para enseñarlo sin recorrer el embudo.
 *
 * Vive aparte de `/growth` por tres motivos:
 *
 * 1. La landing sigue siendo estática. Leer parámetros de la URL obliga a
 *    renderizar en cada petición, y no compensa pagarlo en la página que
 *    recibe el tráfico de pago.
 * 2. Aquí NO se guarda lead ni se disparan conversiones. Un enlace de
 *    demostración que mandara leads falsos a Meta y a GA4 envenenaría
 *    justamente los datos con los que se optimizan las campañas.
 * 3. El resultado lo calcula el servidor y se le pasa ya hecho al wizard.
 *    El cliente sigue sin poder calcular, que es lo que impide enseñar el
 *    resultado sin pedir el contacto en el embudo de verdad.
 *
 * Uso: /growth/demo?inv=1500&pac=45&tk=250
 */
export const metadata: Metadata = {
  title: "Simulador (demostración)",
  // Nunca en buscadores: no es una página de captación y competiría con la
  // landing real por las mismas búsquedas.
  robots: { index: false, follow: false },
};

/** Valores por defecto, para que /growth/demo a secas ya enseñe algo. */
const POR_DEFECTO = { inv: "1500", pac: "45", tk: "250" };

export default async function GrowthDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ inv?: string; pac?: string; tk?: string }>;
}) {
  const q = await searchParams;

  const resultado = calcular({
    inversion: parseImporte(q.inv ?? POR_DEFECTO.inv),
    pacientes: parseImporte(q.pac ?? POR_DEFECTO.pac),
    ticket: parseImporte(q.tk ?? POR_DEFECTO.tk),
  });

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto w-full max-w-3xl px-6 md:px-10">
        <p
          className="text-xs font-bold uppercase tracking-[0.28em]"
          style={{ color: T.lime }}
        >
          Demostración
        </p>
        <h1
          className="mt-6 font-black leading-[1.05] tracking-[-0.02em] text-balance"
          style={{ fontSize: "clamp(2rem, 5.5vw, 3rem)" }}
        >
          Así queda el simulador.
        </h1>
        <p className="mt-5 leading-relaxed" style={{ color: T.muted }}>
          Con {q.inv ?? POR_DEFECTO.inv} € al mes, {q.pac ?? POR_DEFECTO.pac} pacientes y un
          ticket medio de {q.tk ?? POR_DEFECTO.tk} €. Cambia{" "}
          <code style={{ color: T.fg }}>inv</code>, <code style={{ color: T.fg }}>pac</code> y{" "}
          <code style={{ color: T.fg }}>tk</code> en la dirección para probar otras cifras.
        </p>
        <p className="mt-3 text-sm" style={{ color: T.muted }}>
          Esta página no guarda ningún lead ni cuenta como conversión.
        </p>

        <div className="mt-10">
          <CalculadoraWizard resultadoInicial={resultado} />
        </div>
      </div>
    </section>
  );
}
