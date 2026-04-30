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
    <section className="relative overflow-hidden py-24 md:py-32">
      <Container className="grid gap-16 lg:grid-cols-2 lg:gap-20">
        {/* Columna izquierda: Sobre dinkbit + globo */}
        <div className="relative">
          <Globe
            className="pointer-events-none absolute -left-12 -top-16 hidden h-[420px] w-[420px] opacity-60 md:block"
          />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
              Sobre dinkbit
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Soluciones digitales <span className="text-[--color-accent]">end-to-end</span> para
              marcas que quieren <span className="text-[--color-accent]">crecer</span>.
            </h2>
            <p className="mt-6 max-w-md text-[--color-fg-muted]">
              Diseñamos, desarrollamos y activamos proyectos digitales pensados
              para generar resultados medibles. Sin humo: análisis, ejecución e
              iteración constante.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/nosotros" size="lg">
                Conócenos
              </ButtonLink>
              <ButtonLink
                href="/casos-de-exito"
                size="lg"
                variant="ghost"
                className="gap-2"
              >
                Ver casos
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M3 7h8m0 0L7 3m4 4l-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Columna derecha: timeline 3 features */}
        <div className="relative">
          {/* Línea vertical detrás de los iconos */}
          <div
            aria-hidden
            className="absolute left-7 top-7 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-[--color-accent] via-[--color-border-strong] to-transparent"
          />
          <ul className="space-y-10">
            {FEATURES.map((f) => (
              <li key={f.title} className="relative flex gap-6">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg-elevated]">
                  <Image
                    src={f.iconSrc}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                </div>
                <div className="pt-2">
                  <p className="text-lg font-semibold text-[--color-fg]">
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
