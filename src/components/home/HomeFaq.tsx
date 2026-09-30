import { Container } from "@/components/ui/Container";
import { HOME_FAQS } from "@/lib/home-faqs";

/**
 * Preguntas frecuentes de la portada, en texto visible.
 *
 * Va en `<details>` nativos y no en un acordeón de JavaScript a propósito: el
 * contenido está en el HTML aunque el bloque esté plegado, así que un rastreador
 * que no ejecute scripts —que son casi todos los de IA— lo lee entero. Un
 * acordeón que monta las respuestas al abrirlas se las esconde justo a quien más
 * interesa que las vea.
 */
export function HomeFaq() {
  return (
    <section className="py-20 md:py-24">
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Preguntas frecuentes
          </p>
          <h2
            className="mt-5 font-black leading-[1.1] tracking-tight"
            style={{ fontSize: "var(--text-display-md)" }}
          >
            Lo que nos preguntáis antes de empezar
          </h2>

          <div className="mt-10 border-t border-border/60">
            {HOME_FAQS.map((f) => (
              <details key={f.q} className="group border-b border-border/60 py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-bold">
                  <span>{f.q}</span>
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-xl leading-none text-accent transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
