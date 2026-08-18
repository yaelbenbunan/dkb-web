import type { Metadata } from "next";
import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";
import { CalculadoraWizard } from "./_components/CalculadoraWizard";

export const metadata: Metadata = {
  title: "Llenar tu agenda es fácil. Ganar más, no",
  description:
    "Cualquiera te trae pacientes. Nosotros te decimos cuáles te dejan dinero, cuáles te lo quitan y qué hacer con eso. Desde 199 €/mes, sin permanencia.",
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: "Llenar tu agenda es fácil. Ganar más, no — dinkbit",
    description:
      "Cualquiera te trae pacientes. Te decimos cuáles te hacen ganar dinero.",
    siteName: "dinkbit",
  },
};

/** Ancho máximo propio: no usamos el Container del sitio para no heredar su
 *  escala, que está pensada para páginas corporativas y aquí se queda corta. */
function Wrap({
  children,
  narrow = false,
  className = "",
}: {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-6 md:px-10 ${narrow ? "max-w-3xl" : "max-w-6xl"} ${className}`}
    >
      {children}
    </div>
  );
}

/** Etiqueta pequeña en mayúsculas que abre cada sección. */
function Eyebrow({ children, color = T.lime }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      className="text-xs font-bold uppercase tracking-[0.28em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

/** Una fila del embudo. `ancho` es el porcentaje de la barra, que estrecha
 *  según avanza para que la caída se vea sin tener que leer los números. */
function FilaEmbudo({
  etiqueta,
  valor,
  ancho,
  nota,
}: {
  etiqueta: string;
  valor: string;
  ancho: number;
  nota?: string;
}) {
  return (
    <div className="py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: T.muted }}
        >
          {etiqueta}
        </span>
        <span
          className="font-black tabular-nums"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", color: T.fg }}
        >
          {valor}
        </span>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full"
        style={{ background: T.line }}
        aria-hidden
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${ancho}%`, background: T.lime, opacity: 0.55 }}
        />
      </div>
      {nota && (
        <p className="mt-2 text-sm" style={{ color: T.muted }}>
          {nota}
        </p>
      )}
    </div>
  );
}

const PIEZAS = [
  {
    n: "01",
    t: "Traemos pacientes",
    d: "Campañas en Google y Meta. Esto lo hace todo el mundo, y es la parte fácil.",
  },
  {
    n: "02",
    t: "Los recogemos sin que se pierda ninguno",
    d: "Una web hecha para convertir y un CRM de tres columnas que tu recepción sí va a usar, porque no tiene nada que rellenar.",
  },
  {
    n: "03",
    t: "Sabemos quién vino de verdad",
    d: "La cita entra en vuestra agenda de siempre. Al terminar, se marca si acudió y cuánto facturó. Dos toques.",
  },
  {
    n: "04",
    t: "Te decimos dónde está tu dinero",
    d: "Qué campaña te trae pacientes rentables y cuál solo te llena la agenda de gente que no vuelve.",
  },
];

