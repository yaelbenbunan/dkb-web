import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";
import { CONTACT_INFO } from "@/lib/contact-info";
import { NavLink } from "./NavLink";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl"
      style={{ backgroundColor: "var(--header-bg)" }}
    >
      <Container className="flex h-20 items-center justify-between gap-8">
        {/* Izquierda: logo + menu */}
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center" aria-label="dinkbit — inicio">
            <Image
              src="/img/logo/dinkbit.svg"
              alt="dinkbit"
              width={140}
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex lg:gap-10">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Derecha: iconos RRSS + CTA llamada (desktop) */}
        <div className="hidden items-center gap-3 lg:flex">
          <SocialIcon
            href={CONTACT_INFO.socials.instagram}
            label="Instagram"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
            }
          />
          <SocialIcon
            href={CONTACT_INFO.socials.tiktok}
            label="TikTok"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.6 6.5a5.7 5.7 0 01-3.4-1.1A5.7 5.7 0 0114 1h-3.5v13.6a2.6 2.6 0 11-2.6-2.6c.3 0 .5 0 .8.1V8.5a6.2 6.2 0 00-.8-.1 6.1 6.1 0 106.1 6.1V8a9 9 0 005.6 1.9V6.5z" />
              </svg>
            }
          />
          <SocialIcon
            href={CONTACT_INFO.socials.linkedin}
            label="LinkedIn"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.4 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v7.44H17.3v-6.6c0-1.57-.03-3.6-2.19-3.6-2.2 0-2.54 1.72-2.54 3.49V22H7.62V8z" />
              </svg>
            }
          />
          <a
            href={`tel:${CONTACT_INFO.phoneE164}`}
            aria-label={`Llamar a ${CONTACT_INFO.phone}`}
            className="ml-1 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            <PhoneIcon />
            <span>¡Llámanos!</span>
          </a>
        </div>

        {/* Llamada (mobile) — siempre visible junto al hamburguesa */}
        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={`tel:${CONTACT_INFO.phoneE164}`}
            aria-label={`Llamar a ${CONTACT_INFO.phone}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_18px_-6px_rgba(24,123,239,0.6)] transition-all hover:bg-accent-hover"
          >
            <PhoneIcon />
          </a>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SocialIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-all hover:bg-accent/15 hover:text-accent-hover"
    >
      {icon}
    </a>
  );
}
