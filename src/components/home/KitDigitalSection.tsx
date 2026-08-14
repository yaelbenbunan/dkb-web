import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import {
  KIT_SOLUCIONES,
  KitSolucionIcon,
} from "@/components/kit-digital/soluciones";

export function KitDigitalSection() {
  return (
    <section className="relative isolate overflow-hidden py-24 md:py-32">
      {/* Spotlight azul a la izquierda */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "18%", ["--sy" as string]: "40%" }}
      />
      {/* Grid sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-40 fade-edges-y"
      />

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Kit Digital
            </p>
            <h2 className="mt-6 text-3xl font-black leading-tight tracking-tight md:text-5xl">
              Somos Agente Digitalizador adherido
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
              El Kit Digital es la ayuda pública para digitalizar tu negocio.
              Nosotros nos encargamos de toda la tramitación y ejecutamos la
              solución: tú solo eliges qué necesitas.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KIT_SOLUCIONES.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i, 4) * 0.07}>
              <div className="surface h-full rounded-2xl p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                  <KitSolucionIcon icon={s.icon} />
                </span>
                <p className="mt-4 text-base font-bold text-fg">{s.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {s.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/kit-digital-2026" size="lg">
              Apúntate a la convocatoria 2026
            </ButtonLink>
            <ButtonLink href="/puesto-seguro" variant="outline" size="lg">
              Ver equipos del puesto seguro
            </ButtonLink>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-fg-muted">
            La nueva convocatoria está pendiente de publicación oficial. Te
            avisamos en cuanto se reactive.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
