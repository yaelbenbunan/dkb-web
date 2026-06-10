import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { CONTACT_INFO } from "@/lib/contact-info";
import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";

/**
 * Chrome reducido para las landings de captación de tráfico de pago: solo logo
 * + botón de teléfono y un footer mínimo con enlaces legales. Sin navegación,
 * para no dar vías de escape y maximizar la conversión.
 */
export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl"
        style={{ backgroundColor: "var(--header-bg)" }}
      >
        <Container className="flex h-16 items-center justify-between gap-4 md:h-20">
          <Link href="/" className="flex items-center" aria-label="dinkbit — inicio">
            <Image
              src="/img/logo/dinkbit.svg"
              alt="dinkbit"
              width={120}
              height={36}
              priority
              className="h-8 w-[110px] shrink-0 md:h-9 md:w-[120px]"
            />
          </Link>
          <a
            href={`tel:${CONTACT_INFO.phoneE164}`}
            aria-label={`Llamar a ${CONTACT_INFO.phone}`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">{CONTACT_INFO.phone}</span>
            <span className="sm:hidden">¡Llámanos!</span>
          </a>
        </Container>
      </header>

      <main id="main-content">{children}</main>

      <footer className="border-t border-border/60 bg-bg-deep py-8">
        <Container className="flex flex-col items-center justify-between gap-4 text-sm text-fg-muted sm:flex-row">
          <p>© {new Date().getFullYear()} dinkbit</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/aviso-legal" className="hover:text-accent">
              Aviso legal
            </Link>
            <Link href="/privacidad" className="hover:text-accent">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-accent">
              Cookies
            </Link>
          </nav>
        </Container>
      </footer>

      <WhatsAppBubble />
    </>
  );
}
