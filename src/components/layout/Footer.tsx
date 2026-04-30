import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";
import { CONTACT_INFO } from "@/lib/contact-info";

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[#070810] pt-20">
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
          <p className="mt-6 max-w-sm text-base leading-relaxed text-[--color-fg-muted]">
            Agencia digital en España.{" "}
            <span className="text-[--color-fg]">
              Diseño, desarrollo y campañas
            </span>{" "}
            que generan negocio.
          </p>
        </div>

        <nav>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--color-fg-dim]">
            Navegación
          </p>
          <ul className="mt-4 space-y-3">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="text-base text-[--color-fg-muted] transition-colors hover:text-[--color-accent]"
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--color-fg-dim]">
            Contacto
          </p>
          <ul className="mt-4 space-y-3 text-base text-[--color-fg-muted]">
            <li>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="transition-colors hover:text-[--color-accent]"
              >
                {CONTACT_INFO.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${CONTACT_INFO.phoneE164}`}
                className="transition-colors hover:text-[--color-accent]"
              >
                {CONTACT_INFO.phone}
              </a>
            </li>
            <li className="pt-2 text-sm leading-relaxed text-[--color-fg-dim]">
              {CONTACT_INFO.address.line1}
              <br />
              {CONTACT_INFO.address.line2}
            </li>
          </ul>
        </div>
      </Container>

      <Container className="flex items-center justify-between py-6 text-xs text-[--color-fg-dim]">
        <span>
          © {new Date().getFullYear()} dinkbit. Todos los derechos reservados.
        </span>
        <span>Hecho con cariño en Madrid · Ciudad de México</span>
      </Container>
    </footer>
  );
}
