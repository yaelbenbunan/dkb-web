import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";
import { CONTACT_INFO } from "@/lib/contact-info";
import { NavLink } from "./NavLink";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[#0e1015]/80 backdrop-blur-xl">
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
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Derecha: iconos RRSS */}
        <div className="hidden items-center gap-2 md:flex">
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
          <SocialIcon
            href={CONTACT_INFO.socials.whatsapp}
            label="WhatsApp"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.523 5.265l-.999 3.648 3.965-1.612zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            }
          />
        </div>

        <MobileMenu />
      </Container>
    </header>
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
      className="flex h-10 w-10 items-center justify-center rounded-full text-[--color-fg-muted] transition-all hover:bg-[#187bef]/15 hover:text-[#3a90f2]"
    >
      {icon}
    </a>
  );
}
