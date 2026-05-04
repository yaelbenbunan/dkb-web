import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";
import { CONTACT_INFO } from "@/lib/contact-info";
import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-bg-deep pt-20">
      {/* Línea superior azul para separar del contenido anterior */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
      />
      {/* Spotlight azul en la parte superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "50%", ["--sy" as string]: "0%" }}
      />
      {/* Textura de grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50 fade-edges-y"
      />
      {/* Dots sutiles encima */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-30"
      />
      <Container className="grid gap-12 pb-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" aria-label="dinkbit — inicio">
            <Image
              src="/img/logo/dinkbit.svg"
              alt="dinkbit"
              width={140}
              height={36}
              className="h-9 w-auto"
            />
          </Link>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-fg-muted">
            Agencia digital en España.{" "}
            <span className="text-fg">
              Diseño, desarrollo y campañas
            </span>{" "}
            que generan negocio.
          </p>
        </div>

        <nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-dim">
            Navegación
          </p>
          <ul className="mt-4 space-y-3">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="text-base text-fg-muted transition-colors hover:text-accent"
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-dim">
            Contacto
          </p>
          <ul className="mt-4 space-y-3 text-base text-fg-muted">
            <li>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="transition-colors hover:text-accent"
              >
                {CONTACT_INFO.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${CONTACT_INFO.phoneE164}`}
                className="transition-colors hover:text-accent"
              >
                {CONTACT_INFO.phone}
              </a>
            </li>
            <li className="pt-2 text-sm leading-relaxed text-fg-dim">
              {CONTACT_INFO.address.line1}
              <br />
              {CONTACT_INFO.address.line2}
            </li>
          </ul>
        </div>
      </Container>

      <Container className="flex flex-col items-start gap-6 border-t border-border/60 py-6 text-xs text-fg-dim md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
          <span>
            © {new Date().getFullYear()} dinkbit. Todos los derechos reservados.
          </span>
          <span>Hecho con cariño en Madrid · Ciudad de México</span>
        </div>
        <ThemeToggle />
      </Container>
    </footer>
  );
}
