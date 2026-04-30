import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-[--color-border] bg-[--color-bg-subtle]">
      <Container className="grid gap-8 py-14 md:grid-cols-3">
        <div>
          <Link href="/" aria-label="dinkbit — inicio">
            <Image
              src="/img/logo/dinkbit.svg"
              alt="dinkbit"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <p className="mt-4 text-sm text-[--color-fg-muted]">
            Agencia digital en España.
          </p>
        </div>
        <nav>
          <p className="text-sm font-semibold text-[--color-fg]">Navegación</p>
          <ul className="mt-4 space-y-2">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="text-sm text-[--color-fg-muted] transition-colors hover:text-[--color-fg]"
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-[--color-fg]">Contacto</p>
          <ul className="mt-4 space-y-2 text-sm text-[--color-fg-muted]">
            <li>
              <a
                href="mailto:hola@dinkbit.com"
                className="transition-colors hover:text-[--color-fg]"
              >
                hola@dinkbit.com
              </a>
            </li>
            <li>
              <a
                href="tel:+34657559397"
                className="transition-colors hover:text-[--color-fg]"
              >
                +34 657 559 397
              </a>
            </li>
            <li className="pt-2 leading-relaxed">
              C/ Fuerteventura 4, 3ª planta
              <br />
              28703 San Sebastián de los Reyes, Madrid
            </li>
          </ul>
        </div>
      </Container>
      <Container className="border-t border-[--color-border] py-6 text-xs text-[--color-fg-dim]">
        © {new Date().getFullYear()} dinkbit. Todos los derechos reservados.
      </Container>
    </footer>
  );
}
