import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import type { CaseStudy } from "@/lib/types";

interface Props {
  caseStudy: CaseStudy;
  serviceTitleBySlug: Record<string, string>;
}

export function CaseHeader({ caseStudy, serviceTitleBySlug }: Props) {
  return (
    <header className="border-b border-[--color-border] bg-[--color-bg-subtle] py-20 md:py-24">
      <Container className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start md:gap-16">
        {/* Izq: cliente + descripción */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
            Caso de éxito
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            {caseStudy.title}
          </h1>
          {caseStudy.description && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[--color-fg-muted]">
              {caseStudy.description}
            </p>
          )}

          {/* Meta: tags + social + cliente desde */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            {/* Tags */}
            {caseStudy.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {caseStudy.tags.map((t) => (
                  <Tag key={t}>{serviceTitleBySlug[t] ?? t}</Tag>
                ))}
              </div>
            )}

            {/* Social icons */}
            {caseStudy.social && (
              <div className="flex items-center gap-3">
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

            {/* Cliente desde */}
            {caseStudy.clientSince && (
              <span className="text-[--color-fg-muted]">
                Cliente desde{" "}
                <span className="text-[--color-fg]">{caseStudy.clientSince}</span>
              </span>
            )}
          </div>
        </div>

        {/* Der: logo del cliente */}
        {caseStudy.clientLogo && (
          <div className="flex h-32 w-48 items-center justify-center rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-6 md:h-40 md:w-56">
            <Image
              src={caseStudy.clientLogo}
              alt={caseStudy.client}
              width={180}
              height={80}
              className="max-h-full w-auto object-contain"
            />
          </div>
        )}
      </Container>
    </header>
  );
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[--color-border-strong] text-[--color-fg-muted] transition-colors hover:border-[--color-accent] hover:text-[--color-accent]"
    >
      {icon}
    </a>
  );
}