export default function GrowthPage() {
  return (
    <>
      {/* ───────── 1. Hero ───────── */}
      <header className="relative overflow-hidden pb-20 pt-24 md:pb-28 md:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: T.lime, opacity: 0.1 }}
        />
        <Wrap className="relative">
          <Eyebrow>Para clínicas que ya invierten en publicidad</Eyebrow>

          <h1
            className="mt-8 font-black leading-[0.92] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.75rem, 8.5vw, 6.5rem)" }}
          >
            Llenar tu agenda
            <br />
            es fácil.
            <br />
            <span style={{ color: T.lime }}>Ganar más, no.</span>
          </h1>

          <p
            className="mt-10 max-w-2xl leading-relaxed"
            style={{ fontSize: "clamp(1.125rem, 2.2vw, 1.5rem)", color: T.muted }}
          >
            Cualquiera te trae pacientes. Nosotros te decimos{" "}
            <strong style={{ color: T.fg, fontWeight: 700 }}>
              cuáles te dejan dinero, cuáles te lo quitan
            </strong>{" "}
            y qué hacer con eso el mes que viene.
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href="#calculadora"
              className="inline-flex h-14 items-center justify-center rounded-full px-9 text-base font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: T.lime, color: T.ink }}
            >
              Calcula qué te cuesta un paciente
            </a>
            <span className="text-sm" style={{ color: T.muted }}>
              Gratis y en 1 minuto
            </span>
          </div>
        </Wrap>
      </header>

      {/* ───────── 2. El problema ───────── */}
      <section className="py-20 md:py-28" style={{ background: T.surface }}>
        <Wrap>
          <Eyebrow color={T.red}>El problema</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.02] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)" }}
          >
            Pagas los anuncios. Entran los leads. Alguien llama.
            <br />
            <span style={{ color: T.red }}>
              Y a partir de ahí, nadie sabe nada.
            </span>
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-lg font-bold">Tu agencia te enseña clics.</p>
              <p className="mt-2 leading-relaxed" style={{ color: T.muted }}>
                Impresiones, CTR, coste por lead. Ninguna de esas palabras
                aparece en tu cuenta del banco.
              </p>
            </div>
            <div>
              <p className="text-lg font-bold">Tu gestor te enseña facturación.</p>
              <p className="mt-2 leading-relaxed" style={{ color: T.muted }}>
                Un número al final del mes, sin decirte de dónde vino ni cuánto
                costó traerlo.
              </p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: T.red }}>
                Nadie une las dos.
              </p>
              <p className="mt-2 leading-relaxed" style={{ color: T.muted }}>
                Y en ese hueco es donde se decide si tu inversión en publicidad
                te hace ganar dinero o te lo come.
              </p>
            </div>
          </div>

          <p
            className="mt-14 max-w-3xl font-bold leading-snug"
            style={{ fontSize: "clamp(1.25rem, 2.8vw, 1.875rem)" }}
          >
            Puedes duplicar los pacientes y ganar menos que el año pasado. Pasa
            constantemente, y sin medirlo no te enteras hasta que es tarde.
          </p>
        </Wrap>
      </section>

      {/* ───────── 3. La solución ───────── */}
      <section className="py-20 md:py-28">
        <Wrap>
          <Eyebrow>La solución</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.02] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)" }}
          >
            Un sistema que sigue al paciente desde el anuncio{" "}
            <span style={{ color: T.lime }}>hasta la caja</span>.
          </h2>

          <p
            className="mt-6 max-w-2xl text-lg leading-relaxed"
            style={{ color: T.muted }}
          >
            Cuatro piezas conectadas. Por separado no valen nada; juntas te dan
            la única cifra que importa.
          </p>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl md:grid-cols-2" style={{ background: T.line }}>
            {PIEZAS.map((p) => (
              <div key={p.n} className="p-8 md:p-10" style={{ background: T.ink }}>
                <span
                  className="font-black tabular-nums"
                  style={{ fontSize: "2.5rem", color: T.lime, opacity: 0.35 }}
                >
                  {p.n}
                </span>
                <p className="mt-3 text-xl font-bold leading-snug">{p.t}</p>
                <p className="mt-3 leading-relaxed" style={{ color: T.muted }}>
                  {p.d}
                </p>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ───────── 4. El embudo con datos de ejemplo ───────── */}
      <section className="py-20 md:py-28" style={{ background: T.surface }}>
        <Wrap narrow>
          <Eyebrow>Lo que ves cada mes</Eyebrow>

          <h2
            className="mt-8 font-black leading-[1.02] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)" }}
          >
            Tu embudo entero, en una pantalla.
          </h2>

          <div
            className="mt-12 rounded-3xl p-7 md:p-10"
            style={{ background: T.ink, border: `1px solid ${T.line}` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]"
                style={{ background: T.line, color: T.muted }}
              >
                Ejemplo, no tus datos
              </span>
              <span className="text-sm" style={{ color: T.muted }}>
                Marzo
              </span>
            </div>

            <div className="mt-6">
              <FilaEmbudo etiqueta="Inviertes" valor="1.200 €" ancho={100} />
              <FilaEmbudo etiqueta="Leads" valor="34" ancho={100} />
              <FilaEmbudo etiqueta="Piden cita" valor="18" ancho={53} />
              <FilaEmbudo
                etiqueta="Acuden de verdad"
                valor="11"
                ancho={32}
                nota="Aquí es donde se cae todo el mundo, y donde nadie mira."
              />
            </div>

            <div className="mt-8 rounded-2xl p-6 md:p-8" style={{ background: T.lime }}>
              <p
                className="text-xs font-bold uppercase tracking-[0.24em]"
                style={{ color: T.ink, opacity: 0.7 }}
              >
                Te han facturado
              </p>
              <p
                className="mt-1 font-black leading-none tabular-nums"
                style={{ fontSize: "clamp(2.75rem, 9vw, 4.5rem)", color: T.ink }}
              >
                5.400 €
              </p>
              <p className="mt-3 font-bold" style={{ color: T.ink }}>
                Por cada euro invertido, has recuperado 4,50 €.
              </p>
            </div>

            <p className="mt-6 text-sm leading-relaxed" style={{ color: T.muted }}>
              Y desglosado por campaña, para que sepas cuál subir y cuál apagar
              el mes que viene. Eso es lo que hace que ganes más: no traer más
              pacientes, sino traer los que salen a cuenta.
            </p>
          </div>
        </Wrap>
      </section>

      {/* ───────── 5. La calculadora ───────── */}
      <section id="calculadora" className="scroll-mt-8 py-20 md:py-28">
        <Wrap narrow>
          <Eyebrow>Empieza por aquí</Eyebrow>

          <h2
            className="mt-8 font-black leading-[1.02] tracking-[-0.02em]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)" }}
          >
            ¿Cuánto te cuesta hoy conseguir un paciente?
          </h2>

          <p className="mt-6 text-lg leading-relaxed" style={{ color: T.muted }}>
            Tres preguntas. Si no sabes las respuestas, también nos vale — de
            hecho, eso ya es el diagnóstico.
          </p>

          <div className="mt-10">
            <CalculadoraWizard />
          </div>
        </Wrap>
      </section>

      {/* ───────── 6. Oferta y cierre ───────── */}
      <section className="py-20 md:py-28" style={{ background: T.surface }}>
        <Wrap narrow>
          <Eyebrow>Lo que cuesta</Eyebrow>

          <p
            className="mt-8 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(3.5rem, 13vw, 7rem)", color: T.lime }}
          >
            199 €<span style={{ fontSize: "0.3em", color: T.fg }}>/mes</span>
          </p>

          <p className="mt-6 text-xl font-bold leading-snug">
            Campañas, web, CRM, agenda y el panel. Todo dentro.
          </p>

          <ul className="mt-8 space-y-3 text-lg" style={{ color: T.muted }}>
            <li>
              <strong style={{ color: T.fg }}>Sin permanencia.</strong> Te quedas
              porque funciona, no porque te obliguemos.
            </li>
            <li>
              <strong style={{ color: T.fg }}>Hay una cuota de alta</strong>,
              porque montar todo esto lleva trabajo. Depende de lo que inviertas
              y de cuántos canales lleves.
            </li>
            <li>
              <strong style={{ color: T.fg }}>La inversión en publicidad</strong>{" "}
              la pagas tú directamente a Google y Meta. Nunca pasa por nosotros.
            </li>
          </ul>

          <div className="mt-14" style={{ borderTop: `1px solid ${T.line}` }}>
            <p
              className="mt-14 font-black leading-tight tracking-[-0.02em]"
              style={{ fontSize: "clamp(1.75rem, 4.5vw, 3rem)" }}
            >
              El objetivo no es llenarte la agenda.
              <br />
              <span style={{ color: T.lime }}>Es que ganes más.</span>
            </p>
            <a
              href="#calculadora"
              className="mt-10 inline-flex h-14 items-center justify-center rounded-full px-9 text-base font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: T.lime, color: T.ink }}
            >
              Calcula qué te cuesta un paciente
            </a>
          </div>
        </Wrap>
      </section>
    </>
  );
}
