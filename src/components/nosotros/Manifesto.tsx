import { Container } from "@/components/ui/Container";

/**
 * Cita de cierre. Padding compacto, fondo con luz azul potente y
 * comillas grandes decorativas marcadas en accent.
 */
export function Manifesto() {
  return (
    <section className="relative isolate overflow-hidden py-14 md:py-16">
      {/* Spotlight azul intenso central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(24,123,239,0.32), transparent 65%)",
        }}
      />
      {/* Glow blob azul a la izquierda */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(58,144,242,0.5), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Glow blob azul a la derecha */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(24,123,239,0.5), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Dots pattern de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-30"
      />
      {/* Línea brillante azul arriba y abajo */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
      />

      <Container className="relative text-center">
        {/* Comillas grandes con glow azul */}
        <span
          aria-hidden
          className="mx-auto block text-8xl font-black leading-none text-[#3a90f2] md:text-9xl"
          style={{
            textShadow:
              "0 0 40px rgba(58,144,242,0.6), 0 0 80px rgba(24,123,239,0.3)",
            lineHeight: 0.6,
          }}
        >
          “
        </span>
        <p
          className="mx-auto mt-6 max-w-4xl font-bold leading-[1.15] tracking-tight text-[--color-fg]"
          style={{ fontSize: "var(--text-display-md)" }}
        >
          No nos limitamos a entregar proyectos.
          <br />
          Construimos relaciones largas con marcas que{" "}
          <span className="italic text-[--color-accent]">
            quieren un partner
          </span>
          ,{" "}
          <span className="whitespace-nowrap">no un proveedor.</span>
        </p>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-[--color-fg-muted]">
          — El equipo dinkbit España
        </p>
      </Container>
    </section>
  );
}
