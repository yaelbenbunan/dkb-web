import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Globe } from "./Globe";

interface Feature {
  iconSrc: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    iconSrc: "/img/icons/features/experiencia.png",
    title: "+15 años de experiencia",
    description:
      "Más de una década diseñando, desarrollando y midiendo proyectos digitales que generan negocio.",
  },
  {
    iconSrc: "/img/icons/features/internacional.png",
    title: "Equipo internacional",
    description:
      "Sucursales en España y México: combinamos talento local con capacidad de escalar a más mercados.",
  },
  {
    iconSrc: "/img/icons/features/multidisciplinar.png",
    title: "Equipo multidisciplinar",
    description:
      "Diseño, desarrollo, paid media, SEO y contenido bajo el mismo techo. Sin pasarte de proveedor en proveedor.",
  },
];

export function AboutFeatures() {
  return (
    <section className="relative isolate overflow-hidden py-28 md:py-40">
      {/* Spotlight azul a la derecha */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "85%", ["--sy" as string]: "50%" }}
      />
      {/* Grid sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-40 fade-edges-y"
      />

      <Container className="grid gap-20 lg:grid-cols-2 lg:gap-24">
        {/* Columna izquierda: Sobre dinkbit + globo */}
        <div className="relative">
          <Globe className="pointer-events-none absolute -left-20 -top-24 hidden h-[480px] w-[480px] opacity-70 md:block" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
              Sobre dinkbit
            </p>
            <h2
              className="mt-6 font-black leading-[0.95] tracking-tight"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              Soluciones digitales{" "}
              <span className="text-[--color-accent]">end-to-end</span>
              <br />
              para marcas que quieren{" "}
              <span className="italic text-[--color-accent]">crecer.</span>
            </h2>
            <p className="mt-8 max-w-md text-lg text-[--color-fg-muted]">
              Diseñamos, desarrollamos y activamos proyectos digitales pensados
              para generar resultados medibles. Sin humo: análisis, ejecución e
              iteración constante.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ButtonLink
                href="/nosotros"
                size="lg"
                className="shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)]"
              >
                Conócenos →
              </ButtonLink>
              <ButtonLink
                href="/casos-de-exito"
                size="lg"
                variant="outline"
              >
                Casos de éxito →
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Columna derecha: timeline 3 features */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-7 top-7 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-[--color-accent] via-[--color-border-strong] to-transparent"
          />
          <ul className="space-y-12">
            {FEATURES.map((f) => (
              <li key={f.title} className="relative flex gap-6">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[--color-bg-elevated] ring-1 ring-[--color-accent]/30 shadow-[0_0_30px_rgba(24,123,239,0.2)]">
                  <Image
                    src={f.iconSrc}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                </div>
                <div className="pt-2">
                  <p className="text-2xl font-bold text-[--color-fg]">
                    {f.title}
                  </p>
                  <p className="mt-2 text-[--color-fg-muted]">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
