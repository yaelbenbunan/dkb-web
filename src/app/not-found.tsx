import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description:
    "La página que buscas no existe o ha sido movida. Vuelve al inicio o explora nuestros servicios.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content">
        <section className="relative isolate overflow-hidden bg-bg-deep py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-40"
      />
      <Container>
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 text-fg">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Error 404
          </p>
          <h1
            className="font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            Esta página se ha{" "}
            <span className="text-accent">perdido en el camino.</span>
          </h1>
          <p className="max-w-md text-lg text-fg-muted">
            La URL que buscas no existe o ha sido movida. Vuelve al inicio o
            descubre lo que hacemos.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ButtonLink href="/">Volver al inicio</ButtonLink>
            <ButtonLink href="/servicios" variant="secondary">
              Ver servicios
            </ButtonLink>
          </div>

          <ul className="mt-6 grid gap-2 text-sm text-fg-muted">
            <li>
              <Link
                href="/casos-de-exito"
                className="font-semibold text-accent hover:underline"
              >
                Casos de éxito →
              </Link>
            </li>
            <li>
              <Link
                href="/nosotros"
                className="font-semibold text-accent hover:underline"
              >
                Sobre dinkbit →
              </Link>
            </li>
            <li>
              <Link
                href="/contacto"
                className="font-semibold text-accent hover:underline"
              >
                Contacto →
              </Link>
            </li>
          </ul>
          </div>
        </Container>
      </section>
      </main>
      <Footer />
    </>
  );
}
