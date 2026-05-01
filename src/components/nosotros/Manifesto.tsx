import { Container } from "@/components/ui/Container";

/**
 * Sección de cita / manifiesto. Texto gigante en el centro con énfasis en azul.
 * Pensado para romper el ritmo visual entre bloques de información.
 */
export function Manifesto() {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(24,123,239,0.18), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-40"
      />

      <Container className="text-center">
        <span
          aria-hidden
          className="mx-auto block text-7xl leading-none text-[#187bef]/40 md:text-8xl"
        >
          “
        </span>
        <p
          className="mx-auto mt-2 max-w-4xl font-bold leading-[1.1] tracking-tight text-[--color-fg]"
          style={{ fontSize: "var(--text-display-md)" }}
        >
          No nos limitamos a entregar proyectos.{" "}
          <span className="italic text-[--color-accent]">
            Construimos relaciones largas
          </span>{" "}
          con marcas que quieren crecer y no dejar nada al azar.
        </p>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-[--color-fg-muted]">
          — El equipo dinkbit España
        </p>
      </Container>
    </section>
  );
}
