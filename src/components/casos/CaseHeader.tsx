import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { CaseStudy } from "@/lib/types";

interface Props {
  caseStudy: CaseStudy;
  serviceTitleBySlug: Record<string, string>;
}

export function CaseHeader({ caseStudy, serviceTitleBySlug }: Props) {
  const hasSocial = caseStudy.social && hasAnySocial(caseStudy.social);

  return (
    <header className="relative isolate overflow-hidden">
      {/* Bg azul tintado para destacar */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(135deg, rgba(12,28,64,0.92) 0%, rgba(8,17,42,1) 100%)",
        }}
      />
      {/* Spotlight azul fuerte */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 65% at 20% 30%, rgba(58,144,242,0.4), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30 fade-edges-y"
      />

      <Container className="relative grid gap-12 py-20 md:grid-cols-[1fr_auto] md:items-center md:gap-16 md:py-24">
        {/* Izq: title → description → date → tags */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Caso de éxito
          </p>
          <h1
            className="mt-6 font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            {caseStudy.title}
          </h1>

          {caseStudy.description && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[--color-fg-muted]">
              {caseStudy.description}
            </p>
          )}

          {caseStudy.clientSince && (
            <p className="mt-7 text-sm text-[--color-fg-muted]">
              Cliente desde{" "}
              <span className="font-semibold text-[--color-fg]">
                {caseStudy.clientSince}
              </span>
            </p>
          )}

          {caseStudy.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {caseStudy.tags.map((t) => (
                <li key={t}>
                  <Link
                    href={`/servicios/${t}`}
                    className="inline-flex h-8 items-center rounded-full bg-[#187bef]/15 px-4 text-xs font-semibold uppercase tracking-wider text-[#3a90f2] ring-1 ring-[#187bef]/30 transition-all hover:bg-[#187bef] hover:text-white"
                  >
                    {serviceTitleBySlug[t] ?? t}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Derecha: logo + iconos sociales centrados respecto al logo */}
        {(caseStudy.clientLogo || hasSocial) && (
          <div className="flex w-fit flex-col items-center gap-5">
            {caseStudy.clientLogo && (
              <Image
                src={caseStudy.clientLogo}
                alt={caseStudy.client}
                width={280}
                height={140}
                className="max-h-32 w-auto object-contain md:max-h-40"
              />
            )}
            {hasSocial && caseStudy.social && (
              <div className="flex items-center justify-center gap-3">
                {caseStudy.social.website && (
                  <SocialLink
                    href={caseStudy.social.website}
                    label="Sitio web"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                      </svg>
                    }
                  />
                )}
                {caseStudy.social.facebook && (
                  <SocialLink
                    href={caseStudy.social.facebook}
                    label="Facebook"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" />
                      </svg>
                    }
                  />
                )}
                {caseStudy.social.instagram && (
                  <SocialLink
                    href={caseStudy.social.instagram}
                    label="Instagram"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                      </svg>
                    }
                  />
                )}
                {caseStudy.social.linkedin && (
                  <SocialLink
                    href={caseStudy.social.linkedin}
                    label="LinkedIn"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.4 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v7.44H17.3v-6.6c0-1.57-.03-3.6-2.19-3.6-2.2 0-2.54 1.72-2.54 3.49V22H7.62V8z" />
                      </svg>
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Container>

      {/* Línea brillante inferior */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef] to-transparent"
      />
    </header>
  );
}

function hasAnySocial(s: NonNullable<CaseStudy["social"]>): boolean {
  return Boolean(s.website || s.facebook || s.instagram || s.linkedin || s.twitter);
}

function SocialLink({
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
      className="surface flex h-10 w-10 items-center justify-center rounded-full text-[--color-fg-muted] transition-all hover:bg-[#187bef] hover:text-white"
    >
      {icon}
    </a>
  );
}
